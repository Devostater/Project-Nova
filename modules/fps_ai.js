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
  // ── Pirate skin (boarding): drone 0 = animated pirate crew, drone 1 = pirate droid (owner models) ──
  const P={want:false,loaded:false,loading:null};
  function applySkin(){
    for(const d of drones){const pv=d.pirate;const on=P.want&&!!pv;if(pv)pv.visible=on;if(d.visual)d.visual.visible=!on;if(!d.visual)d.group.children[0].visible=!on&&d.group.children[0]!==pv;
      if(on){d.meshes=d.pirateMeshes;}else if(d.visual){d.meshes=d.alienMeshes||d.meshes;}}
  }
  function loadPirates(){
    if(P.loading)return P.loading;
    const lu=new URL('../vendor/loaders/GLTFLoader.js',import.meta.url).href,su=new URL('../vendor/utils/SkeletonUtils.js',import.meta.url).href;
    const url=n=>new URL('../models/boarding/'+n+'.glb',import.meta.url).href;
    return P.loading=Promise.all([import(lu),import(su).catch(()=>null)]).then(([{GLTFLoader},SU])=>new Promise(res=>{
      const L=new GLTFLoader();let left=2;const done=()=>{if(--left===0){P.loaded=true;applySkin();res(true);}};
      const fit=(model,h)=>{const b=new T.Box3().setFromObject(model),sz=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());const k=h/Math.max(sz.y,.01);const inner=new T.Group();model.scale.setScalar(k);model.position.set(-c.x*k,-b.min.y*k,-c.z*k);inner.add(model);return inner;};
      const wire=(d,vis)=>{d.pirateMeshes=[];vis.traverse(o=>{o.userData.rangeTarget=true;o.userData.onHit=(dmg,hi)=>hit(d,dmg,hi);if(o.isMesh){o.frustumCulled=false;o.castShadow=true;d.pirateMeshes.push(o);}});vis.userData.rangeTarget=true;vis.visible=false;d.pirate=vis;d.group.add(vis);};
      L.load(url('pirate_crew_rigged_7anim'),g=>{if(state.disposed)return done();const d=drones[0];const src=SU&&SU.clone?SU.clone(g.scene):g.scene;const vis=fit(src,1.8);wire(d,vis);
        d.mixer=new T.AnimationMixer(src);const clip=n=>g.animations.find(a=>a.name.includes(n));
        d.anim={idle:clip('Idle'),walk:clip('Walking'),run:clip('Running'),hit:clip('HeadHit')||clip('KidneyHit'),die:clip('Dying')};d.cur=null;done();},undefined,()=>done());
      L.load(url('pirate_droid'),g=>{if(state.disposed)return done();const d=drones[1];wire(d,fit(g.scene,1.6));done();},undefined,()=>done());
    })).catch(()=>false);
  }
  function play(d,name,once){
    if(!d.mixer||!d.anim||!d.anim[name]||!P.want)return;if(d.cur===name&&!once)return;
    const a=d.mixer.clipAction(d.anim[name]);if(once){a.reset();a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;}else a.setLoop(T.LoopRepeat,Infinity);
    if(d.curAction&&d.curAction!==a)d.curAction.fadeOut(.2);a.reset().fadeIn(.2).play();d.curAction=a;d.cur=name;
  }
  function start(options={}){state.manual=true;P.want=options.skin==='pirate';if(P.want)loadPirates();applySkin();activate(options);}
  function stop(){state.manual=false;P.want=false;applySkin();setActive(false);}
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
          d.visual=visual;d.alienMeshes=d.meshes;
          d.group.add(visual);
          d.group.children[0].visible=false;
        }
      applySkin();},undefined,()=>{});
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
    if(!(P.want&&d.pirate))d.group.position.y+=.08;
    d.group.position.x+=(Math.random()-.5)*.06;
    try{
      if(nova.sound?.laserImpact)nova.sound.laserImpact();
      else if(window.sound?.laserImpact)window.sound.laserImpact();
      else nova.sound?.beep?.(380,.08,'sawtooth');
    }catch(_){}
    if(d.hp<=0){
      d.dead=true;state.kills++;
      if(P.want&&d.mixer&&d.anim&&d.anim.die){play(d,'die',true);setTimeout(()=>{if(d.dead)d.group.visible=false;},2600);}else d.group.visible=false;
      nova.emit?.('droneDestroyed',{id:d.group.name,kills:state.kills});
      nova.toast?.('DRONE DISABLED',1600,'#75ffd1');
    }else{
      nova.toast?.('DRONE HIT · HP '+d.hp+'%',900,'#00e5ff');
      if(d.hp<=55&&d.state!=='retreat'){d.state='retreat';d.timer=2.8;}
      if(P.want&&d.mixer)play(d,'hit',true);
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
    if(should&&!state.active){if(!state.manual){P.want=false;applySkin();}activate({origin:nova.modules?.interior?.origin});}else if(!should&&state.active)setActive(false);
    if(!state.active)return;
    const step=Math.min(.05,Math.max(0,Number(dt)||0));camera.getWorldPosition(cameraPos);cameraLocal.copy(cameraPos);boltsRoot.worldToLocal(cameraLocal);
    for(const d of drones){
      if(d.mixer)d.mixer.update(step);
      if(d.pirate&&P.want){d.pirate.position.y=-d.group.position.y+(d===drones[1]?.6:0);   // crew stands on the deck; the droid hovers low
        if(!d.dead&&d.mixer&&(!d.curAction||d.cur==='idle'||d.cur==='walk'||d.cur==='run'||!d.curAction.isRunning()))play(d,d.state==='shoot'?'idle':d.state==='retreat'?'run':'walk');}
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
