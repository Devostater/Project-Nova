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
  const weaponMeshHolder=new T.Group();weaponMeshHolder.name='NOVA_FPS_WEAPON_HOLDER';pistol.add(weaponMeshHolder);

  // 1. ARC-PISTOL
  const pistolGroup=new T.Group();pistolGroup.name='NOVA_WEAPON_PISTOL';weaponMeshHolder.add(pistolGroup);
  const fallbackGun=new T.Group();fallbackGun.name='NOVA_FPS_PISTOL_FALLBACK';pistolGroup.add(fallbackGun);
  const gunMat=new T.MeshStandardMaterial({color:0x152535,metalness:.82,roughness:.28});
  const glowMat=new T.MeshStandardMaterial({color:0x27dcff,emissive:0x087795,emissiveIntensity:1.4,metalness:.3});
  fallbackGun.add(new T.Mesh(new T.BoxGeometry(.075,.09,.26),gunMat));
  const grip=new T.Mesh(new T.BoxGeometry(.06,.15,.075),gunMat);grip.position.set(0,-.1,.065);fallbackGun.add(grip);
  const muzzle=new T.Mesh(new T.CylinderGeometry(.025,.025,.09,12),glowMat);muzzle.rotation.x=Math.PI/2;muzzle.position.z=-.16;fallbackGun.add(muzzle);

  // 2. VULKAN SCATTER-BLASTER (Heavy shotgun with dual barrels and orange radiator shroud)
  const scatterGroup=new T.Group();scatterGroup.name='NOVA_WEAPON_SCATTER';scatterGroup.visible=false;weaponMeshHolder.add(scatterGroup);
  const scatterMat=new T.MeshStandardMaterial({color:0x1b2028,metalness:.88,roughness:.32});
  const scatterGlowMat=new T.MeshStandardMaterial({color:0xff7722,emissive:0xbb3300,emissiveIntensity:1.8,metalness:.2});
  const scatterBody=new T.Mesh(new T.BoxGeometry(.095,.11,.34),scatterMat);scatterBody.position.set(0,0,-.04);scatterGroup.add(scatterBody);
  const scatterGrip=new T.Mesh(new T.BoxGeometry(.06,.16,.08),scatterMat);scatterGrip.position.set(0,-.11,.07);scatterGrip.rotation.x=-.15;scatterGroup.add(scatterGrip);
  [-.025,.025].forEach(bx=>{
    const bMesh=new T.Mesh(new T.CylinderGeometry(.019,.022,.24,12),scatterMat);bMesh.rotation.x=Math.PI/2;bMesh.position.set(bx,.012,-.25);scatterGroup.add(bMesh);
    const bChoke=new T.Mesh(new T.TorusGeometry(.022,.005,8,16),scatterGlowMat);bChoke.rotation.x=Math.PI/2;bChoke.position.set(bx,.012,-.34);scatterGroup.add(bChoke);
  });
  for(let ri=0;ri<4;ri++){
    const vent=new T.Mesh(new T.BoxGeometry(.08,.012,.02),scatterGlowMat);vent.position.set(0,.062,-.12+ri*.045);scatterGroup.add(vent);
  }

  // 3. LONG-LANCE PLASMA RIFLE (Precision scoped energy lance with blue acceleration coils)
  const rifleGroup=new T.Group();rifleGroup.name='NOVA_WEAPON_RIFLE';rifleGroup.visible=false;weaponMeshHolder.add(rifleGroup);
  const rifleMat=new T.MeshStandardMaterial({color:0x121b26,metalness:.92,roughness:.22});
  const rifleGlowMat=new T.MeshStandardMaterial({color:0x0088ff,emissive:0x0055ff,emissiveIntensity:2.0,metalness:.1});
  const rifleBody=new T.Mesh(new T.BoxGeometry(.07,.095,.46),rifleMat);rifleBody.position.set(0,0,-.06);rifleGroup.add(rifleBody);
  const rifleStock=new T.Mesh(new T.BoxGeometry(.055,.12,.18),rifleMat);rifleStock.position.set(0,-.03,.22);rifleGroup.add(rifleStock);
  const rifleGrip=new T.Mesh(new T.BoxGeometry(.05,.15,.065),rifleMat);rifleGrip.position.set(0,-.11,.05);rifleGrip.rotation.x=-.22;rifleGroup.add(rifleGrip);
  const rifleBarrel=new T.Mesh(new T.CylinderGeometry(.014,.018,.42,12),rifleMat);rifleBarrel.rotation.x=Math.PI/2;rifleBarrel.position.set(0,.015,-.44);rifleGroup.add(rifleBarrel);
  for(let ci=0;ci<4;ci++){
    const coil=new T.Mesh(new T.TorusGeometry(.024,.004,8,16),rifleGlowMat);coil.rotation.x=Math.PI/2;coil.position.set(0,.015,-.30-ci*.065);rifleGroup.add(coil);
  }
  const scopeMount=new T.Mesh(new T.BoxGeometry(.03,.04,.14),rifleMat);scopeMount.position.set(0,.07,-.06);rifleGroup.add(scopeMount);
  const scopeGlass=new T.Mesh(new T.RingGeometry(.012,.022,16),new T.MeshBasicMaterial({color:0x00e5ff,side:T.DoubleSide,transparent:true,opacity:.85}));scopeGlass.position.set(0,.075,-.14);rifleGroup.add(scopeGlass);

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

  // ── Tactical Chest Grenade (Grab from left chest & throw; 3s fuse detonation) ──
  const grenadeGroup=new T.Group();grenadeGroup.name='NOVA_FPS_GRENADE';
  const grenadeBodyGeo=new T.CylinderGeometry(.026,.032,.09,16);
  const grenadeBodyMat=new T.MeshStandardMaterial({color:0x182432,metalness:.85,roughness:.3});
  const grenadeBody=new T.Mesh(grenadeBodyGeo,grenadeBodyMat);grenadeGroup.add(grenadeBody);
  const grenadeCapGeo=new T.SphereGeometry(.028,16,8,0,Math.PI*2,0,Math.PI/2);
  const grenadeCap=new T.Mesh(grenadeCapGeo,grenadeBodyMat);grenadeCap.position.y=.045;grenadeGroup.add(grenadeCap);
  const grenadeRingGeo=new T.TorusGeometry(.032,.004,8,24);
  const grenadeRingMat=new T.MeshBasicMaterial({color:0x00f0ff,toneMapped:false});
  const grenadeRing=new T.Mesh(grenadeRingGeo,grenadeRingMat);grenadeRing.rotation.x=Math.PI/2;grenadeGroup.add(grenadeRing);
  const grenadePinGeo=new T.TorusGeometry(.01,.0025,6,16);
  const grenadePinMat=new T.MeshStandardMaterial({color:0xff4433,metalness:.6,roughness:.4});
  const grenadePin=new T.Mesh(grenadePinGeo,grenadePinMat);grenadePin.position.set(.024,.05,0);grenadePin.rotation.y=Math.PI/2;grenadeGroup.add(grenadePin);
  grenadeGroup.visible=false;grenadeGroup.raycast=()=>{};grenadeGroup.traverse(o=>{o.raycast=()=>{};});scene.add(grenadeGroup);

  const grenadeChestPos=new T.Vector3(),grenadeVel=new T.Vector3(),grenadeTempPos=new T.Vector3();
  let grenadeState='holstered',grenadeFuse=3.0,grenadeCooldown=0;

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

  // VR Collimated Laser Sight Beam (from gun barrel to target point)
  const laserBeamGeo = new T.BufferGeometry();
  laserBeamGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
  const laserBeamMat = new T.LineBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.85,
    blending: T.AdditiveBlending,
    depthWrite: false
  });
  const laserBeamLine = new T.Line(laserBeamGeo, laserBeamMat);
  laserBeamLine.name = 'NOVA_FPS_LASER_SIGHT';
  laserBeamLine.renderOrder = 9999;
  laserBeamLine.visible = false;
  laserBeamLine.raycast = () => {};
  scene.add(laserBeamLine);

  // ── Floating 360° Locomotion Joystick Orb (Left-Hand Virtual Joystick) ──
  const locoGroup = new T.Group();
  locoGroup.name = 'NOVA_FPS_LOCO_ORB';
  const locoBaseRingGeo = new T.TorusGeometry(0.046, 0.0035, 12, 32);
  const locoBaseRingMat = new T.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.65, side: T.DoubleSide });
  const locoBaseRing = new T.Mesh(locoBaseRingGeo, locoBaseRingMat);
  locoGroup.add(locoBaseRing);

  // 4 Directional Cardinal Ticks on Base Ring
  const locoTicks = new T.Group();
  const tickGeo = new T.PlaneGeometry(0.003, 0.012);
  const tickMat = new T.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75, side: T.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const tick = new T.Mesh(tickGeo, tickMat);
    tick.position.set(0, 0.046, 0).applyAxisAngle(new T.Vector3(0, 0, 1), i * Math.PI / 2);
    tick.rotation.z = i * Math.PI / 2;
    locoTicks.add(tick);
  }
  locoGroup.add(locoTicks);

  // Dynamic Connecting Laser Tether Line
  const locoTetherGeo = new T.BufferGeometry();
  locoTetherGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
  const locoTetherMat = new T.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, blending: T.AdditiveBlending });
  const locoTether = new T.Line(locoTetherGeo, locoTetherMat);
  locoGroup.add(locoTether);

  // Deflectable Central Plasma Orb Group
  const locoOrbGroup = new T.Group();
  const locoOrbGeo = new T.SphereGeometry(0.024, 20, 16);
  const locoOrbMat = new T.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x007799,
    emissiveIntensity: 0.8,
    metalness: 0.3,
    roughness: 0.2,
    transparent: true,
    opacity: 0.92
  });
  const locoOrbMesh = new T.Mesh(locoOrbGeo, locoOrbMat);
  locoOrbGroup.add(locoOrbMesh);

  // Outer Aura Glow Ring
  const locoHaloGeo = new T.RingGeometry(0.026, 0.034, 24);
  const locoHaloMat = new T.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5, side: T.DoubleSide, blending: T.AdditiveBlending });
  const locoHalo = new T.Mesh(locoHaloGeo, locoHaloMat);
  locoOrbGroup.add(locoHalo);

  locoGroup.add(locoOrbGroup);
  locoGroup.visible = false;
  locoGroup.raycast = () => {};
  locoGroup.traverse(o => { o.raycast = () => {}; });
  scene.add(locoGroup);

  let locoOrbGrabbed = false, locoSocketPosInit = false;
  const locoSocketPos = new T.Vector3(), tempVec = new T.Vector3(), tempPos = new T.Vector3();
  const camYawFwd = new T.Vector3(), camYawRight = new T.Vector3(), camFwdVec = new T.Vector3();

  const crosshairPos=new T.Vector3();let chLocked=false;
  let currentLockedTargetObj=null,currentLockedPoint=new T.Vector3(),targetLocked=false;

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
        importedGun=model;pistolGroup.add(model);fallbackGun.visible=false;
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

  // Dedicated Plasma Projectile Pool (48 active bolts for multi-weapon arsenal)
  const MAX_PROJECTILES=48;
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
    const core=new T.Mesh(boltCoreGeo,boltCoreMat.clone());core.raycast=()=>{};group.add(core);
    const f1=new T.Mesh(boltFinGeo1,finMat.clone());f1.raycast=()=>{};group.add(f1);
    const f2=new T.Mesh(boltFinGeo2,finMat.clone());f2.raycast=()=>{};group.add(f2);
    const tip=new T.Sprite(tipFlareMat.clone());tip.scale.set(.36,.36,.36);tip.position.set(0,0,-.34);tip.raycast=()=>{};group.add(tip);
    const tail=new T.Sprite(tailFlareMat.clone());tail.scale.set(.24,.24,.24);tail.position.set(0,0,.30);tail.raycast=()=>{};group.add(tail);
    group.visible=false;group.raycast=()=>{};group.traverse(o=>{o.raycast=()=>{};});
    projRoot.add(group);
    projPool.push({mesh:group,core,f1,f2,tip,tail,pos:new T.Vector3(),prevPos:new T.Vector3(),vel:new T.Vector3(),dir:new T.Vector3(),spawnPos:new T.Vector3(),life:0,active:false,dist:0,speed:75,damage:25});
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

  // ── First-Person Armored Pilot Forearm & Glove gripping the pistol ──
  const armSleeveMat = new T.MeshStandardMaterial({ color: 0x14202e, metalness: 0.72, roughness: 0.35 });
  const armArmorMat = new T.MeshStandardMaterial({ color: 0x1f364d, metalness: 0.88, roughness: 0.25 });
  const armGlowMat = new T.MeshBasicMaterial({ color: 0x00f0ff, toneMapped: false });
  const gloveLeatherMat = new T.MeshStandardMaterial({ color: 0x121b24, metalness: 0.45, roughness: 0.6 });

  const fpArm = new T.Group(); fpArm.name = 'NOVA_FPS_RIGHT_ARM';
  const forearmMesh = new T.Mesh(new T.CylinderGeometry(0.042, 0.052, 0.38, 12), armSleeveMat);
  forearmMesh.position.set(-0.012, -0.17, 0.19);
  forearmMesh.rotation.set(-0.58, 0.22, 0.25);
  fpArm.add(forearmMesh);

  const forearmPlate = new T.Mesh(new T.BoxGeometry(0.065, 0.24, 0.018), armArmorMat);
  forearmPlate.position.set(0, 0, 0.046);
  forearmMesh.add(forearmPlate);

  const forearmStripe = new T.Mesh(new T.BoxGeometry(0.012, 0.19, 0.006), armGlowMat);
  forearmStripe.position.set(0, 0, 0.01);
  forearmPlate.add(forearmStripe);

  const gloveHand = new T.Mesh(new T.BoxGeometry(0.068, 0.088, 0.076), gloveLeatherMat);
  gloveHand.position.set(0, -0.095, 0.038);
  fpArm.add(gloveHand);

  const knuckleGuard = new T.Mesh(new T.BoxGeometry(0.072, 0.026, 0.022), armArmorMat);
  knuckleGuard.position.set(0, 0.022, 0.035);
  gloveHand.add(knuckleGuard);

  const thumbGrip = new T.Mesh(new T.CylinderGeometry(0.011, 0.013, 0.064, 8), armArmorMat);
  thumbGrip.rotation.set(0.3, 0.4, 1.2);
  thumbGrip.position.set(-0.032, -0.065, 0.025);
  fpArm.add(thumbGrip);

  const triggerFinger = new T.Mesh(new T.CylinderGeometry(0.009, 0.011, 0.055, 8), armArmorMat);
  triggerFinger.rotation.set(1.4, 0.2, -0.2);
  triggerFinger.position.set(0.026, -0.042, -0.025);
  fpArm.add(triggerFinger);

  fpArm.userData.isPlayer = true;
  fpArm.raycast = () => {};
  fpArm.traverse(o => { o.userData.isPlayer = true; o.raycast = () => {}; if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  pistol.add(fpArm);

  // ── Full 3D Nova Pilot Character (Look-Down Presence & 3rd Person Showcase) ──
  function createPilotCharacter() {
    const g = new T.Group(); g.name = 'NOVA_FPS_PILOT_CHARACTER';
    const suitMat = new T.MeshStandardMaterial({ color: 0x162232, metalness: 0.72, roughness: 0.32 });
    const armorMat = new T.MeshStandardMaterial({ color: 0x1f364d, metalness: 0.88, roughness: 0.24 });
    const cyanGlow = new T.MeshBasicMaterial({ color: 0x00f0ff, toneMapped: false });
    const goldVisorMat = new T.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00c8ea, emissiveIntensity: 1.5, metalness: 0.9, roughness: 0.1 });
    const darkMat = new T.MeshStandardMaterial({ color: 0x0a1017, roughness: 0.6 });

    // 1. Torso
    const torsoGroup = new T.Group(); torsoGroup.name = 'TORSO';
    const chest = new T.Mesh(new T.BoxGeometry(0.48, 0.54, 0.28), suitMat);
    chest.position.y = 1.18;
    torsoGroup.add(chest);

    const chestPlateL = new T.Mesh(new T.BoxGeometry(0.20, 0.24, 0.04), armorMat);
    chestPlateL.position.set(-0.11, 1.25, 0.14);
    torsoGroup.add(chestPlateL);
    const chestPlateR = new T.Mesh(new T.BoxGeometry(0.20, 0.24, 0.04), armorMat);
    chestPlateR.position.set(0.11, 1.25, 0.14);
    torsoGroup.add(chestPlateR);

    const reactorCore = new T.Mesh(new T.CylinderGeometry(0.038, 0.038, 0.02, 16), cyanGlow);
    reactorCore.rotation.x = Math.PI / 2;
    reactorCore.position.set(0, 1.26, 0.155);
    torsoGroup.add(reactorCore);

    const belt = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.07, 16), darkMat);
    belt.position.y = 0.92;
    torsoGroup.add(belt);
    [-0.14, 0.14].forEach(x => {
      const pouch = new T.Mesh(new T.BoxGeometry(0.08, 0.09, 0.05), armorMat);
      pouch.position.set(x, 0.92, 0.21);
      torsoGroup.add(pouch);
    });
    const holster = new T.Mesh(new T.BoxGeometry(0.08, 0.20, 0.09), darkMat);
    holster.position.set(0.24, 0.82, 0);
    torsoGroup.add(holster);

    const jetpack = new T.Group(); jetpack.name = 'JETPACK'; jetpack.position.set(0, 1.22, -0.19);
    const packBody = new T.Mesh(new T.BoxGeometry(0.34, 0.42, 0.12), armorMat);
    jetpack.add(packBody);
    [-0.11, 0.11].forEach(x => {
      const nozzle = new T.Mesh(new T.CylinderGeometry(0.04, 0.055, 0.14, 12), darkMat);
      nozzle.position.set(x, -0.22, 0);
      jetpack.add(nozzle);
      const nozzleGlow = new T.Mesh(new T.CircleGeometry(0.035, 12), cyanGlow);
      nozzleGlow.rotation.x = Math.PI / 2;
      nozzleGlow.position.set(x, -0.29, 0);
      jetpack.add(nozzleGlow);
    });
    torsoGroup.add(jetpack);
    g.add(torsoGroup);

    // 2. Helmet & Visor
    const headGroup = new T.Group(); headGroup.name = 'HEAD';
    headGroup.position.set(0, 1.58, 0);
    const helmetBase = new T.Mesh(new T.SphereGeometry(0.14, 20, 16), armorMat);
    headGroup.add(helmetBase);
    const crest = new T.Mesh(new T.BoxGeometry(0.05, 0.08, 0.24), armorMat);
    crest.position.set(0, 0.10, -0.02);
    headGroup.add(crest);
    const visor = new T.Mesh(new T.SphereGeometry(0.125, 20, 12, 0, Math.PI, 0, Math.PI * 0.55), goldVisorMat);
    visor.rotation.x = 0.22;
    visor.position.set(0, 0.02, 0.045);
    headGroup.add(visor);
    const neckRing = new T.Mesh(new T.TorusGeometry(0.11, 0.022, 8, 20), darkMat);
    neckRing.rotation.x = Math.PI / 2;
    neckRing.position.y = -0.12;
    headGroup.add(neckRing);
    g.add(headGroup);

    // 3. Legs & Boots
    const leftLegGroup = new T.Group(); leftLegGroup.name = 'LEG_L'; leftLegGroup.position.set(-0.13, 0.88, 0);
    const rightLegGroup = new T.Group(); rightLegGroup.name = 'LEG_R'; rightLegGroup.position.set(0.13, 0.88, 0);

    [leftLegGroup, rightLegGroup].forEach((legGrp) => {
      const thigh = new T.Mesh(new T.CylinderGeometry(0.085, 0.07, 0.38, 12), suitMat);
      thigh.position.y = -0.19;
      legGrp.add(thigh);
      const thighArmor = new T.Mesh(new T.BoxGeometry(0.12, 0.22, 0.035), armorMat);
      thighArmor.position.set(0, -0.18, 0.065);
      legGrp.add(thighArmor);
      const knee = new T.Mesh(new T.BoxGeometry(0.11, 0.09, 0.07), armorMat);
      knee.position.set(0, -0.40, 0.05);
      legGrp.add(knee);
      const shin = new T.Mesh(new T.CylinderGeometry(0.068, 0.062, 0.36, 12), suitMat);
      shin.position.y = -0.58;
      legGrp.add(shin);
      const shinArmor = new T.Mesh(new T.BoxGeometry(0.10, 0.24, 0.025), armorMat);
      shinArmor.position.set(0, -0.58, 0.055);
      legGrp.add(shinArmor);
      const boot = new T.Mesh(new T.BoxGeometry(0.11, 0.10, 0.22), darkMat);
      boot.position.set(0, -0.82, 0.04);
      legGrp.add(boot);
      const soleGlow = new T.Mesh(new T.BoxGeometry(0.09, 0.015, 0.18), cyanGlow);
      soleGlow.position.set(0, -0.87, 0.04);
      legGrp.add(soleGlow);
      g.add(legGrp);
    });

    // 4. Arms
    const leftArmGroup = new T.Group(); leftArmGroup.name = 'ARM_L'; leftArmGroup.position.set(-0.29, 1.40, 0);
    const rightArmGroup = new T.Group(); rightArmGroup.name = 'ARM_R'; rightArmGroup.position.set(0.29, 1.40, 0);

    const lShoulder = new T.Mesh(new T.SphereGeometry(0.095, 12, 10), armorMat);
    leftArmGroup.add(lShoulder);
    const lUpper = new T.Mesh(new T.CylinderGeometry(0.055, 0.048, 0.28, 10), suitMat);
    lUpper.position.set(-0.02, -0.15, 0.04);
    lUpper.rotation.set(0.4, 0, 0.2);
    leftArmGroup.add(lUpper);
    const lForearm = new T.Mesh(new T.CylinderGeometry(0.048, 0.042, 0.28, 10), suitMat);
    lForearm.position.set(-0.01, -0.32, 0.18);
    lForearm.rotation.set(1.2, 0.1, -0.3);
    leftArmGroup.add(lForearm);
    const lWristPad = new T.Mesh(new T.BoxGeometry(0.08, 0.015, 0.09), cyanGlow);
    lWristPad.position.set(0, 0.045, 0);
    lForearm.add(lWristPad);
    g.add(leftArmGroup);

    const rShoulder = new T.Mesh(new T.SphereGeometry(0.095, 12, 10), armorMat);
    rightArmGroup.add(rShoulder);
    const rUpper = new T.Mesh(new T.CylinderGeometry(0.055, 0.048, 0.28, 10), suitMat);
    rUpper.position.set(0.02, -0.14, -0.06);
    rUpper.rotation.set(-1.1, 0.1, -0.2);
    rightArmGroup.add(rUpper);
    const rForearm = new T.Mesh(new T.CylinderGeometry(0.048, 0.042, 0.30, 10), suitMat);
    rForearm.position.set(0.01, -0.22, -0.28);
    rForearm.rotation.set(-1.4, 0, 0);
    rightArmGroup.add(rForearm);

    // Blaster in right glove for 3rd-person showcase
    const rHandGlove = new T.Mesh(new T.BoxGeometry(0.065, 0.08, 0.07), gloveLeatherMat);
    rHandGlove.position.set(0, -0.16, 0.02);
    rForearm.add(rHandGlove);

    // 3P Arc-Pistol
    const charBlaster = new T.Group(); charBlaster.name = 'CHAR_WEAPON_PISTOL';
    const charBlasterBody = new T.Mesh(new T.BoxGeometry(0.045, 0.08, 0.22), armorMat);
    charBlasterBody.position.set(0, -0.04, -0.11);
    charBlaster.add(charBlasterBody);
    const charBlasterBarrel = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.12, 8), darkMat);
    charBlasterBarrel.rotation.x = Math.PI / 2;
    charBlasterBarrel.position.set(0, 0.02, -0.14);
    charBlaster.add(charBlasterBarrel);
    const charBlasterGlow = new T.Mesh(new T.BoxGeometry(0.015, 0.015, 0.12), cyanGlow);
    charBlasterGlow.position.set(0, 0.038, -0.02);
    charBlaster.add(charBlasterGlow);
    rHandGlove.add(charBlaster);

    // 3P Vulkan Scatter-Blaster
    const charScatter = new T.Group(); charScatter.name = 'CHAR_WEAPON_SCATTER'; charScatter.visible = false;
    const charScatterBody = new T.Mesh(new T.BoxGeometry(0.06, 0.09, 0.26), armorMat);
    charScatterBody.position.set(0, -0.04, -0.12);
    charScatter.add(charScatterBody);
    [-0.016, 0.016].forEach(bx => {
      const bMesh = new T.Mesh(new T.CylinderGeometry(0.012, 0.014, 0.16, 8), darkMat);
      bMesh.rotation.x = Math.PI / 2;
      bMesh.position.set(bx, 0.012, -0.21);
      charScatter.add(bMesh);
    });
    const charScatterGlow = new T.Mesh(new T.BoxGeometry(0.035, 0.016, 0.12), new T.MeshBasicMaterial({ color: 0xff7722, toneMapped: false }));
    charScatterGlow.position.set(0, 0.025, -0.10);
    charScatter.add(charScatterGlow);
    rHandGlove.add(charScatter);

    // 3P Plasma Lance Rifle
    const charRifle = new T.Group(); charRifle.name = 'CHAR_WEAPON_RIFLE'; charRifle.visible = false;
    const charRifleBody = new T.Mesh(new T.BoxGeometry(0.045, 0.08, 0.38), armorMat);
    charRifleBody.position.set(0, -0.03, -0.16);
    charRifle.add(charRifleBody);
    const charRifleBarrel = new T.Mesh(new T.CylinderGeometry(0.010, 0.012, 0.30, 8), darkMat);
    charRifleBarrel.rotation.x = Math.PI / 2;
    charRifleBarrel.position.set(0, 0.015, -0.32);
    charRifle.add(charRifleBarrel);
    const charRifleGlow = new T.Mesh(new T.BoxGeometry(0.018, 0.018, 0.20), new T.MeshBasicMaterial({ color: 0x0088ff, toneMapped: false }));
    charRifleGlow.position.set(0, 0.028, -0.22);
    charRifle.add(charRifleGlow);
    rHandGlove.add(charRifle);

    g.add(rightArmGroup);

    g.userData.isPlayer = true;
    g.raycast = () => {};
    g.traverse(o => { o.userData.isPlayer = true; o.raycast = () => {}; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    return {
      group: g,
      torso: torsoGroup,
      head: headGroup,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      charBlaster,
      charScatter,
      charRifle
    };
  }
  const pilotChar = createPilotCharacter();
  pilotChar.group.visible = false;
  rig.add(pilotChar.group);

  // ── Multi-Weapon Tactical Arsenal Definition ──
  const WEAPONS = [
    { id: 'pistol', name: 'ARC-PISTOL', type: 'sidearm', cooldown: 160, damage: 25, speed: 48, pellets: 1, spread: 0, recoilKick: 0.045, recoilPitch: 0.06, color: 0x00f0ff, coreColor: 0xbaffff, muzzleColor: 0xbffcff, soundFreq: 880 },
    { id: 'scatter', name: 'VULKAN SCATTER', type: 'shotgun', cooldown: 440, damage: 16, speed: 44, pellets: 6, spread: 0.075, recoilKick: 0.12, recoilPitch: 0.18, color: 0xff7722, coreColor: 0xffe088, muzzleColor: 0xffaa44, soundFreq: 380 },
    { id: 'rifle', name: 'PLASMA LANCE', type: 'rifle', cooldown: 320, damage: 60, speed: 85, pellets: 1, spread: 0, recoilKick: 0.07, recoilPitch: 0.10, color: 0x3388ff, coreColor: 0xddeeff, muzzleColor: 0x77ccff, soundFreq: 1100 }
  ];
  let activeWeaponIdx = 0;
  let activeWeapon = WEAPONS[0];
  let wpnBtn = null;

  function updateWeaponVisuals() {
    const isP = activeWeapon.id === 'pistol';
    const isS = activeWeapon.id === 'scatter';
    const isR = activeWeapon.id === 'rifle';
    pistolGroup.visible = isP;
    scatterGroup.visible = isS;
    rifleGroup.visible = isR;
    if (pilotChar.charBlaster) pilotChar.charBlaster.visible = isP;
    if (pilotChar.charScatter) pilotChar.charScatter.visible = isS;
    if (pilotChar.charRifle) pilotChar.charRifle.visible = isR;
    if (isP) {
      muzzleFlash.position.set(0, .025, -.21);
      muzzleRing.position.set(0, .025, -.24);
    } else if (isS) {
      muzzleFlash.position.set(0, .014, -.36);
      muzzleRing.position.set(0, .014, -.38);
    } else if (isR) {
      muzzleFlash.position.set(0, .015, -.65);
      muzzleRing.position.set(0, .015, -.67);
    }
    if (wpnBtn) {
      wpnBtn.textContent = isP ? 'ARC' : (isS ? 'SCTR' : 'RNGE');
      const c = '#' + (activeWeapon.color.toString(16).padStart(6, '0'));
      wpnBtn.style.color = c;
      wpnBtn.style.borderColor = c;
      wpnBtn.style.boxShadow = `0 0 18px ${c}55`;
    }
  }

  function playWeaponSwitchSound(){
    try{
      const ctx=nova.sound?.ctx||window.sound?.ctx;
      if(ctx){
        if(ctx.state==='suspended')ctx.resume?.();
        const t=ctx.currentTime, osc=ctx.createOscillator(), g=ctx.createGain();
        osc.type='sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.06);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.07);
      }
    }catch(_){}
  }

  function setWeapon(idOrIdx) {
    let targetIdx = -1;
    if (typeof idOrIdx === 'number') {
      targetIdx = (idOrIdx % WEAPONS.length + WEAPONS.length) % WEAPONS.length;
    } else if (typeof idOrIdx === 'string') {
      const q = idOrIdx.toLowerCase();
      targetIdx = WEAPONS.findIndex(w => w.id === q || w.name.toLowerCase().includes(q) || w.type.includes(q));
    }
    if (targetIdx < 0) return false;
    activeWeaponIdx = targetIdx;
    activeWeapon = WEAPONS[activeWeaponIdx];
    updateWeaponVisuals();
    playWeaponSwitchSound();
    drawHud();
    const hexColor = '#' + activeWeapon.color.toString(16).padStart(6, '0');
    nova.toast?.(`🔫 ARMED: ${activeWeapon.name} [${activeWeapon.type.toUpperCase()}]`, 1800, hexColor);
    return true;
  }

  function cycleWeapon(dir = 1) {
    const next = (activeWeaponIdx + dir % WEAPONS.length + WEAPONS.length) % WEAPONS.length;
    setWeapon(next);
  }

  window.novaSetFpsWeapon = setWeapon;
  window.novaCycleFpsWeapon = cycleWeapon;

  let isThirdPerson = false, walkCycleTimer = 0;
  function toggleThirdPerson(force){
    if(!active || renderer?.xr?.isPresenting) return;
    isThirdPerson = (typeof force === 'boolean') ? force : !isThirdPerson;
    if(isThirdPerson){
      pilotChar.head.visible = true;
      camera.position.set(0.42, 0.24, 2.15);
      nova.toast?.('🎥 THIRD-PERSON SHOWCASE CAM (Key C / V)', 2200, '#00f0ff');
    }else{
      pilotChar.head.visible = false;
      camera.position.set(0, 0, 0);
      nova.toast?.('🎯 FIRST-PERSON VIEW (Key C / V)', 1800, '#00ffcc');
    }
  }
  window.novaToggleFPSCamera = toggleThirdPerson;
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
  let active=false,weaponOn=true,lastFire=0,lastDamage=0,health=100,shield=100,maxShield=100,yaw=0,pitch=0,hudTimer=0,muzzleTimer=0;
  let timeSinceDamage=0,ctrlTpHeld=false;
  let rightController=null,leftController=null,rightGrip=null,leftGrip=null,rightHand=null,leftHand=null,rightIsHand=false,leftIsHand=false;
  let leftPinchHeld=false,rightPinchHeld=false,leftPinchTime=0,leftPinchUsed=false,rightPinchTime=0,rightPinchUsed=false,rightPinchAimTime=0,bothPinchTime=0,bothPinchExit=false,snapHeld=false,padExitHeld=false,padUseHeld=false,session=null,exiting=false,pointerWasLocked=false;
  let xrSwapHeld=false,padSwapHeld=false,wristTapHeld=false,lMidPinchHeld=false;
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
    c.fillStyle=health>35?'#65ffad':'#ff596d';c.fillText('HULL '+Math.round(health)+'%',350,438);
    c.fillStyle='#58dfff';c.fillText('SHIELD '+Math.round(shield)+'%',500,438);
    c.fillStyle=weaponOn?('#'+activeWeapon.color.toString(16).padStart(6,'0')):'#8295a0';c.fillText(weaponOn?activeWeapon.name:'HANDS',650,438);
    c.font='bold 21px monospace';c.fillStyle=grenadeState==='holstered'?'#33e5ff':'#ff9933';
    c.fillText(grenadeState==='holstered'?'GRENADE:READY':(grenadeState==='cooldown'?'GRENADE:RELOAD':'GRENADE:'+Math.max(0,grenadeFuse).toFixed(1)+'s'),810,438);
    c.font='18px monospace';c.fillStyle='#a9d8e8';c.fillText(renderer?.xr?.isPresenting?'PINCH/STICK: TELEPORT · FIST: MOVE · GRENADE: LEFT CHEST · R-PINCH: FIRE':'WASD MOVE · CLICK FIRE · Q WEAPON · G GRENADE · E USE · C/V CAM · ESC EXIT',70,464);
    hudTexture.needsUpdate=true;
  }

  function joint(hand,name){
    if(!name)return null;
    if(hand?.joints?.[name])return hand.joints[name];
    if(hand?.getObjectByName?.(name))return hand.getObjectByName(name);
    for(let i=0;i<2;i++){
      const h=renderer?.xr?.getHand?.(i);
      if(h?.joints?.[name])return h.joints[name];
      if(h?.getObjectByName?.(name))return h.getObjectByName(name);
    }
    return null;
  }
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
  let handGunYaw=(function(){try{const q=new URLSearchParams(location.search);if(q.has('gunyaw'))return(parseFloat(q.get('gunyaw'))||0)*Math.PI/180;}catch(_){}return 0;})();
  let handGunPitch=(function(){try{const q=new URLSearchParams(location.search);if(q.has('gunpitch'))return(parseFloat(q.get('gunpitch'))||0)*Math.PI/180;}catch(_){}return -0.14;})();
  let handGunRoll=(function(){try{const q=new URLSearchParams(location.search);if(q.has('gunroll'))return(parseFloat(q.get('gunroll'))||0)*Math.PI/180;}catch(_){}return Math.PI/2;})();
  function setWeaponParent(parent,hand=false){
    if(!parent)return;
    if(pistol.parent!==parent)parent.add(pistol);
    pistol.position.set(hand ? .018 : .015,(hand ? -.018 : -.035) + recoilPitch*.03,(hand ? -.075 : -.09) + recoilKick);
    pistol.rotation.set((hand ? handGunPitch : 0) - recoilPitch,hand ? handGunYaw : 0,hand ? handGunRoll : 0);
  }
  function playLaserSound(wpn=activeWeapon){
    try{
      const ctx=nova.sound?.ctx||window.sound?.ctx;
      if(ctx){
        if(ctx.state==='suspended')ctx.resume?.();
        const t=ctx.currentTime;
        if(wpn?.id==='scatter'){
          const osc=ctx.createOscillator(),g=ctx.createGain();
          osc.type='sawtooth';osc.frequency.setValueAtTime(340,t);osc.frequency.exponentialRampToValueAtTime(75,t+.13);
          g.gain.setValueAtTime(.26,t);g.gain.exponentialRampToValueAtTime(.001,t+.14);
          osc.connect(g);g.connect(ctx.destination);osc.start(t);osc.stop(t+.14);
        }else if(wpn?.id==='rifle'){
          const osc=ctx.createOscillator(),g=ctx.createGain();
          osc.type='triangle';osc.frequency.setValueAtTime(1350,t);osc.frequency.exponentialRampToValueAtTime(310,t+.11);
          g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.115);
          osc.connect(g);g.connect(ctx.destination);osc.start(t);osc.stop(t+.115);
        }else{
          const osc=ctx.createOscillator(),g=ctx.createGain();
          osc.type='triangle';osc.frequency.setValueAtTime(560,t);osc.frequency.exponentialRampToValueAtTime(140,t+.08);
          g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.085);
          osc.connect(g);g.connect(ctx.destination);osc.start(t);osc.stop(t+.085);
        }
      }else if(nova.sound?.laser)nova.sound.laser();
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
         node===tpMarker||node===crosshairGroup||node===projRoot||node===vfxRoot||node===locoGroup||
         node.userData?.isPlayer||node.userData?.fpsIgnore){
        return true;
      }
      if(node.name&&(node.name.startsWith('NOVA_FPS_')||node.name==='NOVA_HELMET_HUD'))return true;
      node=node.parent;
    }
    return false;
  }
  function aimRay(){
    if(renderer?.xr?.isPresenting&&rightIsHand&&rightIndexValid&&rightWristValid){
      origin.copy(rightIndex);
      direction.subVectors(rightIndex,rightWrist).normalize();
      origin.addScaledVector(direction,.05);
    }else if(renderer?.xr?.isPresenting&&session&&(rightController||rightGrip)){
      const src=rightController||rightGrip;
      src.getWorldPosition(origin);
      src.getWorldQuaternion(controllerQ);
      direction.set(0,0,-1).applyQuaternion(controllerQ).normalize();
      origin.addScaledVector(direction,.12);
    }else if(renderer?.xr?.isPresenting&&weaponOn&&pistol&&pistol.parent){
      pistol.getWorldPosition(origin);
      pistol.getWorldQuaternion(controllerQ);
      direction.set(0,0,-1).applyQuaternion(controllerQ).normalize();
      origin.addScaledVector(direction,.22);
    }else{
      camera.getWorldPosition(origin);camera.getWorldDirection(direction).normalize();
      origin.addScaledVector(direction,.32);
    }
    ray.set(origin,direction);ray.camera=camera;   // sprites need the camera to raycast
    try{
      const rawHits=ray.intersectObjects(scene.children,true);
      return rawHits.filter(h=>!isPlayerHierarchy(h.object)&&h.distance>.20);
    }catch(e){return [];}
  }
  function findUserData(object,key){
    let node=object,depth=0;
    while(node&&depth++<12){if(node.userData&&node.userData[key])return node;node=node.parent;}
    return null;
  }
  function applyDamageToTarget(hitObject,damage=25,hitInfo={}){
    let node=hitObject,depth=0,hitApplied=false,mainTarget=null;
    while(node&&depth++<12){
      if(isPlayerHierarchy(node))return null;
      if(node.userData){
        const u=node.userData;
        const isTarget=u.rangeTarget||u.enemy||u.fpsEnemy||u.isEnemy||u.nfUnit||
                       (typeof u.onHit==='function')||(typeof u.takeDamage==='function')||
                       (typeof u.damage==='function')||(typeof u.health==='number')||(typeof u.hp==='number');
        if(isTarget){
          if(!mainTarget)mainTarget=node;
          if(typeof u.onHit==='function'){try{u.onHit(damage,hitInfo);hitApplied=true;}catch(_){}}
          if(typeof u.takeDamage==='function'){try{u.takeDamage(damage,hitInfo);hitApplied=true;}catch(_){}}
          if(typeof u.damage==='function'){try{u.damage(damage);hitApplied=true;}catch(_){}}
          if(typeof u.health==='number'){
            u.health=Math.max(0,u.health-damage);hitApplied=true;
            if(u.health===0){node.visible=false;try{u.onKilled?.();}catch(_){}}
          }
          if(typeof u.hp==='number'){
            u.hp=Math.max(0,u.hp-damage);hitApplied=true;
            if(u.hp===0){node.visible=false;try{u.onKilled?.();}catch(_){}}
          }
        }
      }
      node=node.parent;
    }
    return hitApplied?mainTarget:null;
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

  function triggerMuzzleFlash(wpn=activeWeapon){
    muzzleTimer=.09;
    muzzleFlash.visible=true;
    const isS=wpn?.id==='scatter', isR=wpn?.id==='rifle';
    const sScale=isS?2.2:(isR?1.6:1.4);
    muzzleFlash.scale.set(sScale,sScale,sScale);
    muzzleFlash.material.color.setHex(wpn?.muzzleColor||0xbffcff);
    muzzleRing.visible=true;
    muzzleRing.scale.set(isS?1.8:(isR?1.3:1),isS?1.8:(isR?1.3:1),1);
    muzzleRing.material.color.setHex(wpn?.color||0x00f0ff);
  }

  const spawnPos=new T.Vector3(),spawnDir=new T.Vector3(),camWorldPos=new T.Vector3(),camRightVec=new T.Vector3(),camUpVec=new T.Vector3(),projRightVec=new T.Vector3();
  function launchProjectile(sideOffset=0,spreadX=0,spreadY=0,speedVal=48,damageVal=25,glowCol=0x00f0ff,coreCol=0xbaffff){
    if(renderer?.xr?.isPresenting&&rightIsHand&&rightIndexValid&&rightWristValid){
      spawnPos.copy(rightIndex).addScaledVector(direction,.05);
      spawnDir.copy(direction);
      projRightVec.set(1,0,0).applyQuaternion(camera.quaternion);
      if(sideOffset)spawnPos.addScaledVector(projRightVec,sideOffset);
    }else if(renderer?.xr?.isPresenting&&session&&(rightController||rightGrip)){
      const src=rightController||rightGrip;
      src.getWorldPosition(spawnPos);
      src.getWorldQuaternion(controllerQ);
      spawnDir.set(0,0,-1).applyQuaternion(controllerQ).normalize();
      projRightVec.set(1,0,0).applyQuaternion(controllerQ);
      spawnPos.addScaledVector(spawnDir,.14);
      if(sideOffset)spawnPos.addScaledVector(projRightVec,sideOffset);
    }else if(renderer?.xr?.isPresenting&&weaponOn&&pistol&&pistol.parent){
      pistol.getWorldPosition(spawnPos);
      pistol.getWorldQuaternion(controllerQ);
      spawnDir.set(0,0,-1).applyQuaternion(controllerQ).normalize();
      projRightVec.set(1,0,0).applyQuaternion(controllerQ);
      spawnPos.addScaledVector(spawnDir,.22);
      if(sideOffset)spawnPos.addScaledVector(projRightVec,sideOffset);
    }else if(isThirdPerson){
      pilotChar.rightArm.getWorldPosition(spawnPos);
      camera.getWorldDirection(spawnDir).normalize();
      projRightVec.set(1,0,0).applyQuaternion(camera.quaternion);
      spawnPos.addScaledVector(spawnDir,.42);
      if(sideOffset)spawnPos.addScaledVector(projRightVec,sideOffset);
    }else{
      camera.getWorldPosition(camWorldPos);
      camera.getWorldQuaternion(controllerQ);
      camRightVec.set(1,0,0).applyQuaternion(controllerQ);
      camUpVec.set(0,1,0).applyQuaternion(controllerQ);
      camera.getWorldDirection(spawnDir).normalize();
      spawnPos.copy(camWorldPos)
        .addScaledVector(camRightVec,.24 + sideOffset)
        .addScaledVector(camUpVec,-.18)
        .addScaledVector(spawnDir,.42);
    }

    // Direct bolt toward crosshair / locked target point if active
    if(targetLocked&&currentLockedPoint&&currentLockedPoint.lengthSq()>0.001){
      spawnDir.subVectors(currentLockedPoint,spawnPos).normalize();
    }else if(crosshairGroup.visible){
      spawnDir.subVectors(crosshairGroup.position,spawnPos).normalize();
    }
    // Apply shotgun / weapon dispersion
    if(spreadX||spreadY){
      camRightVec.set(1,0,0).applyQuaternion(camera.quaternion);
      camUpVec.set(0,1,0).applyQuaternion(camera.quaternion);
      spawnDir.addScaledVector(camRightVec,spreadX).addScaledVector(camUpVec,spreadY).normalize();
    }

    const p=projPool.find(x=>!x.active)||projPool[0];
    p.active=true;
    p.life=1.6;
    p.dist=0;
    p.damage=damageVal;
    p.pos.copy(spawnPos);
    p.prevPos.copy(spawnPos);
    p.spawnPos.copy(spawnPos);
    p.dir.copy(spawnDir);
    p.vel.copy(spawnDir).multiplyScalar(speedVal);
    p.lockedTarget=targetLocked?currentLockedTargetObj:null;
    p.lockedPos=targetLocked?crosshairGroup.position.clone():null;
    p.mesh.position.copy(spawnPos);
    p.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),spawnDir);
    if(p.core&&p.core.material)p.core.material.color.setHex(coreCol);
    if(p.f1&&p.f1.material)p.f1.material.color.setHex(glowCol);
    if(p.f2&&p.f2.material)p.f2.material.color.setHex(glowCol);
    if(p.tip&&p.tip.material)p.tip.material.color.setHex(coreCol);
    if(p.tail&&p.tail.material)p.tail.material.color.setHex(glowCol);
    p.mesh.visible=true;
  }

  function fire(){
    const overdrive=!!window.novaPewPewOverdrive;
    const isScatter=activeWeapon.id==='scatter';
    const isRifle=activeWeapon.id==='rifle';
    let cooldown=activeWeapon.cooldown;
    if(overdrive&&activeWeapon.id==='pistol')cooldown=70;
    else if(overdrive)cooldown=Math.round(cooldown*0.55);

    const now=performance.now();if(!active||!weaponOn||now-lastFire<cooldown)return false;lastFire=now;
    playLaserSound(activeWeapon);
    try{options.onShot?.();}catch(_){}
    aimRay(); // updates origin and direction cleanly

    const up = (typeof window !== 'undefined' && window.novaFpsUpgrades) ? window.novaFpsUpgrades : {};
    if(isScatter){
      recoilKick=0.12;recoilPitch=0.18;
      const count = up.scatter_choke ? 8 : 6;
      const spreadMult = up.scatter_choke ? 0.65 : 1.0;
      for(let i=0;i<count;i++){
        const a=(i/count)*Math.PI*2+(Math.random()-0.5)*0.5;
        const rad=(0.035+Math.random()*0.038)*spreadMult;
        launchProjectile(0,Math.cos(a)*rad,Math.sin(a)*rad,44,16,0xff7722,0xffe088);
      }
    }else if(isRifle){
      recoilKick=0.07;recoilPitch=0.10;
      const dmg = up.lance_focus ? 90 : 60;
      launchProjectile(0,0,0,85,dmg,0x3388ff,0xddeeff);
    }else{
      recoilKick=overdrive?0.035:0.045;recoilPitch=overdrive?0.04:0.06;
      const dmg = up.arc_cap ? 35 : 25;
      launchProjectile(overdrive ? 0.045 : 0,0,0,overdrive ? 68 : 48,dmg,0x00f0ff,0xbaffff);
      if(overdrive)launchProjectile(-0.045,0,0,68,dmg,0x00f0ff,0xbaffff);
    }
    triggerMuzzleFlash(activeWeapon);
    nova.emit?.('fpsWeaponFired',{mode:options.mode||'fps',weapon:activeWeapon.id});
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
  function explodeGrenade(pos){
    grenadeState='cooldown';grenadeCooldown=3.5;grenadeGroup.visible=false;
    playImpactSound();
    try{if(nova.sound?.explosion)nova.sound.explosion();else if(window.sound?.explosion)window.sound.explosion();}catch(_){}
    spawnImpactVfx(pos,new T.Vector3(0,1,0),true);
    for(let a=0;a<Math.PI*2;a+=Math.PI/3){
      spawnImpactVfx(pos.clone().add(new T.Vector3(Math.cos(a)*.45,0,Math.sin(a)*.45)),new T.Vector3(0,1,0),true);
    }
    try{
      scene.traverse(node=>{
        if(!node.visible||isPlayerHierarchy(node))return;
        const tPos=node.getWorldPosition(new T.Vector3());
        const dist=tPos.distanceTo(pos);
        if(dist<=6.0){
          const dmg=Math.round(150*(1-dist/6.0));
          const hitTarget=applyDamageToTarget(node,dmg,{origin:pos.clone(),point:tPos.clone(),normal:new T.Vector3(0,1,0)});
          if(hitTarget){
            nova.emit?.('targetHit',{target:hitTarget,damage:dmg,point:tPos,aoe:true});
          }
        }
      });
    }catch(_){}
    camera.getWorldPosition(origin);
    const pDist=origin.distanceTo(pos);
    if(pDist<4.5)damage(Math.round(60*(1-pDist/4.5)));
    nova.toast?.('💥 GRENADE DETONATED',1400,'#ffaa33');
  }

  function damage(amount){
    let n=Math.max(0,Number(amount)||0);
    timeSinceDamage=0;
    const prevShield=shield;
    const absorbed=Math.min(shield,n);
    shield-=absorbed;
    n-=absorbed;
    health=Math.max(0,health-n);
    lastDamage=1.25;
    if(!renderer?.xr?.isPresenting){
      damageOverlay.style.background=absorbed>0?'radial-gradient(transparent 46%, rgba(0,220,255,.55) 100%)':'radial-gradient(transparent 46%, rgba(220,10,20,.60) 100%)';
      damageOverlay.style.opacity='1';
    }
    if(prevShield>0&&shield<=0){
      try{nova.sound?.beep?.(240,.18,'sawtooth');}catch(_){}
      nova.toast?.('SHIELD DEPLETED',1400,'#ff4455');
    }
    drawHud();
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
    camera.getWorldPosition(origin);
    const b=options.bounds;
    if(b){
      if(origin.x<b[0])rig.position.x+=b[0]-origin.x;
      else if(origin.x>b[1])rig.position.x+=b[1]-origin.x;
      if(origin.z<b[2])rig.position.z+=b[2]-origin.z;
      else if(origin.z>b[3])rig.position.z+=b[3]-origin.z;
    }
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
  function throwGrenadeForward(){
    if(!active||grenadeState!=='holstered')return;
    camera.getWorldPosition(camWorldPos);
    camera.getWorldDirection(spawnDir);
    grenadeGroup.position.copy(camWorldPos).addScaledVector(spawnDir,.4);
    grenadeVel.copy(spawnDir).multiplyScalar(15).add(new T.Vector3(0,3.2,0));
    grenadeState='thrown';
    grenadeFuse=3.0;
    grenadeGroup.visible=true;
    try{if(nova.sound?.switchClick)nova.sound.switchClick();}catch(_){}
    nova.toast?.('💥 GRENADE THROWN · 3s FUSE',1400,'#ffaa00');
  }

  function keyDown(e){
    if(!active)return;down.add(e.code);
    if(!/^F\d+$/.test(e.code))e.stopImmediatePropagation();   // flight keys are disabled while on foot (F-keys still reach the browser)
    if(e.code==='Escape'){e.preventDefault();requestExit('keyboard');}
    else if(e.code==='Space'){e.preventDefault();fire();}
    else if(e.code==='KeyE'||e.code==='Enter'){e.preventDefault();interact();}
    else if(e.code==='KeyG'){e.preventDefault();throwGrenadeForward();}
    else if(e.code==='KeyC'||e.code==='KeyV'){e.preventDefault();toggleThirdPerson();}
    else if(e.code==='KeyQ'){e.preventDefault();cycleWeapon(1);}
    else if(e.code==='Digit1'){e.preventDefault();setWeapon('pistol');}
    else if(e.code==='Digit2'){e.preventDefault();setWeapon('scatter');}
    else if(e.code==='Digit3'){e.preventDefault();setWeapon('rifle');}
  }
  function onWheel(e){
    if(!active||!weaponOn)return;
    e.preventDefault();
    if(e.deltaY>0)cycleWeapon(1);
    else if(e.deltaY<0)cycleWeapon(-1);
  }
  function keyUp(e){down.delete(e.code);}
  function onXRSelect(e){
    if(!active||!weaponOn)return;
    if(tpMarker&&tpMarker.visible)return;
    fire();
  }
  function tick(dt){
    if(!active)return;const d=Math.min(.05,Math.max(0,Number(dt)||0));
    lastDamage=Math.max(0,lastDamage-d);
    if(!lastDamage)damageOverlay.style.opacity='0';
    timeSinceDamage+=d;
    if(timeSinceDamage>3.5&&shield<maxShield){
      const prevS=shield;shield=Math.min(maxShield,shield+d*25);
      if(Math.floor(shield/5)!==Math.floor(prevS/5))drawHud();
    }
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

      // Direct hit check for locked target
      if(p.lockedTarget && p.lockedPos){
        if(p.pos.distanceTo(p.lockedPos) < Math.max(0.85, stepDist * 1.5)){
          p.active=false;p.mesh.visible=false;
          playImpactSound();
          hitNormal.copy(p.dir).negate();
          const hitTarget=applyDamageToTarget(p.lockedTarget,p.damage||25,{origin:p.prevPos.clone(),point:p.lockedPos.clone(),normal:hitNormal.clone()});
          nova.emit?.('targetHit',{target:hitTarget||p.lockedTarget,damage:p.damage||25,point:p.lockedPos});
          spawnImpactVfx(p.lockedPos,hitNormal,true);
          continue;
        }
      }

      if(stepDist>.0001){
        stepRay.set(p.prevPos,p.dir);
        stepRay.far=stepDist * 1.25;
        let rawHits=[];
        try{rawHits=stepRay.intersectObjects(scene.children,true);}catch(_){rawHits=[];}
        for(const hit of rawHits){
          if(isPlayerHierarchy(hit.object))continue;
          if(p.dist<.22&&hit.distance<.22)continue;
          if(hit.object.visible===false)continue;
          if(hit.face&&hit.face.normal){
            hit.object.getWorldQuaternion(hitObjQ);
            hitNormal.copy(hit.face.normal).applyQuaternion(hitObjQ).normalize();
          }else{
            hitNormal.copy(p.dir).negate();
          }

          const target=applyDamageToTarget(hit.object,p.damage||25,{origin:p.prevPos.clone(),point:hit.point.clone(),normal:hitNormal.clone()});
          if(target){
            p.active=false;p.mesh.visible=false;
            playImpactSound();
            nova.emit?.('targetHit',{target,damage:p.damage||25,point:hit.point});
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

    const curSession=renderer?.xr?.getSession?.()||null;
    if(curSession!==session){
      if(session){try{session.removeEventListener('selectstart',onXRSelect);}catch(_){}}
      session=curSession;
      if(session){try{session.addEventListener('selectstart',onXRSelect);}catch(_){}}
    }
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
      trigger=!rightIsHand&&(((rightSource?.gamepad?.buttons?.[0]?.value||0)>.45)||((rightSource?.gamepad?.buttons?.[1]?.value||0)>.75));
      use=!rightIsHand&&(!!rightSource?.gamepad?.buttons?.[4]?.pressed||!!rightSource?.gamepad?.buttons?.[1]?.pressed);
      leave=!rightIsHand&&!!rightSource?.gamepad?.buttons?.[5]?.pressed;
      // VR Controller Weapon Swap: Left controller X (btn 4), Y (btn 5), or Right stick click (btn 3)
      const xrSwap=!leftIsHand&&(!!leftSource?.gamepad?.buttons?.[4]?.pressed||!!leftSource?.gamepad?.buttons?.[5]?.pressed||(!rightIsHand&&!!rightSource?.gamepad?.buttons?.[3]?.pressed));
      if(xrSwap&&!xrSwapHeld){cycleWeapon(leftSource?.gamepad?.buttons?.[5]?.pressed?-1:1);}
      xrSwapHeld=xrSwap;
      if(turn){if(!snapHeld){rig.rotation.y-=Math.sign(turn)*Math.PI/6;snapHeld=true;}}else snapHeld=false;
      const isMR=window.isPassthroughActive||(renderer?.xr?.isPresenting&&window.xrSessionType==='immersive-ar');
      const ctrlTp=!leftIsHand&&((la[1]<-.60)||!!leftSource?.gamepad?.buttons?.[3]?.pressed);
      if(ctrlTp||tpMarker.visible){mx=0;mz=0;}
      walk(mx,mz,d);if(trigger)fire();if(use&&!padUseHeld)interact();if(leave&&!padExitHeld)requestExit('vr');
      padUseHeld=use;padExitHeld=leave;
      const leftThumbValid=leftIsHand&&handPoint(leftHand,'thumb-tip',leftThumb);
      const leftIndexValid=leftIsHand&&handPoint(leftHand,'index-finger-tip',leftIndex);
      const leftMiddleValid=leftIsHand&&handPoint(leftHand,'middle-finger-tip',leftMiddle);
      const leftWristValid=leftIsHand&&handPoint(leftHand,'wrist',leftWrist);
      const leftPinch=leftIsHand&&leftThumbValid&&leftIndexValid&&leftThumb.distanceTo(leftIndex)<.055;
      const leftMidPinch=leftIsHand&&leftThumbValid&&leftMiddleValid&&leftThumb.distanceTo(leftMiddle)<.052;
      if(leftMidPinch&&!lMidPinchHeld){cycleWeapon(1);}
      lMidPinchHeld=leftMidPinch;

      const rightThumbValid=rightIsHand&&handPoint(rightHand,'thumb-tip',rightThumb);
      const rightIndexValid=rightIsHand&&handPoint(rightHand,'index-finger-tip',rightIndex);
      const rightMiddleValid=rightIsHand&&handPoint(rightHand,'middle-finger-tip',rightMiddle);
      const rightWristValid=rightIsHand&&handPoint(rightHand,'wrist',rightWrist);
      const rPinchDist=(rightThumbValid&&rightIndexValid)?rightThumb.distanceTo(rightIndex):999;
      const rMidPinchDist=(rightThumbValid&&rightMiddleValid)?rightThumb.distanceTo(rightMiddle):999;
      const rIndexCurled=(rightIndexValid&&rightWristValid)?(rightIndex.distanceTo(rightWrist)<.142):false;
      const rightPinch=rightIsHand&&(rPinchDist<.065||rMidPinchDist<.065||rIndexCurled);
      if(leftPinch&&!leftPinchHeld){leftPinchTime=0;leftPinchUsed=false;}if(leftPinch)leftPinchTime+=d;
      if(rightPinch&&!rightPinchHeld){rightPinchTime=0;rightPinchUsed=false;}if(rightPinch)rightPinchTime+=d;
      if(leftPinch&&rightPinch&&!weaponOn){bothPinchTime+=d;if(bothPinchTime>=1.0&&!bothPinchExit){bothPinchExit=true;requestExit('hands');}}else{bothPinchTime=0;bothPinchExit=false;}

      // ── Smooth Floor Teleportation (Controller forward ray / Left stick click) ──
      const floorY=rig.position.y;
      if(ctrlTp&&leftController){
        leftController.getWorldPosition(origin);
        leftController.getWorldQuaternion(controllerQ);
        direction.set(0,0,-1).applyQuaternion(controllerQ).normalize();
        if(direction.y<-0.04){
          const t=(floorY-origin.y)/direction.y;
          if(t>0.2&&t<35){
            const hitX=origin.x+direction.x*t,hitZ=origin.z+direction.z*t;
            const b=options.bounds;
            const cx=(b&&!isMR)?T.MathUtils.clamp(hitX,b[0],b[1]):hitX,cz=(b&&!isMR)?T.MathUtils.clamp(hitZ,b[2],b[3]):hitZ;
            tpHit.set(cx,floorY+.02,cz);
            tpMarker.position.copy(tpHit);
            tpMarker.visible=true;
            tpValid=true;
          }else{tpMarker.visible=false;tpValid=false;}
        }else{tpMarker.visible=false;tpValid=false;}
      }
      if(!ctrlTp&&ctrlTpHeld&&tpValid&&tpMarker.visible){
        camera.getWorldPosition(origin);
        const cDx=origin.x-rig.position.x,cDz=origin.z-rig.position.z;
        rig.position.x=tpHit.x-cDx;
        rig.position.z=tpHit.z-cDz;
        try{(nova.sound||window.sound)?.beep?.(900,.05);}catch(_){}
        tpMarker.visible=false;tpValid=false;
      }
      ctrlTpHeld=ctrlTp;

      // ── Right Pinch Floor Teleport (Keep right hand pinch to teleport; left hand does NOT teleport) ──
      let rightAimingAtFloor=false;
      if(rightPinch&&!leftPinch&&rightIsHand&&rightIndexValid){
        camera.getWorldPosition(origin);
        const pDir=new T.Vector3().subVectors(rightIndex,origin).normalize();
        if(pDir.y<-0.05){
          rightAimingAtFloor=true;
          rightPinchAimTime+=d;
          if(rightPinchAimTime>=0.14){
            const t=(floorY-origin.y)/pDir.y;
            if(t>0.2&&t<35){
              const hitX=origin.x+pDir.x*t,hitZ=origin.z+pDir.z*t;
              const b=options.bounds;
              const cx=(b&&!isMR)?T.MathUtils.clamp(hitX,b[0],b[1]):hitX,cz=(b&&!isMR)?T.MathUtils.clamp(hitZ,b[2],b[3]):hitZ;
              tpHit.set(cx,floorY+.02,cz);
              tpMarker.position.copy(tpHit);
              tpMarker.visible=true;
              tpValid=true;
            }else{tpMarker.visible=false;tpValid=false;}
          }else{tpMarker.visible=false;tpValid=false;}
        }else{
          tpMarker.visible=false;tpValid=false;rightPinchAimTime=0;
        }
      }else{
        if(tpMarker.visible&&tpValid&&!rightPinch&&rightPinchHeld){
          camera.getWorldPosition(origin);
          const cDx=origin.x-rig.position.x,cDz=origin.z-rig.position.z;
          rig.position.x=tpHit.x-cDx;
          rig.position.z=tpHit.z-cDz;
          try{(nova.sound||window.sound)?.beep?.(900,.05);}catch(_){}
          rightPinchUsed=true;
        }
        tpMarker.visible=false;tpValid=false;rightPinchAimTime=0;
      }

      // ── Floating 360° Locomotion Orb (Left-Hand Virtual Joystick) ──
      locoGroup.visible=true;
      camera.getWorldPosition(camWorldPos);
      camera.getWorldDirection(camFwdVec);
      camYawFwd.set(camFwdVec.x,0,camFwdVec.z).normalize();
      if(camYawFwd.lengthSq()<0.001)camYawFwd.set(0,0,-1);
      camYawRight.crossVectors(camYawFwd,up).normalize();

      // Ergonomic hover target: 24cm below head, 22cm to left, 32cm forward
      const targetSocketPos=new T.Vector3()
        .copy(camWorldPos)
        .addScaledVector(up,-0.24)
        .addScaledVector(camYawRight,-0.22)
        .addScaledVector(camYawFwd,0.32);

      if(!locoSocketPosInit){
        locoSocketPos.copy(targetSocketPos);
        locoSocketPosInit=true;
      }else{
        locoSocketPos.lerp(targetSocketPos,Math.min(1.0,d*10.0));
      }
      locoGroup.position.copy(locoSocketPos);
      locoGroup.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),camYawFwd);
      locoGroup.rotateX(Math.PI/6);

      // Check Left Hand position & grabbing state
      const lHandWorld=new T.Vector3();
      let leftHandPosValid=false,leftSqueezing=false;
      if(leftIsHand){
        if(leftIndexValid||leftWristValid){
          lHandWorld.copy(leftIndexValid?leftIndex:leftWrist);
          leftHandPosValid=true;
          const hasLeftMid=handPoint(leftHand,'middle-finger-tip',leftMiddle);
          const curled=leftWristValid&&((hasLeftMid&&leftMiddle.distanceTo(leftWrist)<.14)||(leftIndexValid&&leftIndex.distanceTo(leftWrist)<.14));
          leftSqueezing=leftPinch||curled;
        }
      }else if(leftController||leftGrip){
        const lCtrl=leftGrip||leftController;
        lCtrl.getWorldPosition(lHandWorld);
        leftHandPosValid=true;
        const gp=leftSource?.gamepad;
        const gripPress=(gp?.buttons?.[1]?.value>0.25)||!!gp?.buttons?.[1]?.pressed;
        const trigPress=(gp?.buttons?.[0]?.value>0.25)||!!gp?.buttons?.[0]?.pressed;
        leftSqueezing=gripPress||trigPress;
      }

      locoOrbGroup.getWorldPosition(tempPos);
      const grabDist=leftHandPosValid?lHandWorld.distanceTo(tempPos):999;
      const isNearOrb=grabDist<0.26;
      if(!locoOrbGrabbed){
        if(leftHandPosValid&&isNearOrb&&leftSqueezing){
          locoOrbGrabbed=true;
          try{(nova.sound||window.sound)?.click?.();}catch(_){}
        }
      }else{
        if(!leftHandPosValid||!leftSqueezing||grabDist>0.45){
          locoOrbGrabbed=false;
        }
      }

      // ── Weapon Firing: Right Pinch (aiming forward/up) OR Left Pinch Debug Fire ──
      // Right hand pinch fires weapon when aiming forward/up (not aiming down at floor)
      if(rightPinch&&weaponOn&&!tpMarker.visible&&!rightAimingAtFloor){
        if(!rightPinchHeld||(performance.now()-lastFire>=200))fire();
      }

      // Left hand pinch: FPS gun fires for debug ONLY when NOT grabbing or near the locomotion orb
      if(leftPinch&&weaponOn&&!locoOrbGrabbed&&!isNearOrb){
        if(!leftPinchHeld||(performance.now()-lastFire>=200))fire();
      }
      // Quick tap without weapon interacts with props/buttons
      if(!leftPinch&&leftPinchHeld&&!weaponOn&&!leftPinchUsed&&leftPinchTime<.32&&!locoOrbGrabbed&&!isNearOrb){interact();}
      leftPinchHeld=leftPinch;rightPinchHeld=rightPinch;

      // Tactical Wrist Weapon Swap: Touch or tap left wrist with right hand index or controller
      if(leftWristValid){
        const rTip=(rightIsHand&&rightIndexValid)?rightIndex:((rightGrip||rightController)?(rightGrip||rightController).position:null);
        if(rTip&&rTip.distanceTo(leftWrist)<0.14){
          if(!wristTapHeld){cycleWeapon(1);wristTapHeld=true;}
        }else{wristTapHeld=false;}
      }

      let orbDeflected=false;
      const MAX_THROW=0.08,DEADZONE=0.010;
      const is3DEVA=!!(options.zeroG||options.isEVA||window.novaIsEvaActive||window.novaEva?.active);

      if(locoOrbGrabbed&&leftHandPosValid){
        const localPos=locoGroup.worldToLocal(lHandWorld.clone());
        if(!is3DEVA){
          localPos.y=0; // In gravity interior/shooting range: restrict virtual joystick to 2D horizontal plane
        }
        const dist=localPos.length();
        if(dist>MAX_THROW){
          localPos.multiplyScalar(MAX_THROW/dist);
        }
        locoOrbGroup.position.copy(localPos);

        locoOrbMat.emissive.setHex(0x00ff88);
        locoOrbMat.color.setHex(0x66ffbb);
        locoHalo.scale.setScalar(1.35);

        if(dist>DEADZONE){
          orbDeflected=true;
          const normMag=Math.min(1.0,(dist-DEADZONE)/(MAX_THROW-DEADZONE));
          const speedCurve=normMag*normMag*0.45+normMag*0.55;
          const moveSpeed=(options.speed||3.2)*speedCurve;

          // Directly map deflection to player movement along camYawRight (X) and camYawFwd (-Z)
          const moveFwd=-localPos.z/MAX_THROW;
          const moveStrafe=localPos.x/MAX_THROW;
          const moveDir=new T.Vector3()
            .addScaledVector(camYawRight,moveStrafe)
            .addScaledVector(camYawFwd,moveFwd);

          if(!is3DEVA){
            // 2D horizontal movement along floor/room plane
            if(moveDir.lengthSq()>0.0001){
              moveDir.normalize().multiplyScalar(moveSpeed*d);
              moveRigXZ(moveDir.x,moveDir.z);
            }
          }else{
            // 3D 360° full 6DOF EVA movement (forward/back, strafe, up/down vertical elevation)
            const moveUp=localPos.y/MAX_THROW;
            moveDir.addScaledVector(up,moveUp);
            if(moveDir.lengthSq()>0.0001){
              const move3D=moveDir.clone().normalize().multiplyScalar(moveSpeed*d);
              rig.position.add(move3D);
              if(window.novaEva&&window.novaEva.active&&window.novaEva.vel){
                window.novaEva.vel.addScaledVector(moveDir.clone().normalize(),moveSpeed*0.45*d);
              }
            }
          }
        }
      }else{
        locoOrbGroup.position.lerp(new T.Vector3(0,0,0),Math.min(1.0,d*18.0));
        locoOrbMat.emissive.setHex(0x007799);
        locoOrbMat.color.setHex(0x00e5ff);
        locoHalo.scale.setScalar(1.0);
      }

      const tetherPosAttr=locoTetherGeo.attributes.position;
      tetherPosAttr.setXYZ(0,0,0,0);
      tetherPosAttr.setXYZ(1,locoOrbGroup.position.x,locoOrbGroup.position.y,locoOrbGroup.position.z);
      tetherPosAttr.needsUpdate=true;

      const vrWalking = (Math.abs(mx) + Math.abs(mz) > 0.01) || orbDeflected;
      if(vrWalking){
        walkCycleTimer += d * 8.0;
        const stride = Math.sin(walkCycleTimer) * 0.38;
        pilotChar.leftLeg.rotation.x = stride;
        pilotChar.rightLeg.rotation.x = -stride;
      }else{
        pilotChar.leftLeg.rotation.x = T.MathUtils.lerp(pilotChar.leftLeg.rotation.x, 0, d * 8);
        pilotChar.rightLeg.rotation.x = T.MathUtils.lerp(pilotChar.rightLeg.rotation.x, 0, d * 8);
      }
      correctRoomScale();
      pilotChar.group.visible = false; // In VR: remove/hide FPS body so it doesn't obstruct player view or hands
      fpArm.visible = false;
    }else{
      if(pistol.parent!==camera){camera.add(pistol);}
      let x=(down.has('KeyD')?1:0)-(down.has('KeyA')?1:0),z=(down.has('KeyS')?1:0)-(down.has('KeyW')?1:0);
      const pads=navigator.getGamepads?.()||[],pad=[...pads].find(p=>p?.connected&&p.mapping==='standard')||[...pads].find(p=>p?.connected&&p.axes?.length>=2);
      let use=false,leave=false;
      if(pad){
        x=Math.abs(pad.axes?.[0]||0)>.17?(pad.axes[0]||0):x;z=Math.abs(pad.axes?.[1]||0)>.17?(pad.axes[1]||0):z;
        yaw-=dead(pad.axes?.[2]||0)*d*2.2;pitch=T.MathUtils.clamp(pitch-dead(pad.axes?.[3]||0)*d*1.8,-1.25,1.25);
        if((pad.buttons?.[7]?.value||0)>.45)fire();use=!!pad.buttons?.[0]?.pressed;leave=!!pad.buttons?.[1]?.pressed;
        const padSwap=!!pad.buttons?.[2]?.pressed||!!pad.buttons?.[4]?.pressed||!!pad.buttons?.[5]?.pressed;
        if(padSwap&&!padSwapHeld){cycleWeapon(1);}
        padSwapHeld=padSwap;
      }
      rig.rotation.set(0,yaw,0);camera.rotation.set(pitch,0,0,"YXZ");walk(x,z,d);
      if(use&&!padUseHeld)interact();if(leave&&!padExitHeld)requestExit('gamepad');padUseHeld=use;padExitHeld=leave;

      pilotChar.group.visible = true;
      pilotChar.group.position.set(0, -1.65, 0);
      pilotChar.group.rotation.set(0, Math.PI, 0); // For PC: Rotate 180 degrees so character faces downrange along -Z
      pilotChar.head.visible = isThirdPerson;

      const isWalking = (Math.abs(x) + Math.abs(z)) > 0.01;
      if(isWalking){
        walkCycleTimer += d * 9.0;
        const stride = Math.sin(walkCycleTimer) * 0.42;
        pilotChar.leftLeg.rotation.x = stride;
        pilotChar.rightLeg.rotation.x = -stride;
        pilotChar.leftArm.rotation.x = -stride * 0.35;
      }else{
        pilotChar.leftLeg.rotation.x = T.MathUtils.lerp(pilotChar.leftLeg.rotation.x, 0, d * 10);
        pilotChar.rightLeg.rotation.x = T.MathUtils.lerp(pilotChar.rightLeg.rotation.x, 0, d * 10);
        pilotChar.leftArm.rotation.x = T.MathUtils.lerp(pilotChar.leftArm.rotation.x, 0, d * 10);
      }
      pilotChar.torso.rotation.x = pitch * 0.35;
      pilotChar.rightArm.rotation.x = -1.1 + pitch * 0.75;

      if(isThirdPerson){
        pistol.visible = false;
        fpArm.visible = false;
        camera.position.set(0.42, 0.24, 2.15);
      }else{
        if(weaponOn) pistol.visible = true;
        fpArm.visible = true;
        camera.position.set(0, 0, 0);
        const bobX = isWalking ? Math.sin(walkCycleTimer * 0.5) * 0.007 : 0;
        const bobY = isWalking ? Math.abs(Math.sin(walkCycleTimer)) * 0.008 : 0;
        pistol.position.set(.28 + bobX, -.24 + recoilPitch * .04 - bobY, -.62 + recoilKick);
        pistol.rotation.set(-recoilPitch, 0, 0);
      }
    }

    // ── Update Chest Grenade (Grab from left chest, throw, 3s fuse, explosion) ──
    if(active){
      camera.getWorldPosition(camWorldPos);
      camera.getWorldQuaternion(controllerQ);
      camRightVec.set(1,0,0).applyQuaternion(controllerQ);
      camUpVec.set(0,1,0).applyQuaternion(controllerQ);
      camera.getWorldDirection(spawnDir);

      if(grenadeState==='holstered'){
        // Mounted on left chest: 30cm below head, 16cm to left, 13cm forward
        grenadeChestPos.copy(camWorldPos)
          .addScaledVector(camUpVec,-.30)
          .addScaledVector(camRightVec,-.16)
          .addScaledVector(spawnDir,.13);
        grenadeGroup.position.copy(grenadeChestPos);
        grenadeGroup.quaternion.copy(controllerQ);
        grenadeGroup.visible=true;
        grenadeRingMat.color.setHex(0x00f0ff);

        // Check if VR hand or controller reaches near left chest to grab grenade
        if(session){
          let rightGrab=false,leftGrab=false;
          if(rightGrip||rightController||(rightHandAnchor&&rightAnchorState.ready)){
            const rhPos=(rightHandAnchor&&rightAnchorState.ready)?rightHandAnchor.position:(rightGrip||rightController).position;
            if(rhPos&&rhPos.distanceTo(grenadeChestPos)<.24){
              const rSqueeze=!rightIsHand&&(((rightSource?.gamepad?.buttons?.[1]?.value||0)>.6)||!!rightSource?.gamepad?.buttons?.[1]?.pressed);
              if(rSqueeze||(rightIsHand&&rightPinch)){rightGrab=true;}
            }
          }
          if(leftGrip||leftController||(leftHandAnchor&&leftAnchorState.ready)){
            const lhPos=(leftHandAnchor&&leftAnchorState.ready)?leftHandAnchor.position:(leftGrip||leftController).position;
            if(lhPos&&lhPos.distanceTo(grenadeChestPos)<.24){
              const lSqueeze=!leftIsHand&&(((leftSource?.gamepad?.buttons?.[1]?.value||0)>.6)||!!leftSource?.gamepad?.buttons?.[1]?.pressed);
              if(lSqueeze||(leftIsHand&&leftPinch)){leftGrab=true;}
            }
          }
          if(rightGrab){
            grenadeState='held_right';grenadeFuse=3.0;
            try{nova.sound?.switchClick?.();}catch(_){}
            nova.toast?.('💣 GRENADE ARMED · 3s FUSE',1600,'#ffaa00');
          }else if(leftGrab){
            grenadeState='held_left';grenadeFuse=3.0;
            try{nova.sound?.switchClick?.();}catch(_){}
            nova.toast?.('💣 GRENADE ARMED · 3s FUSE',1600,'#ffaa00');
          }
        }
      }else if(grenadeState==='held_right'||grenadeState==='held_left'){
        const isR=grenadeState==='held_right';
        const holder=isR?(rightHandAnchor&&rightAnchorState.ready?rightHandAnchor:(rightGrip||rightController||camera)):(leftHandAnchor&&leftAnchorState.ready?leftHandAnchor:(leftGrip||leftController||camera));
        holder.getWorldPosition(grenadeTempPos);
        grenadeGroup.position.copy(grenadeTempPos);
        grenadeGroup.visible=true;
        grenadeFuse-=d;
        const blink=(Math.sin(performance.now()*.02)>0);
        grenadeRingMat.color.setHex(blink?0xff2200:0xffaa00);
        if(grenadeFuse<=0){explodeGrenade(grenadeGroup.position.clone());}
        else{
          let releasing=false;
          if(isR){
            const rSqueeze=!rightIsHand&&(((rightSource?.gamepad?.buttons?.[1]?.value||0)>.4)||!!rightSource?.gamepad?.buttons?.[1]?.pressed);
            if(!rSqueeze&&(!rightIsHand||!rightPinch))releasing=true;
          }else{
            const lSqueeze=!leftIsHand&&(((leftSource?.gamepad?.buttons?.[1]?.value||0)>.4)||!!leftSource?.gamepad?.buttons?.[1]?.pressed);
            if(!lSqueeze&&(!leftIsHand||!leftPinch))releasing=true;
          }
          if(releasing){
            camera.getWorldDirection(spawnDir);
            grenadeVel.copy(spawnDir).multiplyScalar(15).add(new T.Vector3(0,3.2,0));
            grenadeState='thrown';
            try{nova.sound?.laser?.();}catch(_){}
            nova.toast?.('💥 GRENADE OUT!',1200,'#ff9933');
          }
        }
      }else if(grenadeState==='thrown'){
        grenadeGroup.position.addScaledVector(grenadeVel,d);
        grenadeVel.y-=9.8*d;grenadeVel.multiplyScalar(.992);
        const floorY=rig.position.y;
        if(grenadeGroup.position.y<=floorY+.04){
          grenadeGroup.position.y=floorY+.04;
          grenadeVel.y=-grenadeVel.y*.42;grenadeVel.x*=.65;grenadeVel.z*=.65;
        }
        grenadeGroup.rotation.x+=7*d;grenadeGroup.rotation.z+=5*d;
        grenadeFuse-=d;
        const rate=(3-grenadeFuse)*.025+.015;
        const blink=(Math.sin(performance.now()*rate)>0);
        grenadeRingMat.color.setHex(blink?0xff1100:0xffaa00);
        if(grenadeFuse<=0){explodeGrenade(grenadeGroup.position.clone());}
      }else if(grenadeState==='cooldown'){
        grenadeCooldown-=d;
        if(grenadeCooldown<=0){
          grenadeState='holstered';grenadeGroup.visible=true;grenadeRingMat.color.setHex(0x00f0ff);
          try{nova.sound?.beep?.(980,.05);}catch(_){}
        }
      }
    }

    // Update dynamic 3D crosshair and VR laser sight at the point where the gun will hit
    if(active&&weaponOn){
      const hits=aimRay();
      const isMR=window.isPassthroughActive||(renderer?.xr?.isPresenting&&window.xrSessionType==='immersive-ar');
      let hitDist=isMR?14.0:45.0;targetLocked=false;currentLockedTargetObj=null;
      for(const hit of hits){
        const isEnemyTarget=findUserData(hit.object,'rangeTarget')||findUserData(hit.object,'enemy')||findUserData(hit.object,'fpsEnemy')||findUserData(hit.object,'nfUnit')||findUserData(hit.object,'onHit')||findUserData(hit.object,'takeDamage')||findUserData(hit.object,'health')||findUserData(hit.object,'hp');
        if(isEnemyTarget){
          hitDist=Math.max(.2,hit.distance);targetLocked=true;currentLockedTargetObj=hit.object;currentLockedPoint.copy(hit.point);break;
        }
        if(isOccluder(hit.object)){
          hitDist=Math.max(.2,hit.distance);break;
        }
      }
      crosshairPos.copy(origin).addScaledVector(direction,hitDist);
      crosshairGroup.position.copy(crosshairPos);
      crosshairGroup.quaternion.copy(camera.quaternion);
      // High-visibility dynamic scaling so reticle is always crisp in VR
      const chScale=Math.max(0.65, hitDist * 0.055);
      crosshairGroup.scale.setScalar(chScale);
      crosshairGroup.traverse(o=>{if(o.material){o.material.depthTest=false;o.material.depthWrite=false;}o.renderOrder=10001;});
      if(targetLocked!==chLocked){
        chLocked=targetLocked;
        const col=targetLocked?0xff2844:0x00e5ff;
        chRingMat.color.setHex(col);
        chTickMat.color.setHex(col);
        laserBeamMat.color.setHex(col);
      }
      crosshairGroup.visible=true;

      // Update VR Laser Sight Line
      laserBeamLine.visible = true;
      const posAttr = laserBeamGeo.attributes.position;
      posAttr.setXYZ(0, origin.x, origin.y, origin.z);
      posAttr.setXYZ(1, crosshairPos.x, crosshairPos.y, crosshairPos.z);
      posAttr.needsUpdate = true;

      // Auto-fire bullet at weapon fire rate when crosshair is locked onto an enemy
      if(targetLocked&&weaponOn&&!locoOrbGrabbed&&!tpMarker.visible&&!bothPinchExit&&grenadeState!=='held_right'){
        fire();
      }
    }else{
      crosshairGroup.visible=false;
      laserBeamLine.visible=false;
    }
    hudTimer-=d;if(hudTimer<=0){hudTimer=.1;drawHud();}
  }

  function enable(next={}){
    if(active){options={...options,...next};drawHud();return true;}
    const isVR = !!(renderer?.xr?.isPresenting);
    maxShield = (typeof window !== 'undefined' && window.novaFpsUpgrades?.tactical_shield) ? 150 : 100;
    options=next||{};active=true;exiting=false;weaponOn=true;health=100;shield=maxShield;lastDamage=0;timeSinceDamage=0;grenadeState='holstered';grenadeFuse=3.0;grenadeCooldown=0;
    yaw=rig.rotation.y;pitch=camera.rotation.x;hud.visible=true;pistol.visible=true;
    pilotChar.group.visible = !isVR;
    pilotChar.group.rotation.set(0, Math.PI, 0);
    pilotChar.head.visible = isThirdPerson;
    if(isThirdPerson)camera.position.set(0.42,0.24,2.15);
    rightController=leftController=rightGrip=leftGrip=rightHand=leftHand=null;rightIsHand=leftIsHand=false;
    leftPinchHeld=rightPinchHeld=leftPinchUsed=rightPinchUsed=bothPinchExit=false;leftPinchTime=rightPinchTime=rightPinchAimTime=bothPinchTime=0;
    locoSocketPosInit=false;locoOrbGrabbed=false;locoOrbGroup.position.set(0,0,0);
    if(renderer?.xr?.isPresenting&&(rightGrip||rightController))setWeaponParent(rightGrip||rightController,false);else{camera.add(pistol);pistol.position.set(.28,-.24,-.62);pistol.rotation.set(0,0,0);}
    window.addEventListener('keydown',keyDown,true);window.addEventListener('keyup',keyUp,true);window.addEventListener('mousemove',mouseMove);window.addEventListener('wheel',onWheel,{passive:false});document.addEventListener('pointerlockchange',pointerLockChange);
    window.addEventListener('pointerdown',pointerDown,true);window.addEventListener('contextmenu',preventMenu,true);showButtons(true);
    updateWeaponVisuals();
    drawHud();nova.toast?.('FPS ACTIVE · RT / RIGHT PINCH FIRE · Q / WHEEL WEAPON · A / LEFT HOLD USE',3200,'#00e5ff');return true;
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
      mk('EXIT','#ff6b7d',64,()=>requestExit('button'));
      mk('CAM','#00f0ff',68,()=>toggleThirdPerson());
      wpnBtn=mk(activeWeapon.id==='pistol'?'ARC':(activeWeapon.id==='scatter'?'SCTR':'RNGE'),'#'+activeWeapon.color.toString(16).padStart(6,'0'),74,()=>cycleWeapon(1));
      mk('USE','#ffd166',78,()=>interact());
      mk('GRENADE','#ff9933',78,()=>throwGrenadeForward());
      mk('FIRE','#00e5ff',118,()=>fire());
      document.body.appendChild(btnBar);
    }
    if(btnBar)btnBar.style.display=on&&!renderer?.xr?.isPresenting?'flex':'none';
  }
  function preventMenu(e){if(active)e.preventDefault();}
  function disable(){
    if(!active)return false;active=false;down.clear();pistol.visible=false;hud.visible=false;damageOverlay.style.opacity='0';
    pilotChar.group.visible=false;isThirdPerson=false;camera.position.set(0,0,0);
    leftGlove.visible=false;rightGlove.visible=false;crosshairGroup.visible=false;laserBeamLine.visible=false;grenadeGroup.visible=false;grenadeState='holstered';
    if(tpMarker)tpMarker.visible=false;tpValid=false;
    locoGroup.visible=false;locoOrbGrabbed=false;locoOrbGroup.position.set(0,0,0);locoSocketPosInit=false;
    if(pistol.parent!==scene)scene.add(pistol);document.exitPointerLock?.();
    window.removeEventListener('keydown',keyDown,true);window.removeEventListener('keyup',keyUp,true);showButtons(false);window.removeEventListener('mousemove',mouseMove);window.removeEventListener('wheel',onWheel);document.removeEventListener('pointerlockchange',pointerLockChange);pointerWasLocked=false;
    window.removeEventListener('pointerdown',pointerDown,true);window.removeEventListener('contextmenu',preventMenu,true);
    for(const p of projPool){p.active=false;p.mesh.visible=false;}
    for(const sp of sparkPool){sp.active=false;sp.mesh.visible=false;}
    for(const r of ringPool){r.active=false;r.mesh.visible=false;}
    for(const fl of impactFlarePool){fl.active=false;fl.sprite.visible=false;}
    muzzleFlash.visible=false;muzzleRing.visible=false;recoilKick=0;recoilPitch=0;
    if(session){try{session.removeEventListener('selectstart',onXRSelect);}catch(_){}}
    options={};session=null;rightController=leftController=rightGrip=leftGrip=rightHand=leftHand=null;rightIsHand=leftIsHand=false;return true;
  }

  const off=nova.onTick?.(tick);
  const state=()=>({active,mode:options.mode||null,weaponOn,weapon:activeWeapon.id,health,shield,input:session?{left:leftIsHand?'hand':leftController?'controller':'none',right:rightIsHand?'hand':rightController?'controller':'none'}:{left:'desktop',right:'desktop'},colliders:(options.colliders||[]).length,position:rig.position.toArray()});
  window.novaTest=window.novaTest||{};window.novaTest.fpsState=state;
  window.novaTest.setGunHandRotation=(yawDeg=90,pitchDeg=0,rollDeg=0)=>{handGunYaw=yawDeg*Math.PI/180;handGunPitch=pitchDeg*Math.PI/180;handGunRoll=rollDeg*Math.PI/180;if(pistol.parent===rightHandAnchor)pistol.rotation.set(handGunPitch,handGunYaw,handGunRoll);};
  return{ready:true,enable,disable,fire,interact,damage,throwGrenade:throwGrenadeForward,setWeapon,cycleWeapon,get activeWeapon(){return activeWeapon;},state,get active(){return active;},get health(){return health;},get shield(){return shield;},get helmetHud(){return hud;},set comfortVignette(v){damageOverlay.style.display=v===false?'none':'block';},dispose(){
    disposed=true;disable();off?.();camera.remove(hud);scene.remove(pistol);scene.remove(projRoot);scene.remove(vfxRoot);damageOverlay.remove();
    scene.remove(leftGlove);scene.remove(rightGlove);scene.remove(leftHandAnchor);scene.remove(rightHandAnchor);
    scene.remove(grenadeGroup);grenadeBodyGeo.dispose();grenadeBodyMat.dispose();grenadeCapGeo.dispose();grenadeRingGeo.dispose();grenadeRingMat.dispose();grenadePinGeo.dispose();grenadePinMat.dispose();
    scene.remove(crosshairGroup);chRingGeo.dispose();chRingMat.dispose();chDotGeo.dispose();chDotMat.dispose();chTickGeo.dispose();chTickMat.dispose();
    scene.remove(locoGroup);locoBaseRingGeo.dispose();locoBaseRingMat.dispose();locoOrbGeo.dispose();locoOrbMat.dispose();locoHaloGeo.dispose();locoHaloMat.dispose();locoTetherGeo.dispose();locoTetherMat.dispose();tickGeo.dispose();tickMat.dispose();
    if(tpMarker){scene.remove(tpMarker);tpRing.geometry?.dispose?.();tpRing.material?.dispose?.();tpBeam.geometry?.dispose?.();tpBeam.material?.dispose?.();tpDot.geometry?.dispose?.();tpDot.material?.dispose?.();}
    leftGlove.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
    rightGlove.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
    boltCoreGeo.dispose();boltCoreMat.dispose();boltFinGeo1.dispose();boltFinGeo2.dispose();finMat.dispose();tipFlareMat.dispose();tailFlareMat.dispose();
    sparkGeo.dispose();sparkMat.dispose();ringGeo.dispose();ringMat.dispose();impactFlareMat.dispose();muzzleRing.geometry?.dispose?.();
    hud.geometry.dispose();hudMaterial.dispose();hudTexture.dispose();
    pistol.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
  }};
}
