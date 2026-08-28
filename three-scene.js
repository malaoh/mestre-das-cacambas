import * as THREE from './assets/vendor/three.module.min.js';

let cleanup;

// Três enquadramentos de câmera ao longo do progresso do ato pinado (--sc-p):
// chegada baixa e dramática -> ângulo de catálogo (onde o comparador vive a
// maior parte do tempo) -> "drone view" alto antes de soltar a seção.
const CAM_KEYS = [
  { p: 0,    pos: [9.4, 1.55, 9.0], look: [0, .08, 0] },
  { p: 0.5,  pos: [6.2, 3.4, 7.2],  look: [0, .3, 0] },
  { p: 1,    pos: [2.3, 8.6, 2.1],  look: [0, .05, 0] },
];

function smoothstep(t){ return t * t * (3 - 2 * t); }

function camFrame(p){
  p = THREE.MathUtils.clamp(p, 0, 1);
  const a = CAM_KEYS[0], b = CAM_KEYS[1], c = CAM_KEYS[2];
  const seg = p < 0.5 ? [a, b, p / 0.5] : [b, c, (p - 0.5) / 0.5];
  const t = smoothstep(THREE.MathUtils.clamp(seg[2], 0, 1));
  const pos = seg[0].pos.map((v, i) => THREE.MathUtils.lerp(v, seg[1].pos[i], t));
  const look = seg[0].look.map((v, i) => THREE.MathUtils.lerp(v, seg[1].look[i], t));
  return { pos, look };
}

// A flat-shaded painted box reads as a toy the instant it has no
// environment to reflect and no surface imperfection. This canvas texture
// (no network fetch, no vendor addon) doubles as roughness and bump input so
// the paint looks worked instead of plastic: patchy wear, faint streaks.
function makeGrimeTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8f8f8f'; ctx.fillRect(0, 0, 256, 256);
  for(let i = 0; i < 700; i++){
    const x = Math.random()*256, y = Math.random()*256, r = Math.random()*9+1;
    const dark = Math.random() > 0.45;
    ctx.fillStyle = `rgba(${dark?20:255},${dark?20:255},${dark?20:255},${Math.random()*0.14})`;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  for(let i = 0; i < 46; i++){
    ctx.strokeStyle = `rgba(0,0,0,${Math.random()*0.16})`;
    ctx.lineWidth = Math.random()*2 + .4;
    const x = Math.random()*256;
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x + (Math.random()*24-12), 256); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 2.2);
  return tex;
}

// Soft radial falloff for the contact shadow, layered under the real
// dynamic shadow so the object reads as grounded even before the sun moves.
function makeContactShadowTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128,128,8,128,128,128);
  g.addColorStop(0, 'rgba(255,255,255,.62)');
  g.addColorStop(.55, 'rgba(255,255,255,.3)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(c);
}

// A tiny procedural "studio" rendered once into a PMREM environment map.
// Two coloured walls plus a floor/ceiling bounce give the paint and edge
// trim something real to reflect, which is most of the difference between
// a flat-shaded toy and a product render. No HDR file, no vendor addon.
function buildStudioEnvironment(renderer){
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const room = new THREE.Scene();
  const key = new THREE.Mesh(new THREE.PlaneGeometry(16,16), new THREE.MeshBasicMaterial({color:0xffb27a}));
  key.position.set(-7,3,-3); key.rotation.y = Math.PI/3.1; room.add(key);
  const fillWall = new THREE.Mesh(new THREE.PlaneGeometry(16,16), new THREE.MeshBasicMaterial({color:0x24222c}));
  fillWall.position.set(7,3,-3); fillWall.rotation.y = -Math.PI/3.1; room.add(fillWall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24,24), new THREE.MeshBasicMaterial({color:0x2a1512}));
  floor.rotation.x = -Math.PI/2; floor.position.y = -4; room.add(floor);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(24,24), new THREE.MeshBasicMaterial({color:0x3a2c22}));
  top.rotation.x = Math.PI/2; top.position.y = 7; room.add(top);
  const rt = pmrem.fromScene(room, 0.035);
  pmrem.dispose();
  return rt.texture;
}

export function mountDumpster(stage){
  if(!stage || cleanup) return;
  const canvas = stage.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth < 800 ? 1.25 : 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.environment = buildStudioEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(33,1,.1,50);
  camera.position.set(6.2,3.4,7.2);
  camera.lookAt(0,.3,0);

  scene.add(new THREE.HemisphereLight(0xffe9d4,0x1b1011,1.3));
  const key = new THREE.DirectionalLight(0xffd8b2,3.1);
  key.position.set(-4,7,5);key.castShadow=true;key.shadow.mapSize.set(1536,1536);
  key.shadow.bias=-0.0003;key.shadow.normalBias=0.02;key.shadow.radius=3;scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe6ff,0.6);fill.position.set(4,3,6);scene.add(fill);
  const rim = new THREE.DirectionalLight(0xd12038,2.1);rim.position.set(5,2,-4);scene.add(rim);
  const keyBase = key.position.clone();

  const grime = makeGrimeTexture();
  const rubro = new THREE.MeshPhysicalMaterial({color:0x8d1027,roughness:.52,metalness:.68,roughnessMap:grime,bumpMap:grime,bumpScale:.012,clearcoat:.28,clearcoatRoughness:.35,envMapIntensity:1.1});
  const edge = new THREE.MeshPhysicalMaterial({color:0xb41931,roughness:.38,metalness:.82,roughnessMap:grime,bumpMap:grime,bumpScale:.01,clearcoat:.32,clearcoatRoughness:.28,envMapIntensity:1.25});
  const dark = new THREE.MeshStandardMaterial({color:0x171312,roughness:.72,metalness:.42,side:THREE.DoubleSide,roughnessMap:grime,envMapIntensity:.85});
  const dumpster = new THREE.Group();
  dumpster.rotation.set(-.06,-.35,0);
  scene.add(dumpster);

  function box(w,h,d,material,x=0,y=0,z=0){
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;dumpster.add(mesh);return mesh;
  }
  box(4.1,.16,1.82,dark,0,-.58,0);
  // Side panels get real thickness and a soft bevel via ExtrudeGeometry
  // instead of a paper-flat ShapeGeometry: a zero-depth plate is the single
  // biggest reason a hard-surface prop reads as a sticker instead of steel.
  const sideShape = new THREE.Shape();
  sideShape.moveTo(-2.4,1.32);sideShape.lineTo(2.4,1.32);sideShape.lineTo(2.02,-.58);sideShape.lineTo(-2.02,-.58);sideShape.closePath();
  const sideGeometry = new THREE.ExtrudeGeometry(sideShape,{depth:.07,bevelEnabled:true,bevelThickness:.028,bevelSize:.022,bevelSegments:3,curveSegments:1});
  sideGeometry.center();
  [1.045,-1.045].forEach((z,index) => {
    const panel = new THREE.Mesh(sideGeometry,rubro);
    panel.position.z=z;panel.rotation.y=index?Math.PI:0;panel.castShadow=true;panel.receiveShadow=true;dumpster.add(panel);
  });
  const endGeometry = new THREE.BufferGeometry();
  endGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
    0,-.58,-.9, 0,-.58,.9, 0,1.32,1.08,
    0,-.58,-.9, 0,1.32,1.08, 0,1.32,-1.08
  ],3));endGeometry.computeVertexNormals();
  [-2.18,2.18].forEach((x,index)=>{const end=new THREE.Mesh(endGeometry,rubro);end.position.x=x;end.rotation.y=index?Math.PI:0;end.castShadow=true;dumpster.add(end)});
  box(4.9,.16,.18,edge,0,1.35,-1.1);box(4.9,.16,.18,edge,0,1.35,1.1);
  box(.18,.16,2.35,edge,-2.4,1.35,0);box(.18,.16,2.35,edge,2.4,1.35,0);
  [-1.6,-.8,0,.8,1.6].forEach(x => {const a=box(.1,2.02,.11,edge,x,.36,-1.13);a.rotation.z=x<0?-.05:.05;const b=box(.1,2.02,.11,edge,x,.36,1.13);b.rotation.z=x<0?-.05:.05});
  [-1.7,1.7].forEach(x => box(.55,.32,.4,dark,x,-.86,0));
  const badge = box(1.65,.54,.06,edge,0,.34,1.19);badge.rotation.x=-.08;

  const shadowTex = makeContactShadowTexture();
  const groundMat = new THREE.MeshStandardMaterial({color:0x000000,transparent:true,alphaMap:shadowTex,roughness:1,depthWrite:false});
  const ground = new THREE.Mesh(new THREE.CircleGeometry(5,64),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-1;ground.receiveShadow=true;scene.add(ground);

  // The pinned act driving the scroll orbit (drone view). Falls back to a
  // static p=0.5 (the ideal inspection frame) if it can't be found.
  const act = stage.closest('[data-sc-act]');
  const fineHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  let targetScale = 1,targetRotY=-.35,dragging=false,lastX=0,visible=true,raf=0;
  let idleSpin = true, lastInputAt = performance.now();
  let camTarget = new THREE.Vector3(6.2,3.4,7.2), lookTarget = new THREE.Vector3(0,.3,0);
  let parX = 0, parY = 0, parTX = 0, parTY = 0;

  const pointerDown = e => {dragging=true;idleSpin=false;lastX=e.clientX;lastInputAt=performance.now();canvas.setPointerCapture?.(e.pointerId)};
  const pointerMove = e => {
    lastInputAt = performance.now();
    if(dragging){ targetRotY += (e.clientX-lastX)*.008; targetRotY=THREE.MathUtils.clamp(targetRotY,-1.05,.6); lastX=e.clientX; return; }
    if(!fineHover || e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    parTX = ((e.clientX - r.left) / r.width - .5) * 2;
    parTY = ((e.clientY - r.top) / r.height - .5) * 2;
  };
  const pointerUp = () => { dragging=false; lastInputAt = performance.now(); };
  const pointerLeave = () => { parTX = 0; parTY = 0; };
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);canvas.addEventListener('pointerleave',pointerLeave);

  const onProduct = e => targetScale=e.detail.scale;
  document.addEventListener('product-change',onProduct);
  const resize = () => {const {width,height}=stage.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()};
  const ro = new ResizeObserver(resize);ro.observe(stage);resize();
  const io = new IntersectionObserver(entries => visible=entries[0].isIntersecting,{threshold:.01});io.observe(stage);
  const clock = new THREE.Clock();
  function render(){
    raf=requestAnimationFrame(render);
    if(!visible)return;
    const dt=Math.min(clock.getDelta(),.05);

    // scroll-driven drone orbit: read the act's own published --sc-p
    let p = 0.5;
    if(act){
      const raw = getComputedStyle(act).getPropertyValue('--sc-p');
      const parsed = parseFloat(raw);
      if(!isNaN(parsed)) p = parsed;
    }
    const frame = camFrame(p);
    camTarget.set(frame.pos[0], frame.pos[1], frame.pos[2]);
    lookTarget.set(frame.look[0], frame.look[1], frame.look[2]);

    // idle life: gentle continuous spin once the reader has stopped
    // dragging/pointing for a moment, so the object never sits dead.
    if(!dragging){
      idleSpin = performance.now() - lastInputAt > 900;
      if(idleSpin) targetRotY += dt * 0.11;
    }

    // mouse parallax: a small look-around offset layered on the scroll frame
    parX = THREE.MathUtils.lerp(parX, parTX, 1 - Math.pow(.001,dt));
    parY = THREE.MathUtils.lerp(parY, parTY, 1 - Math.pow(.001,dt));

    dumpster.scale.lerp(new THREE.Vector3(targetScale,targetScale,targetScale),1-Math.pow(.0008,dt));
    dumpster.rotation.y=THREE.MathUtils.lerp(dumpster.rotation.y,targetRotY,1-Math.pow(.003,dt));

    camera.position.lerp(camTarget,1-Math.pow(.0035,dt));
    camera.position.x += parX * 0.55;
    camera.position.y += -parY * 0.32;
    camera.lookAt(lookTarget.x, lookTarget.y + parY * -0.08, lookTarget.z);

    key.position.lerp(keyBase.clone().add(new THREE.Vector3(p*1.4,-p*1.2,0)),1-Math.pow(.01,dt));

    renderer.render(scene,camera);
  }
  render();stage.classList.add('is-ready');

  cleanup=()=>{cancelAnimationFrame(raf);ro.disconnect();io.disconnect();document.removeEventListener('product-change',onProduct);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',pointerUp);canvas.removeEventListener('pointerleave',pointerLeave);scene.traverse(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(m=>m.dispose());else object.material?.dispose?.()});grime.dispose();shadowTex.dispose();scene.environment?.dispose?.();renderer.dispose();stage.classList.remove('is-ready');cleanup=null};
}

export function destroyDumpster(){cleanup?.()}
