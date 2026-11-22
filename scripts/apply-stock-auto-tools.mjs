import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const helper=`export function assumeAssignedTools(p){const ids=new Set(p.operations.filter(o=>o.enabled).map(o=>o.toolId));for(const t of p.tools)if(ids.has(t.id)){t.loaded=true;t.loadingStatus='assumed-for-programming';t.physicalLoadingVerified=false;}return p;}\n`;
await writeFile('dist/lib/stock-auto-tools.mjs',helper);
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'Integrazione utensili cambiata: '+a);return s.replace(a,b);};
let ui=await readFile('dist/stock-ui.js','utf8');
ui="import {assumeAssignedTools} from './lib/stock-auto-tools.mjs';\n"+once(ui,'function renderTools(){','function renderTools(){assumeAssignedTools(project);');
await writeFile('dist/stock-ui.js',ui);
let complete=await readFile('dist/lib/stock-complete.mjs','utf8');
complete="import {assumeAssignedTools} from './stock-auto-tools.mjs';\n"+once(complete,'return mergeGroups(p);','return assumeAssignedTools(mergeGroups(p));');
await writeFile('dist/lib/stock-complete.mjs',complete);
for(const path of ['dist/lib/stock-auto-tools.mjs','dist/stock-ui.js','dist/lib/stock-complete.mjs']){const r=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});assert.equal(r.status,0,path+'\n'+r.stderr);}
const {assumeAssignedTools}=await import('../dist/lib/stock-auto-tools.mjs');
const p={tools:[{id:'used',loaded:false},{id:'unused',loaded:false},{id:'disabled',loaded:false}],operations:[{enabled:true,toolId:'used'},{enabled:false,toolId:'disabled'}]};
assumeAssignedTools(p);assert.equal(p.tools[0].loaded,true);assert.equal(p.tools[0].physicalLoadingVerified,false);assert.equal(p.tools[0].loadingStatus,'assumed-for-programming');assert.equal(p.tools[1].loaded,false);assert.equal(p.tools[2].loaded,false);
console.log('Utensili assegnati presunti caricati per programmazione; nessuna verifica fisica dichiarata.');
