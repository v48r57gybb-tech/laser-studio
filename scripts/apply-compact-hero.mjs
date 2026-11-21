import {readFile,writeFile} from 'node:fs/promises';
import {Script,runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
let hero=await readFile('dist/hero-workpiece.js','utf8'),html=await readFile('dist/index.html','utf8');
const once=(a,b)=>{assert.equal(hero.split(a).length,2,'Asportazione: riferimento cambiato '+a.slice(0,80));hero=hero.replace(a,b);};
const model=String.raw`function surfaceAt(scene,p){
 p=Math.max(0,Math.min(1,p));const nx=24,ny=20,cells=[];
 const hit=(x,y,a,b,r)=>{const dx=b[0]-a[0],dy=b[1]-a[1],q=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-q*dx,y-a[1]-q*dy)<=r;};
 const swept=(x,y,path,fraction,r)=>{let left=fraction*(path.length-1);for(let k=0;k<path.length-1&&left>=0;k++,left--){const a=path[k],b=path[k+1],q=Math.min(1,left);if(hit(x,y,a,[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q],r))return true;}return false;};
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=-96+(i+.5)*8,y=-70+(j+.5)*7;let h=0;
 if(scene===0){h=6;const progress=p*6;for(let row=0;row<6&&row<=progress;row++){const a=row%2?96:-96,b=-a,q=Math.max(0,Math.min(1,progress-row)),cy=-70+(row+.5)*140/6;if(hit(x,y,[a,cy],[a+(b-a)*q,cy],20)){h=0;break;}}}
 if(Math.abs(x)>88||Math.abs(y)>63){if(scene>=2)h=-52;else if(scene===1){const t=Math.min(2.999999,p*3),pass=Math.floor(t),done=p>0&&swept(x,y,[[-94,-69],[94,-69],[94,69],[-94,69],[-94,-69]],t-pass,6);h=-52*(pass+(done?1:0))/3;}}
 cells.push({x0:x-4,y0:y-3.5,x1:x+4,y1:y+3.5,h:Math.max(-52,h)});}
 return {nx,ny,cells};
}
`;
once('root.OfficinaHeroDemo={stateAt,total};',model+'root.OfficinaHeroDemo={stateAt,total,surfaceAt};');
once('function polygon(points,fill,stroke){',String.raw`function drawSurface(scene,p){
const {nx,ny,cells}=surfaceAt(scene,p),faces=[],view=q=>q[0]*Math.sin(camera.yaw)*Math.cos(camera.pitch)+q[1]*Math.cos(camera.yaw)*Math.cos(camera.pitch)+q[2]*Math.sin(camera.pitch),add=(points,fill)=>faces.push({points,fill,depth:points.reduce((s,q)=>s+view(q),0)/points.length});
const metal=ctx.createLinearGradient(120,220,510,410);metal.addColorStop(0,'#dce9ef');metal.addColorStop(.5,'#aac3d0');metal.addColorStop(1,'#708fa3');
for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=cells[j*nx+i],{x0,y0,x1,y1,h}=c;if(h<=-52)continue;add([[x0,y0,h],[x1,y0,h],[x1,y1,h],[x0,y1,h]],h>0?'#7994a5':metal);
const edges=[{di:0,dj:-1,n:[0,-1],a:[x0,y0],b:[x1,y0]},{di:1,dj:0,n:[1,0],a:[x1,y0],b:[x1,y1]},{di:0,dj:1,n:[0,1],a:[x1,y1],b:[x0,y1]},{di:-1,dj:0,n:[-1,0],a:[x0,y1],b:[x0,y0]}];
for(const e of edges){if(e.n[0]*Math.sin(camera.yaw)+e.n[1]*Math.cos(camera.yaw)<=0)continue;const ni=i+e.di,nj=j+e.dj,bottom=ni<0||nj<0||ni>=nx||nj>=ny?-52:cells[nj*nx+ni].h;if(bottom<h)add([[...e.a,bottom],[...e.b,bottom],[...e.b,h],[...e.a,h]],e.di?'#4a6e85':'#64879b');}}
faces.sort((a,b)=>a.depth-b.depth);for(const f of faces)polygon(f.points,f.fill);
}
function polygon(points,fill,stroke){`);
const start=hero.indexOf('ctx.save();ctx.beginPath();ctx.rect(12,83,W-24,374);ctx.clip();'),end=hero.indexOf('let holes=',start);assert(start>=0&&end>start);hero=hero.slice(0,start)+'ctx.save();ctx.beginPath();ctx.rect(12,83,W-24,374);ctx.clip();drawSurface(s,p);\n'+hero.slice(end);
once('perimeter((p*3)%1,x+4,y+4)','perimeter((p*3)%1,94,69)');once('perimeter(p,x+3,y+3)','perimeter(p,94,69)');
once('assertRenderer();ctx.save();if(s===0||s>=3)',String.raw`if(s===0||s===1){for(let k=0;k<8;k++){const a=k*2.399+ms*.003,t=((ms/420+k*.137)%1),r=5+18*t;line([[tx+r*Math.cos(a),ty+r*Math.sin(a),tz+4+12*Math.sin(t*Math.PI)],[tx+(r+2)*Math.cos(a),ty+(r+2)*Math.sin(a),tz+3+12*Math.sin(t*Math.PI)]],'#d3e9f2',1.1);}}
assertRenderer();ctx.save();if(s===0||s>=3)`);
once('visible=true,dirty=true;','visible=true,dirty=true,lastDraw=-Infinity;');once('if(!paused||dirty){draw(elapsed);dirty=false;}','if(dirty||!paused&&now-lastDraw>=40){draw(elapsed);lastDraw=now;dirty=false;}');
const hint=/<figcaption id="cncHeroHint">[\s\S]*?<\/figcaption>/g;assert.equal([...html.matchAll(hint)].length,1);html=html.replace(hint,'').replace(' aria-describedby="cncHeroHint"','');
const css=String.raw`header .hero-wrap{grid-template-columns:minmax(0,1fr) clamp(120px,31vw,300px)!important;gap:clamp(10px,2vw,24px);align-items:center}header .cnc-workpiece-demo{width:100%!important;min-width:0;justify-self:end;align-self:center;margin:0}header .cnc-workpiece-demo canvas{box-sizing:border-box;max-width:100%}@media(max-width:520px){header .hero-copy h1{font-size:22px}header .hero-product{font-size:20px}header .hero-copy p{font-size:12px}header .hero-copy .hero-credit{font-size:11px}}`;
assert.equal(html.split('</head>').length,2);html=html.replace('</head>','<style id="heroCompactLayout">'+css+'</style></head>');assert(!html.includes('Trascina per ruotare'));assert(!html.includes('aria-describedby="cncHeroHint"'));new Script(hero);
const pure={};runInNewContext(model+'this.surfaceAt=surfaceAt;',pure);const volume=(s,p)=>pure.surfaceAt(s,p).cells.reduce((v,c)=>v+(c.h+52)*56,0);assert(volume(0,.1)>volume(0,.9));assert.equal(volume(0,1),volume(1,0));assert(volume(1,.1)>volume(1,.9));assert.equal(volume(1,1),volume(2,0));const finished=pure.surfaceAt(2,0);assert(finished.cells.every(c=>c.h===0||c.h===-52));assert(finished.cells.filter(c=>c.h===0).every(c=>c.x0>=-88&&c.x1<=88&&c.y0>=-63&&c.y1<=63));
const queue=[],gradient={addColorStop(){}},ctx=new Proxy({createLinearGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{})}),canvas={dataset:{},style:{},getContext:()=>ctx,addEventListener(){},setPointerCapture(){},hasPointerCapture:()=>false},browser={window:null,document:{readyState:'complete',hidden:false,getElementById:id=>id==='cncHeroWorkpiece'?canvas:null}};browser.window=browser;browser.matchMedia=()=>({matches:false,addEventListener(){}});browser.requestAnimationFrame=fn=>queue.push(fn);runInNewContext(await readFile('dist/stock-tool-visuals.js','utf8'),browser);runInNewContext(hero,browser);for(let t=0;t<=19200;t+=50){assert.equal(queue.length,1);queue.shift()(t);}
await writeFile('dist/hero-workpiece.js',hero);await writeFile('dist/index.html',html);
console.log('PASS vignetta compatta: colonna destra mantenuta anche su schermi stretti, istruzioni visibili rimosse, volume asportato decrescente, sei passate di spianatura e tre livelli di contornatura; superficie discretizzata illustrativa. Resa browser da verificare.');
