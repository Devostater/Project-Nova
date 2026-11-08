/**
 * A14 persistent Cold Run objective chain and end card.
 * The game emits the named events below or calls completeBeat(id) at its owners.
 */
export const DIFFICULTY_CONFIG = {
  enemySpawnCount: 3,
  aiAccuracy: 0.60,
  patrolDistance: 700,
  pirateFireRate: 2.2,
  droneCount: 2,
  missileSpeed: 140
};

export function init(nova) {
  const T=nova?.THREE,camera=nova?.camera;
  const KEY='novaColdRun';
  const beats=[
    {id:'intro',title:'Launch from Nova-1',hint:'Cockpit intro and companion line'},
    {id:'graveyard',title:'Warp to the Graveyard',hint:'Enter the Graveyard sector'},
    {id:'ambush',title:'Survive the pirate ambush',hint:'Clear the pirate wave'},
    {id:'salvage',title:'Recover a heat core',hint:'Tractor a salvage pod'},
    {id:'distress',title:'Answer the derelict beacon',hint:'Dock and board the wreck'},
    {id:'drones',title:'Clear the corridor',hint:'Disable both security drones'},
    {id:'choice',title:'Choose the fusion core',hint:'Take it or leave it for the crew pods'},
    {id:'return',title:'Return to the Lantern',hint:'Sell salvage and check on the crew'},
    {id:'complete',title:'Cold Run complete',hint:'Mission record saved'}
  ];
  function fresh(){return{active:false,cursor:0,done:[],startedAt:0,elapsed:0,updatedAt:0,stats:{missiles:0,impacts:0,pirates:0,drones:0,salvage:0,coreChoice:'',morality:0,sold:0}};}
  function read(){
    try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(data&&Array.isArray(data.done)&&data.stats)return{...fresh(),...data,stats:{...fresh().stats,...data.stats}};}catch{}
    return fresh();
  }
  const state=read();
  let tickSave=0;
  function persist(){state.updatedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
  function current(){return beats[Math.min(state.cursor,beats.length-1)];}
  function objective(){
    const b=current();
    return b.id==='complete'?'COLD RUN COMPLETE':b.title+' · '+b.hint;
  }
  const panel=document.createElement('div');
  Object.assign(panel.style,{position:'fixed',left:'50%',top:'18%',transform:'translateX(-50%)',width:'min(460px,88vw)',padding:'22px 26px',display:'none',zIndex:'12000',font:'600 15px monospace',letterSpacing:'.06em',color:'#bdfaff',background:'linear-gradient(145deg,rgba(5,22,42,.96),rgba(12,44,68,.94))',border:'2px solid #32ddff',boxShadow:'0 0 30px rgba(0,210,255,.5)',borderRadius:'10px'});
  panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');document.body.appendChild(panel);
  const cardCanvas=document.createElement('canvas');cardCanvas.width=1024;cardCanvas.height=768;
  const ctx=cardCanvas.getContext('2d');
  const cardTexture=T?new T.CanvasTexture(cardCanvas):null;
  if(cardTexture)cardTexture.colorSpace=T.SRGBColorSpace||cardTexture.colorSpace;
  let card=null,cardVisible=false;
  if(T&&camera){
    card=new T.Mesh(new T.PlaneGeometry(1.65,1.24),new T.MeshBasicMaterial({map:cardTexture,transparent:true,depthWrite:false}));
    card.position.set(0,0,-2.4);card.visible=false;camera.add(card);
  }
  function drawCard(){
    if(!ctx)return;
    ctx.clearRect(0,0,1024,768);
    const grad=ctx.createLinearGradient(0,0,1024,768);grad.addColorStop(0,'#07172b');grad.addColorStop(1,'#12394f');
    ctx.fillStyle=grad;ctx.fillRect(0,0,1024,768);ctx.strokeStyle='#32ddff';ctx.lineWidth=8;ctx.strokeRect(18,18,988,732);
    ctx.fillStyle='#bdfaff';ctx.font='bold 50px monospace';ctx.fillText('MISSION RECORD',64,104);
    ctx.fillStyle='#54ffd1';ctx.font='bold 40px monospace';ctx.fillText('COLD RUN · COMPLETE',64,174);
    const minutes=Math.floor(state.elapsed/60),seconds=Math.floor(state.elapsed%60);
    const lines=[
      'TIME  '+String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0'),
      'PIRATES  '+state.stats.pirates+'     DRONES  '+state.stats.drones,
      'MISSILES  '+state.stats.missiles+'     IMPACTS  '+state.stats.impacts,
      'SALVAGE  '+state.stats.salvage+'     SOLD  '+state.stats.sold,
      'CORE CHOICE  '+(state.stats.coreChoice||'NONE'),
      'MORALITY  '+(state.stats.morality>=0?'+':'')+state.stats.morality
    ];
    ctx.font='30px monospace';ctx.fillStyle='#d6f5ff';
    lines.forEach((line,i)=>ctx.fillText(line,72,270+i*66));
    ctx.fillStyle='#75ffd1';ctx.font='bold 26px monospace';ctx.fillText('ESC / CLOSE TO RETURN TO FLIGHT',72,700);
    if(cardTexture)cardTexture.needsUpdate=true;
  }
  function showEndCard(){
    if(state.cursor<beats.length-1)return false;
    cardVisible=true;drawCard();if(card)card.visible=true;
    panel.innerHTML='<strong style="font-size:22px;color:#72ffd1">COLD RUN · COMPLETE</strong><br><br>'+objective()+'<br><br>Time '+Math.floor(state.elapsed/60)+':'+String(Math.floor(state.elapsed%60)).padStart(2,'0')+' · Morality '+(state.stats.morality>=0?'+':'')+state.stats.morality+'<br><br><button type="button" style="font:inherit;padding:12px 24px;color:#c9faff;background:#123b54;border:2px solid #32ddff;border-radius:8px;cursor:pointer">CLOSE</button>';
    panel.style.display='block';panel.querySelector('button')?.addEventListener('click',hideEndCard,{once:true});
    return true;
  }
  function hideEndCard(){cardVisible=false;if(card)card.visible=false;panel.style.display='none';}
  function updateCheckpoint() {
    if (nova?.shipGroup?.position) {
      window.novaMissionCheckpoint = {
        position: nova.shipGroup.position.clone(),
        quaternion: nova.shipGroup.quaternion ? nova.shipGroup.quaternion.clone() : null,
        beat: current().id
      };
    }
  }
  function start(options={}){
    if(options.fresh){Object.assign(state,fresh());}
    if(!state.startedAt)state.startedAt=Date.now()-state.elapsed*1000;
    state.active=true;persist();updateCheckpoint();nova.toast?.('COLD RUN · '+objective(),3500,'#32ddff');
    if(state.cursor>=beats.length-1)showEndCard();
    return api;
  }
  function completeBeat(id,detail={}){
    if(!state.active)return false;
    const beat=current();if(beat.id!==id)return false;
    if(state.done.includes(id))return false;
    state.done.push(id);state.cursor=Math.min(beats.length-1,state.cursor+1);
    updateCheckpoint();
    if(id==='ambush')state.stats.pirates=Math.max(state.stats.pirates,Number(detail.pirates)||1);
    if(id==='salvage')state.stats.salvage=Math.max(state.stats.salvage,Number(detail.salvage)||1);
    if(id==='drones')state.stats.drones=Math.max(state.stats.drones,Number(detail.drones)||2);
    if(id==='choice')state.stats.coreChoice=detail.choice||state.stats.coreChoice;
    persist();nova.emit?.('missionBeatCompleted',{id,next:current().id,detail});
    if(current().id==='complete'){state.active=false;persist();showEndCard();}
    else nova.toast?.('OBJECTIVE UPDATED · '+objective(),3000,'#54ffd1');
    return true;
  }
  function finish(){if(current().id!=='complete')return false;state.active=false;persist();return showEndCard();}
  function on(name,fn){const off=nova.on?.(name,fn);if(off)offs.push(off);}
  const offs=[];
  on('warpComplete',()=>completeBeat('graveyard'));
  on('pirateWaveCleared',e=>completeBeat('ambush',{pirates:e?.count}));
  on('missileLaunched',()=>state.stats.missiles++);
  on('missileImpact',()=>state.stats.impacts++);
  on('salvageStowed',e=>{state.stats.salvage++;if(e?.type==='heat-core'||e?.type==='fusion-core')completeBeat('salvage');});
  on('boardingStarted',()=>completeBeat('distress'));
  on('droneDestroyed',e=>{state.stats.drones++;if(state.stats.drones>=2)completeBeat('drones',{drones:state.stats.drones});});
  on('fusionCoreChosen',e=>{state.stats.coreChoice=e?.choice||'';state.stats.morality=Number(nova.morality?.score)||0;completeBeat('choice',{choice:state.stats.coreChoice});});
  on('dockedAtLantern',()=>{state.returned=true;maybeReturn();});
  on('coreSold',()=>{state.stats.sold++;state.sold=true;maybeReturn();});
  on('crewReaction',e=>{if(e?.phase==='lantern'){state.crewReaction=true;maybeReturn();}});
  function maybeReturn(){if(state.cursor===7&&state.returned&&state.sold&&state.crewReaction)completeBeat('return',{sold:state.stats.sold});}
  on('moralityChanged',e=>{state.stats.morality=Number(e?.score)||0;persist();});
  function tick(dt){
    if(!state.active)return;
    const d=Math.max(0,Math.min(.1,Number(dt)||0));state.elapsed+=d;tickSave+=d;
    if(tickSave>=5){tickSave=0;persist();}
  }
  const offTick=nova.onTick?.(tick);
  const keyDown=e=>{if(e.code==='Escape'&&cardVisible){e.preventDefault();hideEndCard();}};
  window.addEventListener('keydown',keyDown);
  const api={start,completeBeat,finish,showEndCard,hideEndCard,difficulty:DIFFICULTY_CONFIG,get checkpoint(){return window.novaMissionCheckpoint;},setCheckpoint:(pos,quat)=>{window.novaMissionCheckpoint={position:pos.clone(),quaternion:quat?quat.clone():null};},get active(){return state.active;},get currentObjective(){return objective();},get progress(){return{cursor:state.cursor,total:beats.length-1,done:state.done.slice()};},get stats(){return{...state.stats};},reset(){Object.assign(state,fresh());persist();window.novaMissionCheckpoint=null;hideEndCard();}};
  if(new URLSearchParams(location.search).get('mission')==='cold-run')start();
  return api;
}
