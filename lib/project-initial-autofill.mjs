const number=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1000000;
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(number);
const missing=v=>v===null||v===undefined;
const partial=v=>missing(v)||(Array.isArray(v)&&v.length===3&&v.some(missing));
const copy=v=>structuredClone(v);
function frameValid(c){
 if(!['origin','u','v','w'].every(k=>vector(c[k])))return false;
 const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0),[u,v,w]=[c.u,c.v,c.w],cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 return [u,v,w].every(v=>Math.abs(Math.hypot(...v)-1)<=1e-5)&&Math.abs(dot(u,v))<=1e-5&&dot(cross,w)>=.99999;
}
export function fillInitialProjectDraft(input,draft,plan){
 const a=input?.analysis??input,c=copy(draft),applied=[],unresolved=[];
 const note=(path,message)=>unresolved.push({path,message});
 const set=(target,key,value,path,source)=>{target[key]=copy(value);applied.push({path,source})};
 const finish=()=>{c.autoFill={scope:'initial-explicit-data-only',applied,unresolved,confirmationsApplied:false};return c};
 if(a?.part?.units!=='mm'){note('part.units','Unita mm esplicite richieste: nessuna compilazione');return finish()}
 if(!Array.isArray(a.features)||!Array.isArray(a.proposals)||!Array.isArray(plan?.requests)||!Array.isArray(plan?.tools)||!Array.isArray(c.rows)){note('input','Struttura incompleta');return finish()}
 const duplicate=rows=>rows.some((r,i)=>!r||typeof r.id!=='string'||rows.findIndex(q=>q?.id===r.id)!==i);
 if([a.features,a.proposals,plan.requests,plan.tools,c.rows].some(duplicate)){note('input.ids','ID mancanti o duplicati: compilazione sospesa');return finish()}
 const blocked=id=>(a.open_issues??[]).some(i=>Array.isArray(i?.related_ids)&&i.related_ids.includes(id)&&i.blocks?.some(b=>['geometry','planning','iso_generation'].includes(b)));
 const phase=a.proposals.find(p=>p.id===c.phaseId),f=phase?.frame;let frameConflict=false;
 if(blocked(c.phaseId)){note('phase','Questione bloccante della fase: compilazione sospesa');return finish()}
 if(f){
  for(const key of ['origin','u','v','w']){
   if(!vector(f[key]))continue;
   if(partial(c[key])){if(Array.isArray(c[key])&&c[key].some((n,i)=>!missing(n)&&(!number(n)||Math.abs(n-f[key][i])>1e-6))){frameConflict=true;note(key,'Componenti parziali discordanti: vettore conservato')}else set(c,key,f[key],key,'proposals.'+phase.id+'.frame.'+key);}
   else if(vector(c[key])&&c[key].some((n,i)=>Math.abs(n-f[key][i])>1e-6)){frameConflict=true;note(key,'Frame strutturato discordante: valore corrente conservato')}
  }
 }
 if(!frameConflict&&frameValid(c)&&c.planner&&missing(c.planner.geometry)){
  const b=a.part.bounds;
  if(b&&vector(b.min)&&vector(b.max)&&b.min.every((n,i)=>n<b.max[i])){
   const axes=[c.u,c.v,c.w],points=Array.from({length:8},(_,mask)=>{const p=b.min.map((n,i)=>(mask&(1<<i)?b.max[i]:n)-c.origin[i]);return axes.map(v=>v.reduce((s,n,i)=>s+n*p[i],0))}),min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));
   if(missing(c.planner.placement)){
    set(c.planner,'geometry',{finished:{type:'box',width:max[0]-min[0],depth:max[1]-min[1],height:max[2]-min[2]},origin:{xy:'bottom-left'},allowances:{xMinus:0,xPlus:0,yMinus:0,yPlus:0,zMinus:0,zPlus:0}},'planner.geometry','part.bounds trasformato nella base di fase');
    set(c.planner,'placement',[min[0],min[1],max[2]],'planner.placement','part.bounds trasformato nella base di fase');
    c.planner.geometryRole='ENVELOPE_ONLY_NOT_STEP_SHAPE';note('planner.geometry','Solo inviluppo del pezzo: non identifica sagoma STEP, grezzo reale o staffaggi');
   }else note('planner.placement','Posizione gia presente: dominio non sostituito');
  }else note('part.bounds','Ingombro esplicito assente o non valido');
 }else if(frameConflict||!frameValid(c))note('frame','Base/origine non risolte: nessuna geometria dedotta');
 for(const row of c.rows){
  const path='rows.'+row.id,r=plan.requests.find(r=>r.id===row.id&&r.phaseId===c.phaseId),feature=a.features.find(f=>f.id===r?.featureId),tool=plan.tools.find(t=>t.id===r?.toolId);
  if(!r||!feature||!tool){note(path,'Riferimenti operativi mancanti');continue}
  if(blocked(feature.id)||blocked(r.operationId)||Object.values(feature.values??{}).some(v=>/conflitt|conflict|ambigu|mancante/i.test(v?.status??''))){note(path,'Quote o questioni da chiarire: nessun dato applicato');continue}
  if(tool.kind==='drill'){
   for(const [key,value,source]of [['point',feature.entryPoint,'entryPoint'],['axis',feature.axis,'axis']])if(partial(row[key])&&vector(value))set(row,key,value,path+'.'+key,'features.'+feature.id+'.'+source);
  }
  if(missing(row.depth)&&number(r.depth)&&r.depth>0)set(row,'depth',r.depth,path+'.depth','requests.'+r.id+'.depth');
  for(const key of ['rpm','feed','entryFeed'])if(missing(row[key])&&number(tool.parameters?.[key])&&tool.parameters[key]>0)set(row,key,tool.parameters[key],path+'.'+key,'tools.'+tool.id+'.parameters.'+key);
  if(row.planner?.type==='pocket')note(path+'.planner.parameters','Forma e dimensioni tasca non dedotte dal solo ingombro o punto ingresso');
 }
 return finish();
}
