// Project Nova firing range / interior flow.
// Movement, aiming, weapon input and the helmet HUD are owned by fps_core.
export function init(api) {
  const {THREE,scene,camera,cameraRig,renderer,shipGroup,toast}=api;
  const ORIGIN=new THREE.Vector3(0,-40000,0);
  const tl=new THREE.TextureLoader();
  const tex=(f,rx,ry)=>{const t=tl.load(f);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;};
  const S={active:false,exiting:false,def:null,root:null,targets:[],pos:new THREE.Vector3(),score:0,shots:0,hits:0,sign:null,door:null,ceil:null,front:null,prevParent:null,prevRigPos:null,prevRigQ:null};

  function makeTextPanel(title,subtitle,w=6,h=1.5){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,toneMapped:false}));
    m.userData.draw=()=>{const g=c.getContext('2d');g.clearRect(0,0,1024,256);g.fillStyle='rgba(4,18,28,.94)';g.fillRect(0,0,1024,256);g.strokeStyle='#00e5ff';g.lineWidth=8;g.strokeRect(6,6,1012,244);g.fillStyle='#00e5ff';g.font='bold 62px monospace';g.textAlign='center';g.fillText(title,512,88);g.fillStyle='#ffcc00';g.font='bold 45px monospace';g.fillText(subtitle(),512,164);g.fillStyle='#91b9c9';g.font='28px monospace';g.fillText('Walk through EXIT · Esc / B returns to cockpit',512,226);t.needsUpdate=true;};
    return m;
  }
  function buildRange(){
    const root=new THREE.Group();root.name='NOVA_RANGE';root.position.copy(ORIGIN);
    const W=16,L=60,H=7;
    const floorM=new THREE.MeshStandardMaterial({map:tex('art/textures/tex_metal_floor_1024.jpg',W/4,L/4),roughness:.55,metalness:.7});
    const wallM=new THREE.MeshStandardMaterial({map:tex('art/textures/tex_metal_wall_1024.jpg',L/6,H/6),roughness:.6,metalness:.6});
    const endM=new THREE.MeshStandardMaterial({map:tex('art/textures/tex_metal_wall_1024.jpg',W/6,H/6),roughness:.6,metalness:.6});
    const solid=o=>{o.userData.fpsOccluder=true;return o;};
    const floor=solid(new THREE.Mesh(new THREE.PlaneGeometry(W,L),floorM));floor.rotation.x=-Math.PI/2;floor.position.z=-L/2+6;root.add(floor);
    const ceil=solid(new THREE.Mesh(new THREE.PlaneGeometry(W,L),new THREE.MeshStandardMaterial({color:0x1a2128,roughness:.9})));ceil.rotation.x=Math.PI/2;ceil.position.set(0,H,-L/2+6);root.add(ceil);S.ceil=ceil;
    for(const side of[-1,1]){const w=solid(new THREE.Mesh(new THREE.PlaneGeometry(L,H),wallM));w.rotation.y=-side*Math.PI/2;w.position.set(side*W/2,H/2,-L/2+6);root.add(w);}
    const back=solid(new THREE.Mesh(new THREE.PlaneGeometry(W,H),endM));back.position.set(0,H/2,-L+6);root.add(back);
    const front=solid(new THREE.Mesh(new THREE.PlaneGeometry(W,H),endM));front.rotation.y=Math.PI;front.position.set(0,H/2,6);root.add(front);S.front=front;
    const stripe=new THREE.Mesh(new THREE.PlaneGeometry(W,.6),new THREE.MeshStandardMaterial({map:tex('art/textures/tex_hazard_stripes_1024.jpg',8,.3),roughness:.5}));stripe.rotation.x=-Math.PI/2;stripe.position.set(0,.01,-2);root.add(stripe);
    const rail=new THREE.Mesh(new THREE.BoxGeometry(W-1,.08,.08),new THREE.MeshStandardMaterial({color:0xffaa22,emissive:0x442200,metalness:.8,roughness:.3}));rail.position.set(0,1,-2.2);root.add(rail);
    for(let z=2;z>-L+6;z-=8){const strip=new THREE.Mesh(new THREE.BoxGeometry(W*.7,.05,.3),new THREE.MeshBasicMaterial({color:0xcfefff,toneMapped:false}));strip.position.set(0,H-.05,z);root.add(strip);const light=new THREE.PointLight(0xcfefff,18,16,1.6);light.position.set(0,H-.6,z);root.add(light);}
    root.add(new THREE.HemisphereLight(0x8fb8d8,0x202428,.6));
    const door=new THREE.Mesh(new THREE.PlaneGeometry(2.8,3.5),new THREE.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:.35,toneMapped:false,side:THREE.DoubleSide}));
    door.rotation.y=Math.PI;door.position.set(0,1.75,5.9);door.userData.fpsInteract=()=>exit('door');root.add(door);S.door=door;
    const exitPanel=makeTextPanel('EXIT',()=> 'RETURN TO COCKPIT',3.5,.88);exitPanel.position.set(0,4.15,5.82);exitPanel.rotation.y=Math.PI;exitPanel.userData.draw();exitPanel.userData.fpsInteract=()=>exit('door');root.add(exitPanel);
    const exitPrompt=makeTextPanel('EXIT ARENA',()=> 'CLICK / TOUCH / ESC / B TO LEAVE',2.6,.65);exitPrompt.position.set(0,1.75,5.75);exitPrompt.rotation.y=Math.PI;exitPrompt.userData.draw();exitPrompt.userData.fpsInteract=()=>exit('door');root.add(exitPrompt);
    S.sign=makeTextPanel('FIRING RANGE',()=>{const acc=S.shots?Math.round(100*S.hits/S.shots):0;return 'SCORE '+S.score+'   HITS '+S.hits+'/'+S.shots+'   '+acc+'%';});
    S.sign.position.set(0,5.2,-3);root.add(S.sign);S.sign.userData.draw();
    S.targets=[];const spots=[[-5,-10],[0,-14],[5,-10],[-4,-24],[3,-30],[-1,-42],[6,-46],[-6,-36]];
    for(const [x,z] of spots){
      const post=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1.4),new THREE.MeshStandardMaterial({color:0x556677,metalness:.8}));post.position.set(x,.7,z);root.add(post);
      const pivot=new THREE.Group();pivot.position.set(x,1.4,z);root.add(pivot);
      const disc=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.08,32),new THREE.MeshStandardMaterial({color:0xff3344,emissive:0xff2233,emissiveIntensity:1.2,metalness:.3,roughness:.4}));disc.rotation.x=Math.PI/2;disc.position.y=.55;pivot.add(disc);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.3,.04,8,32),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}));ring.position.set(0,.55,.05);pivot.add(ring);
      const target={pivot,disc,down:0,x,z,sway:Math.random()*6};
      const hitFn=()=>{if(target.down>0)return;target.down=2;S.hits++;S.score+=100;S.sign?.userData.draw?.();};
      disc.userData.rangeTarget=true;disc.userData.onHit=hitFn;
      ring.userData.rangeTarget=true;ring.userData.onHit=hitFn;
      pivot.userData.rangeTarget=true;pivot.userData.onHit=hitFn;
      post.userData.rangeTarget=true;post.userData.onHit=hitFn;
      S.targets.push(target);
    }
    return root;
  }

  const ARENAS={range:{build:buildRange,start:[0,0,3],bounds:[-7.4,7.4,-52,5.4],name:'FIRING RANGE'}};
  let interiorFrames=0;
  function enter(def){
    if(S.active)return true;if(typeof def==='string')def=ARENAS[def];if(!def)return false;
    interiorFrames=0;
    S.def=def;S.root=def.build();
    if(!S.root){exit('load_failed');return false;}
    scene.add(S.root);S.pos.set(def.start[0],0,def.start[2]);S.score=S.shots=S.hits=0;
    S.prevParent=cameraRig.parent;S.prevRigPos=cameraRig.position.clone();S.prevRigQ=cameraRig.quaternion.clone();
    scene.add(cameraRig);cameraRig.quaternion.identity();camera.rotation.set(0,0,0);S.active=true;S.exiting=false;
    const hy=Number(camera.position.y)||0;
    const floorY=renderer?.xr?.isPresenting?(hy>1.25?0:Math.max(0,1.65-hy)):1.65;
    cameraRig.position.set(ORIGIN.x+S.pos.x,ORIGIN.y+floorY,ORIGIN.z+S.pos.z);api.setActive?.(true);
    const colliders=[[-4.55,-1.95,-10.19,-9.81],[1.95,4.55,-10.19,-9.81]].map(c=>({minX:ORIGIN.x+c[0],maxX:ORIGIN.x+c[1],minZ:ORIGIN.z+c[2],maxZ:ORIGIN.z+c[3]}));
    const fps=api.modules?.get?.('fps_core')||api.modules?.fps_core;
    fps?.enable?.({mode:'RANGE',speed:3.2,bounds:[ORIGIN.x+def.bounds[0],ORIGIN.x+def.bounds[1],ORIGIN.z+def.bounds[2],ORIGIN.z+def.bounds[3]],colliders,onExit:()=>exit('input'),onShot:()=>{S.shots++;S.sign?.userData.draw?.();}});
    const fpsAi=api.modules?.get?.('fps_ai')||api.modules?.fps_ai;
    fpsAi?.start?.({origin:S.root.position});
    toast?.(def.name+': WASD/mouse or sticks. Walk through EXIT, Esc or B to leave.',4200,'#00e5ff');return true;
  }
  function exit(reason='exit'){
    if(!S.active||S.exiting)return false;S.exiting=true;S.active=false;
    console.log('[interior] exit called with reason:', reason);
    const fpsAi=api.modules?.get?.('fps_ai')||api.modules?.fps_ai;
    fpsAi?.stop?.();
    const fps=api.modules?.get?.('fps_core')||api.modules?.fps_core;
    fps?.disable?.();
    api.setActive?.(false);
    (S.prevParent||shipGroup).add(cameraRig);
    if (S.prevRigPos) {
      cameraRig.position.copy(S.prevRigPos);
      if (S.prevRigQ) cameraRig.quaternion.copy(S.prevRigQ);
    } else {
      cameraRig.position.set(0, 0, 0);
      cameraRig.quaternion.identity();
    }
    camera.rotation.set(0, 0, 0);
    try {
      if (typeof window !== 'undefined') {
        window._novaRangeNext = false;
        if (typeof history !== 'undefined' && history.replaceState && location.search.includes('arena=')) {
          const u = new URL(location.href);
          u.searchParams.delete('arena');
          history.replaceState({}, '', u.toString());
        }
        if (typeof window.recenterPilotView === 'function') {
          window.recenterPilotView(true);
        }
      }
    } catch(_) {}
    const root=S.root;S.root=null;if(root){scene.remove(root);root.traverse(o=>{o.geometry?.dispose?.();if(o.material){o.material.map?.dispose?.();o.material.dispose?.();}});}
    toast?.('Left the range. Score '+S.score+', '+S.hits+'/'+S.shots+' hits.',3000,'#00e5ff');api.onExit?.({reason,score:S.score,hits:S.hits,shots:S.shots});S.exiting=false;return true;
  }
  function frame(dt){
    if(!S.active||!S.root){if(S.active)exit('root_missing');return;}
    interiorFrames++;
    const hy=Number(camera.position.y)||0;
    const floorY=renderer?.xr?.isPresenting?(hy>1.25?0:Math.max(0,1.65-hy)):1.65;
    const targetY=ORIGIN.y+floorY;
    if(cameraRig.position.y<targetY-8||cameraRig.position.y>targetY+25){
      if(interiorFrames<60){cameraRig.position.y=targetY;}
      else{exit('out_of_bounds');return;}
    }
    S.pos.set(cameraRig.position.x-ORIGIN.x,0,cameraRig.position.z-ORIGIN.z);
    const B=S.def.bounds;
    if(S.pos.x<B[0]-6||S.pos.x>B[1]+6||S.pos.z<B[2]-8||S.pos.z>B[3]+8){
      if(interiorFrames<60){
        cameraRig.position.x=ORIGIN.x+S.def.start[0];cameraRig.position.z=ORIGIN.z+S.def.start[2];
        S.pos.set(S.def.start[0],0,S.def.start[2]);
      }else{exit('out_of_bounds');return;}
    }
    S.pos.x=THREE.MathUtils.clamp(S.pos.x,B[0],B[1]);S.pos.z=THREE.MathUtils.clamp(S.pos.z,B[2],B[3]);
    cameraRig.position.x=ORIGIN.x+S.pos.x;cameraRig.position.z=ORIGIN.z+S.pos.z;
    if(S.pos.z>5.12&&Math.abs(S.pos.x)<1.45){exit('door');return;}
    const isMR=!!(window.isPassthroughActive||(renderer?.xr?.isPresenting&&window.xrSessionType==='immersive-ar'));
    if(S.ceil)S.ceil.visible=!isMR;
    if(S.front)S.front.visible=!isMR;
    if(isMR&&scene.background)scene.background=null;
    const time=performance.now()*.001;
    for(const target of S.targets){if(target.down>0){target.down-=dt;target.pivot.rotation.x=Math.max(-Math.PI/2,target.pivot.rotation.x-dt*8);}else target.pivot.rotation.x=Math.min(0,target.pivot.rotation.x+dt*4);target.pivot.position.x=target.x+Math.sin(time*.6+target.sway)*(Math.abs(target.z)>20?1.5:.4);}
    if(S.door)S.door.material.opacity=.3+.18*Math.sin(time*3);
  }
  if(new URLSearchParams(location.search).get('arena')==='range')queueMicrotask(()=>enter('range'));
  return{enter,exit,frame,get active(){return S.active;},get root(){return S.root;},get origin(){return S.root?.position||ORIGIN;},state:()=>({active:S.active,pos:S.pos.toArray(),score:S.score,hits:S.hits,shots:S.shots,targets:S.targets.length})};
}
