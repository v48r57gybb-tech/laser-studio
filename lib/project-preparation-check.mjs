const numeric=v=>typeof v==='number'&&Number.isFinite(v);
const positive=v=>numeric(v)&&v>0;
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(numeric);
const list=v=>Array.isArray(v)?v:[];
export function inspectProjectPreparation(analysis,plan,drafts=[]){
 const a=analysis?.analysis??analysis,issues=[],operations=[];
 const add=(target,kind,path,message)=>target.push({kind,path,message});
 if(!Array.isArray(a?.features)||!Array.isArray(a?.proposals)||!Array.isArray(plan?.requests)||!Array.isArray(plan?.tools)){
  add(issues,'missing','input','Richiesti features, proposals, requests e tools');return report();
 }
 function unique(rows,path){const map=new Map();for(const row of rows){if(!row||typeof row.id!=='string'||!row.id||map.has(row.id))add(issues,'conflict',path,'ID mancante o duplicato');else map.set(row.id,row)}return map}
 const features=unique(a.features,'features'),proposals=unique(a.proposals,'proposals'),tools=unique(plan.tools,'tools');unique(plan.requests,'requests');
 const configs=new Map();for(const c of list(drafts)){if(!c||typeof c.phaseId!=='string'||configs.has(c.phaseId))add(issues,'conflict','drafts','Fase mancante o duplicata');else configs.set(c.phaseId,c)}
 const pending=new Set(proposals.keys());while(pending.size){const ready=[...pending].filter(id=>list(proposals.get(id).depends_on).every(d=>!pending.has(d)));if(!ready.length){add(issues,'conflict','proposals.depends_on','Dipendenze cicliche');break}ready.forEach(id=>pending.delete(id))}
 for(const p of proposals.values())for(const d of list(p.depends_on))if(!proposals.has(d))add(issues,'conflict','proposals.'+p.id+'.depends_on','Dipendenza inesistente: '+d);
 for(const r of plan.requests){
  if(!r||typeof r.id!=='string')continue;
  const findings=[],base='drafts.'+r.phaseId,c=configs.get(r.phaseId),f=features.get(r.featureId),t=tools.get(r.toolId),rows=list(c?.rows),matches=rows.filter(row=>row?.id===r.id),row=matches[0],path=base+'.rows.'+r.id;
  const check=(ok,key,message)=>{if(!ok)add(findings,'missing',key,message)};
  for(const [exists,key]of [[f,'featureId'],[t,'toolId'],[proposals.has(r.operationId),'operationId'],[proposals.has(r.phaseId),'phaseId']])if(!exists)add(findings,'conflict','requests.'+r.id+'.'+key,'Riferimento inesistente');
  if(matches.length>1)add(findings,'conflict',path,'Riga duplicata');
  check(!!c,base,'Configurazione fase mancante');check(!!row,path,'Configurazione operazione mancante');
  for(const key of ['origin','u','v','w'])check(vector(c?.[key]),base+'.'+key,'Vettore XYZ numerico richiesto');
  if(['u','v','w'].every(k=>vector(c?.[k]))){const [u,v,w]=[c.u,c.v,c.w],dot=(x,y)=>x.reduce((s,n,i)=>s+n*y[i],0),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if([u,v,w].some(v=>Math.abs(Math.hypot(...v)-1)>1e-5)||Math.abs(dot(u,v))>1e-5||dot(cross,w)<.99999)add(findings,'conflict',base+'.uvw','Base non ortonormale destrorsa')}
  check(numeric(c?.stockTopZ),base+'.stockTopZ','Quota ingombro richiesta');for(const key of ['safeClearance','changeClearance'])check(positive(c?.[key]),base+'.'+key,'Margine positivo richiesto');
  if(t){
   if(!['drill','mill','face','chamfer'].includes(t.kind))add(findings,'unsupported','tools.'+t.id+'.kind','Famiglia senza adattatore operativo');
   if(!Number.isInteger(t.station)||t.station<1||t.station>28)add(findings,'conflict','tools.'+t.id+'.station','Stazione fuori 1–28');
   if(plan.tools.some(other=>other&&other.id!==t.id&&other.station===t.station))add(findings,'conflict','tools.'+t.id+'.station','Stazione condivisa da utensili distinti');
   for(const k of ['diameter','fluteLength','projection'])check(positive(t[k]),'tools.'+t.id+'.'+k,'Dimensione utensile positiva richiesta');
  }
  for(const key of ['rpm','feed','entryFeed'])check(positive(row?.[key]),path+'.'+key,'Parametro positivo richiesto');
  if(t?.kind==='drill'){check(vector(row?.point),path+'.point','Ingresso CAD XYZ richiesto');check(vector(row?.axis),path+'.axis','Asse foro richiesto');check(positive(row?.depth),path+'.depth','Profondita alla punta richiesta')}
  const planner=c?.planner?.enabled===true;
  if(planner){
   check(!!c.planner.geometry,base+'.planner.geometry','Dominio geometrico richiesto');check(vector(c.planner.placement),base+'.planner.placement','Posizione del dominio richiesta');
   const spec=row?.planner,allowed={drill:['drilling'],mill:['facing','roughing','finishing','pocket'],face:['facing'],chamfer:['chamfer']};
   if(t&&!allowed[t.kind]?.includes(spec?.type))add(findings,'unsupported',path+'.planner.type','Adattatore assente o incompatibile');
   const p=spec?.parameters??{};
   if(spec?.type==='pocket'){check(typeof p.shape==='string'&&p.shape.length>0,path+'.planner.parameters.shape','Forma tasca richiesta');for(const k of ['x','y'])check(numeric(p[k]),path+'.planner.parameters.'+k,'Posizione tasca richiesta')}
   if(spec?.type==='chamfer')check(positive(p.width),path+'.planner.parameters.width','Larghezza smusso richiesta');
   if(t?.kind!=='drill'&&spec?.type!=='facing')check(positive(row?.depth),path+'.depth','Profondita richiesta');
  }else if(t&&['mill','face','chamfer'].includes(t.kind))check(Array.isArray(row?.path)&&row.path.length>=2&&row.path.every(vector),path+'.path','Percorso centro utensile esplicito richiesto');
  const related=new Set([r.phaseId,r.operationId,r.featureId]);
  for(const issue of list(a.open_issues))if(list(issue?.related_ids).some(id=>related.has(id))&&list(issue.blocks).some(b=>['geometry','planning','iso_generation'].includes(b))&&!list(c?.reviewedIssueIds).includes(issue.id))add(findings,'conflict','open_issues.'+issue.id,String(issue.description??'Questione bloccante da esaminare'));
  for(const [key,v]of Object.entries(f?.values??{}))if(/conflitt|ambigu|mancante/i.test(v?.status??''))add(findings,'conflict','features.'+f.id+'.values.'+key,'Valore da chiarire: '+v.status);
  const confirmations=[];if(c?.acknowledgeDraft!==true)confirmations.push(base+'.acknowledgeDraft');
  if(planner)for(const k of ['geometryConfirmed','toolsConfirmedForPlanning'])if(c.planner[k]!==true)confirmations.push(base+'.planner.'+k);
  const status=findings.some(i=>i.kind==='conflict')?'conflict':findings.some(i=>i.kind==='unsupported')?'unsupported':findings.length?'missing-data':'preliminary-complete';
  operations.push({requestId:r.id,phaseId:r.phaseId,selected:row?.enabled===true,status,findings,confirmations,previewNotes:planner&&row?.planner?.type==='drilling'?['Verificare cicli generati: G81 non supportato dall’anteprima attuale']:[],removalSupported:!!t&&['mill','face'].includes(t.kind)});
 }
 return report();
 function report(){return {scope:'preliminary-data-check-only',issues,operations,counts:Object.fromEntries(['conflict','unsupported','missing-data','preliminary-complete'].map(s=>[s,operations.filter(o=>o.status===s).length])),generatorValidationRequired:true,previewValidationRequired:true,canGenerateAutomatically:false,readyForMachine:false}}
}
