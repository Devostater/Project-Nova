// Resolved THREE from window or runtime
const THREE = typeof window !== 'undefined' ? (window.THREE || window.nova?.THREE) : null;

const IDS=['airlock','quarters','cargo','engineering','bridge'];
let materials=null;

function getMaterials(){
  if(materials)return materials;
  const loader=new THREE.TextureLoader();
  const load=(name,rx,ry)=>{const t=loader.load(new URL(`../art/textures/${name}`,import.meta.url).href);t.colorSpace=THREE.SRGBColorSpace||t.colorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);return t;};
  materials={
    floor:new THREE.MeshStandardMaterial({map:load('tex_metal_floor_1024.jpg',4,9),roughness:.78,metalness:.48}),
    wall:new THREE.MeshStandardMaterial({map:load('tex_metal_wall_1024.jpg',5,2),roughness:.72,metalness:.6}),
    hazard:new THREE.MeshStandardMaterial({map:load('tex_hazard_stripes_1024.jpg',5,1),roughness:.65,metalness:.5}),
    trim:new THREE.MeshStandardMaterial({color:0x172b38,roughness:.35,metalness:.85}),
    glow:new THREE.MeshStandardMaterial({color:0x31dfff,emissive:0x087f9d,emissiveIntensity:2.1,roughness:.25,metalness:.35}),
    core:new THREE.MeshStandardMaterial({color:0xff7628,emissive:0xff4a0a,emissiveIntensity:3,roughness:.22,metalness:.48}),
    red:new THREE.MeshStandardMaterial({color:0x8c1f25,emissive:0x41070a,emissiveIntensity:.7,roughness:.45,metalness:.62})
  };
  return materials;
}

function addBatch(root,items,material,geometries){
  if(!items.length)return;
  const geometry=new THREE.BoxGeometry(1,1,1),mesh=new THREE.InstancedMesh(geometry,material,items.length),matrix=new THREE.Matrix4();
  items.forEach((b,i)=>{matrix.compose(new THREE.Vector3(b[3],b[4],b[5]),new THREE.Quaternion(),new THREE.Vector3(b[0],b[1],b[2]));mesh.setMatrixAt(i,matrix);});
  mesh.instanceMatrix.needsUpdate=true;mesh.name='BOARDING_LEVEL_BATCH';mesh.receiveShadow=true;mesh.castShadow=true;root.add(mesh);geometries.push(geometry);
}

function shell(add,w=12,d=26){
  add('floor',w,.24,d,0,-.12,-5);add('trim',w,.2,d,0,4.15,-5);
  add('wall',.3,4.2,d,-w/2,2,-5);add('wall',.3,4.2,d,w/2,2,-5);
  add('wall',w,4.2,.3,0,2,-18);add('wall',w,4.2,.3,0,2,8);
  for(let z=-16;z<=6;z+=4){add('trim',.12,3.75,.22,-w/2+.22,2,z);add('trim',.12,3.75,.22,w/2-.22,2,z);add('glow',.04,3.1,.06,-w/2+.3,2,z);add('glow',.04,3.1,.06,w/2-.3,2,z);}
}

export function build(section=0){
  const index=typeof section==='string'?Math.max(0,IDS.indexOf(section)):THREE.MathUtils.clamp(Number(section)||0,0,4);
  const id=IDS[index],root=new THREE.Group(),batches={floor:[],wall:[],hazard:[],trim:[],glow:[],core:[],red:[]},geometries=[];
  root.name=`NOVA_BOARDING_${id.toUpperCase()}`;
  const colliders=[];
  const add=(mat,w,h,d,x,y,z)=>{batches[mat].push([w,h,d,x,y,z]);if(['wall','trim','red','core'].includes(mat)&&y+h/2>.15&&y-h/2<2.2&&w>.15&&d>.15)colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});};
  shell(add,index===2?16:index===4?15:12,index===2?30:26);
  const cover=[],enemySpawns=[],checkpoints=[new THREE.Vector3(0,0,6)],exits=[
    {id:'aft',label:index?'RETURN TO '+IDS[index-1].toUpperCase():'AIRLOCK',position:new THREE.Vector3(0,1,6.8),to:index-1},
    {id:'forward',label:index<4?'PROCEED TO '+IDS[index+1].toUpperCase():'BRIDGE',position:new THREE.Vector3(0,1,-17),to:index+1}
  ];
  add('hazard',3.4,.12,.9,0,.08,6.5);add('hazard',3.4,.12,.9,0,.08,-16.5);
  if(index===0){
    add('trim',5,3.2,.45,0,1.6,4.8);add('glow',3,.12,.08,0,3.3,4.55);
    [-3.3,3.3].forEach(x=>{add('trim',2.1,1.4,.7,x,.7,-7);cover.push(new THREE.Vector3(x,.7,-7));});
    enemySpawns.push(new THREE.Vector3(-3.2,1.8,-8),new THREE.Vector3(3.2,1.8,-12));
  }else if(index===1){
    [-1,1].forEach(side=>{add('wall',4.2,3.2,.25,side*3.8,1.6,-5);add('trim',3.6,.55,1.9,side*3.75,.28,-8.5);add('trim',3.6,.55,1.9,side*3.75,.28,-1.5);});
    add('wall',7.2,3.4,.3,0,1.7,-12);add('wall',7.2,3.4,.3,0,1.7,2);
    cover.push(new THREE.Vector3(-2.7,.65,-4),new THREE.Vector3(2.7,.65,-10));enemySpawns.push(new THREE.Vector3(-3,1.8,-7),new THREE.Vector3(3,1.8,-13));
  }else if(index===2){
    [[-5,-10],[0,-6],[5,-12],[-4,0],[4,-1]].forEach(([x,z],i)=>{add(i%2?'red':'trim',3,1.8,2.2,x,.9,z);cover.push(new THREE.Vector3(x,.9,z));});
    add('hazard',14,.08,1.2,0,.05,-15);enemySpawns.push(new THREE.Vector3(-4,1.8,-7),new THREE.Vector3(4,1.8,-14));
  }else if(index===3){
    add('trim',4.8,.6,4.8,0,.3,-7);add('hazard',5.4,.12,5.4,0,.64,-7);
    add('core',1.1,2.8,1.1,0,2.05,-7);add('glow',3.8,.12,.12,0,3.7,-7);add('glow',.12,.12,3.8,0,3.7,-7);
    [-4.2,4.2].forEach(x=>{add('trim',2.3,1.3,.65,x,.65,-11);cover.push(new THREE.Vector3(x,.65,-11));});
    enemySpawns.push(new THREE.Vector3(-3.5,1.8,-5),new THREE.Vector3(3.5,1.8,-12));
  }else{
    add('trim',6,.8,3.2,0,.4,-13);add('red',3,1.2,1.2,0,.6,-10.7);
    [-5,5].forEach(x=>{add('trim',2.2,1.25,.65,x,.63,-7);cover.push(new THREE.Vector3(x,.63,-7));});
    for(let x=-5;x<=5;x+=2.5)add('trim',1.4,1.8,1.4,x,.9,2.5);
    enemySpawns.push(new THREE.Vector3(-4,1.8,-9),new THREE.Vector3(4,1.8,-9),new THREE.Vector3(0,1.1,-11));
  }
  const mats=getMaterials();Object.entries(batches).forEach(([key,items])=>addBatch(root,items,mats[key],geometries));
  root.traverse(o=>{if(o.isInstancedMesh)o.userData.fpsOccluder=true;});
  root.userData.section=index;root.userData.dispose=()=>geometries.forEach(g=>g.dispose());
  dressProps(root,index);
  return{root,spawn:new THREE.Vector3(0,0,5.8),checkpoints,cover,enemySpawns,exits,colliders};
}

// Owner props (Pirate/boarding → public/models/boarding, optimised): loaded async, sized to fit, sat on the floor.
const PROPS={};let loaderP=null;
function propLoader(){return loaderP||(loaderP=import(new URL('../vendor/loaders/GLTFLoader.js',import.meta.url).href).then(m=>new m.GLTFLoader()).catch(()=>null));}
function loadProp(name){
  return PROPS[name]||(PROPS[name]=propLoader().then(L=>L?new Promise(res=>L.load(new URL(`../models/boarding/${name}.glb`,import.meta.url).href,g=>res(g.scene),undefined,()=>res(null))):null));
}
// place(name, [x,y,z], size (m), rotY, axis): axis 'y' = size is the height, otherwise the longest side
function dressProps(root,index){
  const place=(name,pos,size,rotY=0,axis)=>loadProp(name).then(src=>{
    if(!src||root.userData.disposed)return;
    const m=src.clone(true),b=new THREE.Box3().setFromObject(m),sz=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
    m.position.set(-c.x,-b.min.y,-c.z);const w=new THREE.Group();w.add(m);
    w.scale.setScalar(size/Math.max(1e-6,axis==='y'?sz.y:Math.max(sz.x,sz.z)));w.position.set(pos[0],pos[1]||0,pos[2]);w.rotation.y=rotY;w.name='BOARDING_PROP_'+name;
    m.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.userData.fpsOccluder=true;}});root.add(w);
  });
  place('prop_door_hatch',[0,0,-17.75],3.4,0,'y');place('prop_door_hatch',[0,0,7.75],3.4,Math.PI,'y');
  if(index===0){
    [-3.3,3.3].forEach(x=>place('prop_supply_crate',[x,0,-7],1.45,x>0?.2:-.15,'y'));
    place('prop_radiator_heater',[-5.6,0,-2],1.1,Math.PI/2,'y');place('prop_supply_crate',[5,0,1.5],1.1,.6,'y');
  }else if(index===1){
    [-1,1].forEach(side=>{place('prop_cot_bed',[side*3.75,0,-8.5],2.1,Math.PI/2);place('prop_cot_bed',[side*3.75,0,-1.5],2.1,Math.PI/2);place('prop_chair',[side*1.6,0,-5],.95,side>0?-Math.PI/2:Math.PI/2,'y');});
    place('prop_radiator_heater',[5.6,0,-12.8],1.1,-Math.PI/2,'y');
  }else if(index===2){
    [[-5,-10],[0,-6],[5,-12],[-4,0],[4,-1]].forEach(([x,z],i)=>place('prop_supply_crate',[x,0,z],1.8,i*.4,'y'));
    place('prop_supply_crate',[-6.5,0,-15.5],1.2,.3,'y');place('prop_supply_crate',[6.5,0,4],1.2,-.4,'y');
  }else if(index===3){
    [-4.6,4.6].forEach(x=>place('prop_engine_turbine',[x,0,-2.5],3.2,x>0?Math.PI:0));
    [-4.8,4.8].forEach(x=>place('prop_computer_terminal',[x,0,-15.6],1.6,0,'y'));
  }else{
    [-2.5,0,2.5].forEach(x=>{place('prop_computer_terminal',[x,0,2.4],1.7,Math.PI,'y');place('prop_chair',[x,0,.9],.95,Math.PI,'y');});
    place('prop_supply_crate',[-6,0,-15],1.2,.5,'y');
  }
}

export function init(){return{ready:true,build};}
