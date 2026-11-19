import {readFile,writeFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import assert from 'node:assert/strict';
const updates=new Map(),read=n=>readFile('dist/'+n,'utf8');
function once(s,a,b){assert.equal(s.split(a).length,2,'Correzione non applicabile: '+a.slice(0,80));return s.replace(a,b);}
function arcDirection(centers,cx,cy){
 let direction=0;
 for(let i=1;i<centers.length;i++){
  const a={x:centers[i-1].x-cx,y:centers[i-1].y-cy},b={x:centers[i].x-cx,y:centers[i].y-cy};
  const delta=Math.atan2(a.x*b.y-a.y*b.x,a.x*b.x+a.y*b.y);
  if(Math.abs(delta)<1e-8)throw Error('Centri arco coincidenti o verso indeterminato');
  if(Math.abs(delta)>Math.PI-1e-6)throw Error('Intervallo arco ambiguo');
  const sign=Math.sign(delta);if(direction&&direction!==sign)throw Error('Ordine centri arco incoerente');direction=sign;
 }
 if(!direction)throw Error('Centri insufficienti per determinare il verso arco');return direction;
}
let ui=await read('counterbore-straight.js');
ui=once(ui,'function setup(m){',arcDirection.toString()+'\nfunction setup(m){');
ui=once(ui,"direction:d.aCurve==='left'?1:-1",'direction:arcDirection(centers,cx,cy)');
ui=once(ui,"status.textContent='Lamatura: '+e.message;","status.textContent=e.message.startsWith('Lamatura:')?e.message:'Lamatura: '+e.message;");updates.set('counterbore-straight.js',ui);
let core=await read('counterbore-core.js');
const start=core.indexOf('  for(const p of centers){\n   const r=Math.hypot(p.x-cx'),end=core.indexOf('\n  }',start);assert(start>=0&&end>start);
core=core.slice(0,start)+`  for(const [i,p] of centers.entries()){
   const r=Math.hypot(p.x-cx,p.y-cy),angle=((direction*(Math.atan2(p.y-cy,p.x-cx)-start))%TAU+TAU)%TAU;
   const label='foro '+(i+1)+': ',mm=n=>n.toFixed(3)+' mm';
   if(Math.abs(r-R)>.001)fail(label+'centro non sulla linea nominale; scostamento '+mm(Math.abs(r-R)));
   if(angle>sweep+EPS)fail(label+'centro fuori settore: '+(angle*180/Math.PI).toFixed(4)+' gradi su '+(sweep*180/Math.PI).toFixed(4));
   const limits=[['bordo interno',r-(R-width/2)],['bordo esterno',R+width/2-r],['rifilo iniziale',distanceSegment(p,...e0)],['rifilo finale',distanceSegment(p,...e1)]];
   for(const [name,distance] of limits)if(distance<radius-EPS)fail(label+name+', distanza '+mm(distance)+', raggio sede richiesto '+mm(radius));`+core.slice(end);
updates.set('counterbore-core.js',core);
let sim=await read('counterbore-sim.js');
sim=once(sim,'max="32" step="0.25" value="4"','max="1000" step="0.25" value="4"');
sim=once(sim,'<label>Velocità<input','<label>Velocità animazione <output class="speed-value">4×</output><input');
sim=once(sim,'<label>Posizione programma','<label>Velocità rapida<select class="speed-presets"><option value="4">4×</option><option value="32">32×</option><option value="100">100×</option><option value="500">500×</option><option value="1000">1000×</option></select></label><label>Posizione programma');
sim=once(sim,"btn.type='button';btn.textContent='SIMULAZIONE 3D';","btn.type='button';btn.classList.add('btn-sim-start');btn.textContent='SIMULAZIONE 3D';");
sim=once(sim,'  seek.oninput=',`  speed.addEventListener('input',()=>{box.querySelector('.speed-value').textContent=speed.value+'×';});
  box.querySelector('.speed-presets').onchange=e=>{speed.value=e.target.value;speed.dispatchEvent(new Event('input'));};
  seek.oninput=`);
sim=once(sim,'if(Math.hypot(c.x-p.x,c.y-p.y)<=r)','if(Math.abs(c.x-p.x)<=r&&Math.abs(c.y-p.y)<=r&&(c.x-p.x)**2+(c.y-p.y)**2<=r*r)');
sim=once(sim,'let remaining=dt;while(remaining>0&&index<ops.length)','let remaining=dt,batch=0;while(remaining>0&&index<ops.length&&batch++<2000)');
updates.set('counterbore-sim.js',sim);
const profile=String.raw`(function(){
'use strict';
function init(){
 for(const c of [{mode:'straight',width:'width',height:'height',probe:'sp'},{mode:'arc',width:'aWidth',height:'aHeight',probe:'ap'}]){
  const width=document.getElementById(c.width),height=document.getElementById(c.height),probe=document.getElementById(c.probe+'Profile');if(!width||!height||!probe)continue;
  const field=width.closest('.field'),box=document.createElement('div');box.className='field';
  const id='piece-profile-'+c.mode;box.innerHTML='<label for="'+id+'">Tipo di profilo</label><select id="'+id+'"><option value="small">Piccolo · 16,5 × 10 mm</option><option value="big">Grande · 23 × 13,5 mm</option></select>';
  field.parentNode.insertBefore(box,field);const select=box.querySelector('select'),summary=document.createElement('p');summary.className='muted';summary.setAttribute('role','status');probe.closest('.field').append(summary);
  const n=e=>Number(String(e.value).replace(',','.'));
  function sync(){const w=n(width),h=n(height);select.value=w===16.5&&h===10?'small':w===23&&h===13.5?'big':'';const mode=probe.value;const pw=mode==='big'?23:mode==='small'?16.5:w,ph=mode==='big'?13.5:mode==='small'?10:h;summary.textContent='Sonda: profilo '+pw+' × '+ph+' mm'+(mode==='auto'?' · sincronizzato con il pezzo':' · selezione manuale')+'. Altezza nominale di riferimento: non cambia automaticamente le quote di tastatura.';}
  function choose(source){const small=source==='small';width.value=small?'16.5':'23';height.value=small?'10':'13.5';probe.value='auto';for(const el of [width,height,probe])el.dispatchEvent(new Event('change',{bubbles:true}));sync();}
  select.onchange=()=>choose(select.value);for(const el of [width,height,probe]){el.addEventListener('input',sync);el.addEventListener('change',sync);}
  const form=width.closest('form');form?.addEventListener('cnc:before-display',sync);document.getElementById('archiveSection')?.addEventListener('click',()=>queueMicrotask(sync));sync();
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
`;
updates.set('profile-sync.js',profile);
let html=await read('index.html');
const css='.btn-sim-start{background:#ff901a!important;color:#031627!important;border:2px solid #ffb55b!important;box-shadow:0 0 12px #ff901a99,0 0 26px #ff901a55!important;font-weight:800!important}.btn-sim-start:hover:not(:disabled),.btn-sim-start:focus-visible{box-shadow:0 0 18px #ff901acc,0 0 36px #ff901a77!important}.btn-sim-start:disabled{box-shadow:none!important;opacity:.45}';
html=once(html,'</head>','<style>'+css+'</style>\n</head>');html=once(html,'</body>','<script src="profile-sync.js"></script>\n</body>');updates.set('index.html',html);
const ctx=createContext({});new Script(core).runInContext(ctx);const config={enabled:true,diameter:9.5,toolDiameter:5,holeDiameter:6.8,compensation:'wear',effectiveWear:0,wearConfirmed:true,depth:5.4,safeZ:5,toolChangeZ:200,minResidual:2,tool:10,offset:10,rpm:5000,feed:500,entryFeed:60,radialStep:1,coolant:'M8'};
const R=990,edge=64.795/R,step=2*Math.asin(172.568/(2*R)),sweep=edge*2+18*step;
for(const sign of [1,-1])for(const rotation of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
 const cx=R*Math.cos(rotation),cy=R*Math.sin(rotation),start=rotation+Math.PI;
 const centers=Array.from({length:19},(_,i)=>{const a=start+sign*(edge+i*step);return{x:Number((cx+R*Math.cos(a)).toFixed(4)),y:Number((cy+R*Math.sin(a)).toFixed(4))};});
 const geometry={mode:'arc',height:13.5,width:23,edgeType:'radial',radius:R,cx,cy,startAngle:start,sweep,direction:arcDirection(centers,cx,cy),centers};
 assert.equal(geometry.direction,sign);assert.equal(ctx.CncCounterboreCore.plan(config,geometry).centers.length,19);
 assert.throws(()=>ctx.CncCounterboreCore.plan({...config,diameter:24},geometry),/bordo/);
 assert.throws(()=>ctx.CncCounterboreCore.plan(config,{...geometry,direction:-sign}),/fuori settore/);
}
for(const [name,text]of updates)if(name.endsWith('.js'))new Script(text,{filename:name});
for(const [name,text]of updates)await writeFile('dist/'+name,text);
console.log('Correzioni applicate: 8 casi arco 990/19 e controlli bordi verificati. Browser e CNC da collaudare.');
