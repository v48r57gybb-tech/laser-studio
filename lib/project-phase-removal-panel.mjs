import {createPhaseRemoval} from './project-phase-removal.mjs';
export function mountPhaseRemoval(host,getState,stop){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 const box=el('details');box.append(el('summary','Asportazione approssimata e residuo voxel'));
 box.append(el('p','Grezzo rettangolare in coordinate ISO della fase, in mm. Solo frese/spianatori confermati cilindrici a fondo piano lungo Z. Non usare per punte, sfere, smussi o utensili inclinati. Nessun confronto STEP, collisione o certificazione macchina. I rapidi non asportano; non sono verificati contro il grezzo. Calcolo al cursore, non animazione continua.'));
 const config=el('textarea');config.rows=9;config.setAttribute('aria-label','Grezzo e utensili per asportazione');
 const seed=el('button','Carica dati utensili dal piano');seed.type='button';
 const label=el('label'),ack=el('input');ack.type='checkbox';label.append(ack,document.createTextNode('Confermo dominio ISO, diametri, taglienti e forma cilindrica a fondo piano per questa approssimazione.'));
 const calculate=el('button','Calcola residuo al cursore');calculate.type='button';
 const reset=el('button','Cancella risultato');reset.type='button';
 const status=el('p','Definire min/max del grezzo e confermare i dati.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const slice=el('input');slice.type='range';slice.min='0';slice.max='0';slice.value='0';slice.disabled=true;slice.setAttribute('aria-label','Sezione Z del residuo');
 const caption=el('p'),canvas=el('canvas');canvas.width=600;canvas.height=360;canvas.style.maxWidth='100%';canvas.setAttribute('aria-label','Sezione XY del grezzo residuo: pieno azzurro, rimosso scuro');
 const ctx=canvas.getContext('2d');let snapshot=null,computed=-1;
 function invalidate(message='Risultato non aggiornato: ricalcolare al cursore.'){
  snapshot=null;computed=-1;slice.disabled=true;caption.textContent='';status.textContent=message;ctx?.clearRect(0,0,600,360);
 }
 function load(){
  const {tools}=getState();config.value=JSON.stringify({min:[null,null,null],max:[null,null,null],cellSize:1,tools:tools.filter(t=>['mill','face'].includes(t.kind)).map(t=>({station:t.station,shape:'flat-cylinder',diameter:t.diameter,cuttingLength:t.fluteLength}))},null,2);
  ack.checked=false;invalidate('Inserire min/max del grezzo in coordinate ISO; verificare utensili e risoluzione.');
 }
 function draw(){
  if(!snapshot||!ctx)return;const s=snapshot,[nx,ny,nz]=s.counts,z=Math.max(0,Math.min(nz-1,Number(slice.value))),scale=Math.min(540/(s.max[0]-s.min[0]),290/(s.max[1]-s.min[1]));
  ctx.fillStyle='#031627';ctx.fillRect(0,0,600,360);
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
   ctx.fillStyle=s.occupied[(z*ny+y)*nx+x]?'#42cfe7':'#10283b';
   ctx.fillRect(30+x*s.cellSize[0]*scale,320-(y+1)*s.cellSize[1]*scale,s.cellSize[0]*scale,s.cellSize[1]*scale);
  }
  caption.textContent='Sezione XY · Z centro cella '+(s.min[2]+(z+.5)*s.cellSize[2]).toFixed(3)+' mm · azzurro: materiale residuo; scuro: rimosso. X cresce a destra, Y in alto.';
 }
 calculate.onclick=()=>{
  stop();invalidate();try{
   if(!ctx)throw Error('Canvas 2D non disponibile');if(!ack.checked)throw Error('Confermare dominio e forma utensile');
   const state=getState();if(!state.moves.length)throw Error('Generare o allegare prima un ISO simulabile');
   const c=JSON.parse(config.value);if(!Array.isArray(c.tools))throw Error('Utensili mancanti');
   for(const t of c.tools){const actual=state.tools.find(a=>a.station===t.station);if(!actual||!['mill','face'].includes(actual.kind)||t.diameter!==actual.diameter||t.cuttingLength!==actual.fluteLength)throw Error('Utensile non coerente con il piano corrente: T'+t.station)}
   const engine=createPhaseRemoval({...c,confirmed:true});engine.replay(state.moves,state.index);snapshot=engine.snapshot();computed=state.index;
   slice.max=String(snapshot.counts[2]-1);slice.value=slice.max;slice.disabled=false;
   const s=engine.stats();status.textContent='APPROSSIMAZIONE al punto '+computed+' (riga ISO '+state.moves[computed].line+'): rimosso '+s.removedVolume.toFixed(3)+' mm3; residuo '+s.remainingVolume.toFixed(3)+' mm3. Celle '+s.cellSize.map(v=>v.toFixed(3)).join(' x ')+' mm. Non validata per macchina.';draw();
  }catch(error){invalidate('Asportazione non calcolata: '+error.message)}
 };
 seed.onclick=load;reset.onclick=()=>invalidate('Risultato cancellato.');slice.oninput=draw;
 config.addEventListener('input',()=>{ack.checked=false;invalidate('Dati modificati: riconfermare e ricalcolare.')});ack.onchange=()=>invalidate('Conferma modificata: ricalcolare.');
 box.append(seed,config,label,calculate,reset,status,slice,caption,canvas);host.append(box);load();
 return {invalidate,position(index){if(snapshot&&computed!==index)invalidate()},dispose(){snapshot=null;box.remove()}};
}
