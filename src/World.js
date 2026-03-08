// World.js
// Alexander Bateman
// arbatema@ucsc.edu
// Notes to Grader: 
// Resources used:
// Professor videos, links on the assignment page.
// Consulted Claude for various debugging while building the shaders, restructuring the fragment shader so point light and spotlight
// could be toggled independently, adding smoothstep for spotlight cutoff to remove hard edge line on sphere, and getting the spotlight 
// to follow the orbiting light position in tick().


let canvas
let gl;
var a_Position
var a_UV;
var a_Normal;
var u_NormalViz;
let u_FragColor;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_whichTexture;
let u_TexColorWeight;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
var u_NormalMatrix;


//Lighting
let u_LightPos;
let u_LightOn;
let u_EyePos;
var u_LightColor;
var g_lightAnimate = true;

//Spotlight
var u_SpotLightPos;
var u_SpotLightDir;
var u_SpotLightOn;



let camera;

let g_startTime = performance.now() / 1000.0;
let g_textureReady = false;
let g_textureLoaded = 0;
let g_texture0 = null;
let g_texture1 = null;
let g_texture2 = null;
let g_seconds = 0;
let g_fpsFrames = 0;
let g_fpsLast = performance.now();
let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_keys = {};
let g_eyeY = 0.5;      
let g_jumpVelocity = 0;
let g_onGround = true;
let g_gems = [];
let g_gemsCollected = 0;


let g_lightPos = [0.0, 3.0, 0.0]; 
const G_TOTAL_GEMS = 5;
let g_gameWon = false;

var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform vec3 u_LightPos;
  uniform mat4 u_NormalMatrix;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_WorldPos;

  void main(){
    vec4 worldPos4 = u_ModelMatrix * a_Position;
    v_WorldPos = worldPos4.xyz;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos4;
    v_UV = a_UV;
    v_Normal = normalize((u_NormalMatrix * vec4(a_Normal, 0.0)).xyz);

  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec3 v_Normal;
  varying vec3 v_WorldPos;
  uniform vec3 u_LightPos;
  uniform vec3 u_EyePos;
  uniform vec3 u_LightColor;
  uniform int u_NormalViz;
  uniform int u_LightOn;
  uniform vec3 u_SpotLightPos;
  uniform vec3 u_SpotLightDir;
  uniform int u_SpotLightOn;
  uniform vec4 u_FragColor;
  uniform float u_TexColorWeight;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform int u_whichTexture;
  varying vec2 v_UV;

  void main(){
    vec4 texColor;
    if(u_whichTexture == 0){
      texColor = texture2D(u_Sampler0, v_UV);
    }else if(u_whichTexture == 1){
      texColor = texture2D(u_Sampler1, v_UV);
    }else{
      texColor = texture2D(u_Sampler2, v_UV);
    }

    if(u_NormalViz == 1){
      gl_FragColor = vec4(normalize(v_Normal) * 0.5 + 0.5, 1.0);
    }else{
      vec4 baseColor = mix(u_FragColor, texColor, u_TexColorWeight);

      if(u_LightOn == 0 && u_SpotLightOn == 0){
          gl_FragColor = vec4(baseColor.rgb * 0.5, baseColor.a);

      }else{
        vec3 N = normalize(v_Normal);
        float ambient = 0.3;
        vec3 litColor = baseColor.rgb * ambient;

        if(u_LightOn == 1){
          vec3 L = normalize(u_LightPos - v_WorldPos);
          float diff = max(dot(N, L), 0.0);
          vec3 V = normalize(u_EyePos - v_WorldPos);
          vec3 R = reflect(-L, N);
          float spec = pow(max(dot(V, R), 0.0), 32.0);
          litColor += baseColor.rgb * diff * u_LightColor + u_LightColor * spec * 0.5;
        }

        if(u_SpotLightOn == 1){
          vec3 SL = normalize(u_SpotLightPos - v_WorldPos);
          float spotCos = dot(-SL, normalize(u_SpotLightDir));
          float cutoff = cos(radians(20.0));
          float outer = cos(radians(25.0));
          float intensity = smoothstep(outer, cutoff, spotCos);
          float spotDiff = max(dot(N, SL), 0.0);
          litColor += baseColor.rgb * spotDiff * 0.5 * intensity;
        }

        gl_FragColor = vec4(litColor, baseColor.a);
      }
    }
  }`;


  //gl_FragColor = vec4(normalize(v_Normal) * 0.5 + 0.5, 1.0);


const map = [
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,2,2,2,0,0,0,0,4,3,3,0,0,0,0,0,0,1,1,1,0,0,0,0,2,2,0,0,0,4],
  [4,0,0,2,0,2,0,0,0,0,3,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,2,0,0,0,0,4],
  [4,0,0,2,0,2,0,0,0,0,3,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,0,0,3,3,3,3,0,4,4,4,0,4],
  [4,0,0,0,0,0,0,0,2,0,0,2,0,0,0,0,0,0,0,0,0,0,3,0,0,3,0,4,4,4,0,4],
  [4,0,0,0,0,0,0,0,2,0,0,2,0,0,0,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,2,2,0,2,0,0,0,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,1,1,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,4],
  [4,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,4],
  [4,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,2,0,0,0,2,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,2,0,0,0,3,0,0,0,2,0,1,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,3,3,0,0,0,0,0,2,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,3,0,0,0,0,0,0,2,2,2,2,2,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,4],
  [4,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,3,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,3,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,4],
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
];

function main(){
  setupWebGL();
  connectVariablesToGLSL();
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.53, 0.81, 0.92, 1.0);

  camera = new Camera();
  //Start player placement
  camera.eye = new Vector3([2, 0.5, 2]);
  //camera.at  = new Vector3([0, 2, 0]);
  camera.yaw = -45;
  camera._updateAtFromAngles();
  camera.updateView();

  setupInput();
  placeGems();
  initTextures();
  requestAnimationFrame(tick);
}

function setupWebGL(){
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if(!gl){
    console.log("Failed to get WebGL context");
    return;
  }
}

function connectVariablesToGLSL(){
  if(!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)){
    console.log("Failed to init shaders");
    return;
  }
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if(a_Position < 0){
    console.log("Failed to get a_Position");
    return;
  }

  a_UV = gl.getAttribLocation(gl.program, "a_UV");
  if(a_UV < 0){
    console.log("Failed to get a_UV");
    return;
  }

  a_Normal = gl.getAttribLocation(gl.program, "a_Normal");
  if(a_Normal < 0){
    console.log("Failed to get a_Normal");
    return;
  }

  u_NormalViz = gl.getUniformLocation(gl.program, "u_NormalViz");
  if(!u_NormalViz){
    console.log("Failed to get u_NormalViz");
    return;
  }

  u_LightPos = gl.getUniformLocation(gl.program, "u_LightPos");
    if(!u_LightPos){
      console.log("Failed to get u_LightPos");
      return;
  }

  u_EyePos = gl.getUniformLocation(gl.program, "u_EyePos");
    if(!u_EyePos){
      console.log("Failed to get u_EyePos");
      return;
  }
  u_LightOn = gl.getUniformLocation(gl.program, "u_LightOn");
    if(!u_LightOn){
      console.log("Failed to get u_LightOn");
      return;
  }
  u_LightColor = gl.getUniformLocation(gl.program, "u_LightColor");
    if(!u_LightColor){
      console.log("Failed to get u_LightColor");
      return;
  }
  u_SpotLightPos = gl.getUniformLocation(gl.program, "u_SpotLightPos");
      if(!u_SpotLightPos){
      console.log("Failed to get u_SpotLightPos");
      return;
  }
  u_SpotLightDir = gl.getUniformLocation(gl.program, "u_SpotLightDir");
      if(!u_SpotLightDir){
      console.log("Failed to get u_SpotLightDir");
      return;
  }
  u_SpotLightOn  = gl.getUniformLocation(gl.program, "u_SpotLightOn");
      if(!u_SpotLightOn){
      console.log("Failed to get u_SpotLightOn");
      return;
  }
  
  u_NormalMatrix = gl.getUniformLocation(gl.program, "u_NormalMatrix");



  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  if(!u_ModelMatrix){
    console.log("Failed to get u_ModelMatrix");
    return;
  }

  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  if(!u_ViewMatrix){
    console.log("Failed to get u_ViewMatrix");
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
  if(!u_ProjectionMatrix){
    console.log("Failed to get u_ProjectionMatrix");
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  if(!u_FragColor){
    console.log("Failed to get u_FragColor");
    return;
  }

  u_TexColorWeight = gl.getUniformLocation(gl.program, "u_TexColorWeight");
  if(!u_TexColorWeight){
    console.log("Failed to get u_TexColorWeight");
    return;
  }

  u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
  if(!u_Sampler0){
    console.log("Failed to get u_Sampler0");
    return;
  }

  u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");
  if(!u_Sampler1){
    console.log("Failed to get u_Sampler1");
    return;
  }
  u_Sampler2 = gl.getUniformLocation(gl.program, "u_Sampler2");
  if(!u_Sampler2){
    console.log("Failed to get u_Sampler2");
    return;
  }

  u_whichTexture = gl.getUniformLocation(gl.program, "u_whichTexture");
  if(!u_whichTexture){
    console.log("Failed to get u_whichTexture");
    return;
  }

  gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, new Matrix4().elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, new Matrix4().elements);
  gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  //gl.uniform3f(u_EyePos, camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);
  u_EyePos = gl.getUniformLocation(gl.program, "u_EyePos");
  gl.uniform1i(u_LightOn, 1);
  gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0); 

  gl.uniform1i(u_SpotLightOn, 1);
  gl.uniform3f(u_SpotLightPos, 0.0, 5.0, 0.0);  
  gl.uniform3f(u_SpotLightDir, 0.0, -1.0, 0.0);   

  gl.uniform4f(u_FragColor, 1, 1, 1, 1);
  gl.uniform1f(u_TexColorWeight, 0.0);
  gl.uniform1i(u_NormalViz, 0);
  gl.uniform1i(u_Sampler0, 0);
  gl.uniform1i(u_Sampler1, 1);
  gl.uniform1i(u_Sampler2, 2);
  gl.uniform1i(u_whichTexture, 0);
}

function setupInput(){
  //Keyboard
  document.addEventListener('keydown', function(ev){
    g_keys[ev.key.toLowerCase()] = true;
  });
  document.addEventListener('keyup', function(ev){
    g_keys[ev.key.toLowerCase()] = false;
  });

  //Mouse click to enable cursor movement
  canvas.addEventListener('click', function(ev){
    if(document.pointerLockElement !== canvas){
      canvas.requestPointerLock();
    }
  });

  //Mouse Movement
  document.addEventListener('mousemove', function(ev){
    if(document.pointerLockElement === canvas){
      camera.onMouseMove(ev.movementX, ev.movementY);
    }
  });

  //Place block and remove block
  canvas.addEventListener('mousedown', function(ev){
    if(document.pointerLockElement !== canvas){
      return;
    }
    if(ev.button === 0){ //left click
      placeBlock();       
    } else if(ev.button === 2){ //right click
      removeBlock();       
    }
  });

  //Jump velocity at 0.12 seems to be able to jump 2 blocks, but 0.11 can't jump 1? What?
  document.addEventListener('keydown', function(ev){
    if(ev.key === ' ' && g_onGround){
      g_jumpVelocity = 0.12;
      g_onGround = false;
    }
  });
}


function processKeys(){
  const speed = 0.12;
  const turn = 3;

  if(g_keys['w'] || g_keys['s'] || g_keys['a'] || g_keys['d']){
    let oldEyeX = camera.eye.elements[0];
    let oldEyeZ = camera.eye.elements[2];
    let oldAtX = camera.at.elements[0];
    let oldAtZ = camera.at.elements[2];

    if(g_keys['w']){
      camera.moveForward(speed);
    }
    if(g_keys['s']){
      camera.moveBackwards(speed);
    }
    if(g_keys['a']){
      camera.moveLeft(speed);
    }
    if(g_keys['d']){
      camera.moveRight(speed);
    }

    //If new position is inside a wall, revert to old position
    if(!canMoveTo(camera.eye.elements[0], camera.eye.elements[2])){
      camera.eye.elements[0] = oldEyeX;
      camera.eye.elements[2] = oldEyeZ;
      camera.at.elements[0] = oldAtX;
      camera.at.elements[2] = oldAtZ;
      camera.updateView();
    }
/*
    if(g_onGround){
      let mx = Math.floor(camera.eye.elements[0] + 16);
      let mz = Math.floor(camera.eye.elements[2] + 16);
      let floorY = 0.5;
      if(mx >= 0 && mx < 32 && mz >= 0 && mz < 32 && map[mz][mx] > 0){
        floorY = map[mz][mx] - 1 + 0.5;
      }
      if(floorY < g_eyeY){
        g_onGround = false;
        g_jumpVelocity = 0;
      }else{
        g_eyeY = floorY;
          }
        }
*/

    if(g_onGround){
      let mx = Math.floor(camera.eye.elements[0] + 16);
      let mz = Math.floor(camera.eye.elements[2] + 16);
      let floorY = 0.5;
      if(mx >= 0 && mx < 32 && mz >= 0 && mz < 32 && map[mz][mx] > 0){
        floorY = map[mz][mx] - 1 + 0.62;
      }
      if(floorY < g_eyeY - 0.01){
        g_onGround = false;
        g_jumpVelocity = 0;
      }
      g_eyeY = Math.max(g_eyeY, floorY);
    }
  }

  if(g_keys['q']){
    camera.panLeft(turn);
  }
  if(g_keys['e']){
    camera.panRight(turn);
  }

}

function updateJump(){
  if(!g_onGround){
    g_jumpVelocity -= 0.006;
    g_eyeY += g_jumpVelocity;

    let mx = Math.floor(camera.eye.elements[0] + 16);
    let mz = Math.floor(camera.eye.elements[2] + 16);
    let floorY = 0.5;
    if(mx >= 0 && mx < 32 && mz >= 0 && mz < 32 && map[mz][mx] > 0){
      floorY = map[mz][mx] - 1 + 0.62;  //wall top + eye height, trying 0.62 instead of 0.5
    }

    if(g_eyeY <= floorY){
      g_eyeY = floorY;
      g_jumpVelocity = 0;
      g_onGround = true;
    }
  }
  camera.eye.elements[1] = g_eyeY;
  camera.at.elements[1] = g_eyeY + Math.sin(camera.pitch * Math.PI / 180);
  camera.updateView();
}

function getTargetMapCell(){
  //Get the cube 2 cubes in front of player, so its not stacking on self.
  let f = new Vector3();
  f.set(camera.at);
  f.sub(camera.eye);
  f.elements[1] = 0;
  f.normalize();
  f.mul(2.0);

  let tx = Math.floor(camera.eye.elements[0] + f.elements[0] + 16);
  let tz = Math.floor(camera.eye.elements[2] + f.elements[2] + 16);

  //Clamp to range to stay away from border walls, still geting slightly into the cube.
  tx = Math.max(1, Math.min(30, tx));
  tz = Math.max(1, Math.min(30, tz));
  return { x: tx, z: tz };
}

function placeBlock(){
  let c = getTargetMapCell();
  if(map[c.z][c.x] < 4){
    map[c.z][c.x]++;
  }
}

function removeBlock(){
  let c = getTargetMapCell();
  if(map[c.z][c.x] > 0){
    map[c.z][c.x]--;
  }
}

function placeGems(){
  //Place gems around map
  const spots = [
    { x: 4, z: 4 },
    { x: 14, z: 8 },
    { x: 25, z: 5 },
    { x: 8, z: 20 },
    { x: 22, z: 26 },
  ];
 g_gems = spots.map(function(s){
    return { x: s.x, z: s.z, collected: false };
  });
}

function checkGemCollection(){
  let ex = camera.eye.elements[0] + 16;  
  let ez = camera.eye.elements[2] + 16;
  for(let g of g_gems){
    if(g.collected){
      continue;
    }
    let dx = ex - g.x - 0.5;
    let dz = ez - g.z - 0.5;
    if(dx*dx + dz*dz < 1.5){
      g.collected = true;
      g_gemsCollected++;
      document.getElementById('gems').textContent = g_gemsCollected + ' / ' + G_TOTAL_GEMS;
      if(g_gemsCollected >= G_TOTAL_GEMS && !g_gameWon){
        g_gameWon = true;
        document.getElementById('story').textContent = 'You found all 5 gems! You win!';
      }
    }
  }
}

function initTextures(){
  g_texture0 = gl.createTexture();
  g_texture1 = gl.createTexture();
  g_texture2 = gl.createTexture();
  g_textureLoaded = 0;
  g_textureReady = false;

  function doneOne(){
    g_textureLoaded++;
    if(g_textureLoaded === 3){
      g_textureReady = true;
    }
    }

  const img0 = new Image();
  img0.onload = function(){
    loadTexture0(img0, g_texture0, 0);
    doneOne();
  };
  img0.src = 'src/sky.jpg';

  const img1 = new Image();
  img1.onload = function(){
    loadTexture1(img1, g_texture1, 1);
    doneOne();
  };
  img1.src = 'src/brick.jpg';

  const img2 = new Image();
  img2.onload = function(){
    loadTexture2(img2, g_texture2, 2);
    doneOne();
  };
  img2.src = 'src/grass.jpg';
}

function loadTexture0(image){
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, g_texture0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(u_Sampler0, 0);
}

function loadTexture1(image){
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, g_texture1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(u_Sampler1, 1);
}

function loadTexture2(image){
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, g_texture2);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(u_Sampler2, 2);
}

function tick(){
  g_seconds = performance.now() / 1000.0 - g_startTime;

  processKeys();
  updateJump();
  checkGemCollection();
  renderScene();

  //FPS counter
  g_fpsFrames++;
  let now = performance.now();
  if(now - g_fpsLast >= 1000){
    document.getElementById('fps').textContent = g_fpsFrames;
    g_fpsFrames = 0;
    g_fpsLast = now;
  }

  if(g_lightAnimate){
  g_lightPos[0] = Math.sin(g_seconds) * 3;
  g_lightPos[2] = Math.cos(g_seconds) * 3;
  }

  gl.uniform3f(u_SpotLightPos, g_lightPos[0], g_lightPos[1] + 2.0, g_lightPos[2]);
  gl.uniform3f(u_SpotLightDir, -g_lightPos[0], -3.0, -g_lightPos[2]);
  requestAnimationFrame(tick);
}

/*
  if(g_lightAnimate){
    g_lightPos[0] = Math.sin(g_seconds) * 3;
    g_lightPos[2] = Math.cos(g_seconds) * 3;
  }

  let spotX = Math.sin(g_seconds * 0.7) * 5;
  let spotZ = Math.cos(g_seconds * 0.7) * 5;
  gl.uniform3f(u_SpotLightPos, spotX, 8.0, spotZ);
  gl.uniform3f(u_SpotLightDir, -spotX, -8.0, -spotZ);
  requestAnimationFrame(tick);

}
  */


function canMoveTo(x, z){
  let mx = Math.floor(x + 16);
  let mz = Math.floor(z + 16);
  if(mx < 0 || mx >= 32 || mz < 0 || mz >= 32){
    return false;
  }
  if(map[mz][mx] === 0){
    return true;
  }

  let blockTop = map[mz][mx] - 1;
  let feetY = g_eyeY - 0.5;
  return feetY > blockTop + 0.1;
}



/*
function canMoveTo(x, z){
  let mx = Math.floor(x + 16);
  let mz = Math.floor(z + 16);
  if(mx < 0 || mx >= 32 || mz < 0 || mz >= 32){
  return false;
}
  // Allow if player's feet are above the wall height
  return map[mz][mx] === 0 || (g_eyeY - 0.5) > map[mz][mx] - 1 - 0.05;
  //return map[mz][mx] === 0 || (g_eyeY - 0.5) > map[mz][mx] - 1;
}
  
*/


function renderScene(){
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_EyePos, camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);
  //gl.uniform1i(u_SpotLightOn, u_SpotLightOn);


  let cube = new Cube();  

  //Sky, solid color
  cube.textureNum = 0;
  cube.texWeight = 0.0;
  cube.color = [0.53, 0.81, 0.92, 1.0];
  cube.matrix.setIdentity();
  cube.matrix.scale(200, 200, 200);
  cube.matrix.translate(-0.5, -0.5, -0.5);
  cube.render();

  let lightCube = new Cube();
  lightCube.color = [1.0, 1.0, 0.0, 1.0];
  lightCube.texWeight = 0.0;
  lightCube.matrix.setIdentity();
  lightCube.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  lightCube.matrix.scale(0.2, 0.2, 0.2);
  lightCube.render();

  let s = new Sphere();
  s.color = [1.0, 0.2, 0.2, 1.0];
  s.texWeight = 0.0; 
  s.matrix.setIdentity();
  s.matrix.translate(-1, 1, 0);
  s.render();

  if(!window.g_teapot){
  window.g_teapot = new Model('src/teapot.obj');
}
    g_teapot.color = [0.8, 0.4, 0.1, 1.0];
    g_teapot.matrix.setIdentity();
    g_teapot.matrix.translate(3, -1, 0);
    g_teapot.matrix.scale(0.5, 0.5, 0.5);
    g_teapot.render();


  //Ground/grass textures
  cube.textureNum = 2;
  if(g_textureReady){
    cube.texWeight = 1.0;
  }else{
    cube.texWeight = 0.0;
  }
  cube.color = [0.3, 0.6, 0.2, 1.0];

  for(let z = 0; z < 32; z++){
    for(let x = 0; x < 32; x++){
      //Skip tiles where walls exist
      if(map[z][x] > 0){
        continue;
      }
      //Super slight terrain height using sine waves. Reduced values by factor of 10 to not be noticeable. 
      let h = Math.sin(x * 0.04) * 0.015 + Math.cos(z * 0.03) * 0.015 + Math.sin((x + z) * 0.02) * 0.01;
      cube.matrix.setIdentity();
      cube.matrix.translate(x - 16, -1 + h, z - 16);
      cube.matrix.scale(1, 0.1, 1);
      cube.render();
    }
  }

  /*
  //Ground/grass
  cube.textureNum = 2;
  if(g_textureReady){
    cube.texWeight = 1.0;
  }else{
    cube.texWeight = 0.0;
  }
  cube.color = [0.3, 0.6, 0.2, 1.0];
  cube.matrix.setIdentity();
  cube.matrix.translate(-16, -1, -16);
  cube.matrix.scale(32, 0.01, 32);
  cube.render();

*/


  //Brick walls
  cube.textureNum = 1;
  if(g_textureReady){
    cube.texWeight = 1.0;
  }else{
    cube.texWeight = 0.0;
  }
  cube.color = [0.7, 0.4, 0.3, 1.0];

  for(let z = 0; z < 32; z++){
    for(let x = 0; x < 32; x++){
      const h = map[z][x];
      if(h === 0){
        continue;
      }
      for(let y = 0; y < h; y++){
        cube.matrix.setIdentity();
        cube.matrix.translate(x - 16, y - 1, z - 16);
        cube.render();
      }
    }
  }

  //Collectibles/gems
  for(let g of g_gems){
    
    if(g.collected){
      continue;
    }
    cube.textureNum = 0;
    cube.texWeight = 0.0;
    cube.color = [1.0, 0.85, 0.0, 1.0]; 
    cube.matrix.setIdentity();
    cube.matrix.translate(g.x - 16 + 0.25, Math.sin(g_seconds * 3) * 0.15, g.z - 16 + 0.25);
    cube.matrix.rotate(g_seconds * 90, 0, 1, 0);
    cube.matrix.scale(0.5, 0.5, 0.5);
    cube.render();
  }

  //Place panda
  drawPanda(6 - 16, -0.5, 6 - 16);

  //Place panda wandering in circle
  let wx = 20 - 16 + Math.sin(g_seconds * 0.5) * 3;
  let wz = 15 - 16 + Math.cos(g_seconds * 0.5) * 3;
  drawPanda(wx, -0.5, wz);
}

//Simplified panda 
function drawPanda(px, py, pz){
  let c = new Cube();
  c.texWeight = 0.0;

  // Body 
  c.color = [1, 1, 1, 1];
  c.matrix.setIdentity();
  c.matrix.translate(px, py + 0.2, pz);
  c.matrix.scale(0.6, 0.5, 0.8);
  c.render();

  // Head 
  c.color = [1, 1, 1, 1];
  c.matrix.setIdentity();
  c.matrix.translate(px + 0.05, py + 0.7, pz + 0.1);
  c.matrix.scale(0.5, 0.45, 0.5);
  c.render();

  // Left ear 
  c.color = [0.05, 0.05, 0.05, 1];
  c.matrix.setIdentity();
  c.matrix.translate(px + 0.0, py + 1.1, pz + 0.15);
  c.matrix.scale(0.15, 0.15, 0.15);
  c.render();

  // Right ear 
  c.color = [0.05, 0.05, 0.05, 1];
  c.matrix.setIdentity();
  c.matrix.translate(px + 0.42, py + 1.1, pz + 0.15);
  c.matrix.scale(0.15, 0.15, 0.15);
  c.render();

  // Left eye patch 
  c.color = [0.05, 0.05, 0.05, 1];
  c.matrix.setIdentity();
  c.matrix.translate(px + 0.08, py + 0.85, pz + 0.0);
  c.matrix.scale(0.15, 0.12, 0.1);
  c.render();

  // Right eye patch 
  c.color = [0.05, 0.05, 0.05, 1];
  c.matrix.setIdentity();
  c.matrix.translate(px + 0.35, py + 0.85, pz + 0.0);
  c.matrix.scale(0.15, 0.12, 0.1);
  c.render();

  // Nose 
  c.color = [1.0, 0.6, 0.7, 1];
  c.matrix.setIdentity();
  c.matrix.translate(px + 0.22, py + 0.75, pz - 0.02);
  c.matrix.scale(0.12, 0.08, 0.05);
  c.render();

  // Front left leg 
  c.color = [0.05, 0.05, 0.05, 1];
  c.matrix.setIdentity();
  let legSwing = Math.sin(g_seconds * 4) * 0.05;
  c.matrix.translate(px + 0.0, py - 0.1, pz + 0.05 + legSwing);
  c.matrix.scale(0.2, 0.3, 0.2);
  c.render();

  // Front right leg 
  c.matrix.setIdentity();
  c.matrix.translate(px + 0.4, py - 0.1, pz + 0.05 - legSwing);
  c.matrix.scale(0.2, 0.3, 0.2);
  c.render();

  // Back left leg 
  c.matrix.setIdentity();
  c.matrix.translate(px + 0.0, py - 0.1, pz + 0.55 - legSwing);
  c.matrix.scale(0.2, 0.3, 0.2);
  c.render();

  // Back right leg
  c.matrix.setIdentity();
  c.matrix.translate(px + 0.4, py - 0.1, pz + 0.55 + legSwing);
  c.matrix.scale(0.2, 0.3, 0.2);
  c.render();
}
main();
