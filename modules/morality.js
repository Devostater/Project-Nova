/**
 * A13 saved morality meter and the fusion-core choice API.
 * Game integration can read flightRecordLine() and listen for crewReaction.
 */
export function init(nova) {
  const KEY='novaMorality';
  const LOW=-100,HIGH=100,MAX_HISTORY=50;
  function read(){
    try{
      const value=JSON.parse(localStorage.getItem(KEY)||'{}');
      return{score:Math.max(LOW,Math.min(HIGH,Number(value.score)||0)),history:Array.isArray(value.history)?value.history.slice(-MAX_HISTORY):[]};
    }catch{return{score:0,history:[]};}
  }
  const state=read();
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify({score:state.score,history:state.history.slice(-MAX_HISTORY)}));}catch{}
  }
  function add(delta,reason='Unrecorded choice'){
    const amount=Number(delta);
    if(!Number.isFinite(amount)||!amount)return state.score;
    const before=state.score;
    state.score=Math.max(LOW,Math.min(HIGH,before+amount));
    const entry={at:Date.now(),delta:state.score-before,score:state.score,reason:String(reason).slice(0,120)};
    state.history.push(entry);if(state.history.length>MAX_HISTORY)state.history.splice(0,state.history.length-MAX_HISTORY);
    save();
    const payload={score:state.score,delta:entry.delta,reason:entry.reason,history:state.history.slice()};
    nova.emit?.('moralityChanged',payload);
    nova.toast?.('MORALITY '+(state.score>=0?'+':'')+state.score,1700,state.score<0?'#ff8393':'#70ffd4');
    return state.score;
  }
  function chooseFusionCore(choice,mission='cold-run'){
    const normalized=String(choice||'').toLowerCase();
    if(normalized!=='take'&&normalized!=='leave')return{ok:false,reason:'Choose take or leave.'};
    const choiceKey='novaFusionChoice:'+String(mission).replace(/[^a-z0-9_-]/gi,'').slice(0,40);
    try{if(localStorage.getItem(choiceKey))return{ok:false,reason:'This fusion-core choice is already recorded.'};}catch{}
    const outcome=normalized==='take'?'take':'leave';
    try{localStorage.setItem(choiceKey,outcome);}catch{}
    let heatCores=0;
    if(outcome==='take'){
      try{heatCores=Math.max(0,Number(localStorage.getItem('novaHeatCores'))||0)+1;localStorage.setItem('novaHeatCores',String(heatCores));}catch{}
      add(-15,'Took the fusion core');
    }else{
      let saved=0;try{saved=Math.max(0,Number(localStorage.getItem('novaCrewPodsSaved'))||0)+1;localStorage.setItem('novaCrewPodsSaved',String(saved));}catch{}
      add(15,'Left the fusion core for the crew pods');
    }
    const payload={choice:outcome,score:state.score,heatCores};
    nova.emit?.('fusionCoreChosen',payload);
    nova.emit?.('crewReaction',{choice:outcome,score:state.score,line:'The crew acknowledges your choice.'});
    return{ok:true,...payload};
  }
  function flightRecordLine(){
    const last=state.history[state.history.length-1];
    return'MORALITY '+(state.score>=0?'+':'')+state.score+(last?' · '+last.reason:' · NO CHOICES RECORDED');
  }
  const api={
    add,chooseFusionCore,flightRecordLine,
    get score(){return state.score;},
    get history(){return state.history.map(entry=>({...entry}));},
    reset(){state.score=0;state.history.length=0;save();nova.emit?.('moralityChanged',{score:0,delta:0,reason:'Reset',history:[]});}
  };
  if(nova)nova.morality=api;
  return api;
}
