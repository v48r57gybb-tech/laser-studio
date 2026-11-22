import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const runtime=await readFile('stock-simulation-save.js','utf8');
let sim=await readFile('dist/stock-sim.js','utf8');
function once(a,b){assert.equal(sim.split(a).length,2,'Salvataggio simulazione: integrazione cambiata '+a.slice(0,100));sim=sim.replace(a,b);}
once('let ops=[]','let saveController=null;\n let ops=[]');
once('function scopeChoose(key,resume=true){','function scopeChoose(key,resume=true){saveController?.prepare(key,resume);');
const state="{hidden:container.hidden,full:!scopeKey&&playerMode==='all',running:playing&&!scopePreparing,done:ops.length>0&&index>=ops.length-1&&progress>=1}";
once('function loop(now){','function loop(now){saveController?.update('+state+');');
once('if(!container.hidden)render();requestAnimationFrame(loop);','if(!container.hidden)render();saveController?.update('+state+');requestAnimationFrame(loop);');
const legacy=/^.*if\(window\.CncVisual\)CncVisual\.attachRecording.*$/gm;assert.equal([...sim.matchAll(legacy)].length,1,'Registrazione precedente non individuata');sim=sim.replace(legacy,'');
once('\n requestAnimationFrame(loop);\n}','\n saveController=window.StockSimulationSave.mount({container,canvas,actions:playerActions,seek});\n requestAnimationFrame(loop);\n}');
sim=runtime+'\n'+sim;
const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:sim,encoding:'utf8'});assert.equal(check.status,0,check.stderr);
const tests=spawnSync(process.execPath,['tests/stock-simulation-save.mjs'],{encoding:'utf8'});assert.equal(tests.status,0,tests.stdout+'\n'+tests.stderr);
await writeFile('dist/stock-sim.js',sim);process.stdout.write(tests.stdout);
await import('./apply-stock-simulation-refinements.mjs');
