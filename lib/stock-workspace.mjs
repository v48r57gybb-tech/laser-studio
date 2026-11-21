export const SCHEMA=1;
export const ARCHIVE_KEY='officina-stock-workspace-v1';
const MAX=2000000;
const operations=new Set(['probe','facing','roughing','finishing','chamfer','drilling','pocket']);
const clone=v=>JSON.parse(JSON.stringify(v));
function fail(s){throw Error('Grezzo: '+s);}
function finite(v,k){if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1000000)fail(k+' non valido');return v;}
function positive(v,k){if(finite(v,k)<=0)fail(k+' deve essere positivo');return v;}
function plain(v,k){if(!v||typeof v!=='object'||Array.isArray(v))fail(k+' non valido');}
function id(v){if(typeof v!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(v))fail('ID non valido');return v;}
function safe(v,depth=0){if(depth>30)fail('documento troppo annidato');if(typeof v==='number'&&!Number.isFinite(v))fail('numero non finito');if(v===undefined||typeof v==='function'||typeof v==='bigint')fail('valore non serializzabile');if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))fail('chiave riservata');safe(x,depth+1);}}
export function validateProject(input){
 safe(input);plain(input,'progetto');if(input.schemaVersion!==SCHEMA||input.kind!=='stock-workspace'||input.units!=='mm')fail('formato progetto non supportato');if(typeof input.name!=='string'||!input.name.trim()||input.name.length>120)fail('nome non valido');
 const g=input.geometry;plain(g,'geometria');const f=g.finished;plain(f,'finito');if(!['box','plate','cylinder','tube','L','U','T','custom'].includes(f.type))fail('solido non supportato');positive(f.height,'altezza');
 if(['cylinder','tube'].includes(f.type)){positive(f.diameter,'diametro');if(f.type==='tube'&&positive(f.innerDiameter,'diametro interno')>=f.diameter)fail('foro oltre diametro esterno');}
 else if(f.type==='custom'){if(!Array.isArray(f.points)||f.points.length<3||f.points.length>1000)fail('vertici non validi');for(const p of f.points){finite(p.x,'vertice X');finite(p.y,'vertice Y');}}
 else {positive(f.width,'X');positive(f.depth,'Y');if(['L','U','T'].includes(f.type)){positive(f.thickness,'spessore');if(f.thickness>=Math.min(f.width,f.depth)||f.type==='U'&&2*f.thickness>=f.width)fail('spessore incompatibile');}}
 plain(g.allowances,'sovramateriali');for(const k of ['xMinus','xPlus','yMinus','yPlus','zMinus','zPlus'])if(finite(g.allowances[k],k)<0)fail('sovramateriale negativo');if(!['top-left','top-right','bottom-left','bottom-right','center'].includes(g.origin?.xy))fail('zero non valido');
 if(!Array.isArray(input.tools)||input.tools.length>28)fail('utensili non validi');const ids=new Set(),stations=new Set();
 for(const t of input.tools){id(t.id);if(ids.has(t.id))fail('ID utensile duplicato');ids.add(t.id);if(!Number.isInteger(t.station)||t.station<1||t.station>28||stations.has(t.station))fail('postazione duplicata o non valida');stations.add(t.station);if(!['face','mill','chamfer','spot','drill','probe'].includes(t.kind)||(t.kind==='probe')!==(t.station===28))fail('famiglia/postazione non valida');positive(t.diameter,'diametro utensile');if(typeof t.loaded!=='boolean')fail('stato utensile non valido');plain(t.parameters,'parametri utensile');for(const k of ['rpm','feed','entryFeed'])if(t.parameters[k]!==null)positive(t.parameters[k],k);if(t.parameters.rpm!==null&&!Number.isInteger(t.parameters.rpm))fail('S intero richiesto');if(!['off','M8','M18'].includes(t.parameters.coolant))fail('refrigerante non valido');}
 if(!Array.isArray(input.operations)||input.operations.length>1000)fail('operazioni non valide');const opIds=new Set();for(const op of input.operations){id(op.id);if(opIds.has(op.id))fail('ID operazione duplicato');opIds.add(op.id);if(!operations.has(op.type)||typeof op.enabled!=='boolean')fail('operazione non valida');if(op.enabled&&!ids.has(op.toolId))fail('utensile operazione non trovato');plain(op.parameters,'parametri operazione');}
 if(typeof input.notes!=='string'||input.notes.length>20000)fail('note non valide');return clone(input);
}
export function createProject(name='Nuovo grezzo'){
 return validateProject({schemaVersion:SCHEMA,kind:'stock-workspace',units:'mm',name,notes:'',geometry:{finished:{type:'box',width:100,depth:60,height:20},origin:{xy:'top-left'},allowances:{xMinus:2,xPlus:2,yMinus:2,yPlus:2,zMinus:0,zPlus:3}},tools:[[1,'face',50],[2,'mill',40],[3,'mill',20],[4,'mill',12],[5,'mill',8],[6,'mill',6],[7,'mill',4],[8,'mill',3],[9,'chamfer',10],[10,'spot',6],[28,'probe',6]].map(([station,kind,diameter])=>({id:'tool-'+station,station,kind,diameter,loaded:false,parameters:{rpm:null,feed:null,entryFeed:null,coolant:'off'}})),operations:[]});
}
export function exportProject(project){return JSON.stringify(validateProject(project),null,2);
}
export function importProject(text){if(typeof text!=='string'||text.length>MAX)fail('documento troppo grande');let v;try{v=JSON.parse(text);}catch{fail('JSON non valido');}return validateProject(v);
}
export function prepare(project,modules={}){
 const p=validateProject(project),blockers=[];
 if(typeof modules.geometry?.validate!=='function')blockers.push('nucleo geometrico completo non collegato');else modules.geometry.validate(clone(p.geometry));
 const active=p.operations.filter(o=>o.enabled);if(!active.length)blockers.push('nessuna operazione attiva');
 for(const op of active){const t=p.tools.find(t=>t.id===op.toolId);if(!t.loaded)blockers.push(op.id+': utensile non confermato');if(op.type!=='probe')for(const k of ['rpm','feed','entryFeed'])if(t.parameters[k]===null)blockers.push(op.id+': '+k+' mancante');if(typeof modules[op.type]?.plan!=='function')blockers.push(op.id+': pianificatore non collegato');}
 if(typeof modules.composer?.compose!=='function')blockers.push('compositore ISO unico non collegato');
 return {project:p,blockers,readyForPlanning:!blockers.length,geometryChecked:typeof modules.geometry?.validate==='function'};
}
export function validateArchive(input){safe(input);plain(input,'archivio');if(input.schemaVersion!==SCHEMA||input.kind!=='stock-archive'||!Number.isSafeInteger(input.revision)||input.revision<0||!Array.isArray(input.items)||input.items.length>1000)fail('archivio non valido');const ids=new Set();for(const item of input.items){id(item.id);if(ids.has(item.id))fail('ID archivio duplicato');ids.add(item.id);if(typeof item.updatedAt!=='string'||!Number.isFinite(Date.parse(item.updatedAt)))fail('data non valida');validateProject(item.project);}return clone(input);
}
export function createArchive(storage,{key=ARCHIVE_KEY,now=()=>new Date().toISOString()}={}){
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')fail('memoria non disponibile');if(key!==ARCHIVE_KEY)fail('chiave archivio diversa non ammessa');
 const empty=()=>({schemaVersion:SCHEMA,kind:'stock-archive',revision:0,items:[]});
 function read(){const text=storage.getItem(key);if(text===null)return empty();if(typeof text!=='string'||text.length>MAX)fail('archivio troppo grande');let data;try{data=JSON.parse(text);}catch{fail('archivio corrotto: originale preservato');}return validateArchive(data);
 }
 function write(archive,expectedRevision){const current=read();if(current.revision!==expectedRevision)fail('conflitto revisione: ricaricare archivio');const next=validateArchive({...archive,revision:expectedRevision+1}),text=JSON.stringify(next);if(text.length>MAX)fail('archivio troppo grande');storage.setItem(key,text);return next;
 }
 return Object.freeze({read,\n save(project,{recordId,expectedRevision}={}){id(recordId);const p=validateProject(project),a=read();if(a.revision!==expectedRevision)fail('conflitto revisione');const i=a.items.findIndex(v=>v.id===recordId),item={id:recordId,updatedAt:now(),project:p};if(i<0)a.items.push(item);else a.items[i]=item;return write(a,expectedRevision);},\n remove(recordId,{expectedRevision,confirmed=false}={}){if(!confirmed)fail('eliminazione non confermata');id(recordId);const a=read();if(!a.items.some(i=>i.id===recordId))fail('record non trovato');a.items=a.items.filter(i=>i.id!==recordId);return write(a,expectedRevision);},\n export(){return JSON.stringify(read(),null,2);},\n import(text,{expectedRevision,mode='merge'}={}){if(mode!=='merge')fail('solo importazione non distruttiva merge');if(typeof text!=='string'||text.length>MAX)fail('importazione troppo grande');let raw;try{raw=JSON.parse(text);}catch{fail('JSON non valido');}const incoming=validateArchive(raw),a=read(),ids=new Set(a.items.map(i=>i.id));for(const i of incoming.items){if(ids.has(i.id))fail('ID gia presente: '+i.id);a.items.push(i);}return write(a,expectedRevision);}\n });\n}