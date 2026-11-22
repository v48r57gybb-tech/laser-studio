import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const staged=new Map();
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'Grafica utensili: integrazione cambiata '+a.slice(0,100));return s.replace(a,b);};
async function patch(path,a,b){const s=staged.get(path)??await readFile(path,'utf8');staged.set(path,once(s,a,b));}
const parserPath='dist/cnc-simulator.js',parserBefore=await readFile(parserPath,'utf8');
await patch(parserPath,String.raw`const lines=text.split(/\r?\n/);`,String.raw`let activeToolStation=null;const lines=text.split(/\r?\n/);`);
await patch(parserPath,"if(has('T')&&ms.includes(6)){","if(has('T')&&ms.includes(6)){activeToolStation=val('T');");
await patch(parserPath,'type,tool,toolName,raw,line:line+1','type,tool,toolName,toolStation:activeToolStation,raw,line:line+1');
await patch('dist/index.html','<script src="stock-sim.js"></script>','<script src="stock-simulation-tools.js"></script><script src="stock-sim.js"></script>');
await patch('dist/stock-sim.js','const tool=bindStockSimulationTool(op,project);if(!tool)continue;','const tool=window.StockSimulationTools.bind(op,project);if(!tool)continue;');
await patch('dist/stock-sim.js',String.raw`const station=Number(/T(\d+)/.exec(op.toolName||'')?.[1]),visualTool=project.tools.find(t=>t.station===station);if(visualTool)StockToolVisual.draw(ctx,p,visualTool,screen,performance.now()/1000,yaw);`,'const visualTool=window.StockSimulationTools.draw(ctx,p,op,project,screen,performance.now()/1000,yaw);');
await patch('dist/stock-sim.js',"('T'+visualTool.station+' · '+({face:'FRESA SPIANATURA',mill:'FRESA',chamfer:'SMUSSATORE',drill:'PUNTA',spot:'CENTRINO',tap:'MASCHIO',probe:'SONDA'}[visualTool.kind]||visualTool.kind)+' Ø'+visualTool.diameter+' mm')",'window.StockSimulationTools.label(visualTool)');
await patch('dist/stock-ui.js','window.__stockProject=structuredClone(p);','window.__stockProject=window.StockSimulationTools.projectFor(p,result);');
for(const [path,code]of staged)if(path.endsWith('.js')){const r=spawnSync(process.execPath,['--input-type=module','--check'],{input:code,encoding:'utf8'});assert.equal(r.status,0,path+'\n'+r.stderr);}
for(const [path,code]of staged)await writeFile(path,code);
await copyFile('stock-simulation-tools.js','dist/stock-simulation-tools.js');
const test='const parserBefore='+JSON.stringify(parserBefore)+';\n'+String.raw`import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createProject} from './dist/lib/stock-workspace.mjs';
import {toggleLinked} from './dist/lib/stock-linked-holes.mjs';
import {generateGroupedProgram} from './dist/lib/stock-iso-groups.mjs';
const p=createProject();p.geometry.finished.height=50;p.setup={safeZ:20,changeZ:200,externalMargin:5,topFacedConfirmed:true,externalFinishedConfirmed:false,finishStockConfirmed:false};
p.tools.push({id:'visual-test-drill',station:11,kind:'drill',diameter:7.4,loaded:false,lengthMode:'manual',fluteLength:80,tipAngle:118,parameters:{rpm:2000,feed:200,entryFeed:200,coolant:'off'}});
p.operations=[{id:'visual-holes',type:'drilling',enabled:true,toolId:'visual-test-drill',parameters:{pattern:'line',x:20,y:-20,count:2,pitch:20,angle:0,depth:20,mode:'blind',depthReference:'tip',rPlane:3,cycle:'G83',q:2,smartPosition:'manual',smartDepth:'manual',coolant:'M8'}}];
toggleLinked(p,'visual-holes','countersinking',true,[]);toggleLinked(p,'visual-holes','tapping',true,[{drill:7.4,thread:'M8',pitch:1.25,kind:'form'}]);for(const o of p.operations.filter(o=>o.holeRole)){const t=p.tools.find(t=>t.id===o.toolId);t.lengthMode='manual';t.fluteLength=80;}
const context={},old={};runInNewContext(parserBefore,old);for(const path of ['dist/cnc-simulator.js','dist/stock-tool-visuals.js','dist/stock-simulation-tools.js'])runInNewContext(readFileSync(path,'utf8'),context);
let vertices=0,paints=[];const ctx={save(){},restore(){},beginPath(){},moveTo(x,y){assert(Number.isFinite(x)&&Number.isFinite(y));vertices++;},lineTo(x,y){assert(Number.isFinite(x)&&Number.isFinite(y));vertices++;},closePath(){},fill(){paints.push(this.fillStyle);},stroke(){},arc(){}};
const cases=[p,structuredClone(p)];cases[1].operations.unshift({id:'visual-probe',type:'probe',enabled:true,toolId:cases[1].tools.find(t=>t.kind==='probe').id,parameters:{axes:['Z'],clearance:5,expectedError:.5,overtravel:2,positionFeed:1000,macroProfileConfirmed:false,calibrationConfirmed:false,provisionalOriginConfirmed:false,ballBottomReferenceConfirmed:false}});
for(const input of cases){const result=generateGroupedProgram(input,{previewProbe:true}),project=context.StockSimulationTools.projectFor(input,result),programs=[result.iso,...(result.simulationISO?[result.simulationISO]:[])];assert.equal(project.readyForMachine,false);for(const iso of programs){const before=old.CncSimulation.parseISO(iso),after=context.CncSimulation.parseISO(iso),kinematics=ops=>JSON.stringify(Array.from(ops,o=>[o.from,o.to,o.type,o.feed,o.cycle??null]));assert.equal(kinematics(after),kinematics(before));const seen={tap:new Set(),countersink:new Set()};for(const op of after){op.toolName='Test senza nome T';const tool=context.StockSimulationTools.bind(op,project);if(!tool||!seen[tool.kind]||seen[tool.kind].has(op.type))continue;paints=[];const n=vertices,point={x:(op.from.x+op.to.x)/2,y:(op.from.y+op.to.y)/2,z:(op.from.z+op.to.z)/2};context.StockSimulationTools.draw(ctx,point,op,project,q=>({x:q.x,y:q.y-q.z}),.1,-Math.PI/4);assert(vertices-n>100);const rgb=paints.map(v=>/rgb\((\d+),(\d+),(\d+)\)/.exec(v)).filter(Boolean).map(m=>m.slice(1).map(Number));assert(rgb.some(([r,g,b])=>tool.kind==='tap'?g>r&&g>b:r>g&&b>g));assert(context.StockSimulationTools.label(tool).includes('T'+tool.station));seen[tool.kind].add(op.type);}for(const kind of ['tap','countersink']){assert(seen[kind].has('rapid'));assert(seen[kind].has('feed'));}}}
assert.throws(()=>context.StockSimulationTools.resolve({toolStation:99,line:1},p),/T99/);assert.equal(context.StockSimulationTools.resolve({toolStation:null,toolName:'Setup',distance:0,line:1},p),null);
console.log('PASS grafica: postazione T esplicita, snapshot dei piani, disegno di maschio verde e svasatore fucsia in rapido e avanzamento, ISO esportato e dedicato alla simulazione, con/senza sonda; cinematica parser invariata. Vertici disegnati: '+vertices+'. Non è prova visiva browser o collaudo CNC.');`;
const syntax=spawnSync(process.execPath,['--input-type=module','--check'],{input:test,encoding:'utf8'});assert.equal(syntax.status,0,syntax.stderr);
const result=spawnSync(process.execPath,['--input-type=module'],{input:test,encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(result.status,0,result.stdout+'\n'+result.stderr);process.stdout.write(result.stdout);
