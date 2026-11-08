/**
 * First-person control core for ranges and boarding.
 * Desktop: WASD + mouse look, click/Space fire, E interact, Esc exit.
 * Gamepad: left/right sticks, RT fire, A interact, B exit.
 * Quest controllers: left stick move, right stick snap turn, trigger fire, A interact, B exit.
 * Hand tracking: left fist moves, left pinch draws/uses, right pinch fires, both pinches exit.
 */
export function init(nova) {
  const T=nova?.THREE,scene=nova?.scene,camera=nova?.camera,rig=nova?.cameraRig,renderer=nova?.renderer;
  if(!T||!scene||!camera||!rig)return{ready:false,enable(){},disable(){},damage(){}};
  const lightBlend={transparent:true,depthWrite:false,blending:T.CustomBlending,blendEquation:T.AddEquation,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendEquationAlpha:T.AddEquation,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor};

  const pistol=new T.Group();pistol.name='NOVA_FPS_PISTOL';
  const fallbackGun=new T.Group();fallbackGun.name='NOVA_FPS_PISTOL_FALLBACK';pistol.add(fallbackGun);
  const gunMat=new T.MeshStandardMaterial({color:0x152535,metalness:.82,roughness:.28});
  const glowMat=new T.MeshStandardMaterial({color:0x27dcff,emissive:0x087795,emissiveIntensity:1.4,metalness:.3});
  fallbackGun.add(new T.Mesh(new T.BoxGeometry(.075,.09,.26),gunMat));
  const grip=new T.Mesh(new T.BoxGeometry(.06,.15,.075),gunMat);grip.position.set(0,-.1,.065);fallbackGun.add(grip);
  const muzzle=new T.Mesh(new T.CylinderGeometry(.025,.025,.09,12),glowMat);muzzle.rotation.x=Math.PI/2;muzzle.position.z=-.16;fallbackGun.add(muzzle);
  const muzzleFlash=new T.Mesh(new T.SphereGeometry(.045,8,6),new T.MeshBasicMaterial({color:0xbffcff,toneMapped:false,opacity:.95,...lightBlend}));
  muzzleFlash.position.set(0,.025,-.21);muzzleFlash.visible=false;pistol.add(muzzleFlash);
  pistol.visible=false;pistol.raycast=()=>{};pistol.traverse(o=>{o.raycast=()=>{};});scene.add(pistol);

  const tpMarker=new T.Group();tpMarker.name='NOVA_FPS_TP_MARKER';
  const tpRing=new T.Mesh(new T.RingGeometry(.18,.26,32),new T.MeshBasicMaterial({color:0x00e5ff,side:T.DoubleSide,transparent:true,opacity:.85}));
  tpRing.rotation.x=-Math.PI/2;tpMarker.add(tpRing);
  const tpBeam=new T.Mesh(new T.CylinderGeometry(.02,.02,1.2,8),new T.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:.35}));
  tpBeam.position.y=.6;tpMarker.add(tpBeam);
  const tpDot=new T.Mesh(new T.CircleGeometry(.06,16),new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}));
  tpDot.rotation.x=-Math.PI/2;tpDot.position.y=.01;tpMarker.add(tpDot);
  tpMarker.visible=false;tpMarker.raycast=()=>{};tpMarker.traverse(o=>{o.raycast=()=>{};});scene.add(tpMarker);

  // Dynamic 3D crosshair separate from the helmet HUD, tracking where the gun will hit in the world
  const crosshairGroup=new T.Group();crosshairGroup.name='NOVA_FPS_CROSSHAIR';
  const chRingGeo=new T.RingGeometry(.032,.042,32);
  const chRingMat=new T.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:.9,side:T.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false});
  const chRing=new T.Mesh(chRingGeo,chRingMat);chRing.renderOrder=10001;crosshairGroup.add(chRing);
  const chDotGeo=new T.CircleGeometry(.007,16);
  const chDotMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,side:T.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false});
  const chDot=new T.Mesh(chDotGeo,chDotMat);chDot.renderOrder=10001;crosshairGroup.add(chDot);
  const chTickGeo=new T.PlaneGeometry(.005,.02);
  const chTickMat=new T.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:.85,side:T.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false});
  for(let i=0;i<4;i++){
    const tick=new T.Mesh(chTickGeo,chTickMat);tick.renderOrder=10001;
    tick.rotation.z=i*Math.PI/2;
    tick.position.set(0,.054,0).applyAxisAngle(new T.Vector3(0,0,1),i*Math.PI/2);
    crosshairGroup.add(tick);
  }
  crosshairGroup.visible=false;crosshairGroup.raycast=()=>{};crosshairGroup.traverse(o=>{o.raycast=()=>{};});scene.add(crosshairGroup);
  const crosshairPos=new T.Vector3();let chLocked=false;

  // Load the owner's full-resolution Arc-Pistol unchanged. The simple meshes above remain only
  // as an offline/loading fallback; no LOD or geometry reduction is applied to the GLB.
  let importedGun=null,disposed=false;
  (async()=>{
    try{
      const mod=await import(new URL('../vendor/loaders/GLTFLoader.js',import.meta.url).href);
      const loader=new mod.GLTFLoader();
      // Query version prevents Quest Browser/GitHub Pages from reusing the earlier normal-only GLB.
      loader.load(new URL('../models/nova_gun.glb?v=pbr-128ea3c-2',import.meta.url).href,gltf=>{
        if(disposed){gltf.scene?.traverse?.(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m?.dispose?.());else o.material?.dispose?.();});return;}
        const model=gltf.scene;model.name='NOVA_ARC_PISTOL_FULL_QUALITY';
        // Uploaded source points its barrel along +Z with +Y up. Turn it 180 degrees so the
        // barrel follows the FPS/controller forward axis (-Z) without the previous 90-degree roll.
        model.rotation.set(0,Math.PI,0);
        model.updateMatrixWorld(true);
        const box=new T.Box3().setFromObject(model),size=new T.Vector3(),center=new T.Vector3();box.getSize(size);box.getCenter(center);
        const scale=.30/Math.max(size.x,size.y,size.z,1e-6);model.scale.multiplyScalar(scale);model.updateMatrixWorld(true);
        new T.Box3().setFromObject(model).getCenter(center);model.position.sub(center);
        // Put the controller/hand at the grip instead of the model's geometric centre.
        model.position.add(new T.Vector3(0,.045,-.052));
        model.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(!m)return;if(m.map){m.map.colorSpace=T.SRGBColorSpace;m.map.needsUpdate=true;}else{m.color?.set?.(0x111923);m.metalness=.78;m.roughness=.3;}m.needsUpdate=true;});});
        const emissive=new T.TextureLoader().load(new URL('../models/texture_emissive.png?v=pbr-128ea3c-2',import.meta.url).href,()=>{
          model.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(!m)return;m.emissiveMap=emissive;m.emissive?.set?.(0x63e8ff);m.emissiveIntensity=.72;m.needsUpdate=true;});});
        },undefined,e=>console.warn('[NOVA FPS] Arc-Pistol emissive texture failed to load.',e));
        emissive.flipY=false;if('colorSpace' in emissive)emissive.colorSpace=T.SRGBColorSpace;
        model.raycast=()=>{};model.traverse(o=>{o.raycast=()=>{};if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
        importedGun=model;pistol.add(model);fallbackGun.visible=false;
      },undefined,e=>console.warn('[NOVA FPS] Full-quality pistol failed to load; using fallback.',e));
    }catch(e){console.warn('[NOVA FPS] GLTFLoader unavailable; using fallback pistol.',e);}
  })();

  const texLoader=new T.TextureLoader();
  function loadTex(name,file){
    if(typeof window!=='undefined'&&window.NOVA_VFX?.tex?.[name])return window.NOVA_VFX.tex[name];
    try{const t=texLoader.load(new URL(file,import.meta.url).href);t.colorSpace=T.SRGBColorSpace;return t;}catch(e){return null;}
  }
  const laserTex=loadTex('laser','../fx/vfx_laser.png');
  const flareTex=loadTex('flare','../fx/vfx_flare.png');
  const sparkTex=loadTex('spark','../fx/vfx_spark.png');
  const ringTex=loadTex('shockwave','../fx/vfx_shockwave.png');

  // Dedicated Plasma Projectile Pool (24 active bolts)
  const MAX_PROJECTILES=24;
  const projPool=[];
  const projRoot=new T.Group();projRoot.name='NOVA_FPS_PROJECTILES';projRoot.raycast=()=>{};scene.add(projRoot);

  const boltCoreGeo=new T.CylinderGeometry(.015,.022,.62,8);boltCoreGeo.rotateX(Math.PI/2);
  const boltCoreMat=new T.MeshBasicMaterial({color:0xbaffff,toneMapped:false,...lightBlend});

  const boltFinGeo1=new T.PlaneGeometry(.14,.76);boltFinGeo1.rotateX(Math.PI/2);
  const boltFinGeo2=boltFinGeo1.clone();boltFinGeo2.rotateZ(Math.PI/2);
  const finMat=new T.MeshBasicMaterial({map:laserTex||null,color:0x00f0ff,transparent:true,opacity:.95,side:T.DoubleSide,depthWrite:false,toneMapped:false,...lightBlend});

  const tipFlareMat=new T.SpriteMaterial({map:flareTex||null,color:0xd8ffff,transparent:true,opacity:.98,depthWrite:false,toneMapped:false,...lightBlend});
  const tailFlareMat=new T.SpriteMaterial({map:flareTex||null,color:0x00a8ff,transparent:true,opacity:.65,depthWrite:false,toneMapped:false,...lightBlend});

  for(let i=0;i<MAX_PROJECTILES;i++){
    const group=new T.Group();group.name='NOVA_FPS_BOLT_'+i;
    const core=new T.Mesh(boltCoreGeo,boltCoreMat);core.raycast=()=>{};group.add(core);
    const f1=new T.Mesh(boltFinGeo1,finMat);f1.raycast=()=>{};group.add(f1);
    const f2=new T.Mesh(boltFinGeo2,finMat);f2.raycast=()=>{};group.add(f2);
    const tip=new T.Sprite(tipFlareMat);tip.scale.set(.36,.36,.36);tip.position.set(0,0,-.34);tip.raycast=()=>{};group.add(tip);
    const tail=new T.Sprite(tailFlareMat);tail.scale.set(.24,.24,.24);tail.position.set(0,0,.30);tail.raycast=()=>{};group.add(tail);
    group.visible=false;group.raycast=()=>{};group.traverse(o=>{o.raycast=()=>{};});
    projRoot.add(group);
    projPool.push({mesh:group,pos:new T.Vector3(),prevPos:new T.Vector3(),vel:new T.Vector3(),dir:new T.Vector3(),spawnPos:new T.Vector3(),life:0,active:false,dist:0,speed:75});
  }

  // Dedicated Impact VFX Pools (Sparks, Expanding Rings, Flares)
  const vfxRoot=new T.Group();vfxRoot.name='NOVA_FPS_VFX';vfxRoot.raycast=()=>{};scene.add(vfxRoot);
  const MAX_SPARKS=48;
  const sparkGeo=new T.BoxGeometry(.014,.014,.09);
  const sparkMat=new T.MeshBasicMaterial({map:sparkTex||null,color:0x69f5ff,toneMapped:false,...lightBlend});
  const sparkPool=[];
  for(let i=0;i<MAX_SPARKS;i++){
    const mesh=new T.Mesh(sparkGeo,sparkMat);mesh.visible=false;mesh.raycast=()=>{};vfxRoot.add(mesh);
    sparkPool.push({mesh,pos:new T.Vector3(),vel:new T.Vector3(),life:0,maxLife:0,active:false});
  }

  const MAX_RINGS=8;
  const ringGeo=new T.RingGeometry(.03,.08,24);
  const ringMat=new T.MeshBasicMaterial({map:ringTex||null,color:0x00f0ff,side:T.DoubleSide,transparent:true,opacity:.95,depthWrite:false,toneMapped:false,...lightBlend});
  const ringPool=[];
  for(let i=0;i<MAX_RINGS;i++){
    const mesh=new T.Mesh(ringGeo,ringMat);mesh.visible=false;mesh.raycast=()=>{};vfxRoot.add(mesh);
    ringPool.push({mesh,life:0,maxLife:.18,active:false});
  }

  const MAX_IMPACT_FLARES=8;
  const impactFlareMat=new T.SpriteMaterial({map:flareTex||null,color:0xd8ffff,transparent:true,opacity:.95,depthWrite:false,toneMapped:false,...lightBlend});
  const impactFlarePool=[];
  for(let i=0;i<MAX_IMPACT_FLARES;i++){
    const sprite=new T.Sprite(impactFlareMat);sprite.visible=false;sprite.raycast=()=>{};vfxRoot.add(sprite);
    impactFlarePool.push({sprite,life:0,maxLife:.14,active:false,size:.55});
  }

  const muzzleRing=new T.Mesh(new T.RingGeometry(.025,.07,24),ringMat);
  muzzleRing.position.set(0,.025,-.24);muzzleRing.visible=false;muzzleRing.raycast=()=>{};pistol.add(muzzleRing);
  let recoilKick=0,recoilPitch=0;

  const hudCanvas=document.createElement('canvas');hudCanvas.width=1024;hudCanvas.height=512;
  const hudTexture=new T.CanvasTexture(hudCanvas);hudTexture.colorSpace=T.SRGBColorSpace||hudTexture.colorSpace;
  const hudMaterial=new T.MeshBasicMaterial({map:hudTexture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  const hud=new T.Mesh(new T.PlaneGeometry(1.72,.86),hudMaterial);hud.name='NOVA_HELMET_HUD';hud.position.set(0,0,-1.5);hud.renderOrder=10000;hud.raycast=()=>{};hud.visible=false;camera.add(hud);

  function createGloveVisual(isLeft){
    const g=new T.Group();g.name=isLeft?'NOVA_FPS_GLOVE_L':'NOVA_FPS_GLOVE_R';
    const palmMat=new T.MeshStandardMaterial({color:0x1b2836,roughness:.3,metalness:.6});
    const armorMat=new T.MeshStandardMaterial({color:0x33e5ff,emissive:0x0088aa,emissiveIntensity:.6,roughness:.2,metalness:.4});
    const glowMat=new T.MeshBasicMaterial({color:0x00f0ff,toneMapped:false});
    const palm=new T.Mesh(new T.BoxGeometry(.065,.038,.075),palmMat);
    palm.position.set(isLeft?.008:-.008,-.015,.025);g.add(palm);
    const cuff=new T.Mesh(new T.CylinderGeometry(.036,.038,.028,16),armorMat);
    cuff.rotation.x=Math.PI/2;cuff.position.set(isLeft?.008:-.008,-.015,.072);g.add(cuff);
    const cuffRing=new T.Mesh(new T.TorusGeometry(.038,.004,8,24),glowMat);
    cuffRing.rotation.x=Math.PI/2;cuffRing.position.copy(cuff.position);g.add(cuffRing);
    for(let i=0;i<4;i++){
      const fY=-.005-i*.012;
      const finger=new T.Mesh(new T.CylinderGeometry(.006,.006,.042,8),armorMat);
      finger.rotation.z=Math.PI/2;finger.rotation.x=-.35;
      finger.position.set(isLeft?-.012:.012,fY,-.012-(i===0?.015:0));g.add(finger);
    }
    const thumb=new T.Mesh(new T.CylinderGeometry(.007,.007,.038,8),armorMat);
    thumb.rotation.y=isLeft?.5:-.5;thumb.rotation.z=isLeft?.8:-.8;
    thumb.position.set(isLeft?.026:-.026,.022,.01);g.add(thumb);
    g.visible=false;g.raycast=()=>{};g.traverse(o=>{o.raycast=()=>{};});scene.add(g);
    return g;
  }
  const leftGlove=createGloveVisual(true);
  const rightGlove=createGloveVisual(false);
  const leftHandAnchor=new T.Group(),rightHandAnchor=new T.Group();leftHandAnchor.name='NOVA_FPS_HAND_ANCHOR_L';rightHandAnchor.name='NOVA_FPS_HAND_ANCHOR_R';
  leftHandAnchor.raycast=()=>{};rightHandAnchor.raycast=()=>{};scene.add(leftHandAnchor,rightHandAnchor);
  const leftAnchorState={ready:false},rightAnchorState={ready:false},anchorPos=new T.Vector3(),anchorQ=new T.Quaternion();
  function trackHandAnchor(anchor,jointObject,state,dt){
    jointObject.getWorldPosition(anchorPos);jointObject.getWorldQuaternion(anchorQ);const jump=!state.ready||anchor.position.distanceTo(anchorPos)>.22,a=1-Math.exp(-Math.max(.001,dt)*22);
    if(jump){anchor.position.copy(anchorPos);anchor.quaternion.copy(anchorQ);state.ready=true;}else{anchor.position.lerp(anchorPos,a);anchor.quaternion.slerp(anchorQ,a);}
    anchor.updateMatrixWorld(true);
  }

  const damageOverlay=document.createElement('div');
  Object.assign(damageOverlay.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'35',opacity:'0',transition:'opacity .12s',background:'radial-gradient(transparent 48%, rgba(220,10,20,.55) 100%)'});
  document.body.appendChild(damageOverlay);

  const ray=new T.Raycaster();ray.far=60;ray.params.Line.threshold=.08;
  const origin=new T.Vector3(),direction=new T.Vector3(),forward=new T.Vector3(),right=new T.Vector3(),move=new T.Vector3(),up=new T.Vector3(0,1,0);
  const leftThumb=new T.Vector3(),leftIndex=new T.Vector3(),leftMiddle=new T.Vector3(),leftWrist=new T.Vector3();
  const rightThumb=new T.Vector3(),rightIndex=new T.Vector3(),rightMiddle=new T.Vector3(),rightWrist=new T.Vector3();
  const endPoint=new T.Vector3(),midPoint=new T.Vector3(),tpHit=new T.Vector3();
  const controllerQ=new T.Quaternion();
  const down=new Set();
  let active=false,weaponOn=true,lastFire=0,lastDamage=0,health=100,shield=25,yaw=0,pitch=0,hudTimer=0,muzzleTimer=0;
  let rightController=null,leftController=null,rightGrip=null,leftGrip=null,rightHand=null,leftHand=null,rightIsHand=false,leftIsHand=false,leftFist=false,leftAnchor=null;
  let leftPinchHeld=false,rightPinchHeld=false,leftPinchTime=0,leftPinchUsed=false,bothPinchTime=0,bothPinchExit=false,snapHeld=false,padExitHeld=false,padUseHeld=false,session=null,exiting=false,pointerWasLocked=false;
  let tpValid=false;
  let options={};

  function drawHud(){
    const c=hudCanvas.getContext('2d');c.clearRect(0,0,1024,512);
    const hit=lastDamage>0;
    c.strokeStyle=hit?'rgba(255,45,65,.95)':'rgba(0,229,255,.58)';c.lineWidth=8;
    c.beginPath();c.moveTo(46,92);c.lineTo(46,40);c.lineTo(210,40);c.moveTo(814,40);c.lineTo(978,40);c.lineTo(978,92);
    c.moveTo(46,420);c.lineTo(46,472);c.lineTo(210,472);c.moveTo(814,472);c.lineTo(978,472);c.lineTo(978,420);c.stroke();
    c.fillStyle='rgba(3,18,28,.78)';c.fillRect(48,406,928,68);
    c.font='bold 25px monospace';c.textAlign='left';c.fillStyle='#7ffcff';c.fillText('HELMET · '+String(options.mode||'FPS').toUpperCase(),70,438);
    c.fillStyle=health>35?'#65ffad':'#ff596d';c.fillText('HULL '+Math.round(health)+'%',360,438);
    c.fillStyle='#58dfff';c.fillText('SHIELD '+Math.round(shield)+'%',540,438);
    c.fillStyle=weaponOn?'#ffcf58':'#8295a0';c.fillText(weaponOn?'ARMED':'HANDS',760,438);
    c.font='18px monospace';c.fillStyle='#a9d8e8';c.fillText(renderer?.xr?.isPresenting?'PINCH FLOOR: TELEPORT · FIST: MOVE · R-PINCH: FIRE · BOTH: EXIT':'WASD / STICKS MOVE · CLICK / RT FIRE · E / A USE · ESC / B EXIT',70,464);
    hudTexture.needsUpdate=true;
  }

  function joint(hand,name){return hand?.getObjectByName?.(name)||null;}
  function handPoint(hand,name,out){const j=joint(hand,name);if(!j)return false;j.getWorldPosition(out);return true;}
  function resolveHand(handedness){
    for(let i=0;i<2;i++){
      const h=renderer?.xr?.getHand?.(i);
      if(!h)continue;
      if(h.userData?.handedness===handedness||h.userData?.inputSource?.handedness===handedness)return h;
      const src=(renderer?.xr?.getSession?.()?.inputSources||[])[i];
      if(src?.handedness===handedness&&src?.hand)return h;
    }
    const s=renderer?.xr?.getSession?.();
    if(s){
      const srcs=Array.from(s.inputSources||[]);
      const idx=srcs.findIndex(x=>x.hand&&x.handedness===handedness);
      if(idx>=0)return renderer.xr.getHand(idx);
    }
    return null;
  }
  // remember which three.js controller slot belongs to which XRInputSource (slots don't follow inputSources order)
  const slotSource=[];
  for(let i=0;i<4;i++){const c=renderer?.xr?.getController?.(i);if(!c)continue;c.addEventListener('connected',e=>{slotSource[i]=e.data;});c.addEventListener('disconnected',()=>{slotSource[i]=null;});}
  function slotOf(src){if(!src)return -1;const i=slotSource.indexOf(src);if(i>=0)return i;const s=[...(renderer?.xr?.getSession?.()?.inputSources||[])];return s.indexOf(src);}
  function stickAxes(gamepad){const a=gamepad?.axes||[];return a.length>=4?[a[a.length-2]||0,a[a.length-1]||0]:[a[0]||0,a[1]||0];}
  function dead(v,z=.17){return Math.abs(v)<z?0:v;}
  let handGunYaw=(function(){try{const q=new URLSearchParams(location.search);if(q.has('gunyaw'))return(parseFloat(q.get('gunyaw'))||0)*Math.PI/180;}catch(_){}return Math.PI/2;})();
  let handGunPitch=(function(){try{const q=new URLSearchParams(location.search);if(q.has('gunpitch'))return(parseFloat(q.get('gunpitch'))||0)*Math.PI/180;}catch(_){}return 0;})();
  let handGunRoll=(function(){try{const q=new URLSearchParams(location.search);if(q.has('gunroll'))return(parseFloat(q.get('gunroll'))||0)*Math.PI/180;}catch(_){}return 0;})();
  function setWeaponParent(parent,hand=false){
    if(!parent)return;
    if(pistol.parent!==parent)parent.add(pistol);
    pistol.position.set(hand ? .035 : .015,(hand ? -.035 : -.035) + recoilPitch*.03,(hand ? -.12 : -.09) + recoilKick);
    pistol.rotation.set((hand ? handGunPitch : 0) - recoilPitch,hand ? handGunYaw : 0,hand ? handGunRoll : 0);
  }
  function playLaserSound(){
    try{
      if(nova.sound?.laser){nova.sound.laser();return;}
      if(window.sound?.laser){window.sound.laser();return;}
      const ctx=nova.sound?.ctx||window.sound?.ctx;
      if(ctx){
        if(ctx.state==='suspended')ctx.resume?.();
        const t=ctx.currentTime,osc=ctx.createOscillator(),g=ctx.createGain();
        osc.type='triangle';osc.frequency.setValueAtTime(560,t);osc.frequency.exponentialRampToValueAtTime(140,t+.08);
        g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.085);
        osc.connect(g);g.connect(ctx.destination);osc.start(t);osc.stop(t+.085);
      }
    }catch(_){}
  }
  function playImpactSound(){
    try{
      if(nova.sound?.laserImpact){nova.sound.laserImpact();return;}
      if(window.sound?.laserImpact){window.sound.laserImpact();return;}
      if(nova.sound?.beep){nova.sound.beep(360,.08,'sawtooth');return;}
      const ctx=nova.sound?.ctx||window.sound?.ctx;
      if(ctx){
        const t=ctx.currentTime,osc=ctx.createOscillator(),g=ctx.createGain();
        osc.type='sawtooth';osc.frequency.setValueAtTime(320,t);osc.frequency.exponentialRampToValueAtTime(90,t+.08);
        g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.08);
        osc.connect(g);g.connect(ctx.destination);osc.start(t);osc.stop(t+.08);
      }
    }catch(_){}
  }
  function isPlayerHierarchy(object){
    let node=object;
    while(node){
      if(node===rig||node===camera||node===pistol||node===fallbackGun||node===importedGun||
         node===leftGlove||node===rightGlove||node===leftHandAnchor||node===rightHandAnchor||
         node===tpMarker||node===crosshairGroup||node===projRoot||node===vfxRoot||
         node.userData?.isPlayer||node.userData?.fpsIgnore){
        return true;
      }
      if(node.name&&(node.name.startsWith('NOVA_FPS_')||node.name==='NOVA_HELMET_HUD'))return true;
      node=node.parent;
    }
    return false;
  }
  function aimRay(){
    if(renderer?.xr?.isPresenting&&weaponOn&&pistol&&pistol.parent){
      pistol.getWorldPosition(origin);
      pistol.getWorldQuaternion(controllerQ);
      direction.set(0,0,-1).applyQuaternion(controllerQ).normalize();
      origin.addScaledVector(direction,.22);
    }else if(renderer?.xr?.isPresenting&&session&&(rightGrip||rightController)){
      const src=rightGrip||rightController;
      src.getWorldPosition(origin);direction.set(0,0,-1).applyQuaternion(src.getWorldQuaternion(controllerQ)).normalize();
      origin.addScaledVector(direction,.22);
    }else{
      camera.getWorldPosition(origin);camera.getWorldDirection(direction).normalize();
      origin.addScaledVector(direction,.32);
    }
    ray.set(origin,direction);ray.camera=camera;   // sprites need the camera to raycast
    try{
      const rawHits=ray.intersectObjects(scene.children,true);
      return rawHits.filter(h=>!isPlayerHierarchy(h.object)&&h.distance>.35);
    }catch(e){return [];}
  }
  function findUserData(object,key){
    let node=object,depth=0;
    while(node&&depth++<12){if(node.userData&&node.userData[key])return node;node=node.parent;}
    return null;
  }
  function isOccluder(object){return !!findUserData(object,'fpsOccluder');}

  const sparkDir=new T.Vector3(),tangentA=new T.Vector3(),tangentB=new T.Vector3();
  const stepRay=new T.Raycaster();stepRay.params.Line.threshold=.06;
  const travelVec=new T.Vector3(),hitNormal=new T.Vector3(),hitObjQ=new T.Quaternion();
  function spawnImpactVfx(point,normal,isTarget=false){
    // 1. High-energy impact flash sprite
    const fl=impactFlarePool.find(x=>!x.active)||impactFlarePool[0];
    fl.active=true;fl.life=.14;fl.maxLife=.14;fl.size=isTarget?.72:.52;
    fl.sprite.position.copy(point).addScaledVector(normal,.03);
    fl.sprite.scale.setScalar(fl.size);
    fl.sprite.material.color.setHex(isTarget?0x75ffff:0x69f5ff);
    fl.sprite.material.opacity=.96;
    fl.sprite.visible=true;

    // 2. Surface shockwave ring
    const r=ringPool.find(x=>!x.active)||ringPool[0];
    r.active=true;r.life=.18;r.maxLife=.18;
    r.mesh.position.copy(point).addScaledVector(normal,.02);
    r.mesh.lookAt(r.mesh.position.clone().add(normal));
    r.mesh.scale.setScalar(.4);
    r.mesh.material.opacity=.95;
    r.mesh.visible=true;

    // 3. Directional ricochet spark shower
    tangentA.set(0,1,0);if(Math.abs(normal.y)>.92)tangentA.set(1,0,0);
    tangentB.crossVectors(normal,tangentA).normalize();
    tangentA.crossVectors(normal,tangentB).normalize();
    const count=isTarget?14:10;
    for(let i=0;i<count;i++){
      const sp=sparkPool.find(x=>!x.active);if(!sp)break;
      sp.active=true;sp.life=.22+Math.random()*.14;sp.maxLife=sp.life;
      sp.pos.copy(point).addScaledVector(normal,.02);
      const angle=Math.random()*Math.PI*2,rad=Math.random()*.85,speed=4.5+Math.random()*5.5;
      sparkDir.copy(normal).multiplyScalar(.55)
        .addScaledVector(tangentA,Math.cos(angle)*rad)
        .addScaledVector(tangentB,Math.sin(angle)*rad)
        .normalize();
      sp.vel.copy(sparkDir).multiplyScalar(speed);
      sp.mesh.position.copy(sp.pos);
      sp.mesh.lookAt(sp.pos.clone().add(sp.vel));
      sp.mesh.scale.set(1,1,1);
      sp.mesh.visible=true;
    }
  }

  function triggerMuzzleFlash(){
    muzzleTimer=.09;
    muzzleFlash.visible=true;
    muzzleFlash.scale.set(1.4,1.4,1.4);
    muzzleRing.visible=true;
    muzzleRing.scale.set(1,1,1);
    recoilKick=.026;recoilPitch=.052;
  }

  const spawnPos=new T.Vector3(),spawnDir=new T.Vector3(),camWorldPos=new T.Vector3(),camRightVec=new T.Vector3(),camUpVec=new T.Vector3();
  function launchProjectile(){
    if(renderer?.xr?.isPresenting&&weaponOn&&pistol&&pistol.parent){
      pistol.getWorldPosition(spawnPos);
      pistol.getWorldQuaternion(controllerQ);
      spawnDir.set(0,0,-1).applyQuaternion(controllerQ).normalize();
      spawnPos.addScaledVector(spawnDir,.22);
    }else if(renderer?.xr?.isPresenting&&session&&(rightGrip||rightController)){
      const src=rightGrip||rightController;
      src.getWorldPosition(spawnPos);
      src.getWorldQuaternion(controllerQ);
      spawnDir.set(0,0,-1).applyQuaternion(controllerQ).normalize();
      spawnPos.addScaledVector(spawnDir,.22);
    }else{
      camera.getWorldPosition(camWorldPos);
      camera.getWorldQuaternion(controllerQ);
      camRightVec.set(1,0,0).applyQuaternion(controllerQ);
      camUpVec.set(0,1,0).applyQuaternion(controllerQ);
      camera.getWorldDirection(spawnDir).normalize();
      spawnPos.copy(camWorldPos)
        .addScaledVector(camRightVec,.24)
        .addScaledVector(camUpVec,-.18)
        .addScaledVector(spawnDir,.42);
    }

    // Direct bolt toward crosshair if active
    if(crosshairGroup.visible){
      spawnDir.subVectors(crosshairGroup.position,spawnPos).normalize();
    }

    const p=projPool.find(x=>!x.active)||projPool[0];
    p.active=true;
    p.life=1.6;
    p.dist=0;
    p.pos.copy(spawnPos);
    p.prevPos.copy(spawnPos);
    p.spawnPos.copy(spawnPos);
    p.dir.copy(spawnDir);
    p.vel.copy(spawnDir).multiplyScalar(75);
    p.mesh.position.copy(spawnPos);
    p.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),spawnDir);
    p.mesh.visible=true;
  }

  function fire(){
    const now=performance.now();if(!active||!weaponOn||now-lastFire<160)return false;lastFire=now;
    playLaserSound();
    try{options.onShot?.();}catch(_){}
    aimRay(); // updates origin and direction cleanly
    launchProjectile();
    triggerMuzzleFlash();
    nova.emit?.('fpsWeaponFired',{mode:options.mode||'fps'});
    return true;
  }
  function interact(){
    if(!active)return false;
    const hits=aimRay();
    for(const hit of hits){
      if(hit.distance>(options.interactRange||3))break;
      const target=findUserData(hit.object,'fpsInteract');
      if(target){target.userData.fpsInteract();return true;}
      if(isOccluder(hit.object))break;
    }
    return options.onInteract?.()!==false;
  }
  function requestExit(reason='input'){
    if(!active||exiting)return;exiting=true;
    if(typeof options.onExit==='function')options.onExit(reason);else disable();
    exiting=false;
  }
  function damage(amount){
    let n=Math.max(0,Number(amount)||0),absorbed=Math.min(shield,n);shield-=absorbed;n-=absorbed;health=Math.max(0,health-n);
    lastDamage=1.25;if(!renderer?.xr?.isPresenting)damageOverlay.style.opacity='1';drawHud();
    nova.emit?.('playerDamaged',{health,shield,amount});
    if(health===0){nova.toast?.('SUIT FAILURE · EVACUATING',1800,'#ff4359');requestExit('down');}
  }
  function blockedAt(x,z){
    const r=Math.max(.12,Number(options.playerRadius)||.28);
    for(const c of options.colliders||[]){if(x>c.minX-r&&x<c.maxX+r&&z>c.minZ-r&&z<c.maxZ+r)return true;}
    return false;
  }
  function moveRigXZ(dx,dz){
    const b=options.bounds,ox=rig.position.x,oz=rig.position.z;
    let nx=ox+dx;if(b)nx=T.MathUtils.clamp(nx,b[0],b[1]);if(!blockedAt(nx,oz))rig.position.x=nx;
    let nz=oz+dz;if(b)nz=T.MathUtils.clamp(nz,b[2],b[3]);if(!blockedAt(rig.position.x,nz))rig.position.z=nz;
  }
  function correctRoomScale(){
    if(!session)return;
    camera.getWorldPosition(origin);const dx=origin.x-rig.position.x,dz=origin.z-rig.position.z;
    if(blockedAt(origin.x,origin.z)){moveRigXZ(-dx,0);moveRigXZ(0,-dz);}
    const b=options.bounds;if(b){const cx=T.MathUtils.clamp(origin.x,b[0],b[1]),cz=T.MathUtils.clamp(origin.z,b[2],b[3]);rig.position.x+=cx-origin.x;rig.position.z+=cz-origin.z;}
  }
  function walk(x,z,dt){
    x=dead(x);z=dead(z);if(Math.abs(x)+Math.abs(z)<.01)return;
    camera.getWorldDirection(forward);forward.y=0;if(forward.lengthSq()<.001)forward.set(0,0,-1);forward.normalize();
    right.crossVectors(forward,up).normalize();move.set(0,0,0).addScaledVector(right,x).addScaledVector(forward,-z);
    if(move.lengthSq()>1)move.normalize();move.multiplyScalar((options.speed||3.1)*dt);moveRigXZ(move.x,move.z);
  }
  function mouseMove(e){
    if(!active||renderer?.xr?.isPresenting||document.pointerLockElement!==renderer.domElement)return;
    yaw-=e.movementX*.0022;pitch=T.MathUtils.clamp(pitch-e.movementY*.0022,-1.25,1.25);
  }
  function pointerDown(e){
    if(!active||renderer?.xr?.isPresenting)return;
    if(e.target&&e.target.closest&&e.target.closest('.nova-fps-btn,button,a,input,select,textarea,[id$="-modal"],.modal'))return;   // real buttons and dialogs keep working
    e.preventDefault();e.stopImmediatePropagation();   // flight UI under the overlay must not react
    if(document.pointerLockElement!==renderer.domElement&&e.pointerType==='mouse'){try{renderer.domElement.requestPointerLock?.();}catch(_){}}
    if(e.button===0)fire();if(e.button===2)interact();
  }
  function pointerLockChange(){
    if(document.pointerLockElement===renderer.domElement){pointerWasLocked=true;return;}
    if(active&&pointerWasLocked){pointerWasLocked=false;requestExit('keyboard');}
  }
  function keyDown(e){
    if(!active)return;down.add(e.code);
    if(!/^F\d+$/.test(e.code))e.stopImmediatePropagation();   // flight keys are disabled while on foot (F-keys still reach the browser)
    if(e.code==='Escape'){e.preventDefault();requestExit('keyboard');}
    else if(e.code==='Space'){e.preventDefault();fire();}
    else if(e.code==='KeyE'||e.code==='Enter'){e.preventDefault();interact();}
  }
  function keyUp(e){down.delete(e.code);}
  function tick(dt){
    if(!active)return;const d=Math.min(.05,Math.max(0,Number(dt)||0));
    lastDamage=Math.max(0,lastDamage-d);
    if(!lastDamage)damageOverlay.style.opacity='0';
    if(muzzleTimer>0){
      muzzleTimer=Math.max(0,muzzleTimer-d);
      if(muzzleTimer<=0){muzzleFlash.visible=false;muzzleRing.visible=false;}
      else{const k=muzzleTimer/.09;muzzleRing.scale.setScalar(1+(1-k)*1.8);}
    }
    if(recoilKick>0.0002){
      recoilKick=Math.max(0,recoilKick-d*0.24);
      recoilPitch=Math.max(0,recoilPitch-d*0.48);
    }

    // Update Plasma Projectiles (continuous CCD sweep & volumetric bolt motion)
    for(const p of projPool){
      if(!p.active)continue;
      p.life-=d;
      if(p.life<=0){p.active=false;p.mesh.visible=false;continue;}
      p.prevPos.copy(p.pos);
      p.pos.addScaledVector(p.vel,d);
      p.mesh.position.copy(p.pos);
      travelVec.subVectors(p.pos,p.prevPos);
      const stepDist=travelVec.length();
      p.dist+=stepDist;
      if(p.dist>140){p.active=false;p.mesh.visible=false;continue;}

      if(stepDist>.0001){
        stepRay.set(p.prevPos,p.dir);
        stepRay.far=stepDist;
        let rawHits=[];
        try{rawHits=stepRay.intersectObjects(scene.children,true);}catch(_){rawHits=[];}
        for(const hit of rawHits){
          if(isPlayerHierarchy(hit.object))continue;
          if(p.dist+hit.distance<.38)continue;
          if(hit.object.visible===false)continue;
          if(hit.face&&hit.face.normal){
            hit.object.getWorldQuaternion(hitObjQ);
            hitNormal.copy(hit.face.normal).applyQuaternion(hitObjQ).normalize();
          }else{
            hitNormal.copy(p.dir).negate();
          }

          const target=findUserData(hit.object,'rangeTarget');
          if(target){
            p.active=false;p.mesh.visible=false;
            playImpactSound();
            const data=target.userData||{};
            if(typeof data.onHit==='function')data.onHit(25,{origin:p.prevPos.clone(),point:hit.point.clone(),normal:hitNormal.clone()});
            else if(typeof data.health==='number'){data.health=Math.max(0,data.health-25);if(data.health===0)target.visible=false;}
            else target.visible=false;
            nova.emit?.('targetHit',{target,damage:25,point:hit.point});
            spawnImpactVfx(hit.point,hitNormal,true);
            break;
          }else if(isOccluder(hit.object)){
            p.active=false;p.mesh.visible=false;
            playImpactSound();
            spawnImpactVfx(hit.point,hitNormal,false);
            break;
          }
        }
      }
    }

    // Update Sparks
    for(const sp of sparkPool){
      if(!sp.active)continue;
      sp.life-=d;
      if(sp.life<=0){sp.active=false;sp.mesh.visible=false;continue;}
      sp.vel.y-=9.8*d;
      sp.vel.multiplyScalar(Math.exp(-d*2.4));
      sp.pos.addScaledVector(sp.vel,d);
      sp.mesh.position.copy(sp.pos);
      sp.mesh.lookAt(sp.pos.clone().add(sp.vel));
      const k=sp.life/sp.maxLife;
      sp.mesh.scale.set(k,k,Math.max(.2,sp.vel.length()*.18));
    }

    // Update Shockwave Rings
    for(const r of ringPool){
      if(!r.active)continue;
      r.life-=d;
      if(r.life<=0){r.active=false;r.mesh.visible=false;continue;}
      const k=1-r.life/r.maxLife;
      r.mesh.scale.setScalar(.35+k*2.2);
      r.mesh.material.opacity=.95*(1-k);
    }

    // Update Impact Flares
    for(const fl of impactFlarePool){
      if(!fl.active)continue;
      fl.life-=d;
      if(fl.life<=0){fl.active=false;fl.sprite.visible=false;continue;}
      const k=1-fl.life/fl.maxLife;
      fl.sprite.scale.setScalar(fl.size*(1+k*.4));
      fl.sprite.material.opacity=.95*(1-k*k);
    }

    session=renderer?.xr?.getSession?.()||null;
    if(session){
      const sources=[...session.inputSources],rightSource=sources.find(s=>s.handedness==='right'),leftSource=sources.find(s=>s.handedness==='left');
      pistol.visible=weaponOn&&!!rightSource;
      // three.js controller slots are NOT in session.inputSources order (they drift when hands/controllers swap),
      // so find the slot whose 'connected' event carried this exact input source.
      const rightIndex=slotOf(rightSource),leftIndex=slotOf(leftSource);
      rightIsHand=!!rightSource?.hand;leftIsHand=!!leftSource?.hand;
      rightHand=rightIsHand?(resolveHand('right')||(rightIndex>=0?renderer.xr.getHand?.(rightIndex)||null:null)):null;
      leftHand=leftIsHand?(resolveHand('left')||(leftIndex>=0?renderer.xr.getHand?.(leftIndex)||null:null)):null;
      rightController=rightIndex>=0?renderer.xr.getController?.(rightIndex)||null:null;rightGrip=rightIndex>=0&&!rightIsHand?renderer.xr.getControllerGrip?.(rightIndex)||null:null;
      leftController=leftIndex>=0?renderer.xr.getController?.(leftIndex)||null:null;leftGrip=leftIndex>=0&&!leftIsHand?renderer.xr.getControllerGrip?.(leftIndex)||null:null;
      const rightWristJ=joint(rightHand,'wrist');
      const leftWristJ=joint(leftHand,'wrist');
      if(rightSource?.hand&&rightWristJ){
        trackHandAnchor(rightHandAnchor,rightWristJ,rightAnchorState,d);setWeaponParent(rightHandAnchor,true);
      }else if(rightGrip||rightController){
        rightAnchorState.ready=false;
        setWeaponParent(rightGrip||rightController,false);
      }else rightAnchorState.ready=false;

      // Update glove tracking on both hands
      if(leftSource?.hand&&leftWristJ&&handPoint(leftHand,'wrist',leftWrist)){
        trackHandAnchor(leftHandAnchor,leftWristJ,leftAnchorState,d);
        if(leftGlove.parent!==leftHandAnchor)leftHandAnchor.add(leftGlove);
        leftGlove.position.set(0,0,0);leftGlove.rotation.set(0,0,0);
        leftGlove.visible=true;
      }else if(leftGrip){
        leftAnchorState.ready=false;
        if(leftGlove.parent!==leftGrip)leftGrip.add(leftGlove);
        leftGlove.position.set(0,0,0);leftGlove.rotation.set(0,0,0);
        leftGlove.visible=true;
      }else{leftAnchorState.ready=false;leftGlove.visible=false;}

      if(rightSource?.hand&&rightWristJ&&handPoint(rightHand,'wrist',rightWrist)){
        if(rightGlove.parent!==rightHandAnchor)rightHandAnchor.add(rightGlove);
        rightGlove.position.set(0,0,0);rightGlove.rotation.set(0,0,0);
        rightGlove.visible=true;
      }else if(rightGrip){
        if(rightGlove.parent!==rightGrip)rightGrip.add(rightGlove);
        rightGlove.position.set(0,0,0);rightGlove.rotation.set(0,0,0);
        rightGlove.visible=true;
      }else{rightAnchorState.ready=false;rightGlove.visible=false;}

      let mx=0,mz=0,turn=0,trigger=false,use=false,leave=false;
      const la=stickAxes(leftIsHand?null:leftSource?.gamepad),ra=stickAxes(rightIsHand?null:rightSource?.gamepad);
      mx=dead(la[0]);mz=dead(la[1]);turn=dead(ra[0],.55);
      trigger=!rightIsHand&&(rightSource?.gamepad?.buttons?.[0]?.value||0)>.45;
      use=!rightIsHand&&(!!rightSource?.gamepad?.buttons?.[4]?.pressed||!!rightSource?.gamepad?.buttons?.[1]?.pressed);
      leave=!rightIsHand&&!!rightSource?.gamepad?.buttons?.[5]?.pressed;
      if(turn){if(!snapHeld){rig.rotation.y-=Math.sign(turn)*Math.PI/6;snapHeld=true;}}else snapHeld=false;
      walk(mx,mz,d);if(trigger)fire();if(use&&!padUseHeld)interact();if(leave&&!padExitHeld)requestExit('vr');
      padUseHeld=use;padExitHeld=leave;
      const leftThumbValid=leftIsHand&&handPoint(leftHand,'thumb-tip',leftThumb);
      const leftIndexValid=leftIsHand&&handPoint(leftHand,'index-finger-tip',leftIndex);
      const leftPinch=leftIsHand&&leftThumbValid&&leftIndexValid&&leftThumb.distanceTo(leftIndex)<.044;

      const rightThumbValid=rightIsHand&&handPoint(rightHand,'thumb-tip',rightThumb);
      const rightIndexValid=rightIsHand&&handPoint(rightHand,'index-finger-tip',rightIndex);
      const rightWristValid=rightIsHand&&handPoint(rightHand,'wrist',rightWrist);
      const rPinchDist=(rightThumbValid&&rightIndexValid)?rightThumb.distanceTo(rightIndex):999;
      const rIndexCurled=(rightIndexValid&&rightWristValid)?(rightIndex.distanceTo(rightWrist)<.118):false;
      const rightPinch=rightIsHand&&(rPinchDist<.046||rIndexCurled);
      if(leftPinch&&!leftPinchHeld){leftPinchTime=0;leftPinchUsed=false;}if(leftPinch)leftPinchTime+=d;
      if(leftPinch&&rightPinch){bothPinchTime+=d;if(bothPinchTime>=1.0&&!bothPinchExit){bothPinchExit=true;requestExit('hands');}}else{bothPinchTime=0;bothPinchExit=false;}

      // Left Pinch Floor Teleport: point downward at floor with left pinch to target, release to teleport
      if(leftPinch&&!rightPinch&&leftIsHand&&leftIndexValid){
        camera.getWorldPosition(origin);
        const pDir=new T.Vector3().subVectors(leftIndex,origin).normalize();
        if(pDir.y<-0.05){
          const floorY=rig.position.y;
          const t=(floorY-origin.y)/pDir.y;
          if(t>0.4&&t<35){
            const hitX=origin.x+pDir.x*t,hitZ=origin.z+pDir.z*t;
            const b=options.bounds;
            const cx=b?T.MathUtils.clamp(hitX,b[0],b[1]):hitX,cz=b?T.MathUtils.clamp(hitZ,b[2],b[3]):hitZ;
            if(!blockedAt(cx,cz)){
              tpHit.set(cx,floorY+.02,cz);
              tpMarker.position.copy(tpHit);
              tpMarker.visible=true;
              tpValid=true;
            }else{tpMarker.visible=false;tpValid=false;}
          }else{tpMarker.visible=false;tpValid=false;}
        }else{
          tpMarker.visible=false;tpValid=false;
          if(leftPinchTime>=.32&&!leftPinchUsed){interact();leftPinchUsed=true;}
        }
      }else{
        if(tpMarker.visible&&tpValid&&!leftPinch&&leftPinchHeld){
          camera.getWorldPosition(origin);
          const cDx=origin.x-rig.position.x,cDz=origin.z-rig.position.z;
          rig.position.x=tpHit.x-cDx;
          rig.position.z=tpHit.z-cDz;
          try{nova.sound?.beep?.(1100,.06);}catch(_){}
          leftPinchUsed=true;
        }
        tpMarker.visible=false;tpValid=false;
      }

      if(!leftPinch&&leftPinchHeld&&!leftPinchUsed&&leftPinchTime<.32){weaponOn=!weaponOn;pistol.visible=weaponOn;drawHud();}
      if(rightPinch&&weaponOn&&!leftPinch){
        if(!rightPinchHeld||(performance.now()-lastFire>=220))fire();
      }
      leftPinchHeld=leftPinch;rightPinchHeld=rightPinch;

      // Reliable Fist Locomotion (curl left hand fingers and move fist relative to anchor to walk)
      const hasLeftWrist=handPoint(leftHand,'wrist',leftWrist);
      const hasLeftMid=handPoint(leftHand,'middle-finger-tip',leftMiddle);
      const curled=leftIsHand&&hasLeftWrist&&((hasLeftMid&&leftMiddle.distanceTo(leftWrist)<.13)||(leftIndexValid&&leftIndex.distanceTo(leftWrist)<.13))&&!leftPinch&&!tpMarker.visible;
      if(curled){
        if(!leftFist){leftAnchor=leftWrist.clone();leftFist=true;}
        const off=leftWrist.clone().sub(leftAnchor);off.y=0;
        if(off.length()>.018){
          camera.getWorldDirection(forward);forward.y=0;if(forward.lengthSq()<.001)forward.set(0,0,-1);forward.normalize();
          right.crossVectors(forward,up).normalize();
          const k=1/.06;
          walk(T.MathUtils.clamp(off.dot(right)*k,-1,1),T.MathUtils.clamp(-off.dot(forward)*k,-1,1),d);
        }
      }
      else{leftFist=false;leftAnchor=null;}
      correctRoomScale();
    }else{
      if(pistol.parent!==camera){camera.add(pistol);}
      pistol.position.set(.28,-.24+recoilPitch*.04,-.62+recoilKick);
      pistol.rotation.set(-recoilPitch,0,0);
      let x=(down.has('KeyD')?1:0)-(down.has('KeyA')?1:0),z=(down.has('KeyS')?1:0)-(down.has('KeyW')?1:0);
      const pads=navigator.getGamepads?.()||[],pad=[...pads].find(p=>p?.connected&&p.mapping==='standard')||[...pads].find(p=>p?.connected&&p.axes?.length>=2);
      let use=false,leave=false;
      if(pad){
        x=Math.abs(pad.axes?.[0]||0)>.17?(pad.axes[0]||0):x;z=Math.abs(pad.axes?.[1]||0)>.17?(pad.axes[1]||0):z;
        yaw-=dead(pad.axes?.[2]||0)*d*2.2;pitch=T.MathUtils.clamp(pitch-dead(pad.axes?.[3]||0)*d*1.8,-1.25,1.25);
        if((pad.buttons?.[7]?.value||0)>.45)fire();use=!!pad.buttons?.[0]?.pressed;leave=!!pad.buttons?.[1]?.pressed;
      }
      rig.rotation.set(0,yaw,0);camera.rotation.set(pitch,0,0,"YXZ");walk(x,z,d);
      if(use&&!padUseHeld)interact();if(leave&&!padExitHeld)requestExit('gamepad');padUseHeld=use;padExitHeld=leave;
    }
    // Update dynamic 3D crosshair at the point where the gun will hit
    if(active&&weaponOn){
      const hits=aimRay();
      let hitDist=22,targetLocked=false;
      for(const hit of hits){
        if(findUserData(hit.object,'rangeTarget')){
          hitDist=Math.max(.2,hit.distance);targetLocked=true;break;
        }
        if(isOccluder(hit.object)){
          hitDist=Math.max(.2,hit.distance);break;
        }
      }
      crosshairPos.copy(origin).addScaledVector(direction,hitDist);
      crosshairGroup.position.copy(crosshairPos);
      crosshairGroup.quaternion.copy(camera.quaternion);
      const chScale=Math.max(.35,Math.min(2.5,hitDist*.11));
      crosshairGroup.scale.setScalar(chScale);
      if(targetLocked!==chLocked){
        chLocked=targetLocked;
        const col=targetLocked?0xff2844:0x00e5ff;
        chRingMat.color.setHex(col);
        chTickMat.color.setHex(col);
      }
      crosshairGroup.visible=true;
    }else{
      crosshairGroup.visible=false;
    }
    hudTimer-=d;if(hudTimer<=0){hudTimer=.1;drawHud();}
  }

  function enable(next={}){
    if(active){options={...options,...next};drawHud();return true;}
    options=next||{};active=true;exiting=false;weaponOn=true;health=100;shield=25;lastDamage=0;
    yaw=rig.rotation.y;pitch=camera.rotation.x;hud.visible=true;pistol.visible=true;
    rightController=leftController=rightGrip=leftGrip=rightHand=leftHand=null;rightIsHand=leftIsHand=false;
    leftPinchHeld=rightPinchHeld=leftPinchUsed=bothPinchExit=false;leftPinchTime=bothPinchTime=0;
    if(renderer?.xr?.isPresenting&&(rightGrip||rightController))setWeaponParent(rightGrip||rightController,false);else{camera.add(pistol);pistol.position.set(.28,-.24,-.62);pistol.rotation.set(0,0,0);}
    window.addEventListener('keydown',keyDown,true);window.addEventListener('keyup',keyUp,true);window.addEventListener('mousemove',mouseMove);document.addEventListener('pointerlockchange',pointerLockChange);
    window.addEventListener('pointerdown',pointerDown,true);window.addEventListener('contextmenu',preventMenu,true);showButtons(true);
    drawHud();nova.toast?.('FPS ACTIVE · RT / RIGHT PINCH FIRE · A / LEFT HOLD USE · B / BOTH HOLD EXIT',3200,'#00e5ff');return true;
  }
  // on-screen FIRE / USE / EXIT buttons (mouse, touch and tablet; hidden in VR)
  let btnBar=null;
  function showButtons(on){
    if(on&&!btnBar){
      btnBar=document.createElement('div');btnBar.id='nova-fps-buttons';
      btnBar.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483000;display:flex;gap:14px;align-items:flex-end;font:bold 18px monospace;user-select:none;touch-action:none';
      const mk=(label,col,size,fn)=>{const b=document.createElement('button');b.className='nova-fps-btn';b.textContent=label;
        b.style.cssText=`width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${col};background:rgba(4,18,28,.72);color:${col};font:inherit;cursor:pointer;box-shadow:0 0 18px ${col}55`;
        let rep=null;const start=e=>{e.preventDefault();e.stopPropagation();fn();if(label==='FIRE'){clearInterval(rep);rep=setInterval(fn,180);}};const stop=()=>{clearInterval(rep);rep=null;};
        b.addEventListener('pointerdown',start);b.addEventListener('pointerup',stop);b.addEventListener('pointerleave',stop);b.addEventListener('pointercancel',stop);btnBar.appendChild(b);return b;};
      mk('EXIT','#ff6b7d',64,()=>requestExit('button'));mk('USE','#ffd166',78,()=>interact());mk('FIRE','#00e5ff',118,()=>fire());
      document.body.appendChild(btnBar);
    }
    if(btnBar)btnBar.style.display=on&&!renderer?.xr?.isPresenting?'flex':'none';
  }
  function preventMenu(e){if(active)e.preventDefault();}
  function disable(){
    if(!active)return false;active=false;down.clear();pistol.visible=false;hud.visible=false;damageOverlay.style.opacity='0';
    leftGlove.visible=false;rightGlove.visible=false;crosshairGroup.visible=false;
    if(tpMarker)tpMarker.visible=false;tpValid=false;
    if(pistol.parent!==scene)scene.add(pistol);document.exitPointerLock?.();
    window.removeEventListener('keydown',keyDown,true);window.removeEventListener('keyup',keyUp,true);showButtons(false);window.removeEventListener('mousemove',mouseMove);document.removeEventListener('pointerlockchange',pointerLockChange);pointerWasLocked=false;
    window.removeEventListener('pointerdown',pointerDown,true);window.removeEventListener('contextmenu',preventMenu,true);
    for(const p of projPool){p.active=false;p.mesh.visible=false;}
    for(const sp of sparkPool){sp.active=false;sp.mesh.visible=false;}
    for(const r of ringPool){r.active=false;r.mesh.visible=false;}
    for(const fl of impactFlarePool){fl.active=false;fl.sprite.visible=false;}
    muzzleFlash.visible=false;muzzleRing.visible=false;recoilKick=0;recoilPitch=0;
    options={};session=null;rightController=leftController=rightGrip=leftGrip=rightHand=leftHand=null;rightIsHand=leftIsHand=false;return true;
  }

  const off=nova.onTick?.(tick);
  const state=()=>({active,mode:options.mode||null,weaponOn,health,shield,input:session?{left:leftIsHand?'hand':leftController?'controller':'none',right:rightIsHand?'hand':rightController?'controller':'none'}:{left:'desktop',right:'desktop'},colliders:(options.colliders||[]).length,position:rig.position.toArray()});
  window.novaTest=window.novaTest||{};window.novaTest.fpsState=state;
  window.novaTest.setGunHandRotation=(yawDeg=90,pitchDeg=0,rollDeg=0)=>{handGunYaw=yawDeg*Math.PI/180;handGunPitch=pitchDeg*Math.PI/180;handGunRoll=rollDeg*Math.PI/180;if(pistol.parent===rightHandAnchor)pistol.rotation.set(handGunPitch,handGunYaw,handGunRoll);};
  return{ready:true,enable,disable,fire,interact,damage,state,get active(){return active;},get health(){return health;},get shield(){return shield;},get helmetHud(){return hud;},set comfortVignette(v){damageOverlay.style.display=v===false?'none':'block';},dispose(){
    disposed=true;disable();off?.();camera.remove(hud);scene.remove(pistol);scene.remove(projRoot);scene.remove(vfxRoot);damageOverlay.remove();
    scene.remove(leftGlove);scene.remove(rightGlove);scene.remove(leftHandAnchor);scene.remove(rightHandAnchor);
    scene.remove(crosshairGroup);chRingGeo.dispose();chRingMat.dispose();chDotGeo.dispose();chDotMat.dispose();chTickGeo.dispose();chTickMat.dispose();
    if(tpMarker){scene.remove(tpMarker);tpRing.geometry?.dispose?.();tpRing.material?.dispose?.();tpBeam.geometry?.dispose?.();tpBeam.material?.dispose?.();tpDot.geometry?.dispose?.();tpDot.material?.dispose?.();}
    leftGlove.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
    rightGlove.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
    boltCoreGeo.dispose();boltCoreMat.dispose();boltFinGeo1.dispose();boltFinGeo2.dispose();finMat.dispose();tipFlareMat.dispose();tailFlareMat.dispose();
    sparkGeo.dispose();sparkMat.dispose();ringGeo.dispose();ringMat.dispose();impactFlareMat.dispose();muzzleRing.geometry?.dispose?.();
    hud.geometry.dispose();hudMaterial.dispose();hudTexture.dispose();
    pistol.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
  }};
}
