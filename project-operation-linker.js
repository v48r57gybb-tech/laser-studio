import { suggestFamilies } from './lib/project-tool-automation.mjs';
const OPERATION_ID=/^OP\d{3}$/;
const SETUP_ID=/^SETUP\d{2}$/;
function text(value){return typeof value==='string'?value.trim():''}
function list(value){return Array.isArray(value)?value:[]}
export function createOperationPlanner(analysis){
 const root=analysis?.analysis??analysis??{},proposals=list(root.proposals),issues=list(root.open_issues);
 const features=new Map(list(root.features).map(f=>[text(f.id),f]));
 const operations=proposals.filter(p=>OPERATION_ID.test(text(p.id)));
 const setups=new Map(proposals.filter(p=>SETUP_ID.test(text(p.id))).map(p=>[text(p.id),p]));
 function missing(feature){return Object.values(feature?.values??{}).filter(v=>v?.status==='mancante').length}
 function operation(id){
  const proposal=operations.find(p=>text(p.id)===id);if(!proposal)throw Error('Operazione non trovata: '+id);
  const dependencies=list(proposal.depends_on),explicit=[...new Set(dependencies.filter(d=>setups.has(d)))];
  const header=text(proposal.description).split(/\n/)[0];
  const mentioned=[...new Set((header.match(/\bSETUP\d{2}\b/g)??[]).filter(id=>setups.has(id)))];
  const setupId=explicit.length===1?explicit[0]:explicit.length===0&&mentioned.length===1?mentioned[0]:null;
  const related=new Set([id,...list(proposal.feature_ids),...list(proposal.requirement_ids),...dependencies]);if(setupId)related.add(setupId);
  const questions=issues.filter(i=>list(i.related_ids).some(r=>related.has(r))).map(i=>({id:text(i.id),description:text(i.description),blocks:[...list(i.blocks)]}));
  const status=text(proposal.status)||'non indicato';
  return {id,text:text(proposal.description),setupId,setup:setups.get(setupId)??null,features:list(proposal.feature_ids).map(featureId=>{const f=features.get(featureId);return {id:featureId,kind:text(f?.kind)||'non classificata',description:text(f?.description),support:text(f?.support_status)||'non verificato',missing:f?missing(f):null}}),status,statusLabel:status==='proposed'?'Proposta non approvata':status,blockers:questions.filter(i=>i.blocks.length>0),questions,requirements:[...list(proposal.requirement_ids)],dependencies:[...dependencies],recommendation:suggestFamilies(proposal)};
 }
 function summary(){const rows=operations.map(p=>operation(text(p.id)));return {total:rows.length,proposed:rows.filter(r=>r.status==='proposed').length,withBlockers:rows.filter(r=>r.blockers.length>0).length,operations:rows,phases:[...setups].map(([id,p])=>({id,description:text(p.description),dependencies:[...list(p.depends_on)],operations:rows.filter(r=>r.setupId===id)})),unassigned:rows.filter(r=>!r.setupId)}}
 return {operation,summary,operationIds:operations.map(p=>text(p.id)),setupIds:[...setups.keys()]};
}
function element(tag,className,content){const n=document.createElement(tag);if(className)n.className=className;if(content!==undefined)n.textContent=content;return n}
export function mountOperationPlanner(section){
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
 const probe=document.createElement('div');if(typeof probe?.append!=='function'||typeof section?.prepend!=='function'||!section?.dataset)return null;
 if(section.dataset.operationPlannerReady)return null;section.dataset.operationPlannerReady='true';
 const panel=element('section','project-operations');panel.id='projectOperationsPanel';
 panel.append(element('h2','','Fasi di lavorazione da progetto'));
 const status=element('p','project-operations-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const listNode=element('div','project-operations-list');panel.append(status,listNode);
 const style=document.createElement('style');style.textContent='#projectOperationsPanel{margin:0 0 24px;padding:clamp(12px,3vw,22px);border:1px solid #50778c;border-radius:16px;background:#072031}#projectOperationsPanel h2{margin:0 0 12px;font-size:1.2rem;color:#eaf7ff}#projectOperationsPanel .project-operations-status{color:#a9c9da;line-height:1.5}#projectOperationsPanel .project-operations-list{display:grid;gap:14px;min-width:0}#projectOperationsPanel details{min-width:0;margin:10px 0;padding:12px;border:1px solid #3d637b;border-radius:12px;background:#091e30}#projectOperationsPanel summary{min-height:44px;box-sizing:border-box;padding:10px 4px;cursor:pointer;line-height:1.5;color:#edf8ff;overflow-wrap:anywhere}#projectOperationsPanel .project-phase>summary{font-weight:700;background:#12354c;border-radius:8px;padding:12px}#projectOperationsPanel p,#projectOperationsPanel li{overflow-wrap:anywhere;line-height:1.5}#projectOperationsPanel .project-operation-description{white-space:pre-wrap;color:#cfe6f2}#projectOperationsPanel .project-operation-meta{font-size:.9rem;color:#a9c9da}#projectOperationsPanel .project-operation-status{display:inline-block;border-radius:999px;padding:4px 9px;background:#123d5c;color:#9ddcff;font-size:.8rem}#projectOperationsPanel .project-operation-blockers{border-left:3px solid #ffb65c;color:#ffe0b5}#projectOperationsPanel ul{padding-left:20px}';panel.append(style);
 let planner=null,errorMessage='';const open=new Set();
 function details(label,className=''){const d=element('details',className);d.append(element('summary','',label));return d;}
 function operationCard(o){
  const card=details(o.id+' · '+o.statusLabel,'project-operation');
  card.append(element('p','project-operation-description',o.text),element('p','project-operation-meta','Prerequisiti: '+(o.dependencies.join(', ')||'nessuno dichiarato')));
  const recommendation=o.recommendation;
  const tools=details('Utensili consigliati dal JSON · da configurare','project-operation-tools');
  tools.append(element('p','project-operation-description',recommendation.source||'Categoria utensile non riconosciuta: consultare la descrizione completa.'));
  const names={face:'Fresa a spianare',mill:'Fresa a candela',drill:'Punta',chamfer:'Smussatore',spot:'Centrino',probe:'Sonda',tap:'Filettatura / maschio o fresa',bore:'Alesatura / barenatura','slot-disc':'Fresa a disco',measurement:'Strumento di misura'};
  if(recommendation.families.length){const ul=element('ul');for(const f of recommendation.families)ul.append(element('li','',(names[f.family]??f.family)+(f.supported?' · famiglia gestibile dal modulo nominale':' · adattatore operativo da realizzare')));tools.append(ul)}
  tools.append(element('p','project-operation-meta','Suggerimenti, non utensili già assegnati o caricati. T/H/D, diametri e montaggi non vengono inventati da questa vista.'));
  if(recommendation.alternativesRequireReview)tools.append(element('p','project-operation-meta','La descrizione contiene alternative o condizioni: non tutte le famiglie elencate sono necessariamente richieste.'));
  card.append(tools);
  if(o.requirements.length){const d=details('Requisiti · '+o.requirements.length);d.append(element('p','project-operation-meta',o.requirements.join(', ')));card.append(d)}
  if(o.features.length){const d=details('Caratteristiche collegate · '+o.features.length),ul=element('ul');d.append(element('p','project-operation-meta','Collegamenti del documento: non dimostrano che ogni caratteristica sia lavorata da questa OP.'));for(const f of o.features)ul.append(element('li','project-operation-description',`${f.id} · ${f.kind} · ${f.support==='not_checked'?'supporto non verificato':f.support} · ${f.description}${f.missing?' · '+f.missing+' dati mancanti':''}`));d.append(ul);card.append(d)}
  if(o.questions.length){const d=details('Questioni collegate · '+o.questions.length,'project-operation-blockers'),ul=element('ul');for(const i of o.questions)ul.append(element('li','project-operation-description',`${i.id}: ${i.description}\nBlocchi: ${i.blocks.join(', ')||'nessuno dichiarato'}`));d.append(ul);card.append(d)}
  return card;
 }
 function render(){
  for(const d of listNode.querySelectorAll?.('[data-phase-id]')??[])if(d.open)open.add(d.dataset.phaseId);else open.delete(d.dataset.phaseId);
  listNode.replaceChildren();if(!planner){status.textContent=errorMessage||'Importa il JSON per aprire i piazzamenti e le operazioni.';return}
  let data;try{data=planner.summary()}catch(e){status.textContent='Analisi non utilizzabile: '+e.message;return}
  status.textContent=`${data.phases.length} piazzamenti · ${data.total} operazioni · ${data.proposed} non approvate · ${data.unassigned.length} senza piazzamento univoco. Vista di pianificazione: ISO e simulazione non ancora collegati. Contenuto tecnico non verificato.`;
  for(const phase of data.phases){const d=details(phase.id+' · '+phase.operations.length+' operazioni · Apri fase','project-phase');d.dataset.phaseId=phase.id;d.open=open.has(phase.id);const info=details('Orientamento, zero e attrezzaggio · proposta JSON');info.append(element('p','project-operation-description',phase.description));d.append(info);d.append(element('p','project-operation-meta','Prerequisiti del piazzamento: '+(phase.dependencies.join(', ')||'nessuno dichiarato')+'. Le scelte XY/Z restano nella sezione Origini proposte per piazzamento.'));if(!phase.operations.length)d.append(element('p','','Nessuna OP associata univocamente a questo piazzamento.'));for(const o of phase.operations)d.append(operationCard(o));listNode.append(d)}
  if(data.unassigned.length){const d=details('Attività trasversali / piazzamento da definire · '+data.unassigned.length,'project-phase');d.append(element('p','project-operation-meta','Non assegnate automaticamente a una macchina o a un setup. Controlli e attività a banco non sono convertiti in percorsi CNC.'));for(const o of data.unassigned)d.append(operationCard(o));listNode.append(d)}
 }
 function setAnalysis(analysis){open.clear();try{planner=createOperationPlanner(analysis);errorMessage=''}catch(e){planner=null;errorMessage='Analisi non utilizzabile: '+e.message}listNode.replaceChildren();render()}
 section.addEventListener('project-analysis-updated',e=>{if(e?.detail)setAnalysis(e.detail)});render();section.prepend(panel);return {setAnalysis,refresh:render};
}
