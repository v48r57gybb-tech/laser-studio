import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'Scia utensile: integrazione cambiata '+a.slice(0,100));return s.replace(a,b);};
await copyFile('stock-path-trail.js','dist/stock-path-trail.js');
let html=await readFile('dist/index.html','utf8');html=once(html,'<script src="stock-sim.js"></script>','<script src="stock-path-trail.js"></script><script src="stock-sim.js"></script>');await writeFile('dist/index.html',html);
let sim=await readFile('dist/stock-sim.js','utf8');
const old="for(let k=Math.max(0,index-1000);k<index;k++){const o=ops[k];if(o.type!=='feed')continue;const a=screen(o.from),b=screen(o.to);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=o.nominalComp?'#ffb34d':'#57e0ef';ctx.lineWidth=1.5;ctx.stroke();}";
sim=once(sim,old,'StockPathTrail.draw(ctx,ops,index,progress,screen,project);');await writeFile('dist/stock-sim.js',sim);
for(const path of ['dist/stock-sim.js','dist/stock-path-trail.js']){const r=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});assert.equal(r.status,0,path+'\n'+r.stderr);}
const context=createContext({});new Script(await readFile('dist/stock-path-trail.js','utf8')).runInContext(context);const {segments,draw}=context.StockPathTrail;
const ops=Array.from({length:10},(_,i)=>({type:'feed',toolName:'T2',from:{x:i*10,y:0,z:-3},to:{x:(i+1)*10,y:0,z:-3}})),saved=JSON.stringify(ops),trail=segments(ops,9,.5,30);
assert.equal(trail[0].from.x,65);assert.equal(trail.at(-1).to.x,95);assert.equal(trail[0].alphaFrom,0);assert(trail.at(-1).alphaTo>trail[0].alphaTo);assert.equal(segments(ops,0,0,30).length,0);assert.equal(JSON.stringify(trail),JSON.stringify(segments(ops,9,.5,30)));assert.equal(JSON.stringify(ops),saved);
const switched=structuredClone(ops);switched[9].toolName='T9';assert.equal(segments(switched,9,.5,30).length,1);const rapid=structuredClone(ops);rapid[9].type='rapid';assert(segments(rapid,9,1,30).every(l=>l.to.x<=90));
let strokes=0;const ctx={save(){},restore(){},createLinearGradient(){return {addColorStop(){}};},beginPath(){},moveTo(){},lineTo(){},stroke(){strokes++;},setLineDash(){}};draw(ctx,ops,9,.5,p=>({x:p.x,y:p.y}),{tools:[{station:2,kind:'mill',diameter:10}]});assert(strokes>0);assert.equal(JSON.stringify(ops),saved);
console.log('Scia utensile verificata in build: dissolvenza per distanza, nessun percorso futuro, reset e seek coerenti, tracce precedenti eliminate al cambio utensile; movimenti e materiale invariati. Prova browser ancora necessaria.');
