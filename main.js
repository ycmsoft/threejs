// main.js
// Alexander Bateman
// arbatema@ucsc.edu
// Notes to Grader: Collect all gems to get super jump, where you can then jump on top of mug, to jump on top of the globe, to jump ontop of the lamp, to get on top of the monitor and computer where you'll find a hidden teapot. 


// Resources Used:
// Inspired by "Runtfest" quake 3 map by Xzed released April 13, 2000
// kenney.nl for sound effects (sci-fi pack and impact sounds pack)
// Wood floor by Dimitrios Savva (https://polyhaven.com/a/wood_floor)
// Wood table by Dimitrios Savva (https://polyhaven.com/a/wood_table)
// Ceiling interior by Dimitrios Savva (https://polyhaven.com/a/ceiling_interior)
// Rusty metal grid by Amal Kumar (https://polyhaven.com/a/rusty_metal_grid)
// Corrugated iron by Jenelle van Heerden (https://polyhaven.com/a/corrugated_iron_02)
// Rosewood veneer by Jenelle van Heerden (https://polyhaven.com/a/rosewood_veneer1)
// Nighthawks painting by Edward Hopper, framed photo from Without A Frame (https://withoutaframe.com/products/nighthawks-hopper-canvas) photoshopped onto rosewood skybox veneer
// Office Chair by CMHT Oculus [CC-BY] via Poly Pizza (https://poly.pizza)
// Desk by CreativeTrio
// Computer by Poly by Google [CC-BY] via Poly Pizza (https://poly.pizza)
// Light Desk by Quaternius
// Office Chair (mini) by Quaternius
// Utah Teapot (teapot.obj) (from canvas class files)
// Tardis by Neil Nathanson via Poly Pizza (https://poly.pizza)

// Claude Use:
// Generated amiga ball checker texture pattern.
// Added fake white rectangle ceiling panel where a lamp model was planned.
// Created debug helpers (arrow key positioning, camera helpers) for placing objects and lights.
// Debugged floor shadow issues (separate directional light for desk-on-floor shadow).
// Replaced original enclosed walls with split wall segments to create doorway openings in the mini cubicle.
// Helped with pointer lock controls setup.
// Generated HTML/CSS for HUD, controls display, and blocker overlay.
// Debugged collision system (playerAABB, separate X/Z movement for wall sliding).


import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const PLAYER_RADIUS = 0.35;  
const PLAYER_HEIGHT = 1.6;    
let playerHeight = PLAYER_HEIGHT;
const STEP_HEIGHT   = 0.45;  

const objects = [];
const colliders = [];    
const playerRadius = 0.6;  
const _closest = new THREE.Vector3(); 

const STAND_HEIGHT  = 1.6;  
const CROUCH_HEIGHT = 1.05; 
const CROUCH_LERP   = 18.0; 

//Tardis teleport
const tardisPos = new THREE.Vector3(55, -35, 0); 
const tardisRadius = 2.0;                      
let tardisCooldown = 0;

const tmpDir = new THREE.Vector3();

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
//renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
document.body.appendChild(renderer.domElement);


//Teapot obj
const objLoader = new OBJLoader();

objLoader.load(
  './models/teapot.obj',
  (obj) => {
    obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.material = new THREE.MeshStandardMaterial({
          color: 0xb0b0b0,
          roughness: 0.35,
          metalness: 0.2,
        });
      }
    });

    obj.scale.setScalar(1.0);             
    obj.position.set(-22.6, 19.8, -3.7);       
    obj.rotation.y = Math.PI * 0.1;      
    scene.add(obj);
    objects.push(obj);
    rebuildStaticColliders();
  },
  undefined,
  (err) => console.warn('Failed to load teapot.obj', err)
);



//Textures
const texLoader = new THREE.TextureLoader();
const woodTex = texLoader.load('./textures/wood.jpg');
woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
woodTex.repeat.set(2, 2);

const deskTex = texLoader.load('./textures/floorWood.jpg');
deskTex.wrapS = deskTex.wrapT = THREE.RepeatWrapping;
deskTex.repeat.set(12, 12); 

const deskWoodTex = texLoader.load('./textures/floorWood.jpg');
deskWoodTex.wrapS = deskWoodTex.wrapT = THREE.RepeatWrapping;
deskWoodTex.repeat.set(12, 12); 

const metalTex = texLoader.load('./textures/metal.jpg');
metalTex.wrapS = metalTex.wrapT = THREE.RepeatWrapping;
metalTex.repeat.set(4, 2); 
metalTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

const cubiclesTex = texLoader.load('./textures/cubicles.jpg');
cubiclesTex.wrapS = metalTex.wrapT = THREE.RepeatWrapping;
cubiclesTex.repeat.set(4, 2); 
cubiclesTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

const globeTex = texLoader.load('./textures/globe.jpg', (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;

  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;

  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
});



const floorTex = texLoader.load('./skybox/ny.jpg');
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;

floorTex.repeat.set(40, 40);
floorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

const floorMat = new THREE.MeshStandardMaterial({
  map: floorTex,
  roughness: 1.0,
  metalness: 0.0,
});

const floorSize = 2000; 
const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorSize, floorSize), floorMat);
floor.rotation.x = -Math.PI / 2;

floor.position.y = -35;

floor.receiveShadow = true;
scene.add(floor);



//Audio 
const listener = new THREE.AudioListener();
camera.add(listener);

const audioLoader = new THREE.AudioLoader();

const sfxJump = new THREE.Audio(listener);
const sfxLight = new THREE.Audio(listener);
const sfxPickup = new THREE.Audio(listener);
const sfxTeleport = new THREE.Audio(listener);

audioLoader.load('./sounds/impactMetal_000.ogg', (buf) => { sfxJump.setBuffer(buf);   sfxJump.setVolume(0.35); });
audioLoader.load('./sounds/switch_002.ogg',      (buf) => { sfxLight.setBuffer(buf);  sfxLight.setVolume(0.35); });
audioLoader.load('./sounds/forceField_000.ogg',  (buf) => { sfxPickup.setBuffer(buf); sfxPickup.setVolume(0.45); });
audioLoader.load('./sounds/sfx_shieldUp.ogg',  (buf) => { sfxTeleport.setBuffer(buf); sfxTeleport.setVolume(0.45); });


function playSFX(sfx) {
  if (!sfx.buffer) return;   
  if (sfx.isPlaying) sfx.stop();
  sfx.play();
}

//Pointer Lock FPS controls
//const controls = new PointerLockControls(camera, document.body);
//camera.position.set(0, 1.6, -35); 
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.object);

function spawnPlayer() {
  controls.object.position.set(0, 1.6, -35);
  controls.object.rotation.y = Math.PI;
}
spawnPlayer();

let didInitialSpawn = false;

controls.addEventListener('lock', () => {
  if (!didInitialSpawn) {
    //spawnPlayer();
    didInitialSpawn = true;
  }
  blocker.style.display = 'none';
});

controls.addEventListener('unlock', () => {
  blocker.style.display = 'grid';
});


const blocker = document.getElementById('blocker');
document.getElementById('startBtn').addEventListener('click', () => {
  controls.lock();
});


//Skybox
const cubeTex = new THREE.CubeTextureLoader().load([
  './skybox/px.jpg',
  './skybox/nx.jpg',
  './skybox/py.jpg',
  './skybox/ny.jpg',
  './skybox/pz.jpg',
  './skybox/nz.jpg',
]);
scene.background = cubeTex;


const gltfLoader = new GLTFLoader();

function loadGLB(path, { pos=[0,0,0], rotY=0, scale=1, collide=true } = {}) {
  gltfLoader.load(path, (gltf) => {
      const root = gltf.scene;
      root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      root.position.set(pos[0], pos[1], pos[2]);
      root.rotation.y = rotY;
      root.scale.setScalar(scale);

      scene.add(root);
      if (collide) {
        objects.push(root);
        rebuildStaticColliders();
      }
      
    },
    undefined,
    (err) => console.warn(`Failed to load ${path}`, err)
  );
}
function loadGLBFixed(path, { parent=scene, pos=[0,0,0], rotY=0, scale=1, ground=true, collide=true } = {}) {
  gltfLoader.load(path, (gltf) => {
    const root = gltf.scene;

    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });

    root.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const wrapper = new THREE.Group();
    wrapper.add(root);

    root.position.sub(center);

    if (ground) {
      root.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(root);
      root.position.y -= box2.min.y;
    }

    wrapper.position.set(pos[0], pos[1], pos[2]);
    wrapper.rotation.y = rotY;
    wrapper.scale.setScalar(scale);

    parent.add(wrapper);

    if (collide) {
      objects.push(wrapper);
      rebuildStaticColliders();
    }
  });
}

loadGLB('./models/Computer.glb',  { pos:[0, 0.15, -0.2],rotY:Math.PI,    scale: 0.07, collide: false});
loadGLB('./models/LightDesk.glb', { pos:[25, 0, 0],rotY:-Math.PI/1.4, scale: 25, collide : false});
const tweak = THREE.MathUtils.degToRad(-2);
loadGLBFixed('./models/chair.glb',     { pos:[0, -35, -59],  rotY:(Math.PI/55.5) + tweak,  scale: 1.5, collide : false});
loadGLB('./models/Tardis.glb', { pos:[55, -35, 0],rotY:-Math.PI/2, scale: 0.01, collide : false});


const bigSpinner = new THREE.Mesh(
  new THREE.SphereGeometry(2.6, 64, 64),
  new THREE.MeshStandardMaterial({
    map: globeTex,
    roughness: 0.9,
    metalness: 0.0,
  })
);

bigSpinner.position.set(17.8, 3.3, -7.9); 
bigSpinner.castShadow = true;
bigSpinner.receiveShadow = true;
scene.add(bigSpinner);
objects.push(bigSpinner);
rebuildStaticColliders();

//Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.22);
scene.add(ambient);
//19.75, 9.75, -4.25, location of bulb

const dir = new THREE.DirectionalLight(0xffffff, 0.22);
dir.position.set(0, 28, 0);
dir.target.position.set(0, -0.5, 0);
scene.add(dir.target);

dir.castShadow = true;
dir.shadow.mapSize.set(4096, 4096);

dir.shadow.camera.left   = -40;
dir.shadow.camera.right  =  40;
dir.shadow.camera.top    =  40;
dir.shadow.camera.bottom = -40;

dir.shadow.camera.near = 1;
dir.shadow.camera.far  = 30;

dir.shadow.bias = -0.0002;
dir.shadow.normalBias = 0.02;

scene.add(dir);
//const dirHelper = new THREE.CameraHelper(dir.shadow.camera);
//scene.add(dirHelper);

//Desk lamp / point light
const lamp = new THREE.PointLight(0xffeecc, 500, 300, 2.0);
lamp.visible = true;
lamp.position.set(19.8, 9.75, -4.05);
lamp.castShadow = true;
scene.add(lamp);

const bulb = new THREE.Mesh(
  new THREE.SphereGeometry(1.8, 16, 16),
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffeecc,
    emissiveIntensity: 8,
  })
);
scene.add(bulb);

bulb.position.set(19.8, 9.75, -4.05);
lamp.position.copy(bulb.position).add(new THREE.Vector3(0, 0, -2.0)); 




/*
const lampMarker = new THREE.Mesh(
  new THREE.SphereGeometry(1, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffeecc, emissiveIntensity: 2.0 })
);
scene.add(lampMarker);
lampMarker.position.copy(lamp.position);
*/
//19.75, 9.75, -4.25
/*
window.addEventListener('keydown', (e) => {
  const step = 0.25;
  if (e.key === 'ArrowUp')    lamp.position.z -= step;
  if (e.key === 'ArrowDown')  lamp.position.z += step;
  if (e.key === 'ArrowLeft')  lamp.position.x -= step;
  if (e.key === 'ArrowRight') lamp.position.x += step;
  if (e.key === '[')          lamp.position.y -= step;
  if (e.key === ']')          lamp.position.y += step;

  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','[',']'].includes(e.key)) {
    console.log('lamp.position', lamp.position.x, lamp.position.y, lamp.position.z);
  }
});
lampMarker.position.copy(lamp.position);
*/

//Flashlight spot light attached to camera
const flashlight = new THREE.SpotLight(0xffffff, 2.2, 80, Math.PI / 7, 0.3, 0.5);
flashlight.visible = false;
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(4096, 4096);
flashlight.shadow.camera.near = 0.05;
flashlight.shadow.camera.far  = 150;    
flashlight.shadow.bias = -0.0001;
flashlight.shadow.normalBias = 0.05;
scene.add(flashlight);
scene.add(flashlight.target);


//Toggle flashlight and desk lamp
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;

  const k = e.key.toLowerCase();

  if (k === 'f') {
    flashlight.visible = !flashlight.visible;
    playSFX(sfxLight);
    console.log('Flashlight (SpotLight):', flashlight.visible ? 'ON' : 'OFF');
  }

  if (k === 'l') {
    lamp.visible = !lamp.visible;
    //bulb.visible = lamp.visible;   
    bulb.material.emissiveIntensity = lamp.visible ? 8 : 0;
    playSFX(sfxLight);
    console.log('Lamp (PointLight):', lamp.visible ? 'ON' : 'OFF');
  }
});

/*
const testFloor = new THREE.Mesh(
  new THREE.BoxGeometry(200, 1, 200),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
testFloor.position.y = -1.5;
testFloor.receiveShadow = true;
scene.add(testFloor);
*/

const floorShadowLight = new THREE.DirectionalLight(0xffffff, 0.3);
floorShadowLight.position.set(0, 50, 0);
floorShadowLight.target.position.set(0, -35, 0);
//floorShadowLight.position.set(0, 0, 0);
floorShadowLight.castShadow = true;
floorShadowLight.shadow.mapSize.set(4096, 4096);
floorShadowLight.shadow.camera.left = -50;
floorShadowLight.shadow.camera.right = 50;
floorShadowLight.shadow.camera.top = 50;
floorShadowLight.shadow.camera.bottom = -50;
floorShadowLight.shadow.camera.near = 1;

floorShadowLight.shadow.camera.far = 150;
floorShadowLight.shadow.bias = -0.0002;
floorShadowLight.shadow.normalBias = 0.02;

scene.add(floorShadowLight.target);
scene.add(floorShadowLight);

//const floorShadowHelper = new THREE.CameraHelper(floorShadowLight.shadow.camera);
//scene.add(floorShadowHelper);

ambient.visible = true;
dir.visible = true;
if (typeof floorShadowLight !== 'undefined') floorShadowLight.visible = true;
flashlight.visible = false;



//Tardis teleport
function teleportToSpawn() {
  controls.object.position.set(0, 1.6, -35);

  velocityY = 0;
  canJump = false;

  if (controls.getObject) {
    const obj = controls.getObject();
    obj.rotation.set(0, Math.PI, 0);  
  } else if (controls.object) {
    controls.object.rotation.set(0, Math.PI, 0);
  }

  // pitch is on the camera itself
  camera.rotation.set(0, 0, 0);
}

/*
const dirHelper = new THREE.DirectionalLightHelper(dir, 5); // size of the arrow
scene.add(dirHelper);

const shadowHelper = new THREE.CameraHelper(dir.shadow.camera);
scene.add(shadowHelper);
*/

const MINI_OFFSET = new THREE.Vector3(25, 0, 25); 
/*
function addWorldOffset(x, y, z) {
  return [x + MINI_OFFSET.x, y + MINI_OFFSET.y, z + MINI_OFFSET.z];
}
  */

function addMiniBox(opts) {
  return addBox({
    ...opts,
    x: opts.x + MINI_OFFSET.x,
    y: opts.y + MINI_OFFSET.y,
    z: opts.z + MINI_OFFSET.z,
  });
}

function addMug({
  pos = [0, 0, 0],
  scale = 1,
  yaw = 0,                 
  handleAround = 0,
  handleYaw = Math.PI/45.5, 
  handleRadius = 0.23
} = {}) {
  const group = new THREE.Group();

  const mugMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.45, 24),
    mugMat
  );
  mug.castShadow = mug.receiveShadow = true;
  group.add(mug);

const coffee = new THREE.Mesh(
  new THREE.CylinderGeometry(0.22, 0.22, 0.051, 32),
  new THREE.MeshStandardMaterial({
    color: 0x120a06,
    roughness: 1.0,  
    metalness: 0.0
  })
);
coffee.castShadow = false;
coffee.receiveShadow = false;
coffee.position.set(0, 0.2, 0);  
group.add(coffee);


  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.04, 14, 24),
    mugMat
  );

  //handle.position.set(0.23, 0.0, 0.0);
  const handleAngle = handleAround;  

  const r = handleRadius; 
  handle.position.set(
    Math.cos(handleAngle) * r,
    0.0,
    Math.sin(handleAngle) * r
  );

  handle.rotation.set(0, 0, 0);
  handle.rotation.z = -Math.PI / 2;

  handle.rotation.y = -handleAngle + handleYaw;
  //handle.rotation.y = -handleAngle;

  handle.castShadow = handle.receiveShadow = true;
  group.add(handle);

  group.position.set(pos[0], pos[1], pos[2]);
  group.scale.setScalar(scale);
  group.rotation.y = yaw;

  scene.add(group);
  return group;
}

function addBox({ w,h,d,x,y,z, color=0x888888, map=null, textured=false, cast=true, receive=true }) {
  const geo = new THREE.BoxGeometry(w,h,d);

  const mat = map
    ? new THREE.MeshStandardMaterial({ map })
    : (textured
        ? new THREE.MeshStandardMaterial({ map: deskTex })
        : new THREE.MeshStandardMaterial({ color }));

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x,y,z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  scene.add(mesh);
  objects.push(mesh);
  return mesh;
}

const bigDesk = addBox({ w:80, h:1, d:80, x:0, y:-0.5, z:0, cast:true, receive:true });
bigDesk.castShadow = true; 
bigDesk.receiveShadow = true; 
bigDesk.material.map = deskTex;
bigDesk.material.needsUpdate = true;


//Big desk legs 
const deskW = 80;
const deskD = 80;
const deskTopY = 0.0;     
const legH = 35;           
const legW = 2.5; 
const inset = 4;  

const legY = -18;
const xL = -deskW / 2 + inset;
const xR =  deskW / 2 - inset;
const zB = -deskD / 2 + inset;
const zF =  deskD / 2 - inset;

addBox({ w: legW, h: legH, d: legW, x: xL, y: legY, z: zB, color: 0x222222, cast:true, receive:true });
addBox({ w: legW, h: legH, d: legW, x: xR, y: legY, z: zB, color: 0x222222, cast:true, receive:true });
addBox({ w: legW, h: legH, d: legW, x: xL, y: legY, z: zF, color: 0x222222, cast:true, receive:true });
addBox({ w: legW, h: legH, d: legW, x: xR, y: legY, z: zF, color: 0x222222, cast:true, receive:true });



// Cubicle walls
const wallH = 19;
const wallT = 0.4;
const size = 18;

const doorW = 3.0;
const sideW = (size - doorW) / 2;
const wallY = wallH / 2 - 0.5;
const frontZ = size / 2;

function addWallWithDoorX({
  z, y, h, t, size,
  doorW = 3,
  doorCenterX = 0,
  color = 0x7b7f86
}) {
  const sideW = (size - doorW) / 2;

  //Left segment
  addMiniBox({
    w: sideW, h, d: t,
    x: doorCenterX - (doorW/2 + sideW/2),
    y, z,
    map: metalTex
  });

  //Right segment
  addMiniBox({
    w: sideW, h, d: t,
    x: doorCenterX + (doorW/2 + sideW/2),
    y, z,
    map: metalTex
  });
}

function addWallWithDoorZ({ 
  x, y, h, t, size,
  doorW = 3,
  doorCenterZ = 0,
  color = 0x7b7f86
}) {
  const sideW = (size - doorW) / 2;

  //Back segment
  addMiniBox({
    w: t, h, d: sideW,
    x, y,
    z: doorCenterZ - (doorW/2 + sideW/2),
    map: metalTex
  });

  //Front segment
  addMiniBox({
    w: t, h, d: sideW,
    x, y,
    z: doorCenterZ + (doorW/2 + sideW/2),
    map: metalTex
  });
}


//Back wall
addWallWithDoorX({
  z: -size/2, y: wallY, h: wallH, t: wallT, size,
  doorW: 3.3, doorCenterX: 0
});

//Front wall
addWallWithDoorX({
  z:  size/2, y: wallY, h: wallH, t: wallT, size,
  doorW: 3.3, doorCenterX: 0
});

//Left wall
addWallWithDoorZ({
  x: -size/2, y: wallY, h: wallH, t: wallT, size,
  doorW: 3.3, doorCenterZ: 0
});

//Right wall
addWallWithDoorZ({
  x:  size/2, y: wallY, h: wallH, t: wallT, size,
  doorW: 0, doorCenterZ: 0
});

//Inner walls 
for (let i = -6; i <= 6; i += 3) {
  addMiniBox({ w: 6, h: 4.2, d: 0.25, x: i, y: 1.2, z: -2, map: cubiclesTex });
  addMiniBox({ w: 0.25, h: 4.2, d: 6, x: -2, y: 1.2, z: i, map: cubiclesTex });
}

//Roof
const roofT = 0.5;                          
const roofY = (wallH - 0.5) + roofT / 2;    
addMiniBox({
  w: size,
  h: roofT,
  d: size,
  x: 0,
  y: roofY,
  z: 0,
  map: metalTex     
});
// Desk 1 
// Desk top
const miniDeskTop = addMiniBox({ w: 6, h: 0.35, d: 3, x: 1.2, y: 0.9, z: 0, textured: true, color: 0xffffff });
miniDeskTop.receiveShadow = true;
// Desk legs 1
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x:  3.9, y: 0.1, z:  1.3, color: 0x222222 });
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x: -1.5, y: 0.1, z:  1.3, color: 0x222222 });
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x:  3.9, y: 0.1, z: -1.3, color: 0x222222 });
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x: -1.5, y: 0.1, z: -1.3, color: 0x222222 });
// Monitor 1
addMiniBox({ w: 1.6, h: 1.0, d: 0.1, x: 0, y: 1.6, z: -0.7, color: 0x111111 });
addMiniBox({ w: 0.25, h: 0.6, d: 0.25, x: 0, y: 1.2, z: -0.7, color: 0x333333 });
//Keyboard 1
addMiniBox({ w: 1.6, h: 0.1, d: 0.4, x: 0, y: 1.1, z: 0.8, color: 0x111111 });
//Mouse 1
addMiniBox({ w: 0.2, h: 0.1, d: 0.2, x: 1.1, y: 1.1, z: 0.8, color: 0x111111 });
// Chair 1
loadGLB('./models/minichair.glb', {
  pos: [0.2 + MINI_OFFSET.x, 0.0 + MINI_OFFSET.y, 2.5 + MINI_OFFSET.z],
  rotY: Math.PI,
  scale: 2.0
});

// Desk 2 
// Desk top 
const miniDeskTop2 = addMiniBox({ w: 6, h: 0.35, d: 3, x: 1.2, y: 0.9, z: -3.8, textured: true, color: 0xffffff });
miniDeskTop2.receiveShadow = true;
// Desk legs 2
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x:  3.9, y: 0.1, z:  -2.5, color: 0x222222 });
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x: -1.5, y: 0.1, z:  -2.5, color: 0x222222 });
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x:  3.9, y: 0.1, z: -5.1, color: 0x222222 });
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x: -1.5, y: 0.1, z: -5.1, color: 0x222222 });
// Monitor 2
addMiniBox({ w: 1.6, h: 1.0, d: 0.1, x: 0, y: 1.6, z: -3.0, color: 0x111111 });
addMiniBox({ w: 0.25, h: 0.6, d: 0.25, x: 0, y: 1.2, z: -3.0, color: 0x333333 });
//Keyboard 2
addMiniBox({ w: 1.6, h: 0.1, d: 0.4, x: 0, y: 1.1, z: -4.0, color: 0x111111 });
//Mouse 2
addMiniBox({ w: 0.2, h: 0.1, d: 0.2, x: -1.1, y: 1.1, z: -4.1, color: 0x111111 });
//Chair 2
loadGLB('./models/minichair.glb', {
  pos: [-0.1 + MINI_OFFSET.x, 0.0 + MINI_OFFSET.y, -5.2 + MINI_OFFSET.z],
  rotY: 0,
  scale: 2.0
});
// Desk 3 
// Desk top
const miniDeskTop3 = addMiniBox({ w: 6, h: 0.35, d: 3, x: -5.4, y: 0.9, z: -3.8, textured: true, color: 0xffffff });
miniDeskTop3.receiveShadow = true;
// Desk legs 3 
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x:  -2.7, y: 0.1, z:  -2.5, color: 0x222222 });
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x: -8.1, y: 0.1, z:  -2.5, color: 0x222222 });
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x:  -2.7, y: 0.1, z: -5.1, color: 0x222222 });
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x: -8.1, y: 0.1, z: -5.1, color: 0x222222 });
// Monitor 3 
addMiniBox({ w: 1.6, h: 1.0, d: 0.1, x: -4, y: 1.6, z: -3.0, color: 0x111111 });
addMiniBox({ w: 0.25, h: 0.6, d: 0.25, x: -4, y: 1.2, z: -3.0, color: 0x333333 });
//Keyboard 3
addMiniBox({ w: 1.6, h: 0.1, d: 0.4, x: -4, y: 1.1, z: -4.0, color: 0x111111 });
//Mouse 3
addMiniBox({ w: 0.2, h: 0.1, d: 0.2, x: -5.1, y: 1.1, z: -4.1, color: 0x111111 });
//Chair 3
loadGLB('./models/minichair.glb', {
  pos: [-4.2 + MINI_OFFSET.x, 0.0 + MINI_OFFSET.y, -6.2 + MINI_OFFSET.z],
  rotY: Math.PI/4,
  scale: 2.0
});
// Desk 4
// Desk top 
const miniDeskTop4 = addMiniBox({ w: 6, h: 0.35, d: 3, x: -5.3, y: 0.9, z: 0, textured: true, color: 0xffffff });
miniDeskTop4.receiveShadow = true;
// Desk legs 4
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x:  -2.6, y: 0.1, z:  1.3, color: 0x222222 });
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x: -8, y: 0.1, z:  1.3, color: 0x222222 });
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x:  -2.6, y: 0.1, z: -1.3, color: 0x222222 });
addMiniBox({ w: 0.25, h: 1.6, d: 0.25, x: -8, y: 0.1, z: -1.3, color: 0x222222 });
// Monitor 4 
addMiniBox({ w: 1.6, h: 1.0, d: 0.1, x: -6.5, y: 1.6, z: -0.7, color: 0x111111 });
addMiniBox({ w: 0.25, h: 0.6, d: 0.25, x: -6.5, y: 1.2, z: -0.7, color: 0x333333 });
//Keyboard 4
addMiniBox({ w: 1.6, h: 0.1, d: 0.4, x: -6.5, y: 1.1, z: 0.8, color: 0x111111 });
//Mouse 4
addMiniBox({ w: 0.2, h: 0.1, d: 0.2, x: -5.4, y: 1.1, z: 0.8, color: 0x111111 });
//Chair 4
loadGLB('./models/minichair.glb', {
  pos: [-6.2 + MINI_OFFSET.x, 0.0 + MINI_OFFSET.y, 2.4 + MINI_OFFSET.z],
  rotY: 2* Math.PI/3,
  scale: 2.0
});

miniDeskTop.castShadow = true;
miniDeskTop.receiveShadow = true;

//big mug ontop of big desk

const bigMugGroup = addMug({
  pos: [22, 1.25, -15.5],
  scale: 6.0,
  yaw: Math.PI * 0.2,
  handleAround: 6.0,
  handleYaw: Math.PI / 85.5,
});
objects.push(bigMugGroup);
rebuildStaticColliders();


//mini mugs inside mini office
const miniMugGroup = addMug({
  pos: [1.7 + MINI_OFFSET.x, 1.33 + MINI_OFFSET.y, 0.8 + MINI_OFFSET.z],
  scale: 1,
  yaw: 0,
  handleAround: 7.0,
  handleYaw: Math.PI/55.5
});
objects.push(miniMugGroup);
rebuildStaticColliders();

const miniMugGroup2 = addMug({
  pos: [1.7 + MINI_OFFSET.x, 1.33 + MINI_OFFSET.y, -5.1 + MINI_OFFSET.z],
  scale: 1,
  yaw: 9,
  handleAround: 7.0,
  handleYaw: Math.PI/55.5
});
objects.push(miniMugGroup2);
rebuildStaticColliders();

const miniMugGroup3 = addMug({
  pos: [-6.7 + MINI_OFFSET.x, 1.33 + MINI_OFFSET.y, -4.1 + MINI_OFFSET.z],
  scale: 1,
  yaw: 9,
  handleAround: 7.0,
  handleYaw: Math.PI/55.5
});
objects.push(miniMugGroup3);
rebuildStaticColliders();

const spinner = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 32, 32),
  new THREE.MeshStandardMaterial({ map: globeTex })
);
spinner.position.set(-1.25 + MINI_OFFSET.x, 1.75 + MINI_OFFSET.y, 0.6 + MINI_OFFSET.z);
spinner.castShadow = true;
spinner.receiveShadow = true;
scene.add(spinner);
objects.push(spinner);
rebuildStaticColliders();


const boxSpinner = new THREE.Mesh(
  new THREE.BoxGeometry(3.6, 3.6, 3.6),
  new THREE.MeshStandardMaterial({ color: 0xBA181B})
);
boxSpinner.position.set(-32, 5.6, -3);
boxSpinner.castShadow = true;
boxSpinner.receiveShadow = true;
scene.add(boxSpinner);
objects.push(boxSpinner);
rebuildStaticColliders();


bigSpinner.rotation.z = THREE.MathUtils.degToRad(-23.4);
spinner.rotation.z = THREE.MathUtils.degToRad(-23.4);

function makeCheckerTexture({
  squares = 10,    
  size = 512,           
  colorA = '#d01818',
  colorB = '#f2f2f2'
} = {}) {
  const canvas = document.createElement('canvas');

  canvas.height = size;
  canvas.width  = size * 2;      

  const ctx = canvas.getContext('2d');

  const sq = canvas.height / squares; 
  const squaresX = squares * 2;      

  for (let y = 0; y < squares; y++) {
    for (let x = 0; x < squaresX; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? colorA : colorB;
      ctx.fillRect(x * sq, y * sq, sq, sq);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const amigaTex = makeCheckerTexture({ squares: 10 });

const amigaBall = new THREE.Mesh(
  new THREE.SphereGeometry(2.2, 64, 64),
  new THREE.MeshStandardMaterial({
    map: amigaTex,
    roughness: 0.15,
    metalness: 0.1,
  })
);

amigaBall.position.set(28, 2.2, -22); 
const amigaBaseY = amigaBall.position.y;
amigaBall.castShadow = true;
amigaBall.receiveShadow = true;
scene.add(amigaBall);

objects.push(amigaBall);
rebuildStaticColliders();


//Replace this with a lamp model
const ceilingPanel = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 8),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);

ceilingPanel.position.set(0, 52, -5);
ceilingPanel.rotation.x = Math.PI / 2;  
scene.add(ceilingPanel);


//Collectibles
const gemTotal = 5;
document.getElementById('gemTotal').textContent = gemTotal;

let gemCount = 0;
const gems = [];
const gemGeo = new THREE.SphereGeometry(0.18, 18, 18);
const gemMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x332200 });

const gemSpots = [
  new THREE.Vector3( 5, 0.3,  1),
  new THREE.Vector3(-4.5, 0.3,  2),

  new THREE.Vector3( 3, 0.3, -6),
  new THREE.Vector3(-3, 0.3, -7), 
  new THREE.Vector3( 0, 0.3,  7),
];

for (const p of gemSpots) {
  const g = new THREE.Mesh(gemGeo, gemMat);
  g.position.copy(p).add(MINI_OFFSET);
  //g.position.copy(p);
  g.castShadow = true;
  scene.add(g);
  gems.push(g);
}

function updateGems(dt) {
  for (const g of gems) {
    if (!g.visible) continue;
    g.rotation.y += dt * 2.0;
    g.position.y = 0.45 + Math.sin(performance.now() * 0.004) * 0.1;
  }
  if (gemCount >= gemTotal) {
  document.getElementById('gemMessage').textContent = 'All gems collected! Super jump unlocked!';
}

  const playerPos = getPlayer().position;   
  for (const g of gems) {
    if (!g.visible) continue;
    const dx = g.position.x - playerPos.x;
    const dz = g.position.z - playerPos.z;
    if (Math.sqrt(dx * dx + dz * dz) < 0.5) {
      g.visible = false;
      gemCount++;
      playSFX(sfxPickup);
      document.getElementById('gemCount').textContent = gemCount;
    }
  }
}

//Collision 
  function rebuildStaticColliders() {
  colliders.length = 0;
  for (const m of objects) {
    m.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(m));
  }
}
rebuildStaticColliders();

const debugMat = new THREE.MeshBasicMaterial({ 
  color: 0x00ff00, 
  transparent: true, 
  opacity: 0.3, 
  wireframe: true 
});
debugMat.visible = false;

function addColliderBox(w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    debugMat
  );
  
  mesh.position.set(x, y, z);
  scene.add(mesh);
  objects.push(mesh);
  rebuildStaticColliders();
  return mesh;
}

addColliderBox(11, 20, 27, -22.5, 10, 5);       //Desktop
addColliderBox(3, 1, 4, -22.8, 1, -17.2);       //Mouse
addColliderBox(29, 1, 11, 0, 1, -14.2);         //Keyboard
addColliderBox(14.6, 0.2, 8, 0, 1, 1.2);        //Monitor base
addColliderBox(5.6, 9, 1.5, 0, 4, 2.6);         //Monitor stand
addColliderBox(27, 17, 2.5, 0, 12.5, 0.2);      //Monitor screen
addColliderBox(5.5, 1, 5, 25, 1, -0.1);         //Lamp base
addColliderBox(1.1, 8, 0.5, 26.4, 5.8, 0.9);    //Lamp handle
addColliderBox(4, 1, 2, 25, 11, -0.1);          //Lamp base2 
addColliderBox(7, 6, 5.5, 21, 12, -3.2);        //Lamp 
addColliderBox(29, 1, 31, 0.5, -7, -58);        //Chair bottom
addColliderBox(29, 45, 11, 1, 10, -73);         //Chair back
addColliderBox(2.6, 3, 19, 16.5, 2, -62);       //Chair handle left
addColliderBox(2.6, 3, 19, -15.5, 2, -60.5);    //Chair handle right
addColliderBox(2.9, 10, 2, 16.5, -5, -52.5);    //Chair handle left vertical
addColliderBox(2.9, 10, 2, -15, -5, -51);       //Chair handle right vertical

function playerAABB(pos) {
  return new THREE.Box3(
    new THREE.Vector3(pos.x - PLAYER_RADIUS, pos.y - playerHeight + 0.05, pos.z - PLAYER_RADIUS),
    new THREE.Vector3(pos.x + PLAYER_RADIUS, pos.y, pos.z + PLAYER_RADIUS)
  );
}

function collidesAny(pos) {
  const box = playerAABB(pos);
  for (const c of colliders) {
    if (box.intersectsBox(c)) return true;
  }
  return false;
}

function findGroundY(pos) {
  let best = floor.position.y + playerHeight;
  for (const c of colliders) {
    if (pos.x < c.min.x - PLAYER_RADIUS || pos.x > c.max.x + PLAYER_RADIUS) continue;
    if (pos.z < c.min.z - PLAYER_RADIUS || pos.z > c.max.z + PLAYER_RADIUS) continue;

    const standY = c.max.y + playerHeight;

    if (standY <= pos.y + 1.0 && standY > best) {
      best = standY;
    }
  }
  return best;
}



//FPS movement
const keys = {};
window.addEventListener('keydown', (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));

let velocityY = 0;
let canJump = false;



/*
  const baseSpeed = 10.0;
  const sprintSpeed = 15.0;
  const speed = keys['shift'] ? sprintSpeed : baseSpeed;
  const jumpSpeed = 12.5;
  const gravity = 35.0;
  */

function movePlayer(dt) {
  const baseSpeed = 14.0;
  const sprintSpeed = 22.0;
  const speed = keys['shift'] ? sprintSpeed : baseSpeed;
  const jumpSpeed = 16.0;
  const gravity = 42.0;

  const obj = getPlayer();


const wantsCrouch = keys['c'];
const targetH = wantsCrouch ? CROUCH_HEIGHT : STAND_HEIGHT;
playerHeight += (targetH - playerHeight) * Math.min(1, CROUCH_LERP * dt);

const crouchFactor = (playerHeight < STAND_HEIGHT - 0.05) ? 0.5 : 1.0;
const finalSpeed = speed * crouchFactor;


  flashlight.position.copy(obj.position);
  camera.getWorldDirection(tmpDir);
  flashlight.target.position.copy(obj.position).add(tmpDir.multiplyScalar(10));
  flashlight.target.updateMatrixWorld(true);
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  const move = new THREE.Vector3();
  if (keys['w']) move.add(forward);
  if (keys['s']) move.sub(forward);
  if (keys['d']) move.add(right);
  if (keys['a']) move.sub(right);
  if (move.lengthSq() > 0) move.normalize();

  const step = finalSpeed * dt;
  const tryX = obj.position.clone();
  tryX.x += move.x * step;
  if (!collidesAny(tryX)) {
    obj.position.x = tryX.x;
  }

  const tryZ = obj.position.clone();
  tryZ.z += move.z * step;
  if (!collidesAny(tryZ)) {
    obj.position.z = tryZ.z;
  }

  //Gravity
  velocityY -= gravity * dt;
  obj.position.y += velocityY * dt;
  const groundY = findGroundY(obj.position);
  if (obj.position.y < groundY) {
    obj.position.y = groundY;
    velocityY = 0;
    canJump = true;
  }

if (keys[' '] && canJump) {
  const superJump = (gemCount >= gemTotal);
  velocityY = superJump ? jumpSpeed * 2.1 : jumpSpeed;
  canJump = false;
  playSFX(sfxJump);
}
}


const blobMat = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,      
});

const blobShadow = new THREE.Mesh(
  new THREE.CircleGeometry(2, 32), 
  blobMat
);

blobShadow.rotation.x = -Math.PI / 2;
blobShadow.position.set(amigaBall.position.x, 0.02, amigaBall.position.z);
scene.add(blobShadow);



function getPlayer() {
  return (controls.getObject ? controls.getObject() : controls.object) || camera;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let last = performance.now();
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;

  if (controls.isLocked) {
    movePlayer(dt);
  }
tardisCooldown = Math.max(0, tardisCooldown - dt);

if (controls.isLocked && tardisCooldown === 0) {
  const p = controls.object.position;

  const dx = p.x - tardisPos.x;
  const dz = p.z - tardisPos.z;

if ((dx * dx + dz * dz) < (tardisRadius * tardisRadius) && p.y < tardisPos.y + 5) {
    tardisCooldown = 1.0; 
    playSFX(sfxTeleport);
    teleportToSpawn();
  }
}

const t = performance.now() * 0.001;

const bounceAmp = 0.8;    
const bounceSpeed = 2.2;  

amigaBall.position.y = amigaBaseY + Math.abs(Math.sin(t * bounceSpeed)) * bounceAmp;

const spinSpeedY = 1.4;
const spinSpeedX = 0.6;

amigaBall.rotation.y += dt * spinSpeedY;
amigaBall.rotation.x += dt * spinSpeedX;


const h = amigaBall.position.y - 0.02;


const s = THREE.MathUtils.clamp(1.0 + h * 0.15, 1.0, 2.8);

blobShadow.scale.set(s, s, 1);

blobMat.opacity = THREE.MathUtils.clamp(0.45 - h * 0.02, 0.08, 0.45);


blobShadow.position.x = amigaBall.position.x;
blobShadow.position.z = amigaBall.position.z;


  boxSpinner.rotation.x += dt * 0.6;
  boxSpinner.rotation.y += dt * 0.6;
  //spinner.rotation.x += dt * 1.5;
  spinner.rotation.y += dt * 1.0;
  //bigSpinner.rotation.x += dt * 1.2;
  bigSpinner.rotation.y += dt * 0.8;
  //bigSpinner.rotation.z = THREE.MathUtils.degToRad(23.4);
  //spinner.rotation.z = THREE.MathUtils.degToRad(23.4);

  updateGems(dt);

  renderer.render(scene, camera);
}

animate();