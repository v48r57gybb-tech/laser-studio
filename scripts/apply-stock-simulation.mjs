import {copyFile,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const file of ['lib/stock-simulation-core.mjs','stock-simulation.mjs'])await copyFile(file,'dist/'+file);
let html=await readFile('dist/index.html','utf8');const old='<script src="stock-sim.js"></script>';assert.equal(html.split(old).length,2,'Script simulatore precedente non riconosciuto');html=html.replace(old,'<script type="module" src="stock-simulation.mjs"></script>');await writeFile('dist/index.html',html);
let ui=await readFile('dist/stock-ui.js','utf8');assert(!ui.includes('mountSimulationGuidance'),'Correzioni già montate');ui="import {mountSimulationGuidance} from './stock-simulation.mjs';\n"+ui;ui+='\nmountSimulationGuidance({form,getProject:()=>project,readProject:()=>collect(),replaceProject:p=>{project=p;},changed:()=>{invalidate();renderOps();renderTools();}});\n';await writeFile('dist/stock-ui.js',ui);
for(const path of ['dist/stock-ui.js','dist/stock-simulation.mjs','dist/lib/stock-simulation-core.mjs']){const r=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});assert.equal(r.status,0,path+'\n'+r.stderr);}
const r=spawnSync(process.execPath,['--test','tests/stock-simulation-core.test.mjs'],{encoding:'utf8'});process.stdout.write(r.stdout??'');assert.equal(r.status,0,r.stderr);
