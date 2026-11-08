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
  pistol.visible=false;scene.add(pistol);

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
        model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
        importedGun=model;pistol.add(model);fallbackGun.visible=false;
      },undefined,e=>console.warn('[NOVA FPS] Full-quality pistol failed to load; using fallback.',e));
    }catch(e){console.warn('[NOVA FPS] GLTFLoader unavailable; using fallback pistol.',e);}
  })();

  const tracerGeo=new T.BoxGeometry(.018,.018,1);
  const tracerMat=new T.MeshBasicMaterial({color:0x69f5ff,toneMapped:false,opacity:.85,...lightBlend});
  const tracerRoot=new T.Group();tracerRoot.name='NOVA_FPS_TRACERS';scene.add(tracerRoot);
  const tracers=Array.from({length:10},()=>{const mesh=new T.Mesh(tracerGeo,tracerMat);mesh.visible=false;tracerRoot.add(mesh);return{mesh,life:0};});

  const hudCanvas=document.createElement('canvas');hudCanvas.width=1024;hudCanvas.height=512;
  const hudTexture=new T.CanvasTexture(hudCanvas);hudTexture.colorSpace=T.SRGBColorSpace||hudTexture.colorSpace;
  const hudMaterial=new T.MeshBasicMaterial({map:hudTexture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  const hud=new T.Mesh(new T.PlaneGeometry(1.72,.86),hudMaterial);hud.name='NOVA_HELMET_HUD';hud.position.set(0,0,-1.5);hud.renderOrder=10000;hud.visible=false;camera.add(hud);

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
    g.visible=false;scene.add(g);
    return g;
  }
  const leftGlove=createGloveVisual(true);
  const rightGlove=createGloveVisual(false);
  const leftHandAnchor=new T.Group(),rightHandAnchor=new T.Group();leftHandAnchor.name='NOVA_FPS_HAND_ANCHOR_L';rightHandAnchor.name='NOVA_FPS_HAND_ANCHOR_R';scene.add(leftHandAnchor,rightHandAnchor);
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
  const thumb=new T.Vector3(),index=new T.Vector3(),middle=new T.Vector3(),wrist=new T.Vector3(),endPoint=new T.Vector3(),midPoint=new T.Vector3();
  const controllerQ=new T.Quaternion();
  const down=new Set();
  let active=false,weaponOn=true,lastFire=0,lastDamage=0,health=100,shield=25,yaw=0,pitch=0,hudTimer=0,muzzleTimer=0;
  let rightController=null,leftController=null,rightGrip=null,leftGrip=null,rightHand=null,leftHand=null,rightIsHand=false,leftIsHand=false,leftFist=false,leftAnchor=null;
  let leftPinchHeld=false,rightPinchHeld=false,leftPinchTime=0,leftPinchUsed=false,bothPinchTime=0,bothPinchExit=false,snapHeld=false,padExitHeld=false,padUseHeld=false,session=null,exiting=false,pointerWasLocked=false;
  let options={};

  function drawHud(){
    const c=hudCanvas.getContext('2d');c.clearRect(0,0,1024,512);
    const hit=lastDamage>0;
    c.strokeStyle=hit?'rgba(255,45,65,.95)':'rgba(0,229,255,.58)';c.lineWidth=8;
    c.beginPath();c.moveTo(46,92);c.lineTo(46,40);c.lineTo(210,40);c.moveTo(814,40);c.lineTo(978,40);c.lineTo(978,92);
    c.moveTo(46,420);c.lineTo(46,472);c.lineTo(210,472);c.moveTo(814,472);c.lineTo(978,472);c.lineTo(978,420);c.stroke();
    c.strokeStyle=weaponOn?'#7ffcff':'#607b86';c.lineWidth=4;c.beginPath();c.arc(512,256,18,0,Math.PI*2);c.moveTo(482,256);c.lineTo(501,256);c.moveTo(523,256);c.lineTo(542,256);c.moveTo(512,226);c.lineTo(512,245);c.moveTo(512,267);c.lineTo(512,286);c.stroke();
    c.fillStyle='rgba(3,18,28,.78)';c.fillRect(48,406,928,68);
    c.font='bold 25px monospace';c.textAlign='left';c.fillStyle='#7ffcff';c.fillText('HELMET · '+String(options.mode||'FPS').toUpperCase(),70,438);
    c.fillStyle=health>35?'#65ffad':'#ff596d';c.fillText('HULL '+Math.round(health)+'%',360,438);
    c.fillStyle='#58dfff';c.fillText('SHIELD '+Math.round(shield)+'%',540,438);
    c.fillStyle=weaponOn?'#ffcf58':'#8295a0';c.fillText(weaponOn?'ARMED':'HANDS',760,438);
    c.font='18px monospace';c.fillStyle='#a9d8e8';c.fillText(renderer?.xr?.isPresenting?'RT / RIGHT PINCH FIRE · A / LEFT HOLD USE · B / BOTH HOLD EXIT':'WASD / STICKS MOVE · CLICK / RT FIRE · E / A USE · ESC / B EXIT',70,464);
    hudTexture.needsUpdate=true;
  }

  function joint(hand,name){return hand?.getObjectByName?.(name)||null;}
  function handPoint(hand,name,out){const j=joint(hand,name);if(!j)return false;j.getWorldPosition(out);return true;}
  // remember which three.js controller slot belongs to which XRInputSource (slots don't follow inputSources order)
  const slotSource=[];
  for(let i=0;i<4;i++){const c=renderer?.xr?.getController?.(i);if(!c)continue;c.addEventListener('connected',e=>{slotSource[i]=e.data;});c.addEventListener('disconnected',()=>{slotSource[i]=null;});}
  function slotOf(src){if(!src)return -1;const i=slotSource.indexOf(src);if(i>=0)return i;const s=[...(renderer?.xr?.getSession?.()?.inputSources||[])];return s.indexOf(src);}
  function stickAxes(gamepad){const a=gamepad?.axes||[];return a.length>=4?[a[a.length-2]||0,a[a.length-1]||0]:[a[0]||0,a[1]||0];}
  function dead(v,z=.17){return Math.abs(v)<z?0:v;}
  function setWeaponParent(parent,hand=false){
    if(!parent)return;
    if(pistol.parent!==parent)parent.add(pistol);
    pistol.position.set(hand ? .035 : .015,hand ? -.035 : -.035,hand ? -.12 : -.09);
    pistol.rotation.set(0,0,0);
  }
  function aimRay(){
    camera.getWorldPosition(origin);camera.getWorldDirection(direction);
    if(session&&rightIsHand&&rightHand&&weaponOn&&handPoint(rightHand,'index-finger-tip',index)&&handPoint(rightHand,'wrist',wrist)){
      origin.copy(index);direction.subVectors(index,wrist).normalize();
    }else if(session&&(rightGrip||rightController)){
      const src=rightGrip||rightController;
      src.getWorldPosition(origin);direction.set(0,0,-1).applyQuaternion(src.getWorldQuaternion(controllerQ));
    }
    direction.normalize();ray.set(origin,direction);ray.camera=camera;   // sprites need the camera to raycast
    try{return ray.intersectObjects(scene.children,true);}catch(e){return [];}
  }
  function findUserData(object,key){
    let node=object,depth=0;
    while(node&&depth++<12){if(node.userData&&node.userData[key])return node;node=node.parent;}
    return null;
  }
  function isOccluder(object){return !!findUserData(object,'fpsOccluder');}
  function showTracer(distance){
    const t=tracers.find(x=>x.life<=0)||tracers[0];const d=Math.max(.5,Math.min(16,distance||12));
    endPoint.copy(origin).addScaledVector(direction,d);midPoint.copy(origin).add(endPoint).multiplyScalar(.5);
    t.mesh.position.copy(midPoint);t.mesh.scale.set(1,1,d);t.mesh.lookAt(endPoint);t.mesh.visible=true;t.life=.07;
  }
  function fire(){
    const now=performance.now();if(!active||!weaponOn||now-lastFire<160)return false;lastFire=now;
    const hits=aimRay();let targetHit=null,hitDistance=14;
    options.onShot?.();
    for(const hit of hits){
      const target=findUserData(hit.object,'rangeTarget');
      if(!target){if(isOccluder(hit.object)){hitDistance=hit.distance;break;}continue;}
      targetHit=target;hitDistance=hit.distance;
      const data=target.userData||{};
      if(typeof data.onHit==='function')data.onHit(25,{origin:origin.clone(),point:hit.point.clone()});
      else if(typeof data.health==='number'){data.health=Math.max(0,data.health-25);if(data.health===0)target.visible=false;}
      else target.visible=false;
      nova.emit?.('targetHit',{target,damage:25,point:hit.point});break;
    }
    showTracer(hitDistance);muzzleFlash.visible=true;muzzleTimer=.045;
    nova.emit?.('fpsWeaponFired',{mode:options.mode||'fps',hit:!!targetHit});
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
    lastDamage=Math.max(0,lastDamage-d);muzzleTimer=Math.max(0,muzzleTimer-d);if(!muzzleTimer)muzzleFlash.visible=false;
    if(!lastDamage)damageOverlay.style.opacity='0';
    for(const t of tracers){if(t.life>0){t.life-=d;if(t.life<=0)t.mesh.visible=false;}}
    session=renderer?.xr?.getSession?.()||null;
    if(session){
      const sources=[...session.inputSources],rightSource=sources.find(s=>s.handedness==='right'),leftSource=sources.find(s=>s.handedness==='left');
      pistol.visible=weaponOn&&!!rightSource;
      // three.js controller slots are NOT in session.inputSources order (they drift when hands/controllers swap),
      // so find the slot whose 'connected' event carried this exact input source.
      const rightIndex=slotOf(rightSource),leftIndex=slotOf(leftSource);
      rightIsHand=!!rightSource?.hand;leftIsHand=!!leftSource?.hand;
      rightController=rightIndex>=0?renderer.xr.getController?.(rightIndex)||null:null;rightGrip=rightIndex>=0&&!rightIsHand?renderer.xr.getControllerGrip?.(rightIndex)||null:null;rightHand=rightIndex>=0&&rightIsHand?renderer.xr.getHand?.(rightIndex)||null:null;
      leftController=leftIndex>=0?renderer.xr.getController?.(leftIndex)||null:null;leftGrip=leftIndex>=0&&!leftIsHand?renderer.xr.getControllerGrip?.(leftIndex)||null:null;leftHand=leftIndex>=0&&leftIsHand?renderer.xr.getHand?.(leftIndex)||null:null;
      const rightWristJ=joint(rightHand,'wrist');
      const leftWristJ=joint(leftHand,'wrist');
      if(rightSource?.hand&&rightWristJ){
        trackHandAnchor(rightHandAnchor,rightWristJ,rightAnchorState,d);setWeaponParent(rightHandAnchor,true);
      }else if(rightGrip||rightController){
        rightAnchorState.ready=false;
        setWeaponParent(rightGrip||rightController,false);
      }else rightAnchorState.ready=false;

      // Update glove tracking on both hands
      if(leftSource?.hand&&leftWristJ&&handPoint(leftHand,'wrist',wrist)){
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

      if(rightSource?.hand&&rightWristJ&&handPoint(rightHand,'wrist',wrist)){
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
      const leftPinch=leftIsHand&&handPoint(leftHand,'thumb-tip',thumb)&&handPoint(leftHand,'index-finger-tip',index)&&thumb.distanceTo(index)<.034;
      const rightPinch=rightIsHand&&handPoint(rightHand,'thumb-tip',thumb)&&handPoint(rightHand,'index-finger-tip',index)&&thumb.distanceTo(index)<.034;
      if(leftPinch&&!leftPinchHeld){leftPinchTime=0;leftPinchUsed=false;}if(leftPinch)leftPinchTime+=d;
      if(leftPinch&&rightPinch){bothPinchTime+=d;if(bothPinchTime>=1.0&&!bothPinchExit){bothPinchExit=true;requestExit('hands');}}else{bothPinchTime=0;bothPinchExit=false;}
      if(leftPinch&&!rightPinch&&leftPinchTime>=.32&&!leftPinchUsed){interact();leftPinchUsed=true;}
      if(!leftPinch&&leftPinchHeld&&!leftPinchUsed&&leftPinchTime<.32){weaponOn=!weaponOn;pistol.visible=weaponOn;drawHud();}
      if(rightPinch&&!rightPinchHeld&&weaponOn&&!leftPinch)fire();leftPinchHeld=leftPinch;rightPinchHeld=rightPinch;
      const curled=leftIsHand&&handPoint(leftHand,'middle-finger-tip',middle)&&handPoint(leftHand,'wrist',wrist)&&middle.distanceTo(wrist)<.085;
      if(curled&&!leftPinch){
        if(!leftFist){leftAnchor=wrist.clone();leftFist=true;}
        // fist joystick: wrist offset from where the fist closed, turned into head-relative strafe/forward
        const off=wrist.clone().sub(leftAnchor);off.y=0;
        if(off.length()>.02){
          camera.getWorldDirection(forward);forward.y=0;if(forward.lengthSq()<.001)forward.set(0,0,-1);forward.normalize();
          right.crossVectors(forward,up).normalize();
          const k=1/.06; // 6 cm of travel = full speed
          walk(T.MathUtils.clamp(off.dot(right)*k,-1,1),T.MathUtils.clamp(-off.dot(forward)*k,-1,1),d);
        }
      }
      else{leftFist=false;leftAnchor=null;}
      correctRoomScale();
    }else{
      if(pistol.parent!==camera){camera.add(pistol);pistol.position.set(.28,-.24,-.62);pistol.rotation.set(0,0,0);}
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
    leftGlove.visible=false;rightGlove.visible=false;
    if(pistol.parent!==scene)scene.add(pistol);document.exitPointerLock?.();
    window.removeEventListener('keydown',keyDown,true);window.removeEventListener('keyup',keyUp,true);showButtons(false);window.removeEventListener('mousemove',mouseMove);document.removeEventListener('pointerlockchange',pointerLockChange);pointerWasLocked=false;
    window.removeEventListener('pointerdown',pointerDown,true);window.removeEventListener('contextmenu',preventMenu,true);
    for(const t of tracers){t.life=0;t.mesh.visible=false;}options={};session=null;rightController=leftController=rightGrip=leftGrip=rightHand=leftHand=null;rightIsHand=leftIsHand=false;return true;
  }

  const off=nova.onTick?.(tick);
  const state=()=>({active,mode:options.mode||null,weaponOn,health,shield,input:session?{left:leftIsHand?'hand':leftController?'controller':'none',right:rightIsHand?'hand':rightController?'controller':'none'}:{left:'desktop',right:'desktop'},colliders:(options.colliders||[]).length,position:rig.position.toArray()});
  window.novaTest=window.novaTest||{};window.novaTest.fpsState=state;
  return{ready:true,enable,disable,fire,interact,damage,state,get active(){return active;},get health(){return health;},get shield(){return shield;},get helmetHud(){return hud;},set comfortVignette(v){damageOverlay.style.display=v===false?'none':'block';},dispose(){
    disposed=true;disable();off?.();camera.remove(hud);scene.remove(pistol);scene.remove(tracerRoot);damageOverlay.remove();
    scene.remove(leftGlove);scene.remove(rightGlove);scene.remove(leftHandAnchor);scene.remove(rightHandAnchor);
    leftGlove.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
    rightGlove.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
    tracerGeo.dispose();tracerMat.dispose();hud.geometry.dispose();hudMaterial.dispose();hudTexture.dispose();
    pistol.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
  }};
}
