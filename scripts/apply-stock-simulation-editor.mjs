import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const runtime=await readFile('stock-simulation-editor.js','utf8');
let sim=await readFile('dist/stock-sim.js','utf8');
const anchor='\n requestAnimationFrame(loop);\n}';assert.equal(sim.split(anchor).length,2,'Editor simulazione: punto di montaggio cambiato');
assert(sim.includes('playerFrame')&&sim.includes('playerSettings'),'Editor simulazione: player non installato');
const mount=`\n window.StockSimulationEditor.mount({container,canvas,frame:playerFrame,settings:playerSettings,actions:playerActions,seek,status,opener:btn,onResize:()=>{const dpr=window.devicePixelRatio||1,w=canvas.width/dpr,h=canvas.height/dpr;resize();panX+=(canvas.clientWidth-w)/2;panY+=(canvas.clientHeight-h)/2;render();},onPause:()=>{playing=false;resetMotionClock();},onClose:()=>{container.hidden=true;$('stOutput').hidden=false;}});`;
sim=runtime+'\n'+sim.replace(anchor,mount+anchor);
const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:sim,encoding:'utf8'});assert.equal(check.status,0,check.stderr);
const context={window:{}};runInNewContext(runtime,context);const {constrain,reshape}=context.window.StockSimulationEditor;
for(const [w,h]of [[1280,800],[768,1024],[390,844],[320,480],[1920,1080]])for(const r of [{x:-100,y:-200,width:3000,height:2000},{x:900,y:900,width:100,height:100}]){const q=constrain(r,w,h);assert(q.x>=8&&q.y>=8&&q.width>0&&q.height>0);assert(q.x+q.width<=w-8&&q.y+q.height<=h-8);for(const edge of ['n','s','e','w','ne','nw','se','sw'])for(const delta of [-10000,10000]){const s=reshape(q,edge,delta,delta,w,h);assert(s.x>=8&&s.y>=8&&s.x+s.width<=w-8&&s.y+s.height<=h-8);}}
assert(sim.includes("onPause:()=>{playing=false;resetMotionClock();}"));assert(sim.includes("footer.append(seek.closest('label'),status)"));assert(sim.includes('scene.append(actions,frame)'));await writeFile('dist/stock-sim.js',sim);
console.log('PASS editor: sintassi, limiti finestra e otto direzioni di ridimensionamento su desktop/tablet/mobile; controlli originali spostati senza clonazione; pausa e chiusura collegate. Trascinamento, fullscreen, registrazione e layout richiedono verifica browser.');
