import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
await copyFile('stock-tool-visuals.js','dist/stock-tool-visuals.js');
let html=await readFile('dist/index.html','utf8');const anchor='<script src="stock-sim.js"></script>';assert.equal(html.split(anchor).length,2);html=html.replace(anchor,'<script src="stock-tool-visuals.js"></script>'+anchor);await writeFile('dist/index.html',html);
let sim=await readFile('dist/stock-sim.js','utf8');const render=sim.indexOf(' function render(){'),a=sim.indexOf('  const station=Number(',render),b=sim.indexOf('  status.textContent=',a);assert(render>=0&&a>render&&b>a);
sim=sim.slice(0,a)+String.raw`  const station=Number(/T(\d+)/.exec(op.toolName||'')?.[1]),visualTool=project.tools.find(t=>t.station===station);if(visualTool)StockToolVisual.draw(ctx,p,visualTool,screen,performance.now()/1000,yaw);
`+sim.slice(b);
const old="status.textContent=op.toolName+",next="status.textContent=(visualTool?('T'+visualTool.station+' · '+({face:'FRESA SPIANATURA',mill:'FRESA',chamfer:'SMUSSATORE',drill:'PUNTA',spot:'CENTRINO',tap:'MASCHIO',probe:'SONDA'}[visualTool.kind]||visualTool.kind)+' Ø'+visualTool.diameter+' mm'):op.toolName)+";assert.equal(sim.split(old).length,2);sim=sim.replace(old,next);await writeFile('dist/stock-sim.js',sim);
for(const path of ['dist/stock-sim.js','dist/stock-tool-visuals.js']){const r=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});assert.equal(r.status,0,path+'\n'+r.stderr);}
const context=createContext({});new Script(await readFile('dist/stock-tool-visuals.js','utf8')).runInContext(context);const {model,draw,colors}=context.StockToolVisual;
for(const kind of ['mill','face','drill','spot','chamfer','tap','probe']){const m=model({kind,diameter:10,fluteLength:8,angle:90,tipDiameter:0});assert(m.rings.every(v=>Number.isFinite(v.z)&&Number.isFinite(v.r)&&v.r>=0));assert(m.rings.at(-1).z>m.cutLength);assert(m.color.every((c,i)=>c===colors[kind][i]));}
assert.equal(model({kind:'mill',diameter:50,fluteLength:8}).cutterRadius,25);assert.equal(model({kind:'mill',diameter:6,fluteLength:8}).cutterRadius,3);assert.equal(model({kind:'chamfer',diameter:10,tipDiameter:0,angle:90,fluteLength:8}).rings[1].r,0);assert.throws(()=>model({kind:'mill',diameter:0}));
let points=0;const ctx={save(){},restore(){},beginPath(){},moveTo(){points++;},lineTo(){points++;},closePath(){},fill(){},stroke(){},arc(){}};draw(ctx,{x:0,y:0,z:0},{kind:'mill',diameter:50,fluteLength:8},p=>({x:p.x,y:p.y-p.z}),0,-Math.PI/4);assert(points>100);
console.log('Geometrie utensili parametriche e palette verificate in build. Portautensile illustrativo; prova visiva browser ancora necessaria.');
