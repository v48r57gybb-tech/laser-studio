const OPERATION_ID=/^OP\d{3}$/;
const SETUP_ID=/^SETUP\d{2}$/;
const STATUS_LABELS={described:'Disponibile per revisione',needsclarification:'Da confermare',needsinspection:'Da verificare',blocked:'Bloccata'};
function text(value){return typeof value==='string'?value.trim():''}
function list(value){return Array.isArray(value)?value:[]}
function short(value,max=180){const t=text(value);return t.length>max?t.slice(0,max-1)+'…':t}
export function createOperationPlanner(analysis){
 const root=analysis?.analysis??analysis??{};
 const proposals=list(root.proposals);
 const features=new Map(list(root.features).map(f=>[text(f.id),f]));
 const issues=new Map(list(root.openissues).map(i=>[text(i.id),i]));
 const operations=proposals.filter(p=>OPERATION_ID.test(text(p.id)));
 const setups=new Map(proposals.filter(p=>SETUP_ID.test(text(p.id))).map(p=>[text(p.id),p]));
 if(!operations.length)throw Error('Nessuna proposta di lavorazione OPxxx nel JSON');
 function missing(feature){let count=0;for(const value of Object.values(feature?.values??{}))if(value?.status==='mancante')count++;return count}
 function operation(id){
  const proposal=operations.find(p=>text(p.id)===id);
  if(!proposal)throw Error('Operazione non trovata: '+id);
  const setupMatch=/^(SETUP\d{2})/.exec(text(proposal.description));
  const setupId=setupMatch?setupMatch[1]:null;
  const featureRows=list(proposal.featureids).map(featureId=>{const feature=features.get(featureId);return {id:featureId,kind:text(feature?.kind)||'non classificata',description:short(feature?.description,220),support:text(feature?.supportstatus)||'non verificato',missing:feature?missing(feature):null}});
  const blockers=list([...issues.values()]).filter(issue=>list(issue.relatedids).includes(id)).map(issue=>({id:text(issue.id),description:short(issue.description,260),blocks:list(issue.blocks)}));
  const status=blockers.length?'blocked':text(proposal.status)||'described';
  return {id,text:short(proposal.description,180),setupId,setup:setups.get(setupId)??null,features:featureRows,status,statusLabel:STATUS_LABELS[status]||status,blockers,requirements:list(proposal.requirementid)};
 }
 function summary(){const rows=operations.map(p=>operation(text(p.id)));return {total:rows.length,available:rows.filter(r=>r.status==='described').length,toConfirm:rows.filter(r=>r.status==='needsclarification').length,toInspect:rows.filter(r=>r.status==='needsinspection').length,blocked:rows.filter(r=>r.status==='blocked').length,operations:rows}}
 return {operation,summary,operationIds:operations.map(p=>text(p.id)),setupIds:[...setups.keys()]};
}
function element(tag,className,content){const node=document.createElement(tag);if(className)node.className=className;if(content!==undefined)node.textContent=content;return node}
export function mountOperationPlanner(section){
 if(
  typeof document==='undefined'||
  typeof document.createElement!=='function'
 )return null;

 const domProbe=document.createElement('div');

 if(
  typeof domProbe?.append!=='function'||
  typeof section?.prepend!=='function'||
  !section?.dataset
 )return null;

 if(section.dataset.operationPlannerReady)return null;
 section.dataset.operationPlannerReady='true';
 const panel=element('section','project-operations');panel.id='projectOperationsPanel';
 panel.append(element('h2','','Lavorazioni proposte dal JSON'));
 const status=element('p','project-operations-status','Carica l’analisi JSON per visualizzare le lavorazioni proposte.');
 const listNode=element('div','project-operations-list');
 panel.append(status,listNode);
 const style=document.createElement('style');style.textContent='.project-operations{margin:0 0 24px;padding:18px;border:1px solid #50778c;border-radius:12px;background:rgba(7,32,49,.72)}.project-operations h2{margin:0 0 10px;font-size:1.15rem;color:#eaf7ff}.project-operations-status{margin:0 0 14px;color:#9dbdce}.project-operations-list{display:grid;gap:12px}.project-operation{padding:12px;border:1px solid #3d637b;border-radius:10px;background:rgba(3,22,39,.75)}.project-operation h3{margin:0 0 8px;font-size:1rem;color:#f4fbff}.project-operation-status{display:inline-block;margin-bottom:8px;padding:3px 8px;border-radius:999px;font-size:.75rem;font-weight:700}.status-described{background:#0d4f43;color:#8ff3d3}.status-needsclarification{background:#5b430a;color:#ffd98a}.status-needsinspection{background:#123d5c;color:#8fd0ff}.status-blocked{background:#5b1616;color:#ffb3b3}.project-operation-meta{margin:0 0 8px;color:#9dbdce;font-size:.85rem}.project-operation-features{margin:0 0 8px;padding-left:18px;color:#cfe6f2;font-size:.85rem}.project-operation-blockers{padding:8px;border-left:3px solid #ff6b6b;background:rgba(91,22,22,.28);border-radius:6px;color:#ffd6d6;font-size:.85rem}.project-operation-blockers ul{margin:6px 0 0;padding-left:18px}';
 document.head.append(style);
 let planner=null;
 function render(){
  listNode.replaceChildren();
  if(!planner){status.textContent='Carica l’analisi JSON per visualizzare le lavorazioni proposte.';return}
  let data;try{data=planner.summary()}catch(error){status.textContent='Analisi non utilizzabile: '+error.message;return}
  status.textContent=`${data.total} lavorazioni proposte · ${data.available} disponibili · ${data.toConfirm} da confermare · ${data.toInspect} da verificare · ${data.blocked} bloccate`;
  for(const operation of data.operations){
   const card=element('article','project-operation');
   card.append(element('h3','',`${operation.id} · ${operation.text}`));
   card.append(element('span',`project-operation-status status-${operation.status}`,operation.statusLabel));
   card.append(element('p','project-operation-meta',`Piazzamento: ${operation.setupId??'non indicato'} · Caratteristiche collegate: ${operation.features.length}`));
   if(operation.features.length){const features=element('ul','project-operation-features');for(const feature of operation.features){const item=element('li','',`${feature.id} · ${feature.kind} · ${feature.support}`);if(feature.missing)item.textContent+=` · ${feature.missing} dati mancanti`;features.append(item)}card.append(features)}
   if(operation.blockers.length){const blockers=element('div','project-operation-blockers');blockers.append(element('strong','','Blocchi attivi'));const items=element('ul');for(const blocker of operation.blockers)items.append(element('li','',`${blocker.id}: ${blocker.description}`));blockers.append(items);card.append(blockers)}
   listNode.append(card);
  }
 }
 function setAnalysis(analysis){try{planner=createOperationPlanner(analysis);status.textContent='Analisi JSON caricata.'}catch(error){planner=null;status.textContent='Analisi non utilizzabile: '+error.message}render()}
 document.addEventListener('project-analysis-updated',event=>{if(event?.detail)setAnalysis(event.detail)});
 globalThis.OfficinaOperationPlanner={setAnalysis,refresh:render};
 render();section.prepend(panel);
 return {setAnalysis,refresh:render};
}
