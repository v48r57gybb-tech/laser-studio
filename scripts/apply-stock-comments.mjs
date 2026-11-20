import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const once=(source,anchor,replacement)=>{assert.equal(source.split(anchor).length,2,'Punto commenti ISO cambiato: '+anchor);return source.replace(anchor,replacement);};
const {composeProgram:before}=await import('../dist/lib/stock-program.mjs');
let program=await readFile('dist/lib/stock-program.mjs','utf8');
program=once(program,"add('(OPERAZIONE '+text(op.id)+' - '+text(op.coordinateMode)+')',op);","add('('+text(stockOperationComment(op))+')',op);");
program+=`
function stockOperationComment(op){
 const names={probe:'TASTATURA',facing:'SPIANATURA',roughing:'CONTORNATURA DI SGROSSATURA',finishing:'CONTORNATURA DI FINITURA',drilling:'FORATURA',chamfer:'SMUSSATURA'};
 if(op.type==='pocket')return op.operationShape==='obround'?'ASOLA':'TASCA';
 return names[op.type]??'LAVORAZIONE';
}
`;
let planning=await readFile('dist/lib/stock-planning.mjs','utf8');
planning=once(planning,'id:op.id,type:op.type,tool:snapshot,coordinateMode:mode','id:op.id,type:op.type,operationShape:op.parameters.shape,tool:snapshot,coordinateMode:mode');
await writeFile('dist/lib/stock-program.mjs',program);
await writeFile('dist/lib/stock-planning.mjs',planning);
for(const path of ['dist/lib/stock-program.mjs','dist/lib/stock-planning.mjs']){const r=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});assert.equal(r.status,0,path+'\n'+r.stderr);}
const {composeProgram:after}=await import('../dist/lib/stock-program.mjs?operation-comments');
const cases=[['probe',null,'TASTATURA'],['facing',null,'SPIANATURA'],['roughing',null,'CONTORNATURA DI SGROSSATURA'],['finishing',null,'CONTORNATURA DI FINITURA'],['drilling',null,'FORATURA'],['chamfer',null,'SMUSSATURA'],['pocket','obround','ASOLA'],['pocket','rounded-rectangle','TASCA']];
for(const [type,shape,label]of cases){
 const probe=type==='probe',tool={id:'test-tool',station:probe?28:2,kind:probe?'probe':'mill',diameter:10,fluteLength:30,loaded:true};
 const plan={kind:'stock-operation-plan',id:'internal-id-not-for-comment',type,operationShape:shape,tool:{tool,parameters:{rpm:1000,coolant:'off'}},coordinateMode:'tool-center',workOffset:'G56',safeZ:10,changeZ:100,moves:probe?[{type:'probe-move',z:10,feed:100}]:[{type:'move',code:'G0',z:10},{type:'move',code:'G0',x:0,y:0},{type:'move',code:'G1',z:-1,feed:100}]};
 const old=before([plan]),next=after([plan]);
 assert.deepEqual(next.lineMap,old.lineMap);
 const expected=old.iso.split('\n').map(line=>line.startsWith('(OPERAZIONE ')?'('+label+')':line).join('\n');
 assert.equal(next.iso,expected,'Solo il commento deve cambiare: '+label);
 assert.equal(next.readyForMachine,false);
}
console.log('Commenti ISO: 8 confronti del compositore superati; istruzioni e mappa righe invariate nei casi di prova. Non è collaudo macchina.');
