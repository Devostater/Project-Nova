/**
 * A11 first-person control core. Requires the A4 nova API; auto-enables for ?arena=range.
 * Uses hand joints/controllers when present and keyboard/gamepad/mouse fallbacks otherwise.
 */
export function init(nova) {
  const T=nova?.THREE, scene=nova?.scene, camera=nova?.camera, rig=nova?.cameraRig, renderer=nova?.renderer;
  if(!T||!scene||!camera||!rig) return {ready:false,enable(){},disable(){}};
  const pistol=new T.Group();
  const gunMat=new T.MeshStandardMaterial({color:0x152535,metalness:0.82,roughness:0.28});
  const glowMat=new T.MeshStandardMaterial({color:0x27dcff,emissive:0x087795,emissiveIntensity:1.4,metalness:0.3});
  pistol.add(new T.Mesh(new T.BoxGeometry(0.075,0.09,0.26),gunMat));
  const grip=new T.Mesh(new T.BoxGeometry(0.06,0.15,0.075),gunMat);grip.position.set(0,-0.1,0.065);pistol.add(grip);
  const muzzle=new T.Mesh(new T.CylinderGeometry(0.025,0.025,0.09,12),glowMat);muzzle.rotation.x=Math.PI/2;muzzle.position.z=-0.16;pistol.add(muzzle);
  pistol.visible=false;scene.add(pistol);
  const ray=new T.Raycaster();ray.far=36;ray.params.Line.threshold=0.08;
  const origin=new T.Vector3(), direction=new T.Vector3(), forward=new T.Vector3(), right=new T.Vector3(), move=new T.Vector3(), up=new T.Vector3(0,1,0);
  const thumb=new T.Vector3(), index=new T.Vector3(), mid=new T.Vector3(), wrist=new T.Vector3();
  const down=new Set();let active=false,armed=true,weaponOn=true,lastFire=0,lastDamage=0,health=100,shield=25,comfort=true;
  let savedP=null,savedQ=null,rightController=null,leftController=null,rightHand=null,leftHand=null,leftFist=false,leftAnchor=null;
  const overlay=document.createElement('div');
  Object.assign(overlay.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'35',opacity:'0',transition:'opacity .15s',background:'radial-gradient(transparent 48%, rgba(220,10,20,.55) 100%)'});
  document.body.appendChild(overlay);
  const keydown=e=>{down.add(e.code);if(active&&e.code==='Escape')disable();};
  const keyup=e=>down.delete(e.code);
  const onMouse=e=>{if(active&&e.button===0)fire();};
  const onPadDown=e=>{if(!active)return;const p=e.gamepad;if(p?.buttons?.[0]?.pressed)fire();};
  function fire(){
    const now=performance.now();if(!active||!weaponOn||now-lastFire<180)return;lastFire=now;
    camera.getWorldDirection(direction); camera.getWorldPosition(origin);
    const session=renderer?.xr?.getSession?.();
    if(session&&rightHand&&handPoint(rightHand,'index-finger-tip',index)&&handPoint(rightHand,'wrist',wrist)){origin.copy(index);direction.subVectors(index,wrist).normalize();}
    else if(session&&rightController){rightController.getWorldPosition(origin);rightController.getWorldDirection(direction);}
    ray.set(origin,direction.normalize());
    const hits=ray.intersectObjects(scene.children,true);
    for(const hit of hits){
      let target=hit.object,depth=0;
      while(target&&depth++<8&&!target.userData?.rangeTarget)target=target.parent;
      if(!target)continue;
      const data=target.userData||{};
      if(typeof data.onHit==='function')data.onHit(25,{origin,point:hit.point});
      else if(typeof data.health==='number'){data.health=Math.max(0,data.health-25);if(data.health===0)target.visible=false;}
      else target.visible=false;
      nova.emit?.('targetHit',{target,damage:25,point:hit.point});
      return;
    }
  }
  function setDamage(amount){
    let n=Math.max(0,Number(amount)||0);const absorbed=Math.min(shield,n);shield-=absorbed;n-=absorbed;health=Math.max(0,health-n);
    lastDamage=1.25; if(comfort)overlay.style.opacity='1';
    nova.emit?.('playerDamaged',{health,shield,amount});
    if(health===0)disable();
  }
  function joint(hand,name){return hand?.getObjectByName?.(name)||null;}
  function handPoint(hand,name,out){const j=joint(hand,name);if(!j)return false;j.getWorldPosition(out);return true;}
  function tick(dt){
    if(!active)return;const d=Math.min(.05,Math.max(0,Number(dt)||0));
    lastDamage=Math.max(0,lastDamage-d);if(!lastDamage)overlay.style.opacity='0';
    const session=renderer?.xr?.getSession?.();
    if(session){
      rightController=renderer.xr.getController?.(1)||rightController;
      leftController=renderer.xr.getController?.(0)||leftController;
      rightHand=renderer.xr.getHand?.(1)||rightHand;leftHand=renderer.xr.getHand?.(0)||leftHand;
      if(rightHand&&pistol.parent!==rightHand){rightHand.add(pistol);pistol.position.set(.035,-.035,-.12);pistol.rotation.set(0,Math.PI,0);}
      const pinch=handPoint(rightHand,'thumb-tip',thumb)&&handPoint(rightHand,'index-finger-tip',index)&&thumb.distanceTo(index)<.035;
      if(pinch&&armed){weaponOn=!weaponOn;armed=false;} if(!pinch)armed=true;
      const curled=handPoint(leftHand,'middle-finger-tip',mid)&&handPoint(leftHand,'wrist',wrist)&&mid.distanceTo(wrist)<.085;
      if(curled){if(!leftFist){leftAnchor=wrist.clone();leftFist=true;}
        const dx=wrist.x-leftAnchor.x,dz=wrist.z-leftAnchor.z;
        if(Math.abs(dx)+Math.abs(dz)>.025){move.set(dx*3,0,dz*3);rig.position.addScaledVector(move,d);}}
      else {leftFist=false;leftAnchor=null;}
      const gp=rightController?.gamepad;
      if(gp?.buttons?.[0]?.pressed)fire();
      const lg=leftController?.gamepad,axes=lg?.axes||[];
      if(!leftFist&&axes.length>3){const x=Math.abs(axes[2])>.16?axes[2]:0,z=Math.abs(axes[3])>.16?axes[3]:0;walk(x,z,d);}
    }else{
      const pads=navigator.getGamepads?.()||[];const pad=[...pads].find(p=>p?.connected);
      let x=(down.has('KeyD')?1:0)-(down.has('KeyA')?1:0),z=(down.has('KeyS')?1:0)-(down.has('KeyW')?1:0);
      if(pad){x=pad.axes?.[0]||x;z=pad.axes?.[1]||z;if(pad.buttons?.[7]?.value>.45)fire();}
      walk(x,z,d);
    }
    if(session&&weaponOn&&rightHand){
      if(handPoint(rightHand,'thumb-tip',thumb)&&handPoint(rightHand,'index-finger-tip',index)&&thumb.distanceTo(index)<.035)fire();
    }
  }
  function walk(x,z,d){
    if(Math.abs(x)+Math.abs(z)<.08)return;
    camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,up).normalize();
    move.set(0,0,0).addScaledVector(right,x).addScaledVector(forward,-z);
    if(move.lengthSq()>1)move.normalize();rig.position.addScaledVector(move,3.1*d);
  }
  function enable(){
    if(active)return;active=true;savedP=rig.position.clone();savedQ=rig.quaternion.clone();
    rightController=renderer?.xr?.getController?.(1)||null;leftController=renderer?.xr?.getController?.(0)||null;
    pistol.visible=true;rightController?.add(pistol);pistol.position.set(.045,-.035,-.12);pistol.rotation.set(0,Math.PI,0);
    window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('mousedown',onMouse);
    renderer?.domElement?.addEventListener('selectstart',fire);
    nova.toast?.('FPS CONTROLS ACTIVE · WASD / LEFT STICK · CLICK / TRIGGER FIRE',2500,'#00e5ff');
  }
  function disable(){
    if(!active)return;active=false;down.clear();pistol.visible=false;
    if(pistol.parent!==scene)scene.add(pistol);
    if(savedP)rig.position.copy(savedP);if(savedQ)rig.quaternion.copy(savedQ);
    window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('mousedown',onMouse);
    renderer?.domElement?.removeEventListener('selectstart',fire);overlay.style.opacity='0';
  }
  const off=nova.onTick?.(tick);
  const api={ready:true,enable,disable,damage:setDamage,get health(){return health;},get shield(){return shield;},set comfortVignette(v){comfort=!!v;}};
  return api;
}
