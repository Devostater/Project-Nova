/**
 * A5 range drone AI. Requires the A4 nova API, A10 interior and A11 fps_core.
 * Two security drones cycle patrol -> cover -> slow bolt fire -> retreat.
 */
export function init(nova) {
  const T=nova?.THREE,scene=nova?.scene,camera=nova?.camera,rig=nova?.cameraRig;
  if(!T||!scene||!camera||!rig)return{ready:false,start(){},stop(){}};
  const root=new T.Group();root.name='NOVA_RANGE_DRONES';root.visible=false;scene.add(root);
  const boltsRoot=new T.Group();boltsRoot.name='NOVA_DRONE_BOLTS';boltsRoot.raycast=()=>{};boltsRoot.visible=false;scene.add(boltsRoot);
  const droneGeo=new T.SphereGeometry(.34,20,14),lensGeo=new T.SphereGeometry(.13,12,8);
  const coverGeo=new T.BoxGeometry(2.6,1.35,.38),boltGeo=new T.SphereGeometry(.09,10,8);
  const armorMat=new T.MeshStandardMaterial({color:0x283b50,metalness:.88,roughness:.27});
  const lensMat=new T.MeshStandardMaterial({color:0x26dcff,emissive:0x087d9b,emissiveIntensity:1.8,metalness:.3});
  const coverMat=new T.MeshStandardMaterial({color:0x26394a,metalness:.78,roughness:.48});
  const boltMat=new T.MeshBasicMaterial({color:0xff4d84,transparent:true,depthWrite:false,blending:T.CustomBlending,blendEquation:T.AddEquation,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendEquationAlpha:T.AddEquation,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor});
  const forward=new T.Vector3(),aim=new T.Vector3(),delta=new T.Vector3(),cameraPos=new T.Vector3(),cameraLocal=new T.Vector3(),boltStart=new T.Vector3(),coverPoint=new T.Vector3(),boltPrev=new T.Vector3(),boltDir=new T.Vector3(),boltWorldStart=new T.Vector3(),boltWorldEnd=new T.Vector3();
  const boltRay=new T.Raycaster();
  const coverPositions=[new T.Vector3(-3.25,0,-10),new T.Vector3(3.25,0,-10)];
  const covers=[];
  for(const x of [-3.25,3.25]){const m=new T.Mesh(coverGeo,coverMat);m.position.set(x,.68,-10);m.visible=false;m.userData.fpsOccluder=true;root.add(m);covers.push(m);}
  const bolts=Array.from({length:12},()=>{const mesh=new T.Mesh(boltGeo,boltMat);mesh.raycast=()=>{};mesh.visible=false;boltsRoot.add(mesh);return{mesh,velocity:new T.Vector3(),life:0,active:false};});
  const drones=[0,1].map(i=>{
    const group=new T.Group();group.name='NOVA_RANGE_DRONE_'+(i+1);group.userData.rangeTarget=true;
    group.position.set(i===0?-3.4:3.4,1.9,i===0?-7:-13);
    const hull=new T.Mesh(droneGeo,armorMat);hull.scale.set(1.25,.78,1.05);hull.userData.rangeTarget=true;group.add(hull);
    const lens=new T.Mesh(lensGeo,lensMat);lens.position.set(0,.02,-.34);lens.userData.rangeTarget=true;group.add(lens);
    group.userData.hp=100;root.add(group);
    return{group,hp:100,state:'patrol',timer:1.2+i*1.4,fireTimer:2.2+i*.8,home:group.position.clone(),waypoint:new T.Vector3(i===0?-1.8:1.8,2.15,-8-i*4),cover:i,flash:0,dead:false,meshes:[hull,lens]};
  });
  const state={active:false,manual:false,disposed:false,kills:0};
  const inRange=()=>!!nova.modules?.interior?.active;
  function setActive(v){
    state.active=!!v;root.visible=state.active;boltsRoot.visible=state.active;
    for(const c of covers)c.visible=state.active;
    if(state.active){for(const d of drones)d.group.visible=!d.dead;nova.toast?.('SECURITY DRONES · DODGE THE SLOW BOLTS',2300,'#ff5b91');}
    else for(const b of bolts){b.active=false;b.mesh.visible=false;}
  }
  function activate(options={}){
    const origin=options.origin||nova.modules?.interior?.origin;
    if(origin){root.position.copy(origin);boltsRoot.position.copy(origin);}else{root.position.set(0,0,0);boltsRoot.position.set(0,0,0);}
    root.updateMatrixWorld(true);boltsRoot.updateMatrixWorld(true);
    for(const d of drones)if(d.dead){d.dead=false;d.hp=100;d.group.userData.hp=100;d.group.visible=true;d.group.position.copy(d.home);d.state='patrol';d.timer=1;}
    setActive(true);
  }
  function start(options={}){state.manual=true;activate(options);}
  function stop(){state.manual=false;setActive(false);}
  function loadModel(){
    const isPublic=import.meta.url.includes('/public/modules/');
    const loaderUrl=new URL('../vendor/loaders/GLTFLoader.js',import.meta.url).href;
    const modelUrl=new URL('../models/alien_attack_drone.glb',import.meta.url).href;
    import(loaderUrl).then(({GLTFLoader})=>{
      if(state.disposed||!GLTFLoader)return;
      new GLTFLoader().load(modelUrl,gltf=>{
        if(state.disposed)return;
        const model=gltf.scene,bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
        const scale=1.7/Math.max(size.x,size.y,size.z,.01);
        for(const d of drones){
          const visual=model.clone(true);
          visual.scale.setScalar(scale);
          visual.position.set(-center.x*scale,-center.y*scale,-center.z*scale);
          visual.userData.rangeTarget=true;
          visual.userData.onHit=(dmg,hitInfo)=>hit(d,dmg,hitInfo);
          d.meshes=[];
          visual.traverse(o=>{
            if(o.isMesh){
              o.userData.rangeTarget=true;
              o.userData.onHit=(dmg,hitInfo)=>hit(d,dmg,hitInfo);
              d.meshes.push(o);
            }
          });
          d.visual=visual;
          d.group.add(visual);
          d.group.children[0].visible=false;
        }
      },undefined,()=>{});
    }).catch(()=>{});
  }
  loadModel();
  function fire(d){
    const b=bolts.find(x=>!x.active);if(!b)return;
    camera.getWorldPosition(cameraPos);aim.copy(cameraPos);root.worldToLocal(aim);
    boltStart.copy(d.group.position);boltStart.y+=.1;
    b.mesh.position.copy(boltStart);b.velocity.subVectors(aim,boltStart).normalize().multiplyScalar(4.8);
    b.mesh.visible=true;b.active=true;b.life=4.2;
  }
  function hit(d,damage=25,hitInfo){
    if(d.dead)return;
    d.hp=Math.max(0,d.hp-Math.max(1,Number(damage)||25));d.group.userData.hp=d.hp;d.flash=.22;
    d.group.position.y+=.08;
    d.group.position.x+=(Math.random()-.5)*.06;
    try{
      if(nova.sound?.laserImpact)nova.sound.laserImpact();
      else if(window.sound?.laserImpact)window.sound.laserImpact();
      else nova.sound?.beep?.(380,.08,'sawtooth');
    }catch(_){}
    if(d.hp<=0){
      d.dead=true;d.group.visible=false;state.kills++;
      nova.emit?.('droneDestroyed',{id:d.group.name,kills:state.kills});
      nova.toast?.('DRONE DISABLED',1600,'#75ffd1');
    }else{
      nova.toast?.('DRONE HIT · HP '+d.hp+'%',900,'#00e5ff');
      if(d.hp<=55&&d.state!=='retreat'){d.state='retreat';d.timer=2.8;}
    }
  }
  for(const d of drones){
    d.group.userData.onHit=(damage,hitInfo)=>hit(d,damage,hitInfo);
    for(const m of (d.meshes||[]))m.userData.onHit=(damage,hitInfo)=>hit(d,damage,hitInfo);
  }
  function moveToward(d,target,speed,dt){
    delta.subVectors(target,d.group.position);delta.y=0;const distance=delta.length();
    if(distance<.12)return true;
    delta.multiplyScalar(1/distance);d.group.position.addScaledVector(delta,Math.min(distance,speed*dt));
    d.group.rotation.y=Math.atan2(delta.x,delta.z);d.group.position.y=1.85+Math.sin(performance.now()*.002+d.cover)*.12;
    return distance<.35;
  }
  function tick(dt){
    const should=state.manual||inRange();
    if(should&&!state.active)activate({origin:nova.modules?.interior?.origin});else if(!should&&state.active)setActive(false);
    if(!state.active)return;
    const step=Math.min(.05,Math.max(0,Number(dt)||0));camera.getWorldPosition(cameraPos);cameraLocal.copy(cameraPos);boltsRoot.worldToLocal(cameraLocal);
    for(const d of drones){
      if(d.dead)continue;
      d.timer-=step;d.fireTimer-=step;
      if(d.flash>0){
        d.flash-=step;
        lensMat.emissiveIntensity=3.5;
        if(d.meshes){
          for(const m of d.meshes){
            if(m.material){
              const mats=Array.isArray(m.material)?m.material:[m.material];
              for(const mat of mats){
                if(!mat)continue;
                if(!mat.userData)mat.userData={};
                if(!mat.userData.origEmissive&&mat.emissive){
                  mat.userData.origEmissive=mat.emissive.clone();
                  mat.userData.origEmissiveIntensity=mat.emissiveIntensity??1;
                }
                mat.emissive?.setHex?.(0x00ffff);
                if('emissiveIntensity' in mat)mat.emissiveIntensity=3.2;
              }
            }
          }
        }
      }else{
        lensMat.emissiveIntensity=1.8;
        if(d.meshes){
          for(const m of d.meshes){
            if(m.material){
              const mats=Array.isArray(m.material)?m.material:[m.material];
              for(const mat of mats){
                if(mat?.userData?.origEmissive){
                  mat.emissive?.copy?.(mat.userData.origEmissive);
                  if('emissiveIntensity' in mat)mat.emissiveIntensity=mat.userData.origEmissiveIntensity;
                }
              }
            }
          }
        }
      }
      if(d.state==='patrol'){
        if(moveToward(d,d.waypoint,1.1,step)||d.timer<=0){d.waypoint.set(d.home.x+(Math.random()-.5)*2,2,-5-Math.random()*8);d.state='cover';d.timer=2.4;}
      }else if(d.state==='cover'){
        const cover=coverPositions[d.cover];coverPoint.set(cover.x,1.85,cover.z+2.1);
        if(moveToward(d,coverPoint,1.5,step)||d.timer<=0){d.state='shoot';d.timer=5.5;d.fireTimer=.45;}
      }else if(d.state==='shoot'){
        if(d.fireTimer<=0){fire(d);d.fireTimer=1.9+Math.random()*.5;}
        if(d.timer<=0){d.state='retreat';d.timer=2.5;}
      }else if(d.state==='retreat'){
        if(moveToward(d,d.home,1.7,step)||d.timer<=0){d.state='patrol';d.timer=3+Math.random()*2;}
      }
    }
    for(const b of bolts){
      if(!b.active)continue;
      b.life-=step;boltPrev.copy(b.mesh.position);b.mesh.position.addScaledVector(b.velocity,step);
      if(b.life<=0){b.active=false;b.mesh.visible=false;continue;}
      boltDir.subVectors(b.mesh.position,boltPrev);const travel=boltDir.length();
      if(travel>.0001){boltWorldStart.copy(boltPrev);boltsRoot.localToWorld(boltWorldStart);boltWorldEnd.copy(b.mesh.position);boltsRoot.localToWorld(boltWorldEnd);boltDir.subVectors(boltWorldEnd,boltWorldStart);boltRay.set(boltWorldStart,boltDir.normalize());boltRay.far=travel;const blocked=boltRay.intersectObjects(scene.children,true).some(h=>{let o=h.object,n=0;while(o&&n++<12){if(o.userData?.fpsOccluder)return true;o=o.parent;}return false;});if(blocked){b.active=false;b.mesh.visible=false;continue;}}
      if(b.mesh.position.distanceTo(cameraLocal)<.42){b.active=false;b.mesh.visible=false;nova.modules?.fps_core?.damage?.(11);}
    }
  }
  const off=nova.onTick?.(tick);
  return{ready:true,start,stop,get active(){return state.active;},get kills(){return state.kills;},dispose(){
    state.disposed=true;stop();off?.();scene.remove(root);scene.remove(boltsRoot);
    droneGeo.dispose();lensGeo.dispose();coverGeo.dispose();boltGeo.dispose();armorMat.dispose();lensMat.dispose();coverMat.dispose();boltMat.dispose();
  }};
}
