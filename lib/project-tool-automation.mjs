import { registerProjectToolAssignment } from '../project-tool-assignment.js';
import { applyNominalTools as existingNominalTools } from './stock-nominal-tools.mjs';
const SUPPORTED=new Set(['face','mill','drill','chamfer','spot','probe']);
const positive=(n)=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=1000000;
const key=t=>[t.kind,t.diameter,t.fluteLength??null,t.neckDiameter??null,t.neckLength??null,t.overallLength??null].join('|');
export function recommendationText(proposal){
 const s=String(proposal?.description??'');
 const match=/Caratteristiche e categoria di utensile:\s*([\s\S]*?)(?=\n\s*\n|Requisiti geometrici|Parametri iniziali|$)/i.exec(s);
 return match?.[1]?.trim()??'';
}
export function suggestFamilies(proposal){
 const source=recommendationText(proposal),s=source.toLowerCase(),families=[];
 const add=(family)=>{if(!families.includes(family))families.push(family)};
 if(/spianar/.test(s))add('face');
 if(/candela|cilindrica|contornar|fresatura|fresa per riferimenti|sgrossatura con fresa/.test(s))add('mill');
 if(/punta|foratura|preforo/.test(s))add('drill');
 if(/smuss|utensile a 45/.test(s))add('chamfer');
 if(/maschio|filett/.test(s))add('tap');
 if(/baren|alesatur/.test(s))add('bore');
 if(/fresa a disco/.test(s))add('slot-disc');
 if(/strumenti di misura|misurazione/.test(s))add('measurement');
 return {proposalId:proposal.id,source,families:families.map(family=>({family,supported:SUPPORTED.has(family)})),status:families.length?'suggested':'needs_review',alternativesRequireReview:/oppure|alternativa|eventuale|solo dopo/.test(s)};
}
export function prepareAutomaticTools(project,requests,{applyNominalTools,loadProfile=null}={}){
 if(!project||!Array.isArray(project.tools)||!Array.isArray(requests)||requests.length>1000)throw Error('Progetto o richieste non validi');
 if(typeof applyNominalTools!=='function')throw Error('Collegare applyNominalTools esistente');
 const next=structuredClone(project),assignments=[],pending=[],used=new Set(),ids=new Set();
 for(const t of next.tools){if(!SUPPORTED.has(t.kind)||!positive(t.diameter)||!Number.isInteger(t.station)||t.station<1||t.station>28||(t.kind==='probe')!==(t.station===28)||used.has(t.station)||typeof t.id!=='string'||!t.id||ids.has(t.id))throw Error('Magazzino utensili incoerente');used.add(t.station);ids.add(t.id)}
 for(const r of requests){
  if(typeof r.operationId!=='string'||!r.operationId)throw Error('Operazione mancante');
  if(!SUPPORTED.has(r.family)){pending.push({operationId:r.operationId,family:r.family,reason:'Famiglia senza adattatore operativo'});continue}
  if(!positive(r.diameter))throw Error('Diametro utensile non valido');
  const candidate={kind:r.family,diameter:r.diameter};
  for(const field of ['fluteLength','neckDiameter','neckLength','overallLength'])if(r[field]!=null){if(!positive(r[field]))throw Error(field+' non valido');candidate[field]=r[field]}
  let tool=next.tools.find(t=>key(t)===key(candidate));
  if(!tool){
   const pool=r.family==='probe'?[28]:r.family==='drill'?[11,12,13,14,15,16,17,18,19,20]:Array.from({length:27},(_,i)=>i+1);
   const station=pool.find(n=>!used.has(n));
   if(!station){pending.push({operationId:r.operationId,family:r.family,reason:'Nessuna stazione libera per famiglia'});continue}
   let id='auto-'+r.family+'-'+station;while(ids.has(id))id+='x';
   tool={...candidate,id,station,loaded:false,parameters:{rpm:null,feed:null,entryFeed:null,coolant:'off'},origin:'generic-simulation'};
   next.tools.push(tool);used.add(station);ids.add(id);
   if(loadProfile)loadProfile(tool);
  }
  if(r.depth!=null&&!positive(r.depth))throw Error('Raggiungimento richiesto non valido');
  const depth=r.depth??null,margin=r.clearanceMargin??5;if(!positive(margin))throw Error('Margine nominale non valido');
  const requiredReach=depth===null?null:depth+margin;
  const dOperations=['roughing','finishing','pocket'];
  assignments.push({operationId:r.operationId,toolId:tool.id,addresses:{T:tool.station,H:tool.station,D:dOperations.includes(r.operationType)?tool.station:null},mounting:{requiredDepth:depth,proposedReach:requiredReach,actualProjection:null,status:'nominal-not-verified'},fluteStatus:depth===null?'depth-required':tool.fluteLength==null?'length-required':tool.fluteLength>=depth?'nominal-length-sufficient':'strategy-or-tool-review',collisionStatus:'not-checked',readyForISO:false});
 }
 applyNominalTools(next);
 return {project:next,assignments,pending,collisionCheck:false,executionAuthorized:false};
}
if(typeof document!=='undefined')registerProjectToolAssignment({suggestFamilies,prepareAutomaticTools,applyNominalTools:existingNominalTools});
