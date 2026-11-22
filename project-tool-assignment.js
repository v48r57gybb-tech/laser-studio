import { buildAdaptivePlan,adaptiveKey } from './lib/project-adaptive-tools.mjs';
const STORE='officina-project-adaptive-library-v2',LEGACY='officina-project-tool-library-v1';
const families=new Set(['face','mill','drill','chamfer','spot','probe','tap','bore']);
export function readAdaptiveLibrary(storage){
 const raw=storage.getItem(STORE),legacy=raw===null?storage.getItem(LEGACY):null;
 let data;try{data=JSON.parse(raw??legacy??'{"records":[]}')}catch{throw Error('Libreria non leggibile: originale preservato')}
 if(raw!==null&&data.version!==2||!Array.isArray(data.records)||data.records.length>2000)throw Error('Libreria progetto non valida');
 const map=new Map();for(const t of data.records){if(!families.has(t.kind)||!Number.isFinite(t.diameter)||t.diameter<=0)throw Error('Utensile libreria non valido');for(const k of ['fluteLength','projection'])if(t[k]!=null&&(!Number.isFinite(t[k])||t[k]<=0))throw Error('Lunghezza libreria non valida');if(t.pitch!=null&&(!Number.isFinite(t.pitch)||t.pitch<0))throw Error('Passo libreria non valido');const key=adaptiveKey(t),old=map.get(key);if(!old||t.fluteLength>(old.fluteLength??0))map.set(key,structuredClone(t))}
 return {raw,legacy,records:[...map.values()]};
}
export function saveAdaptiveLibrary(storage,snapshot,tools){
 const map=new Map(snapshot.records.map(t=>[adaptiveKey(t),t]));for(const t of tools)map.set(adaptiveKey(t),structuredClone(t));if(map.size>2000)throw Error('Limite libreria raggiunto');
 if(storage.getItem(STORE)!==snapshot.raw||snapshot.raw===null&&storage.getItem(LEGACY)!==snapshot.legacy)throw Error('Libreria cambiata in altra scheda: ricalcolare');
 const records=[...map.values()].map(t=>{const n=structuredClone(t);delete n.station;n.loaded=false;n.virtual=true;return n});storage.setItem(STORE,JSON.stringify({version:2,records}));return records.length;
}
export function replaceAssignmentOutput(node,rows,makeNode){node.replaceChildren(...rows.map(makeNode));}
let registered=false;
export function registerProjectToolAssignment(){
 if(typeof document==='undefined'||registered)return;registered=true;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 function preview(t){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 260 190');svg.setAttribute('role','img');svg.setAttribute('aria-label',`Utensile digitale Ø${t.diameter}, sporgenza ${t.projection} mm, tagliente ${t.fluteLength} mm`);svg.style.maxWidth='360px';
  const scale=Math.min(130/t.projection,65/Math.max(t.diameter,1)),width=Math.max(t.diameter*scale,2),height=t.projection*scale,flute=t.fluteLength*scale;
  function rect(x,y,w,h,color){const n=document.createElementNS(svg.namespaceURI,'rect');for(const [k,v]of Object.entries({x,y,width:w,height:h,fill:color}))n.setAttribute(k,String(v));svg.append(n)}
  rect(70,12,100,22,'#586a7b');rect(120-width/2,34,width,height,'#91a6b9');rect(120-width/2,34+height-flute,width,flute,'#42bdd5');
  const text=document.createElementNS(svg.namespaceURI,'text');text.setAttribute('x','4');text.setAttribute('y','184');text.setAttribute('fill','#d9eef9');text.setAttribute('font-size','11');text.textContent=`Ø${t.diameter} · tagliente ${t.fluteLength} · sporgenza ${t.projection} mm`;svg.append(text);return svg;
 }
 document.addEventListener('project-analysis-updated',event=>{
  if(event.target?.id!=='projectAnalysisPanel')return;
  const panel=event.target.querySelector('#projectOperationsPanel'),analysis=event.detail?.analysis??event.detail;if(!panel||!Array.isArray(analysis?.proposals))return;
  for(const n of panel.querySelectorAll('[data-adaptive-tools]'))n.remove();
  const global=el('div');global.dataset.adaptiveTools='global';const button=el('button','Ricalcola tutte le fasi e salva utensili');button.type='button';const message=el('p','Utensili digitali adattivi: +5 mm sempre sul raggiungimento. Nessuna garanzia anticollisione; ISO e simulazione di asportazione non collegati.');message.setAttribute('role','status');global.append(button,message);panel.insertBefore(global,panel.children[1]??null);
  const phases=new Map(),cards=new Map(),overrides={};
  for(const phase of panel.querySelectorAll('[data-phase-id]')){
   const box=el('div');box.dataset.adaptiveTools='phase';const recalc=el('button','Ricalcola questa fase e aggiorna utensili condivisi');recalc.type='button';const output=el('ul');box.append(recalc,output);phase.insertBefore(box,phase.children[1]??null);phases.set(phase.dataset.phaseId,{output,recalc});
   for(const card of phase.querySelectorAll('.project-operation')){const id=/^OP\d{3}\b/.exec(card.querySelector('summary')?.textContent??'')?.[0],target=card.querySelector('.project-operation-tools');if(id&&target){const area=el('div');area.dataset.adaptiveTools='operation';target.append(area);cards.set(id,area)}}
  }
  function render(plan){
   for(const [id,p]of phases){const rows=plan.requests.filter(r=>r.phaseId===id);replaceAssignmentOutput(p.output,rows,r=>el('li',`${r.operationId}/${r.featureId} · ${r.kind} Ø${r.diameter} · T${r.addresses.T}/H${r.addresses.H}${r.addresses.D===null?'':'/D'+r.addresses.D} · ingresso ${r.entryOffset.toFixed(3)} mm · profondità ${r.depth??'non definita, ingombro assunto'} · richiesta ${r.lengths.projection} mm · montaggio condiviso ${r.visualGeometry.projection} mm (+5 inclusi) · nominale`));}
   for(const [id,area]of cards){area.replaceChildren();const rows=plan.requests.filter(r=>r.operationId===id);if(!rows.length){area.append(el('p','Nessun utensile CNC assegnato: controllo/attività non pianificata o dati indispensabili assenti.'));continue}
    for(const r of rows){const t=plan.tools.find(t=>t.id===r.toolId),d=el('details');d.append(el('summary',`${r.featureId} · ${r.kind} Ø${r.diameter} · lunghezza totale digitale ${t.overallLength} mm`));d.append(el('p',r.note+' · Origine: '+r.sourceRefs.join(', ')+'. Corpo, portautensile e staffe reali non verificati. Profondità geometrica non equivale a quota esecutiva.'));
     function field(label,key,value){const l=el('label',label+' '),input=el('input');input.type='number';input.min=key==='entryOffset'?'0':'.001';input.step='any';input.value=value===null?'':String(value);l.append(input);d.append(l);input.addEventListener('change',()=>{if(!input.value.trim()||!input.checkValidity()){for(const p of phases.values())p.output.replaceChildren();message.textContent='Valore non valido: correggere il campo e ricalcolare';panel.dispatchEvent(new CustomEvent('project-phase-tools-invalidated',{bubbles:true,detail:{readyForISO:false}}));return}overrides[r.id]={...overrides[r.id],[key]:Number(input.value)};calculate(false)})}
     field('Diametro proposto mm','diameter',r.diameter);field('Profondità locale mm','depth',r.depth);field('Distanza ingresso dal piano ingombro mm','entryOffset',r.entryOffset);d.append(preview(t),el('p',`Tagliente ${t.fluteLength} mm · sporgenza ${t.projection} mm · parte serrata assunta 20 mm · totale ${t.overallLength} mm. Modello virtuale adattivo, non allungamento di un utensile reale. S${t.parameters.rpm} F${t.parameters.feed}: parametri nominali non approvati.`));area.append(d);
    }
   }
  }
  function calculate(save){try{let snapshot;try{snapshot=readAdaptiveLibrary(localStorage)}catch(e){if(save)throw e;snapshot={records:[]};message.textContent=e.message}
    const plan=buildAdaptivePlan(analysis,{overrides,catalog:snapshot.records});const count=save?saveAdaptiveLibrary(localStorage,snapshot,plan.tools):snapshot.records.length;render(plan);
    message.textContent=`${plan.requests.length} abbinamenti operazione/caratteristica · ${plan.tools.length} utensili digitali distinti · ${plan.phases.length} fasi. ${save?'Libreria salvata: '+count:'Anteprima ricalcolata, libreria non modificata'}. ${plan.pending.join('; ')} +5 mm è margine nominale; collisioni non verificate. ISO e simulazione di asportazione non collegati.`;
    panel.dispatchEvent(new CustomEvent('project-phase-tools-assigned',{bubbles:true,detail:structuredClone({...plan,simulationGeometryReady:true,machiningSimulationConnected:false})}));
   }catch(e){for(const p of phases.values())p.output.replaceChildren();for(const area of cards.values())for(const svg of area.querySelectorAll('svg'))svg.remove();message.textContent='Ricalcolo non completato: '+e.message;panel.dispatchEvent(new CustomEvent('project-phase-tools-invalidated',{bubbles:true,detail:{readyForISO:false}}))}}
  button.onclick=()=>calculate(true);for(const p of phases.values())p.recalc.onclick=()=>calculate(true);calculate(false);
 });
}
