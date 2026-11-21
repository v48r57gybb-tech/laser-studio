import {readFile,writeFile} from 'node:fs/promises';
import {Script,runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
let ui=await readFile('dist/interface-presentation.js','utf8'),hero=await readFile('dist/hero-workpiece.js','utf8'),html=await readFile('dist/index.html','utf8');
function replace(s,a,b){assert.equal(s.split(a).length,2,'Vignetta: riferimento cambiato '+a.slice(0,100));return s.replace(a,b);}
function between(s,a,b,value){const i=s.indexOf(a),j=s.indexOf(b,i);assert(i>=0&&j>i,'Vignetta: sezione cambiata '+a);return s.slice(0,i)+value+s.slice(j);}
ui=between(ui," const canvas=document.createElement('canvas');",'\n}\ndocument.addEventListener',String.raw` operations.remove();
 function sync(){const stock=mode.value==='stock';warnings.hidden=!stock;notes.forEach(note=>note.hidden=!stock);if(description)description.textContent=stock?'Parti da un grezzo e configura le operazioni per ottenere il pezzo finito.':mode.value==='arc'?'Configura il pezzo curvo ad arco e le lavorazioni dedicate.':'Configura il pezzo dritto e le lavorazioni dedicate.';}
 mode.addEventListener('change',sync);sync();`);
hero=replace(hero,"const toggle=document.getElementById('cncHeroPause'),reduced=","const reduced=");
hero=between(hero,'function label(){','reduced.addEventListener', '');
hero=replace(hero,'const project=(x,y,z)=>({x:320+(x-y)*1.45,y:290+(x+y)*.62-z*1.55});',String.raw`const camera={yaw:Math.PI/4,pitch:.52,zoom:1};let drag=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),reset=()=>{Object.assign(camera,{yaw:Math.PI/4,pitch:.52,zoom:1});dirty=true;};
const project=(x,y,z)=>({x:320+1.9*camera.zoom*(x*Math.cos(camera.yaw)-y*Math.sin(camera.yaw)),y:305+1.9*camera.zoom*((x*Math.sin(camera.yaw)+y*Math.cos(camera.yaw))*Math.sin(camera.pitch)-z*Math.cos(camera.pitch))});
canvas.style.touchAction='none';canvas.style.cursor='grab';
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;camera.yaw+=(e.clientX-drag.x)*.006;camera.pitch=clamp(camera.pitch+(e.clientY-drag.y)*.005,.32,1.1);drag.x=e.clientX;drag.y=e.clientY;dirty=true;});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(drag?.id!==e.pointerId)return;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);canvas.style.cursor='grab';});
canvas.addEventListener('wheel',e=>{if(e.ctrlKey||!Number.isFinite(e.deltaY)||e.deltaY===0)return;e.preventDefault();e.stopPropagation();camera.zoom=clamp(camera.zoom*Math.exp(-e.deltaY*.001),.65,1.65);dirty=true;},{passive:false});canvas.addEventListener('dblclick',reset);
canvas.addEventListener('keydown',e=>{if(e.key==='Home')reset();else if(e.key==='ArrowLeft')camera.yaw-=.08;else if(e.key==='ArrowRight')camera.yaw+=.08;else if(e.key==='ArrowUp')camera.pitch=clamp(camera.pitch-.06,.32,1.1);else if(e.key==='ArrowDown')camera.pitch=clamp(camera.pitch+.06,.32,1.1);else if(e.key==='+')camera.zoom=clamp(camera.zoom*1.1,.65,1.65);else if(e.key==='-')camera.zoom=clamp(camera.zoom/1.1,.65,1.65);else return;e.preventDefault();dirty=true;});`);
hero=between(hero,'polygon([[-x,-y,-52]','for(let j=0;j<6;j++)',String.raw`ctx.save();ctx.beginPath();ctx.rect(12,83,W-24,374);ctx.clip();
const corners=[[-x,-y],[x,-y],[x,y],[-x,y]],sides=corners.map((a,i)=>{const b=corners[(i+1)%4];return {points:[[...a,-52],[...b,-52],[...b,0],[...a,0]],depth:(a[0]+b[0])*Math.sin(camera.yaw)+(a[1]+b[1])*Math.cos(camera.yaw),shade:65+15*i};}).sort((a,b)=>a.depth-b.depth);
for(const side of sides){const n=side.shade;polygon(side.points,'rgb('+n+','+(n+25)+','+(n+40)+')','#9bb3c2');}
const metal=ctx.createLinearGradient(130,220,500,400);metal.addColorStop(0,'#d7e4ec');metal.addColorStop(.5,'#a3bac9');metal.addColorStop(1,'#6c8da3');polygon([[-x,-y,0],[x,-y,0],[x,y,0],[-x,y,0]],metal,'#d6ebf5');
`);
hero=replace(hero,"'#f1d9a1',7","'#e3f2fa77',1");
hero=between(hero,'if(s>=1){for(let k=1;k<=3;k++)','let holes=',"if(s===1)line(border(x,y,.5),'#ffac46',1.5);\n");
hero=between(hero,'const pocket=s>4?1:s===4?p:0,depth=15*pocket;','if(s>=5){',String.raw`const pocket=s>4?1:s===4?p:0,depth=15*pocket;if(pocket>0){
const opening=[[-29,-21,.2],[29,-21,.2],[29,21,.2],[-29,21,.2]],floor=opening.map(([a,b])=>[a,b,-depth]);
ctx.save();polygon(opening,'#102b3d');ctx.clip();polygon(floor,'#a3bdca');
const fx=Math.sin(camera.yaw)>=0?-29:29,fy=Math.cos(camera.yaw)>=0?-21:21;
polygon([[fx,-21,0],[fx,21,0],[fx,21,-depth],[fx,-21,-depth]],'#395a70');polygon([[-29,fy,0],[29,fy,0],[29,fy,-depth],[-29,fy,-depth]],'#506e82');
for(let k=-15;k<=15;k+=4)line([[-26,k,-depth],[26,k,-depth]],'#dcecf455',.7);
ctx.restore();line([...opening,opening[0]],'#d7effa',1.2);}
`);
hero=between(hero,'if(s!==8){const tip=project','ctx.fillStyle=\'#58e6f5\';',String.raw`if(s!==8){const tools={face:{kind:'face',diameter:40,fluteLength:9,shankDiameter:18},mill:{kind:'mill',diameter:12,fluteLength:s===1||s===2?60:32},drill:{kind:'drill',diameter:10,fluteLength:38,tipAngle:118},chamfer:{kind:'chamfer',diameter:16,fluteLength:12,angle:90,tipDiameter:0},tap:{kind:'tap',diameter:8,fluteLength:28,pitch:1.25,leadLength:3,tapMethod:'cut'}};
assertRenderer();ctx.save();if(s===0||s>=3){const floor=s>=5?-15:s===4?-depth:0;ctx.beginPath();ctx.rect(0,0,W,project(tx,ty,floor).y+2);ctx.clip();}
root.StockToolVisual.draw(ctx,{x:tx,y:ty,z:tz},{...tools[kind],shankLength:16},v=>project(v.x,v.y,v.z),ms/1000,camera.yaw);ctx.restore();}
ctx.restore();
`);
hero=replace(hero,'function init(){',"function assertRenderer(){if(!root.StockToolVisual?.draw)throw Error('Renderer utensili simulazione non caricato');}\nfunction init(){");
html=replace(html,'<figcaption><button id="cncHeroPause" type="button">Pausa animazione</button></figcaption>','<figcaption id="cncHeroHint">Trascina per ruotare · rotella per zoom · doppio clic per ripristinare. Tastiera: frecce, +/−, Home.</figcaption>');
html=replace(html,'id="cncHeroWorkpiece" width=','id="cncHeroWorkpiece" tabindex="0" aria-describedby="cncHeroHint" width=');
html=replace(html,'</head>','<style>header .cnc-workpiece-demo figcaption{font:12px/1.6 system-ui;color:#b9d4e3;text-align:center}#cncHeroWorkpiece:focus-visible{outline:3px solid #ff9d3b;outline-offset:4px}</style></head>');
assert(!hero.includes('cncHeroPause'));assert(!html.includes('id="cncHeroPause"'));assert(!ui.includes("const canvas=document.createElement('canvas')"));assert(!ui.includes('requestAnimationFrame'));assert.equal((html.match(/id="cncHeroWorkpiece"/g)||[]).length,1);assert(html.indexOf('src="stock-tool-visuals.js"')<html.indexOf('src="hero-workpiece.js"'));
new Script(hero);new Script(ui);
const queue=[],handlers={},gradient={addColorStop(){}},counts={draw:0,clip:0},ctx=new Proxy({createLinearGradient:()=>gradient,clip(){counts.clip++;}},{get:(o,k)=>o[k]??(()=>{})}),canvas={dataset:{},style:{},getContext:()=>ctx,addEventListener:(k,f)=>handlers[k]=f,setPointerCapture(){},hasPointerCapture:()=>false},context={window:null,document:{readyState:'complete',hidden:false,getElementById:id=>id==='cncHeroWorkpiece'?canvas:null}};context.window=context;context.matchMedia=()=>({matches:false,addEventListener(){}});context.requestAnimationFrame=fn=>queue.push(fn);
runInNewContext(await readFile('dist/stock-tool-visuals.js','utf8'),context);const originalDraw=context.StockToolVisual.draw;context.StockToolVisual.draw=(...args)=>{counts.draw++;return originalDraw(...args);};runInNewContext(hero,context);
for(let t=0;t<19400;t+=50){assert.equal(queue.length,1);queue.shift()(t);}assert(counts.draw>0&&counts.clip>counts.draw);
let prevented=0;handlers.wheel({deltaY:-100,preventDefault(){prevented++;},stopPropagation(){}});assert.equal(prevented,1);handlers.pointerdown({button:0,pointerId:1,clientX:20,clientY:20});handlers.pointermove({pointerId:1,clientX:200,clientY:60});queue.shift()(19500);handlers.pointerup({pointerId:1});handlers.dblclick();handlers.keydown({key:'Home',preventDefault(){}});queue.shift()(19550);
await writeFile('dist/interface-presentation.js',ui);await writeFile('dist/hero-workpiece.js',hero);await writeFile('dist/index.html',html);
console.log('PASS vignetta unica: generazione legacy rimossa, pulsante pausa assente, utensili condivisi con Editor, cavità ritagliata, nove fasi, rotazione/zoom/reset. Renderer eseguito con canvas simulato: resa e interazione browser da verificare.');
