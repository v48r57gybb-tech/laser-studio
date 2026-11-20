import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const path='dist/stock-ui.js';
let ui=await readFile(path,'utf8');
for(const anchor of ['function collect()','function renderOps()','function renderTools()','function invalidate()'])assert(ui.includes(anchor),'Punto di integrazione mancante: '+anchor);
assert(!ui.includes("from './stock-operation-editor.mjs'"),'Editor già integrato');
let editor=await readFile('stock-operation-editor.mjs','utf8');
function replaceOnce(anchor,replacement){
 assert.equal(editor.split(anchor).length,2,'Punto di correzione editor non univoco: '+anchor);
 editor=editor.replace(anchor,replacement);
}
replaceOnce('if(!dirty)load();else drawTable();','if(!dirty){if(JSON.stringify(getProject())!==baseline)load();}else drawTable();');
replaceOnce("input.addEventListener('change',()=>{capture();","input.addEventListener('change',()=>{if(!editor.contains(input)||!draft)return;dirty=true;panel.dataset.pending='true';capture();");
await writeFile('dist/stock-operation-editor.mjs',editor);
ui="import {mountOperationEditor} from './stock-operation-editor.mjs';\n"+ui;
ui+='\nmountOperationEditor({form,getProject:()=>project,readProject:()=>collect(),replaceProject:p=>{project=p;},changed:()=>{invalidate();renderOps();renderTools();}});\n';
await writeFile(path,ui);
for(const file of [path,'dist/stock-operation-editor.mjs']){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(result.status,0,file+'\n'+result.stderr);}
console.log('Editor integrato nella build; sintassi verificata. Non è un collaudo browser o macchina.');
