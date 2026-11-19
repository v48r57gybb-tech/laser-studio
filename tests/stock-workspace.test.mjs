import assert from 'node:assert/strict';
import {createProject,validateProject,exportProject,importProject,prepare,createArchive,ARCHIVE_KEY} from '../lib/stock-workspace.mjs';
let passed=0;const cases=[];function test(n,f){f();passed++;cases.push(n);}
const copy=x=>JSON.parse(JSON.stringify(x));
function memory(){const data=new Map([['cnc-iso-archive','PRESERVE'],['iso-smart-v2','PRESERVE']]);return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
function active(){const p=createProject();const t=p.tools[0];t.loaded=true;t.parameters={rpm:2000,feed:200,entryFeed:60,coolant:'M8'};p.operations=[{id:'face-1',type:'facing',enabled:true,toolId:t.id,parameters:{stepZ:1.5}}];return p;}
test('progetto canonico esportabile',()=>assert.equal(exportProject(importProject(exportProject(createProject()))),exportProject(createProject())));
test('T1 T2 T3 e sonda',()=>{const p=createProject();assert.equal(p.tools[0].diameter,50);assert.equal(p.tools[1].diameter,40);assert.equal(p.tools[2].diameter,20);assert.equal(p.tools.at(-1).station,28);});
test('nessun utensile dato per caricato',()=>assert(createProject().tools.every(t=>!t.loaded)));
test('preparazione blocca dipendenze mancanti',()=>{const p=prepare(active());assert.equal(p.readyForPlanning,false);assert(p.blockers.some(s=>s.includes('geometrico')));assert(p.blockers.some(s=>s.includes('pianificatore')));assert(p.blockers.some(s=>s.includes('compositore')));});
test('prepare non genera ISO',()=>assert(!Object.hasOwn(prepare(active()),'iso')));
test('utensile non caricato blocca',()=>{const p=active();p.tools[0].loaded=false;assert(prepare(p).blockers.some(s=>s.includes('non confermato')));});
test('S mancante blocca',()=>{const p=active();p.tools[0].parameters.rpm=null;assert(prepare(p).blockers.some(s=>s.includes('rpm')));});
test('archivio vuoto non scrive',()=>{const s=memory(),a=createArchive(s);assert.equal(a.read().revision,0);assert(!s.data.has(ARCHIVE_KEY));});
test('save read progetto completo',()=>{const s=memory(),a=createArchive(s),p=active();p.notes='Morsa e battuta';const r=a.save(p,{recordId:'A',expectedRevision:0});assert.equal(r.revision,1);assert.deepEqual(a.read().items[0].project,p);});
test('salvataggio non tocca vecchie chiavi',()=>{const s=memory(),a=createArchive(s);a.save(createProject(),{recordId:'A',expectedRevision:0});assert.equal(s.data.get('cnc-iso-archive'),'PRESERVE');assert.equal(s.data.get('iso-smart-v2'),'PRESERVE');});
test('override per progetto non muta altri record',()=>{const s=memory(),a=createArchive(s),p=active();a.save(p,{recordId:'A',expectedRevision:0});p.tools[0].parameters.feed=999;a.save(p,{recordId:'B',expectedRevision:1});assert.equal(a.read().items[0].project.tools[0].parameters.feed,200);});
test('revisione obsoleta rifiutata',()=>{const a=createArchive(memory());a.save(createProject(),{recordId:'A',expectedRevision:0});assert.throws(()=>a.save(createProject(),{recordId:'B',expectedRevision:0}));assert.equal(a.read().items.length,1);});
test('modifica record esistente con revisione',()=>{const a=createArchive(memory());a.save(createProject(),{recordId:'A',expectedRevision:0});a.save(createProject('Modificato'),{recordId:'A',expectedRevision:1});assert.equal(a.read().items.length,1);assert.equal(a.read().items[0].project.name,'Modificato');});
test('eliminazione richiede conferma',()=>{const a=createArchive(memory());a.save(createProject(),{recordId:'A',expectedRevision:0});assert.throws(()=>a.remove('A',{expectedRevision:1}));assert.equal(a.read().items.length,1);});
test('eliminazione confermata',()=>{const a=createArchive(memory());a.save(createProject(),{recordId:'A',expectedRevision:0});a.remove('A',{expectedRevision:1,confirmed:true});assert.equal(a.read().items.length,0);});
test('export import merge non distruttivo',()=>{const a=createArchive(memory()),b=createArchive(memory());a.save(active(),{recordId:'A',expectedRevision:0});b.save(createProject(),{recordId:'B',expectedRevision:0});b.import(a.export(),{expectedRevision:1});assert.equal(b.read().items.length,2);});
test('collisione ID import non sovrascrive',()=>{const a=createArchive(memory());a.save(createProject(),{recordId:'A',expectedRevision:0});const before=a.export();assert.throws(()=>a.import(before,{expectedRevision:1}));assert.equal(a.export(),before);});
test('archivio corrotto preservato',()=>{const s=memory();s.setItem(ARCHIVE_KEY,'BAD');const a=createArchive(s);assert.throws(()=>a.read());assert.throws(()=>a.save(createProject(),{recordId:'A',expectedRevision:0}));assert.equal(s.getItem(ARCHIVE_KEY),'BAD');});
test('quota memoria non nascosta',()=>{const a=createArchive({getItem:()=>null,setItem(){throw Error('quota');}});assert.throws(()=>a.save(createProject(),{recordId:'A',expectedRevision:0}),/quota/);});
for(const [name,mut]of [
 ['versione',p=>p.schemaVersion=2],['unita',p=>p.units='inch'],['S frazionario',p=>p.tools[0].parameters.rpm=2.5],['postazione duplicata',p=>p.tools[1].station=1],['T28 fresa',p=>p.tools[0].station=28],['sovramateriale negativo',p=>p.geometry.allowances.zPlus=-1],['utensile mancante',p=>p.operations[0].toolId='missing'],['ID operazione duplicato',p=>p.operations.push(copy(p.operations[0]))],['NaN',p=>p.geometry.finished.width=NaN],['foro troppo grande',p=>{p.geometry.finished={type:'tube',height:20,diameter:20,innerDiameter:21};}]
])test('rifiuta '+name,()=>{const p=active();mut(p);assert.throws(()=>validateProject(p));});
test('chiave riservata import rifiutata',()=>{const p=exportProject(createProject());assert.throws(()=>importProject(p.replace('"notes": ""','"notes": "", "__proto__": {}')));});
test('100 cicli save export import',()=>{for(let i=0;i<100;i++){const a=createArchive(memory()),b=createArchive(memory()),p=active();p.geometry.finished.width=50+i;a.save(p,{recordId:'R'+i,expectedRevision:0});b.import(a.export(),{expectedRevision:0});assert.deepEqual(b.read().items[0].project,p);}});
console.log(JSON.stringify({passed,failed:0,cases,roundtrips:100,scope:'real workspace schema and archive integration; memory storage adapter, not DOM, browser build or CNC'},null,2));
