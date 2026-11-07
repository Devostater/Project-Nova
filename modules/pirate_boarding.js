import * as THREE from 'three';
import {build} from './boarding_levels.js';

export function init(nova){
  const scene=nova?.scene,rig=nova?.cameraRig,camera=nova?.camera,ship=nova?.shipGroup;
  if(!scene||!rig||!camera||!ship)return{ready:false,dock(){return false;},board(){return false;}};
  const getMod=name=>nova.modules?.get?.(name)||nova.modules?.[name];
  const point=new THREE.Vector3(),cameraPoint=new THREE.Vector3();
  const disabled=new Map();
  const S={active:false,target:null,docked:null,level:null,section:0,route:[0,1,2,3,4],checkpoint:0,escape:false,escapeLeft:0,lastClock:-1,
    savedPos:null,savedQuat:null,shipVisible:true,startKills:0,wave:1,waveNeed:1,boss:null,bossHp:0,bossFire:0,choices:[],loot:null,marker:null};

  function unitOf(target){
    const combat=target?.userData?.nfUnit||target?.g?.userData?.nfUnit;if(combat)return combat;
    if(target?.isObject3D){
      if(!target.userData.boardingUnit)target.userData.boardingUnit={g:target,alive:true,disabled:!!target.userData.disabled,name:target.userData.boardingName||target.name||'SMALL DERELICT',r:target.userData.radius||20,fac:'derelict',st:{hp:1}};
      return target.userData.boardingUnit;
    }
    return target||null;
  }
  function targetGroup(target){const u=unitOf(target);return u?.g||target?.isObject3D&&target||null;}
  function addBeacon(u){
    if(u.boardingBeacon)return;
    const g=new THREE.Group();g.name='NOVA_BOARDING_BEACON';
    const ring=new THREE.Mesh(new THREE.TorusGeometry(Math.max(5,u.r*.62),.35,8,32),new THREE.MeshBasicMaterial({color:0xffa02e,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending}));
    ring.rotation.x=Math.PI/2;g.add(ring);
    const light=new THREE.PointLight(0xff7b22,12,Math.max(40,u.r*4),2);g.add(light);g.position.y=Math.max(7,u.r*.75);u.g.add(g);u.boardingBeacon=g;
  }
  function removeBeacon(u){if(!u?.boardingBeacon)return;const g=u.boardingBeacon;u.g?.remove(g);g.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});u.boardingBeacon=null;}
  function registerDisabled(detail){
    const u=unitOf(detail?.unit||detail);if(!u?.g||u.fac!=='pirate')return false;
    const until=performance.now()+Math.max(1,Number(detail?.seconds)||90)*1000;
    u.disabled=true;u.disabledUntil=until;u.tgt=null;u.state='disabled';u.g.userData.disabled=true;u.g.userData.boardingReady=true;u.g.userData.dockingState='disabled';
    disabled.set(u,until);addBeacon(u);
    nova.toast?.(`${u.name} DISABLED · 90 S BOARDING WINDOW · SELECT + DOCK`,4200,'#ff9a3c');
    nova.emit?.('boardingWindowOpened',{target:u.g,unit:u,seconds:90});return true;
  }
  const offDisabled=nova.on?.('pirateDisabled',registerDisabled);

  function expire(u){
    disabled.delete(u);removeBeacon(u);if(!u?.alive)return;
    u.disabled=false;u.g.userData.disabled=false;u.g.userData.boardingReady=false;u.g.userData.docked=false;u.g.userData.dockingState='';
    u.hp=Math.max(u.hp,u.st.hp*.24);u.state='cruise';u.disabledUntil=0;
    if(S.docked===u)S.docked=null;nova.toast?.(`${u.name} RESTORED POWER · BOARDING WINDOW CLOSED`,2600,'#ff765e');
  }

  function dock(target){
    if(S.active)return true;
    const u=unitOf(target),small=!!u?.g?.userData?.boardingSmall||u?.fac==='derelict';if(!u?.alive||(!u.disabled&&!small)||!u.g?.userData?.boardingReady){nova.toast?.('BOARDING REQUIRES A DISABLED PIRATE FRIGATE OR DERELICT',2300,'#ff9a5e');return false;}
    const distance=u.g.position.distanceTo(ship.position),range=Math.max(220,u.r+120);
    if(distance>range){nova.toast?.(`MOVE CLOSER TO BOARD · ${Math.round(distance)} M / ${Math.round(range)} M`,2200,'#ffaa33');return false;}
    if(S.docked===u&&u.g.userData.docked)return board(u.g);
    S.docked=u;u.g.userData.docked=true;u.g.userData.dockingState='docked';
    nova.shipBody?.velocity?.set?.(0,0,0);nova.shipBody?.angularVelocity?.set?.(0,0,0);
    nova.toast?.(`ALONGSIDE ${u.name} · BOARD READY · PRESS DOCK AGAIN OR E`,3500,'#42e8ff');
    nova.emit?.('pirateDocked',{target:u.g,unit:u});return true;
  }

  function clearLevel(){
    getMod('fps_ai')?.stop?.();
    if(S.level){scene.remove(S.level.root);S.level.root.userData.dispose?.();S.level=null;}
    if(S.marker){scene.remove(S.marker);S.marker.geometry?.dispose?.();S.marker.material?.dispose?.();S.marker=null;}
    clearBoss();clearChoices();
  }
  function exitMarker(position,color=0x2de5ff){
    const m=new THREE.Mesh(new THREE.TorusGeometry(.72,.08,8,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));
    m.position.copy(position);m.rotation.x=Math.PI/2;scene.add(m);S.marker=m;
  }
  function loadSection(routeIndex,fromCheckpoint=false){
    clearLevel();S.section=THREE.MathUtils.clamp(routeIndex,0,S.route.length-1);const levelIndex=S.route[S.section];S.level=build(levelIndex);scene.add(S.level.root);
    const spawn=S.escape?S.level.exits.find(e=>e.id==='forward').position.clone().add(new THREE.Vector3(0,0,1.1)):S.level.spawn.clone();
    rig.position.copy(spawn);rig.quaternion.identity();camera.rotation.set(0,0,0);S.checkpoint=S.section;
    const exit=S.level.exits.find(e=>e.id===(S.escape?'aft':'forward'));exitMarker(exit.position,S.escape?0xff533f:0x2de5ff);
    const ai=getMod('fps_ai');S.startKills=ai?.kills||0;S.wave=1;S.waveNeed=S.route.length<5?1:[1,2,3,2,2][levelIndex];ai?.start?.({origin:S.level.root.position});
    getMod('fps_core')?.enable?.({mode:S.escape?'BOARDING · EVAC':'PIRATE BOARDING',speed:S.escape?3.8:3.05,bounds:[-7.4,7.4,-17.3,7.2],onExit:reason=>evacuate(reason),onInteract:()=>interact()});
    if(levelIndex===4&&!S.escape)spawnBoss();
    nova.emit?.('boardingCheckpoint',{section:levelIndex,index:S.section,restarted:!!fromCheckpoint});
    nova.toast?.(`CHECKPOINT ${S.section+1}/${S.route.length} · ${['AIRLOCK','CREW QUARTERS','CARGO BAY','ENGINEERING','CAPTAIN’S BRIDGE'][levelIndex]}`,2800,'#44eaff');
  }

  function spawnBoss(){
    const g=new THREE.Group();g.name='PIRATE_CAPTAIN';g.position.set(0,1.05,-11);g.userData.rangeTarget=true;
    const armor=new THREE.MeshStandardMaterial({color:0x74232a,metalness:.72,roughness:.35}),glow=new THREE.MeshStandardMaterial({color:0xff9b32,emissive:0xff3b0b,emissiveIntensity:1.8});
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.42,1.05,5,10),armor);g.add(body);const visor=new THREE.Mesh(new THREE.BoxGeometry(.52,.16,.12),glow);visor.position.set(0,.58,-.36);g.add(visor);
    g.userData.health=300;g.userData.onHit=damage=>{if(!S.active||S.boss!==g)return;S.bossHp=Math.max(0,S.bossHp-(Number(damage)||25));g.userData.health=S.bossHp;if(!S.bossHp){g.visible=false;nova.toast?.('CAPTAIN DOWN · CLEAR THE BRIDGE GUARD',2800,'#75ffd1');}};
    scene.add(g);S.boss=g;S.bossHp=300;S.bossFire=1.2;
  }
  function clearBoss(){if(!S.boss)return;const g=S.boss;scene.remove(g);g.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});S.boss=null;}
  function label(text,color){
    const c=document.createElement('canvas');c.width=512;c.height=160;const x=c.getContext('2d');x.clearRect(0,0,512,160);x.fillStyle='rgba(3,12,20,.88)';x.fillRect(4,4,504,152);x.strokeStyle=color;x.lineWidth=8;x.strokeRect(6,6,500,148);x.fillStyle=color;x.font='bold 35px monospace';x.textAlign='center';x.fillText(text,256,94);
    const t=new THREE.CanvasTexture(c),m=new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}),p=new THREE.Mesh(new THREE.PlaneGeometry(3.6,1.12),m);p.userData.labelTexture=t;return p;
  }
  function showChoices(){
    clearChoices();[['LOOT CORE + CARGO',0xffb14a,-2,()=>choose('loot')],['SELF-DESTRUCT',0xff5264,2,()=>choose('self-destruct')]].forEach(([text,color,x,fn])=>{
      const p=label(text,'#'+color.toString(16).padStart(6,'0'));p.position.set(x,1.65,-10);p.userData.fpsInteract=fn;scene.add(p);S.choices.push(p);
    });
  }
  function clearChoices(){for(const p of S.choices){scene.remove(p);p.geometry.dispose();p.material.map?.dispose?.();p.material.dispose();}S.choices=[];}

  function board(target,options={}){
    if(S.active)return true;const u=unitOf(target||S.docked);const force=!!options.force;
    if(!force&&(!u?.disabled||!u.g?.userData?.docked)){nova.toast?.('DOCK ALONGSIDE THE DISABLED SHIP FIRST',2200,'#ff9a5e');return false;}
    S.active=true;S.target=u||null;S.route=options.small||u?.g?.userData?.boardingSmall||u?.fac==='derelict'?[0,2]:[0,1,2,3,4];S.section=0;S.escape=false;S.loot=null;S.bossHp=0;
    S.savedPos=rig.position.clone();S.savedQuat=rig.quaternion.clone();S.shipVisible=ship.visible;ship.visible=false;nova.setActive?.(true);
    if(u){u.disabledUntil=Infinity;disabled.set(u,Infinity);}nova.emit?.('pirateBoardingStarted',{target:u?.g||null,small:S.route.length<5});loadSection(0);
    return true;
  }
  function enemiesClear(){const ai=getMod('fps_ai');return !ai||((ai.kills||0)-S.startKills>=2);}
  function waveStep(){
    if(S.escape||S.wave>=S.waveNeed)return;const ai=getMod('fps_ai');if(!ai||((ai.kills||0)-S.startKills<2))return;
    S.wave++;ai.stop?.();S.startKills=ai.kills||0;ai.start?.({origin:S.level.root.position});nova.toast?.(`PIRATE REINFORCEMENTS · WAVE ${S.wave}/${S.waveNeed}`,1800,'#ff6b72');
  }
  function sectionClear(){return S.wave>=S.waveNeed&&enemiesClear();}
  function interact(){
    if(!S.active)return false;
    camera.getWorldPosition(cameraPoint);
    for(const p of S.choices)if(p.visible&&p.position.distanceTo(cameraPoint)<3.2){p.userData.fpsInteract();return true;}
    const exit=S.level?.exits.find(e=>e.id===(S.escape?'aft':'forward'));if(exit&&exit.position.distanceTo(cameraPoint)<2.4){advance();return true;}return false;
  }
  function advance(){
    if(!S.active)return false;
    if(S.escape){if(S.section<=0){finishEscape();return true;}loadSection(S.section-1);return true;}
    if(!sectionClear()){nova.toast?.(`HOSTILES REMAIN · WAVE ${S.wave}/${S.waveNeed}`,1600,'#ff6b72');return false;}
    if(S.section===S.route.length-1){if(S.bossHp>0)nova.toast?.('THE PIRATE CAPTAIN STILL HOLDS THE BRIDGE',1800,'#ff6b72');else{if(!S.choices.length)showChoices();nova.toast?.('CHOOSE LOOT OR SELF-DESTRUCT',1800,'#ffb04a');}return false;}
    loadSection(S.section+1);return true;
  }
  function choose(choice){
    if(!S.active||S.bossHp>0)return false;clearChoices();
    if(choice==='loot'){
      S.loot={credits:4000,cargo:3,cores:1};nova.awardBoardingLoot?.(S.loot);
      const morality=getMod('morality')||nova.morality;morality?.add?.(-5,'Looted a disabled pirate fusion core','Useful cargo. They will not be flying home soon.');
      nova.emit?.('fusionCoreChosen',{choice:'take',source:'pirate-boarding'});nova.emit?.('pirateBoardingLooted',S.loot);
      returnToCockpit('loot');
    }
    S.escape=true;S.escapeLeft=75;S.lastClock=-1;const morality=getMod('morality')||nova.morality;morality?.choice?.('self_destruct','scuttle');
    nova.emit?.('fusionCoreChosen',{choice:'self-destruct',source:'pirate-boarding'});nova.toast?.('SELF-DESTRUCT ARMED · 75 SECONDS · RUN TO THE AIRLOCK',3500,'#ff4b45');loadSection(S.section);
    return true;
  }
  function restoreCockpit(){
    clearLevel();getMod('fps_core')?.disable?.();nova.setActive?.(false);ship.visible=S.shipVisible;if(S.savedPos)rig.position.copy(S.savedPos);if(S.savedQuat)rig.quaternion.copy(S.savedQuat);
  }
  function returnToCockpit(reason='abort'){
    if(!S.active)return false;restoreCockpit();S.active=false;
    if(S.target){S.target.g.userData.docked=false;S.target.g.userData.dockingState='disabled';if(S.target.fac==='pirate'){S.target.disabledUntil=performance.now()+30000;disabled.set(S.target,S.target.disabledUntil);if(reason==='loot'){S.target.g.userData.boardingReady=false;S.target.g.userData.boardingComplete=true;}}}
    nova.emit?.('pirateBoardingReturned',{target:S.target?.g||null,reason,loot:S.loot});
    nova.toast?.(reason==='loot'?'BOARDING LOOT SECURED · CORE + CARGO + 4000 CR':'BOARDING ABORTED · RETURNED TO COCKPIT',3000,reason==='loot'?'#ffb14a':'#75ffd1');return true;
  }
  function evacuate(reason='input'){
    if(!S.active)return false;S.loot=null;restoreCockpit();S.active=false;
    if(S.target?.fac==='pirate'){S.target.disabledUntil=performance.now()+30000;disabled.set(S.target,S.target.disabledUntil);S.target.g.userData.docked=false;S.target.g.userData.boardingReady=true;}
    nova.emit?.('pirateBoardingEvacuated',{target:S.target?.g||null,reason});nova.toast?.('EVACUATED · SHIP SAFE · BOARDING LOOT LOST',3200,'#ff6475');return true;
  }
  function finishEscape(){
    const target=S.target;restoreCockpit();S.active=false;nova.toast?.('AIRLOCK CLEAR · WATCH THE PIRATE SHIP',2200,'#ffb04a');
    setTimeout(()=>{if(target){disabled.delete(target);removeBeacon(target);nova.destroyBoardedPirate?.(target);}nova.emit?.('pirateBoardingScuttled',{target:target?.g||null});},1100);
  }
  function tick(dt){
    const now=performance.now();for(const u of nova.combatUnits?.()||[])if(u?.disabled&&!disabled.has(u))registerDisabled({unit:u,seconds:Math.max(1,(u.disabledUntil-now)/1000||90)});
    for(const [u,until] of [...disabled]){if(!u.alive){disabled.delete(u);removeBeacon(u);continue;}if(until!==Infinity&&now>=until)expire(u);else if(u.boardingBeacon)u.boardingBeacon.rotation.y+=(Number(dt)||0)*1.8;}
    if(!S.active)return;const d=Math.min(.05,Math.max(0,Number(dt)||0));camera.getWorldPosition(cameraPoint);waveStep();
    if(!S.escape&&S.route.length===5&&S.section===S.route.length-1&&S.bossHp<=0&&sectionClear()&&!S.choices.length){showChoices();nova.toast?.('BRIDGE SECURED · CHOOSE LOOT OR SELF-DESTRUCT',2600,'#ffb04a');}
    if(S.marker){S.marker.rotation.z+=d*1.5;const exit=S.level?.exits.find(e=>e.id===(S.escape?'aft':'forward'));if(exit&&cameraPoint.distanceTo(exit.position)<1.35)advance();}
    if(S.boss&&S.boss.visible&&!S.escape){S.boss.lookAt(cameraPoint.x,S.boss.position.y,cameraPoint.z);S.bossFire-=d;if(S.bossFire<=0&&S.boss.position.distanceTo(cameraPoint)<30){S.bossFire=1.45;getMod('fps_core')?.damage?.(9);}}
    if(S.escape){S.escapeLeft-=d;const seconds=Math.max(0,Math.ceil(S.escapeLeft));if(seconds<=10||seconds%10===0){if(seconds!==S.lastClock){S.lastClock=seconds;nova.toast?.(`SELF-DESTRUCT ${seconds} · AIRLOCK`,950,seconds<=10?'#ff3636':'#ff9a3c');}}if(S.escapeLeft<=0){const target=S.target;evacuate('blast');setTimeout(()=>{if(target){disabled.delete(target);removeBeacon(target);nova.destroyBoardedPirate?.(target);}},250);}}
  }
  const key=e=>{if(!S.active&&S.docked&&e.code==='KeyE')board(S.docked.g);};window.addEventListener('keydown',key);
  const offTick=nova.onTick?.(tick);
  const test=()=>{const u=nova.spawnBoardingTestTarget?.();if(!u)return null;registerDisabled({unit:u,seconds:900});ship.position.copy(u.g.position).add(new THREE.Vector3(0,0,Math.max(80,u.r+40)));nova.shipBody?.position?.copy?.(ship.position);nova.shipBody?.velocity?.set?.(0,0,0);nova.selectTarget?.(u);return u.name;};
  window.novaTest=Object.assign(window.novaTest||{},{pirateBoarding:test,pirateBoardingBoard:()=>S.docked?board(S.docked.g):false,pirateBoardingState:()=>({active:S.active,section:S.section,checkpoint:S.checkpoint,escape:S.escape,seconds:Math.ceil(S.escapeLeft),disabled:disabled.size})});
  return{ready:true,dock,board,registerDisabled,evacuate,get active(){return S.active;},get docked(){return S.docked?.g||null;},dispose(){offTick?.();offDisabled?.();window.removeEventListener('keydown',key);if(S.active)restoreCockpit();for(const u of disabled.keys())removeBeacon(u);disabled.clear();}};
}
