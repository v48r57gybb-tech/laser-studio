import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import assert from 'node:assert/strict';
const c=createContext({});new Script(await readFile(new URL('../counterbore-core.js',import.meta.url),'utf8')).runInContext(c);const C=c.CncCounterboreCore;
// Parametri sintetici per test, non dati di taglio di produzione.
const base={enabled:true,diameter:9.5,toolDiameter:5,holeDiameter:5.5,depth:5.4,safeZ:5,toolChangeZ:200,minResidual:2,tool:8,offset:8,rpm:2000,feed:120,entryFeed:60,coolant:'M8',radialStep:1,compensation:'wear',effectiveWear:0,wearConfirmed:true};
const straight={mode:'straight',height:10,width:16.5,length:160,centers:[[20,0],[80,0],[140,0]]};
let count=0;function check(name,fn){fn();count++;console.log('PASS '+name);}
check('disattiva non emette ISO',()=>assert.equal(C.emit({enabled:false},{}).length,0));
check('9.5 / 5 / 5.4',()=>{const p=C.plan(base,straight);assert.equal(p.finish,2.25);assert.deepEqual(Array.from(p.levels),[-1.8,-3.6,-5.4]);});
check('13 / 8 / 6.4',()=>{const p=C.plan({...base,diameter:13,toolDiameter:8,holeDiameter:8.5,depth:6.4},straight);assert.deepEqual(Array.from(p.levels),[-2.1333,-4.2667,-6.4]);});
check('copertura radiale indipendente 13 / 3',()=>{const p=C.plan({...base,diameter:13,toolDiameter:3},straight);let covered=p.hole/2;for(const r of p.radii){assert.ok(r-p.tool/2<=covered+1e-7);covered=Math.max(covered,r+p.tool/2);}assert.ok(Math.abs(covered-6.5)<1e-8);});
check('decimali con virgola',()=>{const p=C.plan({...base,diameter:'10,2',toolDiameter:'4,3',depth:'7,5'},straight);assert.ok(Math.abs(p.finish-2.95)<1e-10);assert.equal(p.levels[2],-7.5);});
check('tre retrazioni per centro',()=>{const a=C.emit(base,straight);assert.equal(a.filter(s=>s==='G0 Z5.').length,12);assert.equal(a.filter(s=>s.startsWith('G1 Z-')).length,9);assert.equal(a.filter(s=>s.includes('G41 D8')).length,9);assert.equal(a.filter(s=>s.startsWith('G1 G40')).length,9);});
check('centri originali preservati',()=>{const a=C.emit(base,straight);for(const [x,y]of straight.centers)assert.ok(a.includes('G0 X'+C.fmt(x)+' Y'+C.fmt(y)));});
for(const [name,patch]of [['fresa troppo grande',{toolDiameter:9}],['foro non maggiore',{holeDiameter:5}],['sede non maggiore',{diameter:5}],['profondita passante',{depth:10}],['residuo insufficiente',{depth:9}],['Z sotto cinque',{safeZ:4.99}],['passo radiale eccessivo',{radialStep:3}],['S mancante',{rpm:''}],['F mancante',{feed:''}],['usura non nulla',{effectiveWear:.01}],['D ambiguo',{wearConfirmed:false}],['T non intero',{tool:1.5}],['incrementi non distinguibili',{depth:.0001}]])check(name,()=>assert.throws(()=>C.plan({...base,...patch},straight)));
check('bordo dritto',()=>assert.throws(()=>C.plan({...base,diameter:20},straight)));
check('sovrapposizione',()=>assert.throws(()=>C.plan(base,{...straight,centers:[[20,0],[25,0]]})));
for(const direction of [1,-1])check('arco verso '+direction,()=>{const R=150,start=.4,sweep=1.4,centers=[.2,.7,1.2].map(t=>({x:150+R*Math.cos(start+direction*t),y:40+R*Math.sin(start+direction*t)}));const p=C.plan(base,{mode:'arc',edgeType:'radial',height:10,width:16.5,radius:R,cx:150,cy:40,startAngle:start,sweep,direction,centers});assert.equal(p.centers.length,3);for(let i=0;i<centers.length;i++){assert.equal(p.centers[i].x,centers[i].x);assert.equal(p.centers[i].y,centers[i].y);}});
check('numero ISO non finito rifiutato',()=>assert.throws(()=>C.fmt(NaN)));
check('archi ISO verificati con lettore indipendente',()=>{
 const lines=C.emit(base,straight);let x=0,y=0,z=200,arcs=0;
 const val=(line,k)=>{const m=line.match(new RegExp('(?:^|\\s)'+k+'([+-]?\\d+(?:\\.\\d*)?)'));return m?Number(m[1]):undefined;};
 for(const line of lines){
  const nx=val(line,'X'),ny=val(line,'Y'),nz=val(line,'Z');
  if(line.startsWith('G0 X'))assert.ok(z>=5);
  if(line.startsWith('G3 ')){
   const i=val(line,'I')||0,j=val(line,'J')||0,cx=x+i,cy=y+j;
   assert.ok(Math.abs(Math.hypot(x-cx,y-cy)-Math.hypot(nx-cx,ny-cy))<0.00015);
   assert.ok([-1.8,-3.6,-5.4].some(level=>Math.abs(level-z)<1e-8));arcs++;
  }
  if(nx!==undefined)x=nx;if(ny!==undefined)y=ny;if(nz!==undefined)z=nz;
 }
 assert.equal(arcs,C.plan(base,straight).radii.length*3*3*2);
});
console.log(JSON.stringify({passed:count,scope:'nucleo geometrico/ISO; non integrazione browser, simulatore o CNC'}));
