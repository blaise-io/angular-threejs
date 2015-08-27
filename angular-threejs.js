/*jshint globalstrict:true */

angular.module('threejs', [])

.directive('threeJs', function() {
    'use strict';

    if (typeof THREE === 'undefined') {
        throw new Error('ThreeJS not loaded.');
    }

    var container, renderProps, camera, renderer, scene = new THREE.Scene();

    function detectInit(requirementsInitialized) {
        if (requirementsInitialized) {
            initCanvas();
            renderLoop();
        }
    }

    function initCanvas() {
        renderer = new THREE[renderProps.className](renderProps.params);
        container.appendChild(renderer.domElement);
        setProjection();
    }

    function renderLoop() {
        requestAnimationFrame(renderLoop);
        render();
    }

    function render() {
        renderer.render(scene, camera);
    }

    function setProjection() {
        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
    }

    /**
     * ThreeJsCtrl is the interface for child directives.
     * @constructor
     */
    function ThreeJsCtrl() {}

    ThreeJsCtrl.prototype = {
        scene: scene,
        setProjection: setProjection,

        getRenderer: function() {
            return renderer;
        },

        setRenderer: function(_renderProps) {
            container = _renderProps.container;
            renderProps = _renderProps;
        },

        getCamera: function() {
            return camera;
        },

        setCamera: function(_camera) {
            camera = _camera;
        }
    };

    return {
        restrict: 'E',
        link: function(scope) {
            scope.scene = scene;
            scope.$watch(function() {
                return Boolean(container && renderProps && camera);
            }, detectInit, true);
        },
        controller: ThreeJsCtrl
    };
})

/**
 * Helper function.
 */
.value('threeJsParseAttrs', function(scope, defaults, attrs) {
    'use strict';
    var parsedAttrs = angular.extend({}, defaults);
    for (var k in defaults) {
        if (defaults.hasOwnProperty(k) && attrs[k]) {
            parsedAttrs[k] = scope.$eval(attrs[k]);
        }
    }
    return parsedAttrs;
})

/**
 * <three-js-canvas></three-js-canvas>
 */
.directive('threeJsCanvas', ['threeJsParseAttrs', function(threeJsParseAttrs) {
    'use strict';

    return {
        require: '^threeJs',
        link: function(scope, element, attrs, threeJsCtrl) {
            var defaults = {
                container: element[0],
                className: 'WebGLRenderer',
                params: {antialias: true, alpha: true}
            };
            threeJsCtrl.setRenderer(threeJsParseAttrs(scope, defaults, attrs));
        }
    };
}])

/**
 * <three-js-perspective-camera fov="70" near="1" far="10000" position="[0,300,300]"></three-js-perspective-camera>
 */
.directive('threeJsPerspectiveCamera', ['threeJsParseAttrs', function(threeJsParseAttrs) {
    'use strict';

    return {
        require: '^threeJs',
        link: function(scope, element, attrs, threeJsCtrl) {
            var camera, aspect, defaults, a;

            aspect = window.innerWidth / window.innerHeight;

            defaults = {
                fov: 70,
                aspect: aspect,
                near: 1,
                far: 1000,
                lookAt: [0, 0, 0],
                position: [0, 0, 0]
            };

            a = threeJsParseAttrs(scope, defaults, attrs);

            camera = new THREE.PerspectiveCamera(a.fov, a.aspect, a.near, a.far);
            camera.position.set(a.position[0], a.position[1], a.position[2]);
            camera.lookAt(new THREE.Vector3(a.lookAt[0], a.lookAt[1], a.lookAt[2]));

            threeJsCtrl.setCamera(camera);
        }
    };
}])

/**
 * <three-js-objects objects="objects"></three-js-objects>
 */
.directive('threeJsObjects', function() {
    'use strict';

    return {
        require: '^threeJs',
        link: function(scope, element, attrs, threeJsCtrl) {
            scope.$watch(attrs.objects, function(objectsJson) {
                var loader = new THREE.ObjectLoader();
                threeJsCtrl.scene.add(loader.parse(objectsJson));
            });
        }
    };
})

/**
 * <three-js-orbit-controls max-polar-angle="1.55"></three-js-orbit-controls>
 */
.directive('threeJsOrbitControls', function() {
    'use strict';

    if (!THREE.OrbitControls) {
        // https://github.com/mrdoob/three.js/blob/master/examples/js/controls/OrbitControls.js
        throw new Error('OrbitControls (plugin) not loaded.');
    }

    return {
        require: '^threeJs',
        link: function(scope, element, attrs, threeJsCtrl) {
            function addControls(renderer) {
                var controls = new THREE.OrbitControls(threeJsCtrl.getCamera(), renderer.domElement);
                controls.addEventListener('change', threeJsCtrl.setProjection);
                if (attrs.maxPolarAngle) {
                    controls.maxPolarAngle = scope.$eval(attrs.maxPolarAngle);
                }
            }
            scope.$watch(threeJsCtrl.getRenderer, function(renderer) {
                if (renderer) {
                    addControls(renderer);
                }
            });
        }
    };
});
