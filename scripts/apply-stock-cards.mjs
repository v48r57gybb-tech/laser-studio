import {readFile,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
let ui=await readFile('dist/stock-ui.js','utf8');
for(const anchor of ['function renderOps()','function renderTools()','mountComplete({'])assert(ui.includes(anchor),'Integrazione caselle mancante: '+anchor);
assert(!ui.includes('mountStockCards'),'Caselle già integrate');
await copyFile('stock-cards.mjs','dist/stock-cards.mjs');
ui="import {mountStockCards} from './stock-cards.mjs';\n"+ui;
ui+=`
const stockCards=mountStockCards({form,getProject:()=>project,changed:()=>{invalidate();renderOps();renderTools();}});
const stockRenderOps=renderOps,stockRenderTools=renderTools;
renderOps=function(){stockRenderOps();stockCards.operations();};
renderTools=function(){stockRenderTools();stockCards.tools();};
stockCards.operations();stockCards.tools();
`;
await writeFile('dist/stock-ui.js',ui);
for(const path of ['dist/stock-ui.js','dist/stock-cards.mjs']){const r=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});assert.equal(r.status,0,path+'\n'+r.stderr);}
console.log('Caselle integrate; sintassi verificata. Collaudo browser ancora necessario.');
