# angular-threejs

Allows you to build a scene using directives:

```html
<three-js>
    <three-js-canvas></three-js-canvas>
    <three-js-perspective-camera fov="70" near="1" far="10000" position="[0,300,300]"></three-js-perspective-camera>
    <three-js-objects objects="objects"></three-js-objects>
    <three-js-orbit-controls max-polar-angle="1.55"></three-js-orbit-controls>
    <pre>{{scene|json}}</pre>
</three-js>
```
