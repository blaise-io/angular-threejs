'use strict';

lyr.pageEditorApp.directive('pageThreeD', [
'ThreeDControlsTransformer', '$timeout', function(ThreeDControlsTransformer, $timeout) {

    return function($scope, $element) {
        var wrapper, page = $scope.nav.page;

        $scope.transformDbModel = ThreeDControlsTransformer.dbModel;

        function updateFormFn(dbModel) {
            angular.extend($scope.transformDbModel, dbModel);
            ThreeDControlsTransformer.updateUserModel();
            $timeout($scope.$apply.bind($scope));
        }

        function updateZoomFn(zoom) {
            $scope.zoom.current = zoom;
            $timeout($scope.$apply.bind($scope));
        }

        function initWrapper(area) {
            wrapper = new lyr.pageEditorApp.ThreeDWrapper(
                $element, area.width, area.height
            );
            wrapper.updateFormFn = updateFormFn;
            wrapper.updateZoomFn = updateZoomFn;
            wrapper.addPage(page, $scope.grid.show);

            $scope.$watch('widgets', wrapper.addWidgets.bind(wrapper));
            $scope.$watch('threeD.mode', wrapper.setUserTransformMode.bind(wrapper));
            $scope.$watch('zoom', wrapper.setUserZoomBounds.bind(wrapper));
            $scope.$watch('zoom.delta', wrapper.setUserZoom.bind(wrapper));
            $scope.$watch('grid.show', wrapper.toggleGrid.bind(wrapper));
            $scope.$watch('transformDbModel', wrapper.setTransformFromForm.bind(wrapper), true);
        }

        function resizeAreaCallback(area) {
            if (wrapper) {
                wrapper.resize(area.width, area.height);
            } else {
                initWrapper(area);
            }
        }

        // Also sets initial render once area is computed.
        $scope.$watch('area', resizeAreaCallback, true);

        // Hide transform form when we're getting destroyed.
        $scope.$on('$destroy', function() {
            wrapper.updateFormFn({mesh: null});
        });
    };

}]);


lyr.pageEditorApp.ThreeDWrapper = function(element, width, height) {
    this.element = element;
    this.width = width;
    this.height = height;

    this.webgl = null;
    this.showGrid = null;
    this.pageMesh = null;
    this.widgetMeshes = [];

    this.updateFormFn = angular.noop;
    this.updateZoomFn = angular.noop;

    this.controlMesh = null;
    this.ignoreClickTimer = null;

    this.M_UNIT_FACTOR = 100;

    this.setScene();
    this.setRenderer();
    this.addCamera();
    this.addLight();
    this.addFocusHandler();
    this.initWidgetControls();
    this.addControls();
    this.loadJsonMeshes();
    this.addToDom();
};

lyr.pageEditorApp.ThreeDWrapper.prototype = {

    setScene: function() {
        this.scene = new THREE.Scene();
    },

    webglEnabled: function() {
        try {
            var canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (
                canvas.getContext('webgl') ||
                canvas.getContext('experimental-webgl'))
            );
        } catch (e) {
            return false;
        }
    },

    setRenderer: function() {
        if (this.webglEnabled()) {
            this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
            this.webgl = true; // Yay!
        } else if (window.CanvasRenderingContext2D) {
            this.renderer = new THREE.CanvasRenderer();
            this.webgl = false; // Booooo!
        } else {
            window.alert('Your browser does not support threejs');
            throw new Error('Unsupported browser');
        }
        this.renderer.setSize(this.width, this.height);
    },

    addCamera: function() {
        this.camera = new THREE.PerspectiveCamera(
            30, this.width / this.height,
            0.01 * this.M_UNIT_FACTOR, 10 * this.M_UNIT_FACTOR
        );

        // Should Z be auto-calculated?
        this.camera.position.z = 2 * this.M_UNIT_FACTOR;

        // We change the up direction of the camera.
        // This fixes OrbitControls to rotate X+Y instead of X+Z.
        this.camera.up.set(0, 0, 1);

        this.scene.add(this.camera);
    },

    setUserZoom: function(delta) {
        if (delta) {
            // Use OrbitControls' supplied methods because there's a lot of
            // math involved in calculating zoom when the camera is rotated.
            if (delta < 1) {
                this.controls.dollyIn();
            } else {
                this.controls.dollyOut();
            }
           this.controls.update();
        }
    },

    setUserZoomBounds: function(zoom) {
        this.controls.minDistance = zoom.min * this.M_UNIT_FACTOR;
        this.controls.maxDistance = zoom.max * this.M_UNIT_FACTOR;
    },

    addLight: function() {
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.75);
        this.directionalLight.position.set(0, 0, this.camera.position.z);
        this.camera.add(this.directionalLight);
        this.scene.add(new THREE.AmbientLight(0x999999));
    },

    addFocusHandler: function() {
        this.focusHandler = new THREEx.DomEvents(
            this.camera, this.renderer.domElement
        );
    },

    addControls: function() {
        this.controls = new THREE.OrbitControls(
            this.camera, this.renderer.domElement
        );

        // Don't allow peeking behind the page.
        this.controls.maxPolarAngle = (Math.PI / 2) - 0.05;

        // Reverse controls because we messed with the camera.
        this.controls.keys = {RIGHT: 37, BOTTOM: 38, LEFT: 39, UP: 40};

        // Conflicts with input controls.
        // TODO: Disable noKeys ONLY while any input field is focused.
        this.controls.noKeys = true;

        this.controls.addEventListener(
            'change', this.handleUserInteraction.bind(this)
        );
    },

    addToDom: function() {
        this.element.html(this.renderer.domElement);
    },

    loadJsonMeshes: function() {
        var url;

        url = this.proxy('https://dl.dropboxusercontent.com/u/1436627/Layar/L3D%20Models/klm747.l3d.js');
        new THREE.JSONLoader().load(url, this.addJsonMesh.bind(this), 'model');

//        url = this.proxy('https://dl.dropboxusercontent.com/u/1436627/Layar/L3D%20Models/ducky3.l3d.js');
//        new THREE.JSONLoader().load(url, this.addAnotherJsonMesh.bind(this), 'model');
    },

    addJsonMesh: function(geometry, materials) {
        var mesh, bbox, width, height, scale;

        mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(materials));

        geometry.computeBoundingBox();
        bbox = geometry.boundingBox;

        // Span roughly half the page.
        width = bbox.max.x - bbox.min.x;
        height = bbox.max.y - bbox.min.y;
        scale = (0.5 * this.M_UNIT_FACTOR) / Math.max(width, height);
        mesh.scale.set(scale, scale, scale);

        this.registerMeshControls(mesh);
        this.scene.add(mesh);
        this.render();

        return mesh;
    },

    addAnotherJsonMesh: function(geometry, materials) {
        var mesh = this.addJsonMesh.apply(this, arguments);
        mesh.position.x = -0.2 * this.M_UNIT_FACTOR;
        var scale = 0.1 * this.M_UNIT_FACTOR;
        mesh.scale.set(scale, scale, scale);
        this.render();
    },

    render: function() {
        this.renderer.render(this.scene, this.camera);
    },

    resize: function(width, height) {
        this.width = width;
        this.height = height;
        this.renderer.setSize(this.width, this.height);
        this.camera.updateProjectionMatrix();
        this.render();
    },

    testSameOrigin: function(url) {
        var a = document.createElement('a');
        a.href = url;
        return (
            a.hostname == location.hostname &&
            a.port == location.port &&
            a.protocol == location.protocol
        );
    },

    proxy: function(url) {
        if (this.testSameOrigin(url)) {
            return url;
        } else {
            // TODO Use CORS instead, remove back-end proxy.
            return '/creator/proxy/?' + url;
        }
    },

    addTexturedPlane: function(textureUrl, transparent, size) {
        var geometry, texture, material, mapping, segments;

        mapping = this.webgl ? null : new THREE.UVMapping();
        segments = this.webgl ? null : 20;

        geometry = new THREE.PlaneGeometry(
            size.width, size.height, segments, segments
        );

        texture = new THREE.ImageUtils.loadTexture(
            this.proxy(textureUrl), mapping, function() {
                material.opacity = 1; // Show once texture has loaded.
                this.render();
            }.bind(this)
        );

        material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: transparent,
            alphaTest: transparent ? 0.5 : null, // Prevents depth test issues.
            opacity: 0.1, // Temporary until texture has loaded.
            overdraw: this.webgl ? 0 : 0.3 // Get rid of lines between triangles.
        });

        return new THREE.Mesh(geometry, material);
    },

    addPage: function(page, showGrid) {
        this.page = page;
        this.pageSize = {
            width: page.real_world_width * this.M_UNIT_FACTOR,
            height: page.real_world_height * this.M_UNIT_FACTOR
        };
        this.pageMesh = this.addTexturedPlane(page.image, false, this.pageSize);
        this.scene.add(this.pageMesh);
        this.addPageClickHandler();
        this.setupGrid(showGrid);
    },

    setupGrid: function(showGrid) {
        this.linesWhite = this.getGridLines(0x000000, 0.00, 0.00, 0.01);
        this.linesBlack = this.getGridLines(0xffffff, 0.05, 0.05, 0.01);
        this.toggleGrid(showGrid);
    },

    toggleGrid: function(showGrid) {
        if (showGrid) {
            this.scene.add(this.linesWhite, this.linesBlack);
        } else {
            this.scene.remove(this.linesWhite, this.linesBlack);
        }
        this.render();
    },

    getGridLines: function(color, x, y, z) {
        var grid, geometry, material, step, steps, size, lines = 20;

        geometry = new THREE.Geometry();
        material = new THREE.LineBasicMaterial({
            color      : color,
            transparent: true,
            opacity    : 0.2
        });

        size = this.pageSize;
        step = size.height / lines;
        steps = Math.max(lines, Math.floor(lines * (size.width / size.height)));

        for (var i = -steps, m = steps; i < m; i++) {
            if (Math.abs(i) * step * 2 <= size.height) {
                geometry.vertices.push(
                    new THREE.Vector3(-size.width / 2, i * step, 0),
                    new THREE.Vector3(+size.width / 2, i * step, 0)
                );
            }
            if (Math.abs(i) * step * 2 <= size.width) {
                geometry.vertices.push(
                    new THREE.Vector3(i * step, -size.height / 2, 0),
                    new THREE.Vector3(i * step, +size.height / 2, 0)
                );
            }
        }

        grid = new THREE.Line(geometry, material, THREE.LinePieces);
        grid.position.set(x, y, z);

        return grid;
    },

    addPageClickHandler: function() {
        this.focusHandler.addEventListener(
            this.pageMesh, 'click',
            this.setMeshControls.bind(this),
            false
        );
    },

    addWidgets: function(widgets) {
        if (widgets) {
            for (var i = 0, m = widgets.length; i < m; i++) {
                if (widgets[i].url) { // Can be empty plain object.
                    var widgetMesh = this.addWidget(widgets[i]);
                    this.scene.add(widgetMesh);
                    this.widgetMeshes.push(widgetMesh);
                    this.registerMeshControls(widgetMesh);
                }
            }}
    },

    addWidget: function(widget) {
        var widgetMesh = this.addTexturedPlane(widget.meta.image_url || widget.url, true, {
            width : (this.page.real_world_width * widget.width) / 100 * this.M_UNIT_FACTOR,
            height: (this.page.real_world_height * widget.height) / 100 * this.M_UNIT_FACTOR
        });
        widgetMesh.position.set(
            widget.offset_x * this.M_UNIT_FACTOR,
            widget.offset_y * this.M_UNIT_FACTOR,
            widget.offset_z * this.M_UNIT_FACTOR
        );
        return widgetMesh;
    },

    // Allow focusing/controlling the mesh
    registerMeshControls: function(mesh) {
        this.focusHandler.addEventListener(
            mesh, 'click', this.setMeshControls.bind(this), false
        );
    },

    setMeshControls: function(event) {
        // Ignore unintended clicks if user just performed a drag operation.
        if (this.ignoreClickTimer !== null) {
            return;
        }

        // Remove controls from existing mesh.
        if (this.controlMesh) {
            this.widgetControls.detach(this.controlMesh);
            this.scene.remove(this.widgetControls);
        }

        if (event.target === this.controlMesh || event.target === this.pageMesh) {
            // Don't re-attach controls when mesh with controls was clicked,
            // or when the page was clicked.
            this.controlMesh = null;
            this.updateFormFn({mesh: null});
        } else {
            // Add controls to the new mesh.
            this.controlMesh = event.target;
            this.widgetControls.attach(event.target);
            this.setTransformToUserModel(event.target);
            this.scene.add(this.widgetControls);
        }

        // Render and lock interaction.
        this.handleUserInteraction();
    },

    initWidgetControls: function() {
        this.widgetControls = new THREE.TransformControls(
            this.camera, this.renderer.domElement
        );
        this.widgetControls.addEventListener('change', function(event) {
            if (event.target.object) {
                this.uniformScaleFix(event.target.object);
                this.setTransformToUserModel(event.target.object);
                this.handleUserInteraction();
            }
        }.bind(this));
        this.setUserTransformMode('translate');
    },

    // TransformControls allow non-uniform scaling.
    // Make sure that when this happens, all other axes apply the same scale.
    uniformScaleFix: function(mesh) {
        var s = mesh.scale;
             if (s.x === s.y) { s.set(s.z, s.z, s.z); }
        else if (s.x === s.z) { s.set(s.y, s.y, s.y); }
        else if (s.z === s.y) { s.set(s.x, s.x, s.x); }
    },

    setUserTransformMode: function(mode) {
        this.widgetControls.setMode(mode);
    },

    setTransformFromForm: function(transform) {
        if (this.controlMesh) {
            this.controlMesh.scale.set(
                transform.scale,
                transform.scale,
                transform.scale
            );
            this.controlMesh.rotation.set(
                transform.orientation_phi,
                transform.orientation_theta,
                transform.orientation_psi
            );
            this.controlMesh.position.set(
                transform.offset_x * this.M_UNIT_FACTOR,
                transform.offset_y * this.M_UNIT_FACTOR,
                transform.offset_z * this.M_UNIT_FACTOR
            );
            this.widgetControls.update();
            this.render();
        }
    },

    setTransformToUserModel: function(mesh) {
        this.updateFormFn({
            mesh             : mesh.id,
            scale            : mesh.scale.x,
            orientation_phi  : mesh.rotation.x,
            orientation_theta: mesh.rotation.y,
            orientation_psi  : mesh.rotation.z,
            offset_x         : mesh.position.x / this.M_UNIT_FACTOR,
            offset_y         : mesh.position.y / this.M_UNIT_FACTOR,
            offset_z         : mesh.position.z / this.M_UNIT_FACTOR
        });
    },

    handleUserInteraction: function() {
        // Hide rotate gizmo for rotation relative to camera.
        this.widgetControls.gizmo.rotate.handleGizmos.E[0][0].visible = false;

        // Prevent accidentally activating other controls.
        clearTimeout(this.ignoreClickTimer);
        this.ignoreClickTimer = setTimeout(function() {
            this.ignoreClickTimer = null;
        }.bind(this), 100);


        // Sync back zoom to model.
        this.updateZoomFn(this.camera.position.z / this.M_UNIT_FACTOR);

        // Render changes made by user.
        this.render();
    }

};
