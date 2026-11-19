(function(root){
'use strict';
function compile(text){
 let active=false,R=0,comp=false,pos={x:0,y:0,z:50},actual={...pos},motion=0;const lines=[],map=[];
 const fmt=n=>Number(n.toFixed(5)).toString();
 for(const [index,raw] of text.split(/\r?\n/).entries()){
  const begin=raw.match(/CB-BEGIN R([\d.]+)/);if(begin){active=true;R=Number(begin[1]);comp=false;pos={x:0,y:0,z:50};actual={...pos};}
  if(!active){lines.push(raw);map.push({raw,line:index+1});continue;}
  if(raw.includes('CB-END')){active=false;lines.push(raw);map.push({raw,line:index+1});continue;}
  const code=raw.replace(/\([^)]*\)/g,''),w={};for(const m of code.matchAll(/([XYZIJF])\s*([+\-]?(?:\d+(?:\.\d*)?|\.\d+))/g))w[m[1]]=Number(m[2]);const gs=[...code.matchAll(/G(\d+)/g)].map(m=>Number(m[1]));for(const g of gs)if([0,1,2,3].includes(g))motion=g;
  const hasXY=('X'in w)||('Y'in w);if(!hasXY&&!('Z'in w)){lines.push(raw);map.push({raw,line:index+1,counterbore:true,diameter:2*R});continue;}
  const end={x:w.X??pos.x,y:w.Y??pos.y,z:w.Z??pos.z};
  const push=(p,rapid)=>{lines.push((rapid?'G0':'G1')+' X'+fmt(p.x)+' Y'+fmt(p.y)+' Z'+fmt(p.z)+('F'in w?' F'+w.F:''));map.push({raw,line:index+1,counterbore:true,diameter:2*R});actual={...p};};
  if(gs.includes(40)){comp=false;push(end,false);}
  else if(motion===2||motion===3){
   const cx=pos.x+(w.I||0),cy=pos.y+(w.J||0),radius=Math.hypot(pos.x-cx,pos.y-cy),rr=radius-(comp?R:0);if(!(rr>0))throw Error('Raggio compensato non positivo');const start=Math.atan2(pos.y-cy,pos.x-cx);let delta=Math.atan2(end.y-cy,end.x-cx)-start;if(motion===3&&delta<=0)delta+=2*Math.PI;if(motion===2&&delta>=0)delta-=2*Math.PI;const n=Math.max(8,Math.ceil(Math.abs(delta)*rr/.25));for(let i=1;i<=n;i++){const t=i/n;push({x:cx+rr*Math.cos(start+delta*t),y:cy+rr*Math.sin(start+delta*t),z:pos.z+(end.z-pos.z)*t},false);}
  }else{
   if(gs.includes(41))comp=true;
   let p={...end};if(comp&&hasXY){const dx=end.x-pos.x,dy=end.y-pos.y,l=Math.hypot(dx,dy);if(l>0){p.x-=R*dy/l;p.y+=R*dx/l;}}else if(comp){p.x=actual.x;p.y=actual.y;}
   push(p,motion===0);
  }pos=end;if(lines.length>180000)throw Error('Programma troppo lungo per la simulazione');
 }
 return {text:lines.join('\n'),map};
}
root.CncLamaturaSimulation={compile};if(typeof document==='undefined')return;
const $=id=>document.getElementById(id);
function init(){
 const legacy=root.CncSimulation;if(!legacy)return;
 function parse(text){const c=compile(text),ops=legacy.parseISO(c.text);let diameter=5;for(const o of ops){const m=c.map[o.line-1];if(m){const d=m.raw.match(/(?:FRESA[^)]*?\bD|PUNTA D)([\d.]+)/);if(d)diameter=Number(d[1]);o.line=m.line;o.raw=m.raw;if(m.counterbore){o.tool='counterbore';o.toolName='FRESA LAMATURA';o.diameter=m.diameter;}else o.diameter=diameter;}}return ops;}
 root.CncSimulation={...legacy,parseISO:parse};
 for(const mode of ['straight','arc']){
  const card=$(mode==='arc'?'arcOutputCard':'straightOutput'),out=$(mode==='arc'?'arcOutput':'output');if(!card||!out)continue;
  card.querySelectorAll('.sim-container,.cb-sim,.btn-sim-start,.btn-cb-sim').forEach(el=>el.remove());
  const btn=document.createElement('button');btn.type='button';btn.textContent='SIMULAZIONE 3D';card.querySelector('.actions').append(btn);
  const box=document.createElement('div');box.className='sim-container';box.hidden=true;box.innerHTML='<p class="notice">Simulazione nominale con D pari al raggio utensile selezionato. Non verifica correttori reali, collisioni o staffaggi. Asportazione su griglia approssimata.</p><div class="actions"><button type="button" data-act="play">Avvia / Pausa</button><button type="button" data-act="reset">Riavvia</button><button type="button" data-act="step">Blocco successivo</button><button type="button" data-act="top">Alto / 3D</button><button type="button" data-act="fit">Inquadra tutto</button><button type="button" data-act="record">Registra video</button><button type="button" data-act="close">Chiudi</button></div><label>Velocità<input class="speed" type="range" min="0.25" max="32" step="0.25" value="4"></label><label>Posizione programma<input class="seek" type="range" min="0" max="1" step="0.001" value="0"></label><canvas style="width:100%;height:440px;display:block;touch-action:none"></canvas><pre class="sim-status" style="white-space:pre-wrap"></pre>';card.insertBefore(box,out);
  const canvas=box.querySelector('canvas'),ctx=canvas.getContext('2d'),speed=box.querySelector('.speed'),seek=box.querySelector('.seek'),status=box.querySelector('.sim-status');
  let ops=[],stock,poly=[],grid=[],index=0,t=0,playing=false,last=0,top=false,zoom=1,px=0,py=0,snapshot='',rec=null,stream=null,pauseSeen=false;
  const color={mill:'#ff901a',drill:'#ffd13b',chamfer:'#d946ef',tap:'#10b981',probe:'#ff4d6d',counterbore:'#00dce9'};
  const projection=p=>top?{x:p.x,y:-p.y}:{x:(p.x-p.y)*.70710678,y:(p.x+p.y)*.38-p.z};
  const screen=p=>{const q=projection(p);return{x:px+q.x*zoom,y:py+q.y*zoom};};
  function resize(){const d=window.devicePixelRatio||1;canvas.width=Math.max(1,Math.round(canvas.clientWidth*d));canvas.height=440*d;ctx.setTransform(d,0,0,d,0,0);}
  function fit(){const pts=poly.concat(ops.flatMap(o=>[o.from,o.to])).map(projection);const b=pts.reduce((b,p)=>({loX:Math.min(b.loX,p.x),hiX:Math.max(b.hiX,p.x),loY:Math.min(b.loY,p.y),hiY:Math.max(b.hiY,p.y)}),{loX:Infinity,hiX:-Infinity,loY:Infinity,hiY:-Infinity});const {loX,hiX,loY,hiY}=b;zoom=Math.min((canvas.clientWidth-40)/Math.max(1,hiX-loX),400/Math.max(1,hiY-loY));px=canvas.clientWidth/2-(loX+hiX)*zoom/2;py=220-(loY+hiY)*zoom/2;}
  function inside(x,y){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
  function build(){const a=stock.points.map(p=>({x:p.x+p.nx*stock.width/2,y:p.y+p.ny*stock.width/2,z:0})),b=stock.points.map(p=>({x:p.x-p.nx*stock.width/2,y:p.y-p.ny*stock.width/2,z:0}));poly=a.concat(b.reverse());const xs=poly.map(p=>p.x),ys=poly.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY,dx=Math.max(w/180,.2),dy=Math.max(h/100,.2);grid=[];for(let y=minY+dy/2;y<minY+h;y+=dy)for(let x=minX+dx/2;x<minX+w;x+=dx)if(inside(x,y))grid.push({x,y,z:0,dx,dy});grid.sort((a,b)=>(a.x+a.y)-(b.x+b.y));}
  const lerp=(o,u)=>({x:o.from.x+(o.to.x-o.from.x)*u,y:o.from.y+(o.to.y-o.from.y)*u,z:o.from.z+(o.to.z-o.from.z)*u});
  function remove(o,u,v){if(o.type==='rapid'||['probe','tap'].includes(o.tool))return;const r=(o.diameter||5)/2,n=Math.max(1,Math.ceil(o.distance*(v-u)/Math.max(.1,r/2)));for(let k=0;k<=n;k++){const p=lerp(o,u+(v-u)*k/n);if(p.z>=0)continue;for(const c of grid)if(Math.hypot(c.x-p.x,c.y-p.y)<=r)c.z=Math.max(-stock.height,Math.min(c.z,p.z));}}
  function path(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>{const q=screen(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function draw(){ctx.fillStyle='#031627';ctx.fillRect(0,0,canvas.clientWidth,440);if(!ops.length)return;if(!top){path(poly.map(p=>({...p,z:-stock.height})),'#092337','#548aa3');path(poly,null,'#65dce9');}for(const c of grid){path([{x:c.x-c.dx/2,y:c.y-c.dy/2,z:c.z},{x:c.x+c.dx/2,y:c.y-c.dy/2,z:c.z},{x:c.x+c.dx/2,y:c.y+c.dy/2,z:c.z},{x:c.x-c.dx/2,y:c.y+c.dy/2,z:c.z}],c.z<=-stock.height?'#020812':c.z<0?'#14745b':'#16435c');}const o=ops[Math.min(index,ops.length-1)],p=lerp(o,t);for(let j=Math.max(0,index-50);j<index;j++)path([ops[j].from,ops[j].to],null,ops[j].type==='rapid'?'#52758b':color[ops[j].tool]);path([o.from,p],null,color[o.tool]);const q=screen(p);ctx.fillStyle=color[o.tool]||'#fff';ctx.fillRect(q.x-5,q.y-35,10,35);ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(q.x,q.y,Math.max(2,(o.diameter||5)/2*zoom),0,Math.PI*2);ctx.stroke();status.textContent=o.toolName+' · Riga '+o.line+'\nX '+p.x.toFixed(3)+' Y '+p.y.toFixed(3)+' Z '+p.z.toFixed(3)+'\n'+o.raw;seek.value=String((index+t)/ops.length);}
  function stop(){if(rec&&rec.state!=='inactive')rec.stop();}
  function start(){snapshot=out.value;ops=parse(snapshot);if(!ops.length)throw Error('Nessun movimento');stock=legacy.stockGeometry(compile(snapshot).text,mode);index=0;t=0;pauseSeen=false;box.hidden=false;out.hidden=true;build();resize();fit();draw();}
  function advance(dt){let remaining=dt;while(remaining>0&&index<ops.length){const o=ops[index];if(o.pause&&!pauseSeen){if(rec&&rec.state==='recording'){pauseSeen=true;}else{playing=false;break;}}const duration=o.dwell||Math.max(.005,o.distance/(o.type==='rapid'?500:Math.max(1,o.feed)/60)),step=Math.min(1-t,remaining/duration),old=t;t+=step;remove(o,old,t);remaining-=step*duration;if(t>=1-1e-9){if(index===ops.length-1){t=1;playing=false;setTimeout(stop,150);break;}index++;t=0;pauseSeen=false;}}}
  btn.onclick=()=>{try{if(rec&&rec.state!=='inactive')return;start();playing=true;}catch(e){alert(e.message);}};
  box.onclick=e=>{const a=e.target.dataset.act;if(!a)return;try{if(a==='close'){playing=false;stop();box.hidden=true;out.hidden=false;}if(a==='play'){pauseSeen=true;playing=!playing;}if(a==='reset'){if(rec&&rec.state!=='inactive')return;start();playing=false;}if(a==='top'){top=!top;fit();}if(a==='fit')fit();if(a==='step'){playing=false;const line=ops[index].line;do{remove(ops[index],t,1);t=0;if(index===ops.length-1){t=1;break;}index++;}while(ops[index].line===line);}if(a==='record'){if(rec&&rec.state!=='inactive')return;if(!root.MediaRecorder||!canvas.captureStream)throw Error('Video non supportato');const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(v=>MediaRecorder.isTypeSupported(v));if(!mime)throw Error('WebM non supportato');start();stream=canvas.captureStream(30);const chunks=[];rec=new MediaRecorder(stream,{mimeType:mime});rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const url=URL.createObjectURL(new Blob(chunks,{type:mime})),link=document.createElement('a');link.href=url;link.download='simulazione-completa-'+mode+'.webm';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};rec.start();playing=true;}draw();}catch(err){playing=false;stop();stream?.getTracks().forEach(t=>t.stop());alert(err.message);}};
  seek.oninput=()=>{if(!ops.length)return;playing=false;grid.forEach(c=>c.z=0);const n=Number(seek.value)*ops.length;index=Math.min(ops.length-1,Math.floor(n));t=n>=ops.length?1:n-index;for(let i=0;i<index;i++)remove(ops[i],0,1);remove(ops[index],0,t);draw();};
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom*=Math.exp(-e.deltaY*.001);zoom=Math.max(.0001,Math.min(500,zoom));draw();},{passive:false});let drag=null;canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!drag)return;px+=e.clientX-drag.x;py+=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};draw();};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
  function loop(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;btn.disabled=!out.value.trim();if(!box.hidden){if(out.value!==snapshot){playing=false;stop();box.hidden=true;out.hidden=false;}else{if(playing)advance(dt*Number(speed.value));draw();}}requestAnimationFrame(loop);}requestAnimationFrame(loop);window.addEventListener('resize',()=>{if(!box.hidden){resize();fit();draw();}});
 }
 if(!document.querySelector('script[data-six-scenes]')){const script=document.createElement('script');script.src=new URL('work-animation.js',document.baseURI).href;script.dataset.sixScenes='true';document.head.append(script);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(globalThis);
