import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
function once(s,a,b){assert.equal(s.split(a).length,2,'Integrazione cambiata: '+a.slice(0,90));return s.replace(a,b);}
function check(source,label){const r=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});assert.equal(r.status,0,label+'\n'+r.stderr);}
async function edit(path,fn){const code=fn(await readFile(path,'utf8'));check(code,path);await writeFile(path,code);}
await edit('dist/stock-smart-drilling-ui.mjs',s=>once(s,'current().toolId=assigned.toolId;const t=proj.tools.find(x=>x.id===assigned.toolId);',"const assignedTool=assigned.project.tools.find(x=>x.id===assigned.toolId);if(!assignedTool)throw Error('Punta creata non disponibile: assegnazione annullata');if(!proj.tools.some(x=>x.id===assigned.toolId))proj.tools.push(structuredClone(assignedTool));current().toolId=assigned.toolId;const t=proj.tools.find(x=>x.id===assigned.toolId);"));
function normalizeQuotedNewlines(source){let result='',quote=null,escaped=false;for(const c of source){if(quote===null){result+=c;if(c===String.fromCharCode(39)||c===String.fromCharCode(34)||c===String.fromCharCode(96))quote=c;continue;}if(escaped){result+=c;escaped=false;continue;}if(c===String.fromCharCode(92)){result+=c;escaped=true;continue;}if(c===quote){result+=c;quote=null;continue;}if(c==='\n'&&quote!==String.fromCharCode(96))result+=String.fromCharCode(92)+'n';else result+=c;}return result;}
const integrationPath=new URL('./apply-stock-linked-holes.mjs',import.meta.url);
let integration=normalizeQuotedNewlines(await readFile(integrationPath,'utf8'));
integration=once(integration,'const p=createProject();p.tools.push','const p=createProject();p.geometry.finished.height=50;p.tools.push');
integration=once(integration,"p.operations[0].parameters.mode='through';syncLinked(p);assert.equal(p.operations[1].parameters.depth,20);","const boundary=structuredClone(p);boundary.operations[0].parameters.depth=50;assert.throws(()=>syncLinked(boundary),/Foro cieco oltre fondo/);p.operations[0].parameters.mode='through';p.operations[0].parameters.depth=60;syncLinked(p);assert.equal(p.operations[1].parameters.depth,60);");
check(integration,'Integrazione lavorazioni collegate');await writeFile(integrationPath,integration);
await edit('dist/lib/stock-smart-drilling.mjs',s=>{
 s=once(s,"!['G81','G83','G73'].includes(v.cycle)","!['G81','G83','G73','G84'].includes(v.cycle)");
 s=once(s,"if(v.cycle==='G81')return","if(['G81','G84'].includes(v.cycle))return");
 return once(s,'drillingPoints(v);peckEstimate(v);return v;',"if(v.cycle==='G84'){const t=project.tools.find(t=>t.id===op.toolId);if(op.holeRole!=='tapping'||t?.kind!=='tap'||!(t.pitch>0))throw Error('G84 richiede una maschiatura con maschio e passo validi');if(v.q!=null)throw Error('G84 non usa il passo Q');}else if(op.holeRole==='tapping')throw Error('Ciclo maschiatura non valido');drillingPoints(v);peckEstimate(v);return v;");
});
await import('./apply-stock-linked-holes.mjs');
await edit('dist/lib/stock-program.mjs',s=>once(s,'function stockOperationComment(op){',"function stockOperationComment(op){if(op.tool?.tool?.kind==='tap')return 'MASCHIATURA '+(op.tool.tool.thread??'')+' PASSO '+op.tool.tool.pitch;if(op.tool?.tool?.kind==='countersink')return 'SVASATURA FORI';"));
await edit('dist/stock-tool-visuals.js',s=>once(s,'function model(t){',"function model(t){if(t.kind==='countersink')t={...t,kind:'chamfer'};"));
const test=String.raw`import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createProject} from './dist/lib/stock-workspace.mjs';
import {toggleLinked} from './dist/lib/stock-linked-holes.mjs';
import {generateGroupedProgram} from './dist/lib/stock-iso-groups.mjs';
import {smartParameters,peckEstimate} from './dist/lib/stock-smart-drilling.mjs';
const p=createProject();p.geometry.finished.height=50;p.setup={safeZ:20,changeZ:200,externalMargin:5,topFacedConfirmed:true,externalFinishedConfirmed:false,finishStockConfirmed:false};
p.tools.push({id:'test-drill',station:11,kind:'drill',diameter:7.4,loaded:false,lengthMode:'manual',fluteLength:80,tipAngle:118,parameters:{rpm:2000,feed:200,entryFeed:200,coolant:'off'}});
p.operations=[{id:'source-hole',type:'drilling',enabled:true,toolId:'test-drill',parameters:{pattern:'line',x:20,y:-20,count:2,pitch:20,angle:0,depth:20,mode:'blind',depthReference:'tip',rPlane:3,cycle:'G83',q:2,smartPosition:'manual',smartDepth:'manual',coolant:'M8'}}];
toggleLinked(p,'source-hole','countersinking',true,[]);toggleLinked(p,'source-hole','tapping',true,[{drill:7.4,thread:'M8',pitch:1.25,kind:'form'}]);
for(const o of p.operations.filter(o=>o.holeRole)){o.parameters.geometryConfirmed=true;const t=p.tools.find(t=>t.id===o.toolId);t.lengthMode='manual';t.fluteLength=80;}
const context={};runInNewContext(readFileSync('dist/cnc-simulator.js','utf8'),context);runInNewContext(readFileSync('dist/stock-tool-visuals.js','utf8'),context);
for(const mode of ['blind','through']){const q=structuredClone(p);q.operations[0].parameters.mode=mode;q.operations[0].parameters.depth=mode==='blind'?20:53;const result=generateGroupedProgram(q);assert.equal(result.readyForMachine,false);assert(result.iso.includes('MASCHIATURA'));assert(result.iso.includes('SVASATURA FORI'));assert(result.iso.includes('M29 S300.'));assert(result.iso.includes('G98 G84'));assert(result.iso.includes('F375.'));assert(result.iso.includes('G98 G81'));assert(result.iso.includes('G98 G83'));const tap=result.plans.find(o=>o.tool.tool.kind==='tap'),sink=result.plans.find(o=>o.tool.tool.kind==='countersink');assert(tap&&sink);assert(tap.moves.filter(m=>m.type==='cycle').every(m=>m.z===(mode==='blind'?-15:-53)));const moves=context.CncSimulation.parseISO(result.iso),tapCuts=moves.filter(m=>m.cycle===84&&m.holeEnd),sinkCuts=moves.filter(m=>m.cycle===81&&m.holeEnd);assert.equal(tapCuts.length,2);assert.equal(sinkCuts.length,2);assert.deepEqual(tapCuts.map(m=>[m.to.x,m.to.y]),sinkCuts.map(m=>[m.to.x,m.to.y]));const visual=context.StockToolVisual.model(sink.tool.tool);assert(visual.rings.some(r=>r.r===sink.tool.tool.diameter/2));}
assert.equal(peckEstimate({cycle:'G84',depth:15,rPlane:3,q:null}).count,1);
const bad=structuredClone(p);bad.operations[0].parameters.cycle='G84';bad.operations[0].parameters.q=null;assert.throws(()=>smartParameters(bad,bad.operations[0]),/G84 richiede/);
const unconfirmed=structuredClone(p);unconfirmed.operations[1].parameters.geometryConfirmed=false;assert.throws(()=>generateGroupedProgram(unconfirmed),/Confermare geometria/);
const invalidQ=structuredClone(p);invalidQ.operations[0].parameters.q=0;assert.throws(()=>generateGroupedProgram(invalidQ));
console.log('PASS integrazione ISO e parser simulazione: G83 + svasatura G81 + M29/G84, due posizioni, M8 passo 1.25, cieco e passante; controlli Q e conferme conservati. Non è collaudo browser o CNC.');`;
check(test,'Test integrazione ISO e simulazione');const result=spawnSync(process.execPath,['--input-type=module'],{input:test,encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(result.status,0,result.stdout+'\n'+result.stderr);process.stdout.write(result.stdout);
