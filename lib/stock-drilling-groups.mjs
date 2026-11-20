const numeric=(v,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e6)throw Error(label+' non valido');return v;};
const positive=(v,label)=>{numeric(v,label);if(v<=0)throw Error(label+' positivo richiesto');return v;};
const count=v=>{if(!Number.isInteger(v)||v<1||v>1000)throw Error('Numero fori 1–1000 richiesto');return v;};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const coordinateKeys=new Set(['pattern','x','y','count','pitch','angle','rows','columns','pitchX','pitchY','circleDiameter','points']);
export function drillingPoints(p){
 if(p.pattern!=='points')count(p.count??1);
 let result=[];if(p.pattern==='points'){if(!Array.isArray(p.points))throw Error('Elenco coordinate richiesto');count(p.points.length);result=p.points.map(q=>({x:numeric(q.x,'X'),y:numeric(q.y,'Y')}));}
 else {const x=numeric(p.x,'X'),y=numeric(p.y,'Y'),a=numeric(p.angle??0,'Angolo')*Math.PI/180;
 if(p.pattern==='single')result=[{x,y}];
 else if(p.pattern==='line'){const n=count(p.count),pitch=positive(p.pitch,'Interasse');for(let i=0;i<n;i++)result.push({x:x+i*pitch*Math.cos(a),y:y+i*pitch*Math.sin(a)});}
 else if(p.pattern==='grid'){const rows=count(p.rows),cols=count(p.columns),dx=positive(p.pitchX,'Passo X'),dy=positive(p.pitchY,'Passo Y');count(rows*cols);for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)result.push({x:x+i*dx*Math.cos(a)-j*dy*Math.sin(a),y:y+i*dx*Math.sin(a)+j*dy*Math.cos(a)});}
 else if(p.pattern==='circle'){const n=count(p.count),r=positive(p.circleDiameter,'Diametro distribuzione')/2;for(let i=0;i<n;i++)result.push({x:x+r*Math.cos(a+2*Math.PI*i/n),y:y+r*Math.sin(a+2*Math.PI*i/n)});}
 else throw Error('Schema foratura non supportato');}
 const seen=new Set();for(const q of result){numeric(q.x,'X');numeric(q.y,'Y');const key=Number(q.x.toFixed(4))+','+Number(q.y.toFixed(4));if(seen.has(key))throw Error('Fori coincidenti dopo arrotondamento ISO');seen.add(key);}return result;
}
function signature(op){const params=Object.fromEntries(Object.entries(op.parameters).filter(([k])=>!coordinateKeys.has(k))),meta=Object.fromEntries(Object.entries(op).filter(([k])=>!['id','parameters'].includes(k)));return JSON.stringify(canonical({meta,params}));}
export function prepareDrillingGroups(input){
 const project=structuredClone(input),groups=[],sequence=[];let previous=null;
 for(const op of project.operations){if(op.type!=='drilling'||!op.enabled){sequence.push({operation:op});previous=null;continue;}
 const points=drillingPoints(op.parameters),key=signature(op);if(previous?.key===key){previous.points.push(...points);previous.sourceOperationIds.push(op.id);count(previous.points.length);drillingPoints({pattern:'points',points:previous.points});}
 else {previous={id:op.id,key,operation:op,sourceOperationIds:[op.id],points};groups.push(previous);sequence.push({group:previous});}}
 const reserved=new Set(project.operations.map(o=>o.id)),fragmentToGroup={},operations=[];let serial=0;
 for(const item of sequence){if(item.operation){operations.push(item.operation);continue;}const g=item.group;for(const point of g.points){let id;do{id='iso-hole-'+(++serial);}while(reserved.has(id));reserved.add(id);fragmentToGroup[id]=g.id;operations.push({...structuredClone(g.operation),id,parameters:{...structuredClone(g.operation.parameters),pattern:'single',x:point.x,y:point.y,count:1}});}}
 if(operations.length>1000)throw Error('Espansione oltre il limite di 1000 operazioni del pianificatore');project.operations=operations;
 return {project,groups:groups.map(({id,sourceOperationIds,points})=>({id,sourceOperationIds,points})),fragmentToGroup};
}
