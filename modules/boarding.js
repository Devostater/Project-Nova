/**
 * A12 derelict boarding loop. Invoke api.board(disabledDockedWreck) from BOARD;
 * ?arena=boarding enters the same corridor as a standalone development route.
 */
export function init(nova) {
  const T=nova?.THREE,scene=nova?.scene,rig=nova?.cameraRig,camera=nova?.camera,renderer=nova?.renderer;
  if(!T||!scene||!rig||!camera)return{ready:false,board(){return false;},returnToCockpit(){}};
  const root=new T.Group();root.name='NOVA_DERELICT_INTERIOR';root.visible=false;scene.add(root);
  const loader=new T.TextureLoader();
  const floorTex=loader.load(new URL(import.meta.url.includes('/public/modules/')?'../art/textures/tex_metal_floor_1024.jpg':'../public/art/textures/tex_metal_floor_1024.jpg',import.meta.url).href);
  const wallTex=loader.load(new URL(import.meta.url.includes('/public/modules/')?'../art/textures/tex_metal_wall_1024.jpg':'../public/art/textures/tex_metal_wall_1024.jpg',import.meta.url).href);
  const stripeTex=loader.load(new URL(import.meta.url.includes('/public/modules/')?'../art/textures/tex_hazard_stripes_1024.jpg':'../public/art/textures/tex_hazard_stripes_1024.jpg',import.meta.url).href);
  for(const tex of [floorTex,wallTex,stripeTex]){tex.colorSpace=T.SRGBColorSpace||tex.colorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;}
  floorTex.repeat.set(3,8);wallTex.repeat.set(3,2);stripeTex.repeat.set(5,1);
  const floorMat=new T.MeshStandardMaterial({map:floorTex,roughness:.74,metalness:.58});
  const wallMat=new T.MeshStandardMaterial({map:wallTex,roughness:.78,metalness:.55});
  const stripeMat=new T.MeshStandardMaterial({map:stripeTex,roughness:.65,metalness:.46});
  const trimMat=new T.MeshStandardMaterial({color:0x19364a,metalness:.82,roughness:.3});
  const glowMat=new T.MeshStandardMaterial({color:0x23dfff,emissive:0x087fa0,emissiveIntensity:1.9,metalness:.3});
  const coreMat=new T.MeshStandardMaterial({color:0xff7b22,emissive:0xff4b0b,emissiveIntensity:2.7,metalness:.46,roughness:.22});
  const geometry=[];
  function box(w,h,d,mat,x,y,z){const g=new T.BoxGeometry(w,h,d),m=new T.Mesh(g,mat);geometry.push(g);m.position.set(x,y,z);root.add(m);return m;}
  // A reusable 8 m × 22 m derelict corridor with one airlock exit.
  box(8,.28,22,floorMat,0,-.15,-2);box(8,.22,22,trimMat,0,4.3,-2);
  box(.3,4.3,22,wallMat,-4,2,-2);box(.3,4.3,22,wallMat,4,2,-2);
  box(8,4.2,.28,wallMat,0,2,-13);box(8,4.2,.28,wallMat,0,2,9);
  for(let z=-11;z<=7;z+=3){
    box(.14,3.8,.18,trimMat,-3.78,2,z);box(.14,3.8,.18,trimMat,3.78,2,z);
    box(.05,3.3,.07,glowMat,-3.66,2,z);box(.05,3.3,.07,glowMat,3.66,2,z);
  }
  // Waist-high cover for the A5 security drones.
  for(const x of [-2.2,2.2])box(1.35,1.15,.35,stripeMat,x,.58,-6.5);
  // Core pedestal and airlock marker.
  box(1.4,.45,1.4,trimMat,0,.22,-5.2);
  const airlockDoor=box(2.8,2.7,.16,trimMat,0,1.35,-12.55);
  box(2.1,.08,.08,glowMat,0,2.7,-12.42);
  const core=new T.Group();core.name='NOVA_HEAT_CORE_PICKUP';core.position.set(0,1.12,-5.2);root.add(core);
  const coreMesh=new T.Mesh(new T.IcosahedronGeometry(.38,2),coreMat);core.add(coreMesh);
  const halo=new T.Mesh(new T.TorusGeometry(.62,.025,8,40),glowMat);halo.rotation.x=Math.PI/2;core.add(halo);
  const coreLight=new T.PointLight(0xff6727,8,5,2);core.add(coreLight);
  const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=128;
  const ctx=labelCanvas.getContext('2d');ctx.clearRect(0,0,512,128);ctx.font='bold 36px monospace';ctx.textAlign='center';
  ctx.fillStyle='#ffb56c';ctx.shadowColor='#ff5b21';ctx.shadowBlur=16;ctx.fillText('FUSION CORE · E TAKE / Q LEAVE',256,78);
  const labelTex=new T.CanvasTexture(labelCanvas);labelTex.colorSpace=T.SRGBColorSpace||labelTex.colorSpace;
  const label=new T.Mesh(new T.PlaneGeometry(3.3,.82),new T.MeshBasicMaterial({map:labelTex,transparent:true,depthWrite:false}));
  label.position.set(0,2.08,0);core.add(label);

  const state={active:false,loot:false,disposed:false,savedPos:null,savedQuat:null,shipVisible:true,session:null,target:null,padDown:false,padLeaveDown:false,choice:null};
  const point=new T.Vector3(),corePoint=new T.Vector3(),exitPoint=new T.Vector3(0,1,-11.8);
  const queryBoard=()=>new URLSearchParams(location.search).get('arena')==='boarding';
  function distanceToTarget(target){
    if(!target?.getWorldPosition)return Infinity;
    target.getWorldPosition(point);return point.distanceTo(camera.getWorldPosition(corePoint));
  }
  function board(target=null,options={}){
    if(state.active)return true;
    const force=!!options.force;
    if(!force){
      const data=target?.userData||{};
      const disabled=!!(data.boardingReady||(data.disabled&&(data.docked||data.dockingState==='docked')));
      if(!target||!disabled||distanceToTarget(target)>20){nova.toast?.('BOARDING REQUIRES A DISABLED, DOCKED WRECK WITHIN 20 M',2600,'#ff9a5e');return false;}
    }
    state.target=target||null;state.savedPos=rig.position.clone();state.savedQuat=rig.quaternion.clone();
    state.shipVisible=nova.shipGroup?.visible??true;
    if(nova.shipGroup)nova.shipGroup.visible=false;
    rig.position.set(0,0,8);rig.quaternion.identity();
    root.visible=true;state.active=true;core.visible=!state.choice;
    nova.emit?.('boardingStarted',{target:state.target});
    nova.modules?.fps_core?.enable?.({mode:'BOARDING',speed:2.9,bounds:[-3.5,3.5,-12.2,8.3],onExit:()=>returnToCockpit(),onInteract:()=>interact('take')});
    nova.modules?.fps_ai?.start?.({origin:root.position});
    nova.toast?.('DERELICT BOARDING · CHOOSE THE CORE · E TAKE / Q LEAVE',3500,'#37e7ff');
    return true;
  }
  function chooseCore(choice='take'){
    if(!state.active||state.choice)return false;
    const selected=choice==='leave'?'leave':'take';
    const morality=nova.modules?.morality||nova.morality;
    const result=morality?.chooseFusionCore?.(selected,'cold-run');
    if(morality?.chooseFusionCore&&!result?.ok){nova.toast?.(result.reason||'CHOICE ALREADY RECORDED',2200,'#ff9a5e');return false;}
    let count=0;
    if(!morality?.chooseFusionCore){
      if(selected==='take'){try{count=Math.max(0,Number(localStorage.getItem('novaHeatCores'))||0)+1;localStorage.setItem('novaHeatCores',String(count));}catch{}}
      else{try{count=Math.max(0,Number(localStorage.getItem('novaCrewPodsSaved'))||0)+1;localStorage.setItem('novaCrewPodsSaved',String(count));}catch{}}
      nova.emit?.('fusionCoreChosen',{choice:selected,source:'derelict'});
    }else count=Number(localStorage.getItem('novaHeatCores'))||0;
    state.choice=selected;state.loot=selected==='take';core.visible=false;
    if(state.loot){nova.emit?.('salvageStowed',{type:'heat-core',count,source:'derelict'});nova.emit?.('heatCoreCollected',{count,source:'derelict'});nova.toast?.('FUSION CORE SECURED · RETURN TO THE AIRLOCK',2800,'#ffb56c');}
    else{nova.emit?.('crewPodsSaved',{count,source:'derelict'});nova.toast?.('CORE LEFT FOR THE CREW PODS · RETURN TO THE AIRLOCK',3000,'#75ffd1');}
    return true;
  }
  function collect(){return chooseCore('take');}
  function returnToCockpit(){
    if(!state.active)return false;
    root.visible=false;state.active=false;
    nova.modules?.fps_ai?.stop?.();nova.modules?.fps_core?.disable?.();
    if(nova.shipGroup)nova.shipGroup.visible=state.shipVisible;
    if(state.savedPos)rig.position.copy(state.savedPos);if(state.savedQuat)rig.quaternion.copy(state.savedQuat);
    nova.toast?.(state.choice==='take'?'HEAT CORE RECOVERED · RETURNED TO SHIP':state.choice==='leave'?'CREW PODS SPARED · RETURNED TO SHIP':'BOARDING ABORTED · RETURNED TO SHIP',2400,'#75ffd1');
    nova.emit?.('boardingReturned',{target:state.target,choice:state.choice});state.target=null;return true;
  }
  function interact(choice='take'){
    if(!state.active)return;
    camera.getWorldPosition(point);core.getWorldPosition(corePoint);
    if(!state.choice&&point.distanceTo(corePoint)<2.1){chooseCore(choice);return;}
    if(point.distanceTo(exitPoint)<2.2)returnToCockpit();
  }
  const keyDown=e=>{if(state.active&&e.code==='KeyQ'){e.preventDefault();interact('leave');}};
  const select=e=>interact(e?.inputSource?.handedness==='left'?'leave':'take');
  function tick(dt){
    if(!state.active)return;
    const d=Math.min(.05,Math.max(0,Number(dt)||0));
    // Gently animate only the already-created core meshes.
    if(core.visible){core.rotation.y+=d*.42;coreMesh.rotation.x+=d*.24;}
    camera.getWorldPosition(point);
    if(point.x>3.5)rig.position.x=3.5;if(point.x< -3.5)rig.position.x=-3.5;
    if(point.z< -12)returnToCockpit();
    // Input and exit actions are centralized in fps_core; this tick only handles level flow.
  }
  core.userData.fpsInteract=()=>interact('take');airlockDoor.userData.fpsInteract=()=>returnToCockpit();
  window.addEventListener('keydown',keyDown);
  const off=nova.onTick?.(tick);
  if(queryBoard())board(null,{force:true});
  return{ready:true,board,collect,chooseCore,returnToCockpit,get active(){return state.active;},get hasLoot(){return state.loot;},dispose(){
    returnToCockpit();state.disposed=true;off?.();window.removeEventListener('keydown',keyDown);
    scene.remove(root);
    for(const g of geometry)g.dispose();coreMesh.geometry.dispose();halo.geometry.dispose();label.geometry.dispose();
    for(const m of [floorMat,wallMat,stripeMat,trimMat,glowMat,coreMat,label.material])m.dispose();
    floorTex.dispose();wallTex.dispose();stripeTex.dispose();labelTex.dispose();
  }};
}
