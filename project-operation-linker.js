const OPERATION_ID=/^OP\d{3}$/;
const SETUP_ID=/^SETUP\d{2}$/;
function text(value){return typeof value==='string'?value.trim():''}
function list(value){return Array.isArray(value)?value:[]}
export function createOperationPlanner(analysis){
 const root=analysis?.analysis??analysis??{};
 const proposals=list(root.proposals);
 const features=new Map(list(root.features).map(f=>[text(f.id),f]));
 const issues=list(root.open_issues);
 const operations=proposals.filter(p=>OPERATION_ID.test(text(p.id)));
 const setups=new Map(proposals.filter(p=>SETUP_ID.test(text(p.id))).map(p=>[text(p.id),p]));
 function missing(feature){return Object.values(feature?.values??{}).filter(value=>value?.status==='mancante').length}
 function operation(id){
  const proposal=operations.find(p=>text(p.id)===id);
  if(!proposal)throw Error('Operazione non trovata: '+id);
  const dependencies=list(proposal.depends_on);
  const setupMatch=/^(SETUP\d{2})\b/.exec(text(proposal.description));
  const explicitSetups=dependencies.filter(dependency=>setups.has(dependency));
  const setupId=explicitSetups.length===1?explicitSetups[0]:explicitSetups.length===0&&setupMatch&&setups.has(setupMatch[1])?setupMatch[1]:null;
  const featureRows=list(proposal.feature_ids).map(featureId=>{const feature=features.get(featureId);return {id:featureId,kind:text(feature?.kind)||'non classificata',description:text(feature?.description),support:text(feature?.support_status)||'non verificato',missing:feature?missing(feature):null}});
  const requirements=list(proposal.requirement_ids);
  const related=new Set([id,...list(proposal.feature_ids),...requirements,...dependencies]);
  if(setupId)related.add(setupId);
  const questions=issues.filter(issue=>list(issue.related_ids).some(reference=>related.has(reference))).map(issue=>({id:text(issue.id),description:text(issue.description),blocks:list(issue.blocks)}));
  const blockers=questions.filter(issue=>issue.blocks.length>0);
  const status=text(proposal.status)||'non indicato';
  return {id,text:text(proposal.description),setupId,setup:setups.get(setupId)??null,features:featureRows,status,statusLabel:status==='proposed'?'Proposta non approvata':status,blockers,questions,requirements};
 }
 function summary(){const rows=operations.map(p=>operation(text(p.id)));return {total:rows.length,proposed:rows.filter(r=>r.status==='proposed').length,withBlockers:rows.filter(r=>r.blockers.length>0).length,operations:rows}}
 return {operation,summary,operationIds:operations.map(p=>text(p.id)),setupIds:[...setups.keys()]};
}
function element(tag,className,content){const node=document.createElement(tag);if(className)node.className=className;if(content!==undefined)node.textContent=content;return node}
export function mountOperationPlanner(section){
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
 const domProbe=document.createElement('div');
 if(typeof domProbe?.append!=='function'||typeof section?.prepend!=='function'||!section?.dataset)return null;
 if(section.dataset.operationPlannerReady)return null;
 section.dataset.operationPlannerReady='true';
 const panel=element('section','project-operations');panel.id='projectOperationsPanel';
 panel.append(element('h2','','Lavorazioni proposte dal JSON'));
 const status=element('p','project-operations-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const listNode=element('div','project-operations-list');panel.append(status,listNode);
 const style=document.createElement('style');style.textContent='.project-operations{margin:0 0 24px;padding:18px;border:1px solid #50778c;border-radius:12px;background:rgba(7,32,49,.72)}.project-operations h2{margin:0 0 10px;font-size:1.15rem;color:#eaf7ff}.project-operations-status{margin:0 0 14px;color:#9dbdce}.project-operations-list{display:grid;gap:12px;min-width:0}.project-operation{min-width:0;overflow-wrap:anywhere;padding:12px;border:1px solid #3d637b;border-radius:10px;background:rgba(3,22,39,.75)}.project-operation h3{margin:0 0 8px;font-size:1rem;color:#f4fbff}.project-operation-description{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;margin:0 0 12px;color:#cfe6f2}.project-operation-status{display:inline-block;margin-bottom:8px;padding:3px 8px;border-radius:999px;font-size:.75rem;font-weight:700;background:#123d5c;color:#8fd0ff}.project-operation-meta{margin:0 0 8px;color:#9dbdce;font-size:.85rem}.project-operation-features{margin:10px 0 8px;padding-left:18px;color:#cfe6f2;font-size:.85rem}.project-operation-features li,.project-operation-blockers li{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;margin-bottom:8px}.project-operation-feature-details summary{cursor:pointer;color:#cfe6f2}.project-operation-blockers{padding:8px;border-left:3px solid #ffb65c;background:rgba(91,60,22,.28);border-radius:6px;color:#ffe0b5;font-size:.85rem}.project-operation-blockers ul{margin:6px 0 0;padding-left:18px}';document.head.append(style);
 let planner=null,errorMessage='';
 function render(){
  listNode.replaceChildren();
  if(!planner){status.textContent=errorMessage||'Carica l’analisi JSON per visualizzare le lavorazioni proposte.';return}
  let data;try{data=planner.summary()}catch(error){status.textContent='Analisi non utilizzabile: '+error.message;return}
  status.textContent=data.total?`${data.total} lavorazioni proposte · ${data.proposed} non approvate · ${data.withBlockers} con blocchi collegati. Contenuto tecnico non verificato; nessuna autorizzazione macchina.`:'Analisi caricata: nessuna proposta con ID OPxxx. Le altre proposte restano consultabili sotto.';
  for(const operation of data.operations){
   const card=element('article','project-operation');card.append(element('h3','',operation.id),element('span','project-operation-status',operation.statusLabel));
   card.append(element('p','project-operation-description',operation.text));
   card.append(element('p','project-operation-meta',`Piazzamento: ${operation.setupId??'non indicato univocamente'} · Caratteristiche collegate: ${operation.features.length}`));
   if(operation.requirements.length)card.append(element('p','project-operation-meta','Requisiti: '+operation.requirements.join(', ')));
   if(operation.features.length){const features=element('ul','project-operation-features');for(const feature of operation.features){const support=feature.support==='not_checked'?'supporto non verificato':feature.support;const item=element('li','',`${feature.id} · ${feature.kind} · ${support}${feature.description?' · '+feature.description:''}`);if(feature.missing)item.textContent+=` · ${feature.missing} dati mancanti`;features.append(item)}const details=element('details','project-operation-feature-details');details.append(element('summary','',`Caratteristiche collegate (${operation.features.length})`),features);card.append(details)}
   if(operation.questions.length){const questions=element('div','project-operation-blockers');questions.append(element('strong','','Questioni aperte collegate'));const items=element('ul');for(const issue of operation.questions)items.append(element('li','',`${issue.id}: ${issue.description} · Blocchi dichiarati: ${issue.blocks.join(', ')||'nessuno'}`));questions.append(items);card.append(questions)}
   listNode.append(card);
  }
 }
 function setAnalysis(analysis){try{planner=createOperationPlanner(analysis);errorMessage=''}catch(error){planner=null;errorMessage='Analisi non utilizzabile: '+error.message}render()}
 section.addEventListener('project-analysis-updated',event=>{if(event?.detail)setAnalysis(event.detail)});
 render();section.prepend(panel);
 return {setAnalysis,refresh:render};
}
