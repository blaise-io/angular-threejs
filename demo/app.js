'use strict';

var app = angular.module('app', ['threejs']);

app.run(['$rootScope', '$timeout', function($rootScope, $timeout) {

    $rootScope.objects = {
        "metadata": {
            "version": 4.3,
            "type": "Object",
            "generator": "ObjectExporter"
        },
        "geometries": [
            {
                "uuid": "B60E7E2A-8A80-42EC-9719-E2919CB6A438",
                "type": "Geometry",
                "data": {
                    "vertices": [],
                    "normals": [],
                    "faces": []
                }
            },
            {
                "uuid": "B4BDDC71-BA56-44F5-9D54-BEF4F8C0B5A0",
                "type": "BoxGeometry",
                "width": 100,
                "height": 100,
                "depth": 100
            }
        ],
        "materials": [
            {
                "uuid": "CCF8555B-C9BD-417F-AF5A-3820EC595B39",
                "type": "MeshBasicMaterial",
                "color": 4840522
            },
            {
                "uuid": "53A6DD47-31E4-444C-9BB0-102DB222015C",
                "type": "MeshPhongMaterial",
                "color": 8794224,
                "emissive": 0,
                "specular": 1118481,
                "shininess": 30,
                "transparent": true
            }
        ],
        "object": {
            "uuid": "BE669029-4FA0-4F16-85D4-C299B7DA10FF",
            "type": "Scene",
            "matrix": [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
            "children": [
                {
                    "uuid": "31517222-A9A7-4EAF-B5F6-60751C0BABA3",
                    "type": "Scene",
                    "name": "Scene",
                    "matrix": [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
                    "children": [
                        {
                            "uuid": "C62AAE9F-9E51-46A5-BD2B-71BA804FC0B3",
                            "type": "DirectionalLight",
                            "color": 16777215,
                            "intensity": 1,
                            "matrix": [1,0,0,0,0,1,0,0,0,0,1,0,100,200,150,1]
                        },
                        {
                            "uuid": "C62AAE9F-9E51-46A5-BD2B-71BA804FC0B4",
                            "type": "AmbientLight",
                            "color": 16777215,
                            "matrix": [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
                        },
                        {
                            "uuid": "1FE7C772-10F8-472B-8EFF-8545B9F16E60",
                            "type": "Mesh",
                            "geometry": "B4BDDC71-BA56-44F5-9D54-BEF4F8C0B5A0",
                            "material": "53A6DD47-31E4-444C-9BB0-102DB222015C",
                            "matrix": [0.7071067690849304,0.7071067690849304,0,0,-0.7071067690849304,0.7071067690849304,0,0,0,0,1,0,0,0,0,1]
                        }
                    ]
                }
            ]
        }
    };

    // Below handles buttons.

    var meshIndex = 0;

    $rootScope.addRandomCube = function(scene) {
        var size, cube;

        size = Math.random() * 50;

        cube = new THREE.Mesh(
            new THREE.BoxGeometry(size, size, size),
            new THREE.MeshLambertMaterial({
                color: Math.random() * 0xffffff,
                transparent: true,
                opacity: Math.random()
            })
        );

        cube.position.x = Math.random() * 400 - 200;
        cube.position.y = Math.random() * 400 - 200;
        cube.position.z = Math.random() * 400 - 200;

        cube.rotation.x = Math.random() * 2 * Math.PI;
        cube.rotation.y = Math.random() * 2 * Math.PI;
        cube.rotation.z = Math.random() * 2 * Math.PI;

        cube.name = 'Random cube ' + (++meshIndex);
        cube.userData = {
            size: size,
            position: angular.copy(cube.position),
            rotation: angular.copy(cube.rotation)
        };

        scene.add(cube);

        // Adding a mesh is async, so need to update scope.
        $timeout($rootScope.$apply.bind($rootScope));
    };

    $rootScope.addConfetti = function(scene, str) {
        function addOneMore(counter) {
            if (counter < 100) {
                setTimeout(function() {
                    addOneMore(++counter);
                }, 10);
            }
            $rootScope.addText(scene, str);
        }
        addOneMore(0);
    };

    $rootScope.addText = function(scene, str) {
        var size = 100 + (Math.random() * 100);

        var textGeometry = new THREE.TextGeometry(str, {
            font: 'zinconsolata',
            height: 5,
            size: size
        });

        var text = new THREE.Mesh(textGeometry, new THREE.MeshLambertMaterial({
            color: Math.random() * 0xffffff,
            transparent: true,
            opacity: Math.random()
        }));

        textGeometry.computeBoundingBox();
        var textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;

        text.position.set(-0.5 * textWidth + (Math.random() * 400 - 200), 0, 0);
        
        text.position.y = Math.random() * 400 - 200;
        text.position.z = Math.random() * 400 - 200;

        text.rotation.x = Math.random() * 2 * Math.PI;
        text.rotation.y = Math.random() * 2 * Math.PI;
        text.rotation.z = Math.random() * 2 * Math.PI;

        text.name = 'Random text ' + (++meshIndex);
        text.userData = {
            size: size,
            position: angular.copy(text.position),
            rotation: angular.copy(text.rotation)
        };
        
        scene.add(text);

        // Adding a mesh is async, so need to update scope.
        $timeout($rootScope.$apply.bind($rootScope));
    };

}]);
