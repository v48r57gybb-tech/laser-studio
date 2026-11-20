import {copyFile,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const file of ['lib/stock-countersink-core.mjs','lib/stock-countersink.mjs','stock-countersink-ui.mjs'])await copyFile(file,'dist/'+file);
let ui=await readFile('dist/stock-ui.js','utf8');
const previous="import {generateGroupedProgram as generateProgram} from './lib/stock-iso-groups.mjs';";
assert.equal(ui.split(previous).length,2,'Punto di integrazione ISO fase 5 cambiato');
ui="import {mountCountersinkEditor} from './stock-countersink-ui.mjs';\n"+ui.replace(previous,"import {generateCountersunkProgram as generateProgram} from './lib/stock-countersink.mjs';");
ui+='\nmountCountersinkEditor({form,getProject:()=>project,readProject:()=>collect(),replaceProject:p=>{project=p;},changed:()=>{invalidate();renderOps();renderTools();}});\n';
await writeFile('dist/stock-ui.js',ui);
for(const file of ['dist/stock-ui.js','dist/lib/stock-countersink-core.mjs','dist/lib/stock-countersink.mjs','dist/stock-countersink-ui.mjs']){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,file+'\n'+r.stderr);}
const r=spawnSync(process.execPath,['--test','tests/stock-countersink.test.mjs'],{encoding:'utf8',env:{...process.env,STOCK_TEST_DIST:'1'}});process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');assert.equal(r.status,0,'Collaudo integrazione fase 5 sul prodotto dist fallito');
