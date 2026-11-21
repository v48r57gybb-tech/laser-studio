import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

{
const fsProject=await import('node:fs/promises');
const {runInNewContext}=await import('node:vm');
const {stepRotation,mountProjectMode}=await import('../project-mode.js');
const context={self:{}};runInNewContext(await readFile('project-step-worker.js','utf8'),context);const pack=context.packStepMeshes;
const mesh={attributes:{position:{array:[0,0,0,10,0,0,0,10,0]}},index:{array:[0,1,2]}};
const packed=pack({success:true,meshes:[mesh]});assert.equal(packed.triangles,1);assert.equal(packed.buffer.byteLength,72);assert.equal(JSON.stringify(packed.size),'[10,10,0]');assert([...new Float32Array(packed.buffer)].every(Number.isFinite));
assert.throws(()=>pack({success:false,meshes:[]}));assert.throws(()=>pack({success:true,meshes:[{...mesh,index:{array:[0,1,9]}}]}));assert.throws(()=>pack({success:true,meshes:[{...mesh,attributes:{position:{array:[NaN,0,0]}}}]}));assert.throws(()=>pack({success:true,meshes:[{...mesh,index:{array:new Array(1500003).fill(0)}}]}));
for(const [yaw,pitch]of [[0,0],[-.5,.65],[2,1]]){const m=stepRotation(yaw,pitch);for(let a=0;a<3;a++)for(let b=0;b<3;b++){const dot=[0,1,2].reduce((s,k)=>s+m[a*3+k]*m[b*3+k],0);assert(Math.abs(dot-(a===b?1:0))<1e-6);}}
const savedDocument=globalThis.document,styles=[];globalThis.document={body:{dataset:{}},head:{append:n=>styles.push(n)},createElement:()=>({})};
try{const handlers=[],mode={value:'stock',options:['straight','arc','stock'].map(value=>({value})),append(o){this.options.push(o);},addEventListener(n,fn){assert.equal(n,'change');handlers.push(fn);},dispatchEvent(){handlers.forEach(fn=>fn());}},section={dataset:{},hidden:true},host={dataset:{}},close={};let starts=0,active=null;const factory=()=>{starts++;return {setActive:v=>active=v};};mountProjectMode({mode,section,host,close},factory);assert.equal(starts,0);assert.equal(mode.options.at(-1).value,'project');mode.value='project';mode.dispatchEvent();assert.equal(starts,1);assert.equal(section.hidden,false);assert.equal(active,true);assert.equal(document.body.dataset.projectMode,'true');close.onclick();assert.equal(mode.value,'stock');assert.equal(section.hidden,true);assert.equal(active,false);mode.value='arc';mode.dispatchEvent();mode.value='project';mode.dispatchEvent();close.onclick();assert.equal(mode.value,'arc');mountProjectMode({mode,section,host,close},factory);assert.equal(mode.options.length,4);assert.equal(starts,1);assert.equal(styles.length,1);}finally{if(savedDocument===undefined)delete globalThis.document;else globalThis.document=savedDocument;}
const {createRequire}=await import('node:module');
const requireProject=createRequire(import.meta.url),dep='node_modules/occt-import-js';
assert.equal(JSON.parse(await readFile(dep+'/package.json','utf8')).version,'0.0.23');
const fixture=await readFile(new URL('../tests/fixtures/project-cube.step',import.meta.url));
const fixtureText=fixture.toString('utf8');assert(fixtureText.startsWith('ISO-10303-21;'));assert(fixtureText.trimEnd().endsWith('END-ISO-10303-21;'));
const definitions=[...fixtureText.matchAll(/^#(\d+)=/gm)].map(m=>m[1]),defined=new Set(definitions);assert.equal(definitions.length,175,'Campione STEP incompleto');assert.equal(defined.size,definitions.length,'ID STEP duplicati');for(const [,id]of fixtureText.matchAll(/#(\d+)/g))assert(defined.has(id),'Riferimento STEP mancante: '+id);
const occt=await requireProject('occt-import-js')();
const real=pack(occt.ReadStepFile(new Uint8Array(fixture),{linearUnit:'millimeter'}));
assert(real.triangles>=12);real.size.forEach(v=>assert(Math.abs(v-300)<1e-6));
for(const file of ['project-mode.js','project-step-worker.js']){const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);assert.equal(await readFile('dist/'+file,'utf8'),await readFile(file,'utf8'));}
await fsProject.mkdir('dist/vendor/occt-import-js',{recursive:true});
await fsProject.cp(dep+'/dist','dist/vendor/occt-import-js/dist',{recursive:true});
for(const file of await fsProject.readdir(dep))if(/^(LICENSE|COPYING|README|package\.json)/i.test(file))await fsProject.copyFile(dep+'/'+file,'dist/vendor/occt-import-js/'+file);
assert((await fsProject.stat('dist/vendor/occt-import-js/dist/occt-import-js.wasm')).size>0);
await writeFile('dist/vendor/occt-import-js/NOTICE.txt','occt-import-js 0.0.23 / OpenCascade. Original licenses retained. Unmodified and replaceable JS/WASM files. Source and build instructions: https://github.com/kovacsv/occt-import-js . Software test cube derived from test/testfiles/simple-basic-cube/cube.stp (ST-DEVELOPER / STEP Tools / SIEMENS NX file header).');
let modeSource=await readFile('dist/project-analysis.js','utf8');
const modeOnce=(a,b)=>{assert.equal(modeSource.split(a).length,2,'Modalità progetto: punto integrazione cambiato');modeSource=modeSource.replace(a,b);};
modeOnce(" const button=document.createElement('button');button.type='button';button.textContent='Lavorazione da progetto · anteprima';host.append(button);",'');
modeOnce("button.onclick=()=>{section.hidden=false;section.scrollIntoView({block:'start'});};q('[data-close]').onclick=()=>{section.hidden=true;};","mountProjectMode({mode,section,host,close:q('[data-close]')});");
modeOnce('Nessuna generazione ISO, ricostruzione CAD o simulazione dai dati importati. Il visualizzatore STEP non è ancora disponibile. Gli zeri sono proposte e non trasformano coordinate.','Importa l’analisi JSON per consultarla e apri sotto il modello STEP per esaminarlo. Nessuna generazione ISO, riconoscimento automatico o simulazione dai dati importati. Gli zeri sono proposte e non trasformano coordinate.');
modeSource="import {mountProjectMode} from './project-mode.js';\n"+modeSource;
const modeCheck=spawnSync(process.execPath,['--input-type=module','--check'],{input:modeSource,encoding:'utf8'});assert.equal(modeCheck.status,0,modeCheck.stderr);
await writeFile('dist/project-analysis.js',modeSource);
console.log('PASS progetto separato: navigazione e ritorno, buffer/limiti, rotazioni e STEP campione 300 mm tramite OCCT. Viewer WebGL e dispositivi reali da collaudare. Nessun CAM, riconoscimento geometrico o ISO aggiunto.');
}
