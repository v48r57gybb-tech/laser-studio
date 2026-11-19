import {readFile,writeFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import assert from 'node:assert/strict';
const updates=new Map(),read=n=>readFile('dist/'+n,'utf8');
function once(s,a,b){assert.equal(s.split(a).length,2,'Patch non applicabile: '+a.slice(0,90));return s.replace(a,b);}
let ui=await read('counterbore-straight.js');
const begin=ui.indexOf('function emitRadius(p){'),end=ui.indexOf('root.CncLamaturaV3=',begin);
assert(begin>=0&&end>begin);
ui=ui.slice(0,begin)+`function emitRadius(p){
 const f=root.CncCounterboreCore.fmt;
 const a=['(CB-BEGIN R'+f(p.tool/2)+')','(LAMATURA - CENTRO FRESA - D SOLO USURA ZERO)','G90 G94 G17 G40 G80','T'+p.station+' M6 (FRESA LAMATURA D'+f(p.tool)+')','G0 G43 H'+p.station+' Z'+f(p.change),'S'+f(p.rpm)+' M3',p.coolant==='off'?'M9':p.coolant];
 for(const c of p.centers){
  a.push('G0 Z'+f(p.change),'G0 X'+f(c.x)+' Y'+f(c.y),'G0 Z'+f(p.safe));
  for(const z of p.levels){
   a.push('G1 Z'+f(z)+' F'+f(p.entryFeed),'G1 G41 D'+p.offset+' X'+f(c.x+p.lead)+' Y'+f(c.y)+' F'+f(p.feed));
   for(const r of p.radii)a.push('G1 X'+f(c.x+r)+' Y'+f(c.y)+' F'+f(p.feed),'G3 X'+f(c.x-r)+' Y'+f(c.y)+' I'+f(-r)+' J0. F'+f(p.feed),'G3 X'+f(c.x+r)+' Y'+f(c.y)+' I'+f(r)+' J0. F'+f(p.feed));
   a.push('G1 X'+f(c.x+p.lead)+' Y'+f(c.y)+' F'+f(p.feed),'G1 G40 X'+f(c.x)+' Y'+f(c.y)+' F'+f(p.feed),'G0 Z'+f(p.safe));
  }
 }
 a.push('G0 Z'+f(p.change),'M9','M5','M1','(CB-END)');return a;
}
`+ui.slice(end);
ui=once(ui,"form.addEventListener('submit',()=>{","form.addEventListener('cnc:before-display',()=>{");
ui=once(ui,"safeZ:N(v('safe')),toolChangeZ:N(v('safe'))","safeZ:N(v('clear')),toolChangeZ:N(v('safe'))");
ui=once(ui,'   let geometry={',`   const used=[N(v('millTool')),N(v('drillTool'))];
   const checked=k=>$(m.mode==='arc'?'a'+k[0].toUpperCase()+k.slice(1):k)?.checked;
   if(checked('chamfer'))used.push(N(v('chamferTool')));
   if(checked('tap'))used.push(N(v('tapTool')));
   if(used.includes(p.tool))throw Error('Scegli una posizione T dedicata alla fresa di lamatura.');
   if(!(p.toolDiameter<N(v('diameter'))))throw Error('La fresa di lamatura deve essere più piccola della fresa rifili.');
   let geometry={`);
const help0=ui.indexOf("$(id('help')).textContent="),help1=ui.indexOf(';}',help0);assert(help0>=0&&help1>help0);
ui=ui.slice(0,help0)+"$(id('help')).textContent='Fresa dedicata T'+$(id('tool')).value+' / H'+$(id('tool')).value+' / D'+$(id('tool')).value+' — centro fresa; D solo usura, correzione effettiva nominale zero. Usura non nulla non simulata.'"+ui.slice(help1);
ui=once(ui,'Programma unico con lamatura e D a raggio nominale.','Programma unico con lamatura, centro fresa e D solo usura zero.');
ui=once(ui,"out.dispatchEvent(new Event('input'));","out.dispatchEvent(new Event('cnc:iso-updated'));");
ui=once(ui,'direction:(a.x-cx)*(b.y-cy)-(a.y-cy)*(b.x-cx)>=0?1:-1',"direction:d.aCurve==='left'?1:-1");
updates.set('counterbore-straight.js',ui);
let sim=await read('counterbore-sim.js');
const cb0=sim.indexOf('function compile(text){'),cb1=sim.indexOf('root.CncLamaturaSimulation=',cb0);assert(cb0>=0&&cb1>cb0);
sim=sim.slice(0,cb0)+`function compile(text){
 const lines=[],map=[];let active=false,pos={x:0,y:0,z:50},diameter=5;
 const fmt=n=>Number(n.toFixed(6)).toString();
 for(const [index,raw] of text.split(/\\r?\\n/).entries()){
  if(raw.includes('CB-BEGIN')){active=true;const m=raw.match(/R([\\d.]+)/);if(m)diameter=2*Number(m[1]);}
  const code=raw.replace(/\\([^)]*\\)/g,''),w={};for(const m of code.matchAll(/([XYZIJF])\\s*([+\\-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))/g))w[m[1]]=Number(m[2]);
  const gs=[...code.matchAll(/G(\\d+(?:\\.\\d+)?)/g)].map(m=>Number(m[1])),end={x:w.X??pos.x,y:w.Y??pos.y,z:w.Z??pos.z};
  const push=line=>{lines.push(line);map.push({raw,line:index+1,counterbore:active,diameter});};
  if(active&&(gs.includes(2)||gs.includes(3))){
   const cx=pos.x+(w.I||0),cy=pos.y+(w.J||0),r=Math.hypot(pos.x-cx,pos.y-cy);
   if(!(r>0)||Math.abs(Math.hypot(end.x-cx,end.y-cy)-r)>.002)throw Error('Arco lamatura non valido');
   const a=Math.atan2(pos.y-cy,pos.x-cx);let delta=Math.atan2(end.y-cy,end.x-cx)-a;
   if(gs.includes(3)&&delta<=0)delta+=2*Math.PI;if(gs.includes(2)&&delta>=0)delta-=2*Math.PI;
   const n=Math.max(8,Math.ceil(Math.abs(delta)*r/.2));
   for(let j=1;j<=n;j++){const t=j/n;push('G1 X'+fmt(cx+r*Math.cos(a+delta*t))+' Y'+fmt(cy+r*Math.sin(a+delta*t))+' Z'+fmt(pos.z+(end.z-pos.z)*t)+('F'in w?' F'+w.F:''));}
  }else push(raw);
  if(!gs.includes(65))pos=end;if(raw.includes('CB-END'))active=false;
  if(lines.length>200000)throw Error('Simulazione troppo lunga');
 }return{text:lines.join('\\n'),map};
}
`+sim.slice(cb1);
sim=once(sim,"o.toolName='FRESA LAMATURA';","o.toolName='FRESA LAMATURA · Ø '+m.diameter+' mm';");
sim=once(sim,'let ops=[],stock,','let follow=false,durations=[],groups=[],ops=[],stock,');
sim=once(sim,'<button type="button" data-act="fit">Inquadra tutto</button>','<button type="button" data-act="fit">Inquadra tutto</button><button type="button" data-act="follow" aria-pressed="false">Segui utensile</button>');
sim=once(sim,'<canvas style=','<label>Tempi stimati<select class="time-scope"><option value="all">Programma completo</option><option value="current">Utensile corrente</option></select></label><div class="grid"><label>Rapido nominale (mm/min)<input class="rapid-rate" type="number" min="1" value="10000"></label><label>Cambio utensile stimato (s)<input class="change-time" type="number" min="0" value="0"></label></div><p class="time-status" role="status"></p><canvas style=');
sim=once(sim,'Simulazione nominale con D pari al raggio utensile selezionato.','Simulazione nominale del centro fresa con D solo usura zero.');
sim=once(sim,'  function fit(){const pts=',"  function fit(){follow=false;box.querySelector('[data-act=follow]').setAttribute('aria-pressed','false');const pts=");
sim=once(sim,'if(!ops.length)return;if(!top)','if(!ops.length)return;if(follow){const point=projection(lerp(ops[Math.min(index,ops.length-1)],t));px=canvas.clientWidth/2-point.x*zoom;py=240-point.y*zoom;}if(!top)');
const tool0=sim.indexOf('const q=screen(p);ctx.fillStyle=color[o.tool]'),tool1=sim.indexOf('status.textContent=o.toolName',tool0);assert(tool0>=0&&tool1>tool0);
sim=sim.slice(0,tool0)+'root.CncVisual.drawTool(ctx,p,o.tool,screen,zoom,performance.now()/1000,o.diameter);updateTime();'+sim.slice(tool1);
sim=once(sim,'ops=parse(snapshot);if(!ops.length)','ops=parse(snapshot);estimate();if(!ops.length)');
sim=once(sim,"duration=o.dwell||Math.max(.005,o.distance/(o.type==='rapid'?500:Math.max(1,o.feed)/60))",'duration=Math.max(.000001,durations[index])');
sim=once(sim,"if(a==='fit')fit();","if(a==='fit')fit();if(a==='follow'){follow=!follow;box.querySelector('[data-act=follow]').setAttribute('aria-pressed',String(follow));}");
sim=once(sim,'  seek.oninput=',`  function estimate(){
   const rapid=Number(box.querySelector('.rapid-rate').value),change=Number(box.querySelector('.change-time').value);
   if(!Number.isFinite(rapid)||rapid<=0||!Number.isFinite(change)||change<0)throw Error('Impostazioni tempi non valide');
   let previous=null;groups=[];
   durations=ops.map((o,i)=>{const key=o.tool+'|'+o.toolName;if(key!==previous){groups.push({name:o.toolName,start:i});previous=key;}o.timeGroup=groups.length-1;return(o.dwell||o.distance/(o.type==='rapid'?rapid/60:Math.max(1,o.feed)/60))+(i===groups.at(-1).start?change:0);});
   const select=box.querySelector('.time-scope'),selected=select.value;select.querySelectorAll('[data-generated]').forEach(e=>e.remove());
   groups.forEach((g,i)=>{const option=document.createElement('option');option.value=String(i);option.dataset.generated='true';option.textContent=g.name;select.append(option);});
   if([...select.options].some(o=>o.value===selected))select.value=selected;
  }
  function updateTime(){
   const scope=box.querySelector('.time-scope').value,target=scope==='current'?ops[Math.min(index,ops.length-1)]?.timeGroup:scope==='all'?null:Number(scope);let total=0,elapsed=0;
   durations.forEach((d,i)=>{if(target!==null&&ops[i].timeGroup!==target)return;total+=d;if(i<index)elapsed+=d;else if(i===index)elapsed+=d*t;});
   const format=s=>{s=Math.max(0,Math.round(s));return Math.floor(s/3600)+'h '+Math.floor(s%3600/60)+'m '+s%60+'s';};
   box.querySelector('.time-status').textContent='Stima: '+format(total)+' · Trascorso: '+format(elapsed)+' · Residuo: '+format(total-elapsed)+'. Escluse accelerazioni, attese operatore, tempi mandrino e macro reali. Cambi utensile e rapidi secondo impostazioni. Indipendente dalla velocità animazione.';
  }
  box.querySelector('.time-scope').onchange=()=>{if(ops.length)updateTime();};
  for(const selector of ['.rapid-rate','.change-time'])box.querySelector(selector).onchange=()=>{try{if(ops.length){playing=false;estimate();updateTime();}}catch(e){alert(e.message);}};
  seek.oninput=`);
sim=once(sim,'zoom*=Math.exp(-e.deltaY*.001);','follow=false;zoom*=Math.exp(-e.deltaY*.001);');
sim=once(sim,'canvas.onpointerdown=e=>{drag=','canvas.onpointerdown=e=>{follow=false;drag=');
const extra0=sim.indexOf(" if(!document.querySelector('script[data-six-scenes]'))"),extra1=sim.indexOf('\n}',extra0);assert(extra0>=0&&extra1>extra0);sim=sim.slice(0,extra0)+sim.slice(extra1);
updates.set('counterbore-sim.js',sim);
let visual=await read('simulation-visuals.js');
visual=once(visual,'function drawTool(ctx,p,kind,project,zoom,time){','function drawTool(ctx,p,kind,project,zoom,time,diameter){');
visual=once(visual,"else if(kind==='mill'){","else if(kind==='counterbore'){const r=Math.max(.5,Number(diameter||5)/2);add(0,r);add(24,r);add(24,2.5);add(38,2.5);}\n else if(kind==='mill'){");
visual=once(visual,'mill:[255,134,28],','counterbore:[0,220,233],mill:[255,134,28],');
visual=once(visual,"if(kind==='drill'||kind==='tap'||kind==='mill'){","if(kind==='drill'||kind==='tap'||kind==='mill'||kind==='counterbore'){");
visual=once(visual,"r=kind==='mill'?","r=kind==='counterbore'?(z<=24?Math.max(.5,Number(diameter||5)/2)+.1:2.6):kind==='mill'?");
updates.set('simulation-visuals.js',visual);updates.set('work-animation.js','/* Animazioni integrate nel solo SVG originale. */\n');
let html=await read('index.html');
const figure=html.indexOf('<figure class="cnc-demo">'),svgEnd=html.indexOf('</svg>',figure);assert(figure>=0&&svgEnd>figure);
const scene='<g class="scene scene-counterbore"><rect x="32" y="150" width="196" height="30" rx="4" fill="url(#cnc-steel)"/><g class="cnc-counterbore-pocket"><path d="M104 151V163C104 172 156 172 156 163V151Z" fill="#587185"/><ellipse cx="130" cy="163" rx="26" ry="8" fill="#668399"/><ellipse cx="130" cy="163" rx="10" ry="3" fill="#031627"/><ellipse cx="130" cy="151" rx="26" ry="8" fill="none" stroke="#65f3ff" stroke-width="2"/></g><g class="feed-counterbore"><g class="counterbore-traverse"><rect x="106" y="22" width="48" height="40" rx="6" fill="url(#cnc-steel)"/><rect x="122" y="62" width="16" height="30" fill="url(#cnc-steel)"/><rect x="119" y="92" width="22" height="38" rx="2" fill="url(#cnc-steel)"/><path class="flutes" d="M123 95V128M130 95V128M137 95V128"/></g></g><text x="130" y="212" text-anchor="middle" fill="#65f3ff" font-family="system-ui" font-size="16">Lamatura</text></g>';
html=html.slice(0,svgEnd)+scene+html.slice(svgEnd);
let css='.cnc-demo .scene{animation-duration:24s}';
['probe','mill','drill','chamfer','tap','counterbore'].forEach((name,i)=>{css+='.cnc-demo .scene-'+name+'{animation-delay:'+(i===0?0:-(24-i*4))+'s}';});
css+='@keyframes cnc-scene{0%,15%{opacity:1}16.666667%,100%{opacity:0}}.cnc-demo .feed-counterbore{animation:cnc-counterbore-feed 4s ease-in-out infinite}.cnc-demo .counterbore-traverse{animation:cnc-counterbore-traverse 4s ease-in-out infinite}.cnc-demo .cnc-counterbore-pocket{animation:cnc-counterbore-pocket 4s ease-in-out infinite}@keyframes cnc-counterbore-feed{0%,15%,100%{transform:translateY(0)}40%,75%{transform:translateY(33px)}}@keyframes cnc-counterbore-traverse{0%,40%,75%,100%{transform:translateX(0)}49%,65%{transform:translateX(-10px)}57%{transform:translateX(10px)}}@keyframes cnc-counterbore-pocket{0%,30%{opacity:0}45%,100%{opacity:1}}@media(prefers-reduced-motion:reduce){.cnc-demo .scene,.cnc-demo .feed-counterbore,.cnc-demo .counterbore-traverse,.cnc-demo .cnc-counterbore-pocket{animation:none}.cnc-demo .scene{opacity:0}.cnc-demo .scene-probe{opacity:1}}';
html=once(html,'</head>','<style>'+css+'</style>\n</head>');
html=html.replace('svasatura e maschiatura','svasatura, maschiatura e lamatura');
const order=['simulation-visuals.js','cnc-simulator.js','counterbore-core.js','counterbore-straight.js','counterbore-arc.js','counterbore-sim.js'];
for(const name of order)html=html.split('<script src="'+name+'"></script>').join('');
html=once(html,'</body>',order.map(name=>'<script src="'+name+'"></script>').join('\n')+'\n</body>');updates.set('index.html',html);
const context=createContext({});
for(const name of ['cnc-simulator.js','counterbore-core.js','counterbore-straight.js','counterbore-sim.js'])new Script(updates.get(name)??await read(name),{filename:name}).runInContext(context,{timeout:5000});
const config={enabled:true,diameter:9.5,toolDiameter:5,holeDiameter:6.8,compensation:'wear',effectiveWear:0,wearConfirmed:true,depth:5.4,safeZ:5,toolChangeZ:200,minResidual:2,tool:8,offset:8,rpm:5000,feed:500,entryFeed:60,radialStep:1,coolant:'M8'};
const geometry={mode:'straight',height:10,width:16.5,length:100,centers:[{x:20,y:0},{x:80,y:0}]};
const plan=context.CncCounterboreCore.plan(config,geometry),iso=context.CncLamaturaV3.emitRadius(plan).join('\n');
assert(iso.includes('G41 D8'));assert(iso.includes('D SOLO USURA ZERO'));assert.equal((iso.match(/G1 G41/g)||[]).length,6);
const compiled=context.CncLamaturaSimulation.compile(iso),ops=context.CncSimulation.parseISO(compiled.text);assert(ops.length>0&&ops.every(o=>Number.isFinite(o.distance)));assert.equal(ops.at(-1).to.z,200);
assert.throws(()=>context.CncCounterboreCore.plan({...config,effectiveWear:.01},geometry));
for(const direction of [1,-1]){const centers=[.2,.6].map(a=>({x:-100+100*Math.cos(direction*a),y:100*Math.sin(direction*a)}));assert.equal(context.CncCounterboreCore.plan(config,{mode:'arc',height:10,width:16.5,edgeType:'radial',radius:100,cx:-100,cy:0,startAngle:0,sweep:.8,direction,centers}).centers.length,2);}
for(const [name,text] of updates)if(name.endsWith('.js'))new Script(text,{filename:name});
for(const [name,text] of updates)await writeFile('dist/'+name,text);
console.log('Correzioni integrate e test build superati. Collaudo browser e CNC ancora necessario.');
