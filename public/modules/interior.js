/**
 * A10 interior / firing-range vertical slice.
 * Requires A4 window.nova API. Enter with ?arena=range; Escape exits.
 * WASD (desktop) and left XR thumbstick (headset) move smoothly.
 */
export function init(nova) {
  const T = nova?.THREE, scene = nova?.scene, rig = nova?.cameraRig, camera = nova?.camera;
  if (!T || !scene || !rig) return { ready: false, enter() {}, exit() {} };
  const root = new T.Group();
  root.name = 'NOVA_FIRING_RANGE';
  root.visible = false;
  scene.add(root);
  const loader = new T.TextureLoader();
  const floorTex = loader.load(new URL('../art/textures/tex_metal_floor_1024.jpg', import.meta.url).href);
  const wallTex = loader.load(new URL('../art/textures/tex_metal_wall_1024.jpg', import.meta.url).href);
  const stripeTex = loader.load(new URL('../art/textures/tex_hazard_stripes_1024.jpg', import.meta.url).href);
  for (const tex of [floorTex, wallTex, stripeTex]) {
    tex.colorSpace = T.SRGBColorSpace || tex.colorSpace;
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
  }
  floorTex.repeat.set(8, 12); wallTex.repeat.set(4, 2); stripeTex.repeat.set(8, 1);
  const floorMat = new T.MeshStandardMaterial({ map: floorTex, roughness: 0.72, metalness: 0.62 });
  const wallMat = new T.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.52 });
  const stripeMat = new T.MeshStandardMaterial({ map: stripeTex, roughness: 0.65, metalness: 0.5 });
  const trimMat = new T.MeshStandardMaterial({ color: 0x14374a, metalness: 0.8, roughness: 0.3 });
  const glowMat = new T.MeshStandardMaterial({ color: 0x19dfff, emissive: 0x007caa, emissiveIntensity: 1.8, metalness: 0.25 });
  function box(w,h,d,mat,x,y,z) {
    const m = new T.Mesh(new T.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z); root.add(m); return m;
  }
  // 16 m wide, 30 m long enclosed range; reusable geometry/materials are built only on entry.
  box(16,0.35,30,floorMat,0,-0.18,-8);
  box(16,0.3,30,trimMat,0,5.15,-8);
  box(0.4,5.2,30,wallMat,-8,2.4,-8); box(0.4,5.2,30,wallMat,8,2.4,-8);
  box(16,0.22,0.4,wallMat,0,2.4,-23); box(16,0.22,0.4,wallMat,0,2.4,7);
  for(let z=-20;z<=4;z+=4){
    box(0.24,4.6,0.28,trimMat,-7.7,2.25,z);
    box(0.24,4.6,0.28,trimMat,7.7,2.25,z);
    box(0.08,3.9,0.1,glowMat,-7.53,2.35,z);
    box(0.08,3.9,0.1,glowMat,7.53,2.35,z);
  }
  // Raised target banks and firing lanes
  for(let lane=-1;lane<=1;lane++){
    const x=lane*4.2;
    box(0.08,0.015,24,stripeMat,x,0.005,-8);
    for(let n=0;n<3;n++){
      const z=-4-n*5;
      const stand=box(0.8,0.18,0.8,trimMat,x,0.08,z);
      stand.userData.rangeTarget = true;
      const target=box(0.72,1.45,0.14,glowMat,x,0.9,z-0.3);
      target.userData.rangeTarget = true;
    }
  }
  // Door marker at the range entrance
  box(3.2,2.5,0.12,trimMat,0,1.35,6.72);
  box(2.5,0.08,0.1,glowMat,0,2.55,6.62);
  const state={active:false, savedPos:null, savedQuat:null, shipVisible:true, keys:new Set()};
  const forward=new T.Vector3(), right=new T.Vector3(), move=new T.Vector3();
  const keyDown=e=>{ if(e.code==='Escape'&&state.active){e.preventDefault();exit();} else if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)) state.keys.add(e.code); };
  const keyUp=e=>state.keys.delete(e.code);
  function enter() {
    if(state.active) return;
    state.savedPos=rig.position.clone(); state.savedQuat=rig.quaternion.clone();
    state.shipVisible=nova.shipGroup?.visible ?? true;
    if(nova.shipGroup) nova.shipGroup.visible=false;
    rig.position.set(0,0,5.5); rig.quaternion.identity();
    root.visible=true; state.active=true;
    nova.toast?.('FIRING RANGE · WASD TO MOVE · ESC TO EXIT',3000,'#00e5ff');
  }
  function exit() {
    if(!state.active) return;
    root.visible=false; state.active=false;
    if(nova.shipGroup) nova.shipGroup.visible=state.shipVisible;
    if(state.savedPos) rig.position.copy(state.savedPos);
    if(state.savedQuat) rig.quaternion.copy(state.savedQuat);
    nova.toast?.('RETURNED TO COCKPIT',1800,'#00ffcc');
  }
  function tick(dt) {
    if(!state.active) return;
    const d=Math.min(0.05,Math.max(0,Number(dt)||0));
    let x=(state.keys.has('KeyD')?1:0)-(state.keys.has('KeyA')?1:0);
    let z=(state.keys.has('KeyS')?1:0)-(state.keys.has('KeyW')?1:0);
    const session=nova.renderer?.xr?.getSession?.();
    if(session){
      const src=session.inputSources.find(s=>s.handedness==='left'&&s.gamepad);
      if(src){const a=src.gamepad.axes;x=Math.abs(a[2]||0)>0.16?a[2]:x;z=Math.abs(a[3]||0)>0.16?a[3]:z;}
    }
    if(Math.abs(x)+Math.abs(z)<0.01) return;
    camera?.getWorldDirection(forward); forward.y=0; forward.normalize();
    right.crossVectors(forward,new T.Vector3(0,1,0)).normalize();
    move.set(0,0,0).addScaledVector(right,x).addScaledVector(forward,-z);
    if(move.lengthSq()>1) move.normalize();
    rig.position.addScaledVector(move,4.2*d);
    rig.position.x=T.MathUtils.clamp(rig.position.x,-7.2,7.2);
    rig.position.z=T.MathUtils.clamp(rig.position.z,-22,6.4);
  }
  window.addEventListener('keydown',keyDown);
  window.addEventListener('keyup',keyUp);
  const off=nova.onTick?.(tick);
  if(new URLSearchParams(location.search).get('arena')==='range') enter();
  const api={ready:true,enter,exit,get active(){return state.active;},dispose(){
    exit(); window.removeEventListener('keydown',keyDown); window.removeEventListener('keyup',keyUp);
    off?.(); scene.remove(root);
    floorTex.dispose();wallTex.dispose();stripeTex.dispose();
  }};
  return api;
}
