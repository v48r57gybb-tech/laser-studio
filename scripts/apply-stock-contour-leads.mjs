import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'Contornatura cambiata: '+a.slice(0,100));return s.replace(a,b);};
let s=await readFile('dist/lib/stock-planning.mjs','utf8');
const old="go(a.x-2*far*u.x/ul,a.y-2*far*u.y/ul,z);line(a.x-far*u.x/ul,a.y-far*u.y/ul,undefined,cut.feed,{comp:'G41',offset:t.station});for(const q of [...path,a])line(q.x,q.y);line(a.x+far*v.x/vl,a.y+far*v.y/vl);line(a.x+2*far*v.x/vl,a.y+2*far*v.y/vl,undefined,cut.feed,{comp:'G40'});rapid({z:safe});";
const next="const entry=stockRayExit(a,{x:-u.x/ul,y:-u.y/ul},stock,R+margin),exit=stockRayExit(a,{x:v.x/vl,y:v.y/vl},stock,R+margin);go(a.x-(entry+lead)*u.x/ul,a.y-(entry+lead)*u.y/ul,z);line(a.x-entry*u.x/ul,a.y-entry*u.y/ul,undefined,cut.feed,{comp:'G41',offset:t.station});for(const q of [...path,a])line(q.x,q.y);line(a.x+exit*v.x/vl,a.y+exit*v.y/vl);line(a.x+(exit+lead)*v.x/vl,a.y+(exit+lead)*v.y/vl,undefined,cut.feed,{comp:'G40'});rapid({z:safe});";
s=once(s,old,next);
s=once(s,'far=2*(Math.hypot(g.stock.width,g.stock.depth)+lead)','contourStep=pos(p.stepZ??3,\'passo Z contornatura\')');
assert.equal(s.split('levels(0,-depth,3)').length,3,'Due cicli Z di contornatura attesi');s=s.replaceAll('levels(0,-depth,3)','levels(0,-depth,contourStep)');
s+=`
function stockRayExit(point,direction,stock,clearance){
 let enter=-Infinity,exit=Infinity;
 for(const [axis,lo,hi]of [['x',stock.x0-clearance,stock.x1+clearance],['y',stock.y0-clearance,stock.y1+clearance]]){
  const p=point[axis],d=direction[axis];
  if(Math.abs(d)<1e-12){if(p<lo||p>hi)return 0;continue;}
  const a=(lo-p)/d,b=(hi-p)/d;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
 }
 if(exit<Math.max(0,enter))return 0;
 if(!Number.isFinite(exit))fail('Direzione ingresso contorno non valida');
 return Math.max(0,exit);
}
`;
await writeFile('dist/lib/stock-planning.mjs',s);
let ui=await readFile('dist/stock-ui.js','utf8');ui=once(ui,'roughing:{depth:5,radialStep:3},finishing:{depth:5}','roughing:{depth:5,radialStep:3,stepZ:3},finishing:{depth:5,stepZ:3}');await writeFile('dist/stock-ui.js',ui);
for(const path of ['dist/lib/stock-planning.mjs','dist/stock-ui.js']){const r=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});assert.equal(r.status,0,path+'\n'+r.stderr);}
const {initialProject}=await import('../dist/lib/stock-ui-model.mjs');
const {stockToolDefaults}=await import('../dist/lib/stock-defaults.mjs');
const {planOperations}=await import('../dist/lib/stock-planning.mjs');
const {composeProgram}=await import('../dist/lib/stock-program.mjs');
let cases=0;
for(const origin of ['top-left','top-right','bottom-left','bottom-right','center'])for(const shape of ['box','diamond','cylinder'])for(const type of ['roughing','finishing']){
 if(shape==='cylinder'&&type==='roughing')continue;
 const p=stockToolDefaults(initialProject());p.geometry.origin.xy=origin;p.geometry.allowances.zPlus=0;
 if(shape==='diamond')p.geometry.finished={type:'custom',height:50,points:[{x:0,y:50},{x:50,y:0},{x:100,y:50},{x:50,y:100}]};
 if(shape==='cylinder')p.geometry.finished={type:'cylinder',height:50,diameter:100};
 p.setup.topFacedConfirmed=true;p.setup.finishStockConfirmed=true;const tool=p.tools.find(t=>t.kind==='mill');
 p.operations=[{id:'contour',enabled:true,type,toolId:tool.id,parameters:{depth:6,stepZ:2,radialStep:3}}];
 const plan=planOperations(p).plans[0],moves=plan.moves,starts=[];let z=null,active=false;
 for(let i=0;i<moves.length;i++){const m=moves[i];if(m.code==='G0'&&('x'in m||'y'in m)){assert.ok(z>=p.setup.safeZ);assert.equal(active,false);}if(m.comp==='G41'){active=true;starts.push(i);assert.equal(moves[i-3].code,'G0');assert.equal(moves[i-3].z,p.setup.safeZ);assert.equal(moves[i-2].code,'G0');assert.equal(moves[i-1].code,'G1');}if(active&&'z'in m)assert.equal(m.z,z);if(m.comp==='G40'){active=false;assert.equal(moves[i+1].code,'G0');assert.equal(moves[i+1].z,p.setup.safeZ);}if('z'in m)z=m.z;}
 assert.equal(active,false);assert.equal(starts.length%3,0);const perLevel=starts.length/3;assert.ok(perLevel>=1);
 const firstEntry=moves[starts[0]-2];
 for(const k of [0,perLevel,2*perLevel]){assert.equal(moves[starts[k]-2].x,firstEntry.x);assert.equal(moves[starts[k]-2].y,firstEntry.y);assert.equal(moves[starts[k]-1].z,-2*(k/perLevel+1));}
 const xySlice=k=>{const begin=starts[k],end=moves.findIndex((m,i)=>i>=begin&&m.comp==='G40');return JSON.stringify(moves.slice(begin,end+1).map(({z,...m})=>m));};
 assert.equal(xySlice(0),xySlice(perLevel));assert.equal(xySlice(0),xySlice(2*perLevel));
 if(shape==='box'){const ref={ 'top-left':[0,100],'top-right':[100,100],'bottom-left':[0,0],'bottom-right':[100,0],center:[50,50]}[origin],pad=2*(tool.diameter/2+p.setup.externalMargin)+3;for(const m of moves){if('x'in m)assert.ok(m.x>=-ref[0]-pad&&m.x<=100-ref[0]+pad);if('y'in m)assert.ok(m.y>=-ref[1]-pad&&m.y<=100-ref[1]+pad);}}
 assert.equal(composeProgram([plan]).readyForMachine,false);cases++;
}
assert.equal(cases,25);console.log('25 casi contornatura: ingressi limitati, profili XY ripetuti, Z costante e ritorni in sicurezza verificati nella build; non è prova browser o macchina.');
