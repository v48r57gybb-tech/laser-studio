import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

{
await copyFile('project-linker.js','dist/project-linker.js');
await copyFile('project-linker-ui.js','dist/project-linker-ui.js');
for(const file of ['project-linker.js','project-linker-ui.js','project-mode.js','project-step-worker.js']){const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);}
let source=await readFile('dist/project-analysis.js','utf8');
const once=(a,b)=>{assert.equal(source.split(a).length,2,'Punto integrazione linker cambiato');source=source.replace(a,b);};
once("import {mountProjectMode} from './project-mode.js';","import {mountProjectMode} from './project-mode.js';\nimport {mountLinkerPanel} from './project-linker-ui.js';");
once("let workspace=null,epoch=0;","let workspace=null,epoch=0;const workspaceRef={current:null,linker:null};");
once("workspace=next;render();","workspace=next;workspaceRef.current=workspace;workspaceRef.linker=createLinker(workspace);mountLinkerPanel(section,q,status,workspaceRef);render();");
once("const style=document.createElement('style');style.textContent=","const style=document.createElement('style');style.textContent='#projectAnalysisPanel .linker-panel{margin-top:24px;padding-top:18px;border-top:1px solid #50778c}#projectAnalysisPanel [data-list]{display:grid;gap:8px;max-height:320px;overflow:auto}#projectAnalysisPanel [data-list] button{text-align:left}#projectAnalysisPanel [data-detail]{margin-top:16px;padding:16px;border:1px solid #50778c;border-radius:12px}'+");
source=source.replace("const style=document.createElement('style');style.textContent='#projectAnalysisPanel[hidden]","const style=document.createElement('style');style.textContent='#projectAnalysisPanel[hidden]");
const linkerCheck=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});assert.equal(linkerCheck.status,0,linkerCheck.stderr);
await writeFile('dist/project-analysis.js',source);
console.log('PASS linker: override 83, collegamento F019 e pannello quote-geometria integrati. Nessuna ISO, simulazione o modifica ai generatori.');
}