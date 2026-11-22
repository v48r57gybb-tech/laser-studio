import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const staged=new Map();
function once(s,a,b){assert.equal(s.split(a).length,2,'Modalità nominale: integrazione cambiata '+a.slice(0,100));return s.replace(a,b);}
const corePath='dist/lib/stock-linked-holes.mjs';
let core=await readFile(corePath,'utf8');
core=once(core,"if(o.parameters.geometryConfirmed!==true)throw Error('Confermare geometria, profondità utile e spazio libero della lavorazione associata');",'');
core=once(core,'export function checkLinkedForPlanning(p){syncLinked(p);',"export function checkLinkedForPlanning(p){syncLinked(p);p.programmingMode='nominal';");
core=once(core,"field('Geometria utensile, fondo utile, imbocco e spazio libero verificati',op.parameters.geometryConfirmed,v=>op.parameters.geometryConfirmed=v,{checkbox:true});",'');
assert(!core.includes('geometryConfirmed=true'));
staged.set(corePath,core);
const uiPath='dist/stock-ui.js';let ui=await readFile(uiPath,'utf8');
ui+=String.raw`
{const host=document.getElementById('stockForm');if(host&&!document.getElementById('stockNominalProgrammingPolicy')){const note=document.createElement('p');note.id='stockNominalProgrammingPolicy';note.className='notice';note.textContent='Programmazione nominale: montaggio utensili, fondo utile, imbocco e spazio libero sono da verificare a cura dell’operatore. ISO candidato e simulazione non certificano macchina o attrezzaggio. I controlli numerici restano attivi.';host.prepend(note);}}
`;
staged.set(uiPath,ui);
const selectorPath='dist/stock-thread-selector.mjs';let selector=await readFile(selectorPath,'utf8');selector=once(selector,'Cambiando filetto vengono invalidate le conferme delle lavorazioni collegate.','Cambiando filetto occorre rigenerare l’ISO; le verifiche fisiche restano a cura dell’operatore.');staged.set(selectorPath,selector);
for(const [path,code]of staged){const r=spawnSync(process.execPath,['--input-type=module','--check'],{input:code,encoding:'utf8'});assert.equal(r.status,0,path+'\n'+r.stderr);}for(const [path,code]of staged)await writeFile(path,code);
const test=String.raw`import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createProject} from './dist/lib/stock-workspace.mjs';
import {toggleLinked} from './dist/lib/stock-linked-holes.mjs';
import {generateGroupedProgram} from './dist/lib/stock-iso-groups.mjs';
const p=createProject();p.geometry.finished.height=50;p.setup={safeZ:20,changeZ:200,externalMargin:5,topFacedConfirmed:true,externalFinishedConfirmed:false,finishStockConfirmed:false};
p.tools.push({id:'nominal-test-drill',station:11,kind:'drill',diameter:7.4,loaded:false,lengthMode:'manual',fluteLength:80,tipAngle:118,parameters:{rpm:2000,feed:200,entryFeed:200,coolant:'off'}});
p.operations=[{id:'nominal-test-holes',type:'drilling',enabled:true,toolId:'nominal-test-drill',parameters:{pattern:'line',x:20,y:-20,count:2,pitch:20,angle:0,depth:20,mode:'blind',depthReference:'tip',rPlane:3,cycle:'G83',q:2,smartPosition:'manual',smartDepth:'manual',coolant:'M8'}}];
toggleLinked(p,'nominal-test-holes','countersinking',true,[]);toggleLinked(p,'nominal-test-holes','tapping',true,[{drill:7.4,thread:'M8',pitch:1.25,kind:'form'}]);
for(const o of p.operations.filter(o=>o.holeRole)){assert.notEqual(o.parameters.geometryConfirmed,true);const t=p.tools.find(t=>t.id===o.toolId);t.lengthMode='manual';t.fluteLength=80;}
const original=JSON.stringify(p),result=generateGroupedProgram(p);assert.equal(JSON.stringify(p),original);assert.equal(result.readyForMachine,false);assert.equal(result.project.programmingMode,'nominal');assert(result.iso.includes('G98 G84'));assert(result.iso.includes('G98 G81'));assert(result.iso.includes('M29 S300.'));assert(result.plans.every(o=>o.tool.tool.physicalLoadingVerified!==true));assert(p.operations.every(o=>o.parameters.geometryConfirmed!==true));
const context={};runInNewContext(readFileSync('dist/cnc-simulator.js','utf8'),context);const moves=context.CncSimulation.parseISO(result.iso);assert.equal(moves.filter(m=>m.cycle===84&&m.holeEnd).length,2);assert.equal(moves.filter(m=>m.cycle===81&&m.holeEnd).length,2);
const invalidQ=structuredClone(p);invalidQ.operations[0].parameters.q=0;assert.throws(()=>generateGroupedProgram(invalidQ));
const invalidDepth=structuredClone(p);invalidDepth.operations[0].parameters.depth=50;assert.throws(()=>generateGroupedProgram(invalidDepth),/Foro cieco oltre fondo/);
const short=structuredClone(p);short.tools.find(t=>t.kind==='tap').fluteLength=1;assert.throws(()=>generateGroupedProgram(short),/Tagliente insufficiente/);
const wrongOrder=structuredClone(p);[wrongOrder.operations[0],wrongOrder.operations[2]]=[wrongOrder.operations[2],wrongOrder.operations[0]];assert.throws(()=>generateGroupedProgram(wrongOrder),/Eseguire la foratura prima/);
assert(!readFileSync('dist/lib/stock-linked-holes.mjs','utf8').includes('Geometria utensile, fondo utile, imbocco e spazio libero verificati'));
console.log('PASS modalità nominale: ISO e parser simulazione senza spunta; nessuna verifica fisica dichiarata; controlli Q, profondità, tagliente e sequenza conservati. Browser e CNC non collaudati.');`;
const syntax=spawnSync(process.execPath,['--input-type=module','--check'],{input:test,encoding:'utf8'});assert.equal(syntax.status,0,syntax.stderr);
const result=spawnSync(process.execPath,['--input-type=module'],{input:test,encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(result.status,0,result.stdout+'\n'+result.stderr);process.stdout.write(result.stdout);
