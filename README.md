# CSE 160 - Assignment 5 - Three.js FPS Office
Name: Alexander Bateman  
Email: arbatema@ucsc.edu  

Live Demo: https://ycmsoft.github.io/threejs/index.html

## Description:
A first person exploration game set on a giant desk, inspired by "Runtfest" (Quake 3 map by Xzed released April 13, 2000). You explore a massive desk environment with a miniature office on top, collect gems to unlock super jump, and toggle lights.

Collect all gems to get super jump, where you can then jump on top of mug, to jump on top of the globe, to jump ontop of the lamp, to get on top of the monitor and computer where you'll find a hidden teapot. 


## Files:
- `index.html` - UI, HUD, pointer lock blocker, loads Three.js and main script.
- `main.js` - Main file: scene setup, models, lighting, collision, FPS controls, game logic.
- `models/Computer.glb` - Computer model (Poly by Google [CC-BY] via Poly Pizza).
- `models/LightDesk.glb` - Desk lamp model (Quaternius).
- `models/chair.glb` - Office chair model (CMHT Oculus [CC-BY] via Poly Pizza).
- `models/minichair.glb` - Mini office chair model (Quaternius).
- `models/teapot.obj` - Utah teapot OBJ model.
- `models/Tardis.glb` - Tardis model (Neil Nathanson via Poly Pizza).
- `textures/wood.jpg` - Wood texture.
- `textures/floorWood.jpg` - Desk surface texture (Dimitrios Savva, polyhaven.com).
- `textures/metal.jpg` - Metal wall/roof texture (Amal Kumar, polyhaven.com).
- `textures/cubicles.jpg` - Cubicle wall texture (Jenelle van Heerden, polyhaven.com).
- `textures/globe.jpg` - Earth globe texture.
- `textures/nighthawks.jpg` - Nighthawks painting (Edward Hopper).
- `sounds/impactMetal_000.ogg` - Jump sound (kenney.nl).
- `sounds/switch_002.ogg` - Light toggle sound (kenney.nl).
- `sounds/forceField_000.ogg` - Gem pickup sound (kenney.nl).
- `skybox/` - 6-face cubemap skybox (px, nx, py, ny, pz, nz).
- `README.md` - This readme.

## Controls:
- `W/A/S/D` - Move forward/left/backward/right.
- `Mouse` - Look around (pointer lock).
- `Space` - Jump.
- `Shift` - Sprint.
- `C` or `Ctrl` - Crouch.
- `F` - Toggle flashlight.
- `L` - Toggle desk lamp.
- `Esc` - Unlock pointer.

## Wow:
- FPS movement with gravity, jumping, sprinting, and crouching.
- Flashlight (SpotLight) attached to camera with toggle.
- Toggleable desk lamp (PointLight) with visible glowing bulb.
- Collectible gem system (5 gems) with pickup sound effects.
- Super jump unlocked after collecting all gems.
- Custom collision system with hand placed collider boxes for GLB models.
- Sound effects for jumping, light toggling, and gem collection.
- Tardis teleporter on the floor that warps you back to spawn.

## Claude Use:
- Generated amiga ball checker texture pattern.
- Added fake white rectangle ceiling panel where a lamp model was planned.
- Created debug helpers (arrow key positioning, camera helpers) for placing objects and lights.
- Debugged floor shadow issues (separate directional light for desk-on-floor shadow).
- Replaced original enclosed walls with split wall segments to create doorway openings in the mini cubicle.
- Helped with pointer lock controls setup.
- Generated HTML/CSS for HUD, controls display, and blocker overlay.
- Debugged collision system (playerAABB, separate X/Z movement for wall sliding).
- Helped with Tardis teleport system
- Helped with blob shadow animation for bouncing amiga ball. 

## Resources:
- Three.js documentation and tutorials (threejs.org).
- Poly Pizza (poly.pizza) for free 3D models.
- Poly Haven (polyhaven.com) for PBR textures.
- kenney.nl for sound effects (sci-fi pack and impact sounds pack)
- Wood floor by Dimitrios Savva (https://polyhaven.com/a/wood_floor)
- Wood table by Dimitrios Savva (https://polyhaven.com/a/wood_table)
- Ceiling interior by Dimitrios Savva (https://polyhaven.com/a/ceiling_interior)
- Rusty metal grid by Amal Kumar (https://polyhaven.com/a/rusty_metal_grid)
- Corrugated iron by Jenelle van Heerden (https://polyhaven.com/a/corrugated_iron_02)
- Rosewood veneer by Jenelle van Heerden (https://polyhaven.com/a/rosewood_veneer1)
- Nighthawks painting by Edward Hopper, framed photo from Without A Frame (https://withoutaframe.com/products/nighthawks-hopper-canvas) photoshopped onto rosewood skybox veneer
- Office Chair by CMHT Oculus [CC-BY] via Poly Pizza (https://poly.pizza)
- Desk by CreativeTrio
- Computer by Poly by Google [CC-BY] via Poly Pizza (https://poly.pizza)
- Light Desk by Quaternius
- Office Chair (mini) by Quaternius
- Utah Teapot (teapot.obj) (from canvas class files)
- Tardis by Neil Nathanson via Poly Pizza (https://poly.pizza)
