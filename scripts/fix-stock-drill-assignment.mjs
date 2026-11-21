import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const path='dist/stock-smart-drilling-ui.mjs';
let code=await readFile(path,'utf8');
const before='current().toolId=assigned.toolId;const t=proj.tools.find(x=>x.id===assigned.toolId);';
const after="const assignedTool=assigned.project.tools.find(x=>x.id===assigned.toolId);if(!assignedTool)throw Error('Punta creata non disponibile: assegnazione annullata');if(!proj.tools.some(x=>x.id===assigned.toolId))proj.tools.push(structuredClone(assignedTool));current().toolId=assigned.toolId;const t=proj.tools.find(x=>x.id===assigned.toolId);";
assert.equal(code.split(before).length,2,'Cambio diametro: punto di integrazione cambiato');
code=code.replace(before,after);
function check(source,label){const r=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});assert.equal(r.status,0,label+'\n'+r.stderr);}
check(code,path);
function normalizeQuotedNewlines(source){let result='',quote=null,escaped=false;for(const c of source){if(quote===null){result+=c;if(c===String.fromCharCode(39)||c===String.fromCharCode(34)||c===String.fromCharCode(96))quote=c;continue;}if(escaped){result+=c;escaped=false;continue;}if(c===String.fromCharCode(92)){result+=c;escaped=true;continue;}if(c===quote){result+=c;quote=null;continue;}if(c==='\n'&&quote!==String.fromCharCode(96))result+=String.fromCharCode(92)+'n';else result+=c;}return result;}
const broken='const x="line one'+String.fromCharCode(10)+'line two";';
check(normalizeQuotedNewlines(broken),'Test normalizzazione stringa');
const template='const x=`line one'+String.fromCharCode(10)+'line two`;';assert.equal(normalizeQuotedNewlines(template),template);
const integrationPath=new URL('./apply-stock-linked-holes.mjs',import.meta.url);
const original=await readFile(integrationPath,'utf8');let integration=normalizeQuotedNewlines(original);
function updateTest(a,b){assert.equal(integration.split(a).length,2,'Fixture test cambiata: '+a);integration=integration.replace(a,b);}
updateTest('const p=createProject();p.tools.push', 'const p=createProject();p.geometry.finished.height=50;p.tools.push');
updateTest("p.operations[0].parameters.mode='through';syncLinked(p);assert.equal(p.operations[1].parameters.depth,20);","const boundary=structuredClone(p);boundary.operations[0].parameters.depth=50;assert.throws(()=>syncLinked(boundary),/Foro cieco oltre fondo/);p.operations[0].parameters.mode='through';p.operations[0].parameters.depth=60;syncLinked(p);assert.equal(p.operations[1].parameters.depth,60);");
check(integration,'Integrazione lavorazioni collegate');
await writeFile(path,code);
if(integration!==original)await writeFile(integrationPath,integration);
await import('./apply-stock-linked-holes.mjs');
