import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,exportProject,importProject} from '../lib/stock-workspace.mjs';
import {assignDrill} from '../lib/stock-geometry-tools.mjs';
import {generateProgram} from '../lib/stock-program.mjs';

function fixture(){
 let p=assignDrill(createProject('Collaudo fase 4'),6.8).project;
 p.geometry.finished={type:'box',width:120,depth:80,height:20};
 p.setup={safeZ:30,changeZ:100,externalMargin:5};
 for(const t of p.tools){
  t.loaded=true;t.fluteLength=30;
  t.parameters={rpm:2000,feed:200,entryFeed:80,coolant:'M8'};
  if(t.kind==='mill'){t.centerCutting=true;t.maxRampAngle=4;}
  if(t.kind==='chamfer'){t.angle=90;t.tipDiameter=1;}
  if(t.kind==='drill')t.tipAngle=118;
 }
 p.operations=[
  {id:'face',type:'facing',toolId:'tool-1',enabled:true,parameters:{stepOver:20}},
  {id:'rough',type:'roughing',toolId:'tool-2',enabled:true,parameters:{depth:8,radialStep:2}},
  {id:'finish',type:'finishing',toolId:'tool-3',enabled:true,parameters:{depth:8}},
  {id:'chamfer',type:'chamfer',toolId:'tool-9',enabled:true,parameters:{width:1}},
  {id:'holes',type:'drilling',toolId:'drill-11',enabled:true,parameters:{depth:10,depthReference:'tip',mode:'blind',pattern:'line',x:20,y:-20,count:3,pitch:20,cycle:'G83',q:2,rPlane:3}},
  {id:'pocket',type:'pocket',toolId:'tool-5',enabled:true,parameters:{shape:'obround',x:60,y:-45,length:60,width:20,depth:6,angle:0,stepZ:2,stepOver:3,rampAngle:3,entry:'ramp',finishLeadMargin:1}}
 ];
 return p;
}
function operationLines(result,id){
 const lines=result.iso.split('\n');
 return result.lineMap.filter(row=>row.operationId===id).map(row=>lines[row.line-1]);
}
function checkProgram(result){
 const lines=result.iso.split('\n');
 assert.equal(result.candidate,true);
 assert.equal(result.readyForMachine,false);
 assert.equal(lines.filter(line=>/^O\d{4}\b/.test(line)).length,1);
 assert.equal(lines.filter(line=>line==='M30').length,1);
 assert.equal(lines.filter(line=>line==='%').length,2);
 assert.equal(lines.at(-2),'M30');
 assert.equal(result.lineMap.length,lines.length);
 result.lineMap.forEach((row,i)=>assert.equal(row.line,i+1));
 assert(!/NaN|Infinity|undefined/.test(result.iso));
 assert.deepEqual(result.plans.map(plan=>plan.id),['face','rough','finish','chamfer','holes','pocket']);
}

test('fase 4: programma unico completo, line map e stato candidato',()=>{
 const p=fixture(),before=exportProject(p),result=generateProgram(p);
 checkProgram(result);
 assert.equal(exportProject(p),before,'La generazione non deve modificare il progetto');
 assert.equal(generateProgram(importProject(before)).iso,result.iso);
});

for(const cycle of ['G81','G83','G73'])test('fase 4: '+cycle+' con tre fori, G98 e cancellazione ciclo',()=>{
 const p=fixture();p.operations[4].parameters.cycle=cycle;
 const result=generateProgram(p);checkProgram(result);
 const lines=operationLines(result,'holes'),cycles=lines.filter(line=>line.startsWith('G98 '+cycle+' '));
 assert.equal(cycles.length,3);
 for(const line of cycles){
  assert(/ Z-10\. R3\./.test(line),line);
  assert(/ F200\.$/.test(line),line);
  assert.equal(/ Q2\./.test(line),cycle!=='G81',line);
 }
 for(let i=0;i<lines.length;i++)if(lines[i].startsWith('G98 '+cycle+' '))assert.equal(lines[i+1],'G80');
});

for(const shape of ['obround','rounded-rectangle'])test('fase 4: '+shape+', fondo finale e finitura nominale compensata',()=>{
 const p=fixture();Object.assign(p.operations[5].parameters,{shape,radius:6});
 const result=generateProgram(p);checkProgram(result);
 const plan=result.plans.find(plan=>plan.id==='pocket'),lines=operationLines(result,'pocket');
 assert.equal(plan.coordinateMode,'mixed');
 const cutting=plan.moves.filter(m=>m.type==='move'&&m.code!=='G0'&&typeof m.z==='number');
 assert.equal(Math.min(...cutting.map(m=>m.z)),-6);
 assert(cutting.some(m=>m.z===-2));assert(cutting.some(m=>m.z===-4));
 assert(lines.some(line=>line.includes('G41 D5')));
 assert.equal(lines.filter(line=>line.includes('G41 D5')).length,lines.filter(line=>line.includes('G40')&&line.startsWith('G1')).length);
 assert(lines.some(line=>line.startsWith('G3 ')));
});

test('fase 4: smusso a Z costante senza compensazione cilindrica',()=>{
 const result=generateProgram(fixture()),plan=result.plans.find(plan=>plan.id==='chamfer');
 assert.equal(plan.coordinateMode,'tool-center');
 assert(!plan.moves.some(m=>m.comp));
 const zs=plan.moves.filter(m=>m.type==='move'&&m.code!=='G0'&&typeof m.z==='number').map(m=>m.z);
 assert(zs.length>0);assert(zs.every(z=>z===-1));
 assert(operationLines(result,'chamfer').some(line=>/ Z-1\./.test(line)));
});

test('fase 4: preforo precedente compatibile collegato alla tasca',()=>{
 const p=fixture();
 p.tools.find(t=>t.id==='drill-11').diameter=10;
 p.operations[4].parameters={depth:12,depthReference:'tip',mode:'blind',pattern:'single',x:60,y:-45,cycle:'G81',rPlane:3};
 p.operations[5].parameters.entry='predrill';
 const result=generateProgram(p);checkProgram(result);
 assert.equal(result.plans.find(plan=>plan.id==='holes').moves.filter(m=>m.type==='cycle').length,1);
 assert(result.plans.find(plan=>plan.id==='pocket').moves.some(m=>m.z===-6));
});

const invalid=[
 ['preforo assente',p=>{p.operations[5].parameters.entry='predrill';}],
 ['preforo successivo',p=>{p.operations[5].parameters.entry='predrill';[p.operations[4],p.operations[5]]=[p.operations[5],p.operations[4]];}],
 ['rampa non consentita',p=>{p.tools.find(t=>t.id==='tool-5').centerCutting=false;}],
 ['tasca oltre bordo',p=>{p.operations[5].parameters.x=1;}],
 ['tasca passante non supportata',p=>{p.operations[5].parameters.depth=20;}],
 ['foro senza riferimento punta',p=>{delete p.operations[4].parameters.depthReference;}],
 ['foro passante non confermato',p=>{Object.assign(p.operations[4].parameters,{mode:'through',depth:22,breakthroughConfirmed:false});}],
 ['smussatore senza geometria punta',p=>{delete p.tools.find(t=>t.id==='tool-9').tipDiameter;}],
 ['utensile non confermato',p=>{p.tools.find(t=>t.id==='tool-5').loaded=false;}]
];
for(const [label,mutate]of invalid)test('fase 4: generatore rifiuta '+label,()=>{
 const p=fixture();mutate(p);assert.throws(()=>generateProgram(p));
});
