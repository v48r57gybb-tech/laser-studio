import {readFile,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const path='dist/stock-ui.js';
let ui=await readFile(path,'utf8');
for(const anchor of ['function collect()','function renderOps()','function renderTools()','function invalidate()'])assert(ui.includes(anchor),'Punto di integrazione mancante: '+anchor);
assert(!ui.includes("from './stock-operation-editor.mjs'"),'Editor già integrato');
await copyFile('stock-operation-editor.mjs','dist/stock-operation-editor.mjs');
ui="import {mountOperationEditor} from './stock-operation-editor.mjs';\n"+ui;
ui+='\nmountOperationEditor({form,getProject:()=>project,readProject:()=>collect(),replaceProject:p=>{project=p;},changed:()=>{invalidate();renderOps();renderTools();}});\n';
await writeFile(path,ui);
for(const file of [path,'dist/stock-operation-editor.mjs']){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(result.status,0,file+'\n'+result.stderr);}
console.log('Fase 3 collegata alla build; sintassi verificata. Non è un collaudo browser o macchina.');
