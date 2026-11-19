(function(){
'use strict';
const $=id=>document.getElementById(id);
function inside(x,y,pts){let yes=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[j],b=pts[i];if(((a.y>y)!==(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x))yes=!yes;}return yes;}
function init(){
 const card=$('stockOutputCard');if(!card)return;
 const btn=document.createElement('button');btn.type='button';btn.textContent='SIMULAZIONE 3D GREZZO';btn.style.cssText='background:#ff901a;color:#031627';
 (card.querySelector('.actions')||card).append(btn);
 const container=document.createElement('div');container.hidden=true;
 container.innerHTML='<p class="notice sim-warning"></p><div class="actions"><button type="button" data-do="play">Avvia / Pausa</button><button type="button" data-do="reset">Riavvia</button><button type="button" data-do="top">Vista alto / 3D</button><button type="button" data-do="fit">Inquadra</button><button type="button" data-do="close">Chiudi</button></div><label>Velocità <output class="speed-label">1×</output><input class="sim-speed" type="range" min="0.25" max="32" step="0.25" value="1"></label><label>Posizione <input class="sim-seek" type="range" min="0" max="1" step="0.001" value="0"></label><canvas style="display:block;width:100%;height:440px;background:#031627;touch-action:none"></canvas><pre class="sim-status" style="white-space:pre-wrap"></pre>';
 card.insertBefore(container,$('stOutput'));
 const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d');
 const speed=container.querySelector('.sim-speed'),seek=container.querySelector('.sim-seek'),status=container.querySelector('.sim-status'),warn=container.querySelector('.sim-warning');
 let ops=[],grid=null,project=null,index=0,progress=0,playing=false,last=0,top=false,zoom=1,panX=0,panY=0,snapshot='';
 function buildStock(p){
  const g=p.geometry,f=g.finished,a=g.allowances;
  const x0=-a.xMinus,y0=-a.yMinus,z0=-a.zMinus;
  const x1=(f.width||f.diameter)+a.xPlus,y1=(f.depth||f.diameter)+a.yPlus,z1=(f.height||0)+a.zPlus;
  const w=x1-x0,d=y1-y0,cell=Math.max(0.5,Math.min(w,d)/160);
  const nx=Math.max(1,Math.round(w/cell)),ny=Math.max(1,Math.round(d/cell));
  const h=new Float32Array(nx*ny).fill(z1),voidMask=new Uint8Array(nx*ny);
  if(f.type==='tube'){const cx=(x0+x1)/2,cy=(y0+y1)/2,r=f.innerDiameter/2;for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=x0+(i+0.5)*cell,y=y0+(j+0.5)*cell;if(Math.hypot(x-cx,y-cy)<r)voidMask[j*nx+i]=1;}}
  if(f.type==='custom'&&Array.isArray(f.points)&&f.points.length>2){for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=x0+(i+0.5)*cell,y=y0+(j+0.5)*cell;if(!inside(x,y,f.points))voidMask[j*nx+i]=1;}}
  return {x0,y0,z0,x1,y1,z1,cell,nx,ny,h,voidMask};
 }
 function toolRadius(op){
  const m=/T(\d+)/.exec(op.raw||'');const st=m?Number(m[1]):null;
  const t=project.tools.find(t=>t.station===st);
  return t?t.diameter/2:5;
 }
 function removeAt(x,y,z,r){
  if(!grid)return;
  const {x0,y0,cell,nx,ny,h,voidMask}=grid;
  const i0=Math.max(0,Math.floor((x-r-x0)/cell)),i1=Math.min(nx-1,Math.ceil((x+r-x0)/cell));
  const j0=Math.max(0,Math.floor((y-r-y0)/cell)),j1=Math.min(ny-1,Math.ceil((y+r-y0)/cell));
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
   if(voidMask[j*nx+i])continue;
   const cx=x0+(i+0.5)*cell,cy=y0+(j+0.5)*cell;
   if(Math.hypot(cx-x,cy-y)<=r&&z<h[j*nx+i])h[j*nx+i]=z;
  }
 }
 function projection(p){return top?{x:p.x,y:-p.y}:{x:(p.x-p.y)*0.70710678,y:(p.x+p.y)*0.38-p.z};}
 function screen(p){const a=projection(p);return{x:panX+a.x*zoom,y:panY+a.y*zoom};}
 function resize(){const r=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;canvas.width=Math.max(1,r.width*dpr);canvas.height=Math.max(1,r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
 function fit(){if(!grid)return;const pts=[{x:grid.x0,y:grid.y0,z:grid.z0},{x:grid.x1,y:grid.y1,z:grid.z1}].map(projection);const bounds=pts.reduce((b,p)=>({loX:Math.min(b.loX,p.x),hiX:Math.max(b.hiX,p.x),loY:Math.min(b.loY,p.y),hiY:Math.max(b.hiY,p.y)}),{loX:Infinity,hiX:-Infinity,loY:Infinity,hiY:-Infinity});const w=canvas.clientWidth,h=canvas.clientHeight;zoom=Math.min((w-80)/Math.max(1,bounds.hiX-bounds.loX),(h-100)/Math.max(1,bounds.hiY-bounds.loY));panX=w/2-(bounds.loX+bounds.hiX)/2*zoom;panY=h/2-(bounds.loY+bounds.hiY)/2*zoom;}
 function quad(a,b,c,d,fill){ctx.beginPath();[a,b,c,d].forEach((p,i)=>{const s=screen(p);if(i)ctx.lineTo(s.x,s.y);else ctx.moveTo(s.x,s.y);});ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#0b1f2e';ctx.lineWidth=.4;ctx.stroke();}
 function render(){
  ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);if(!grid||!ops.length)return;
  const op=ops[Math.min(index,ops.length-1)],t=progress;
  const p={x:op.from.x+(op.to.x-op.from.x)*t,y:op.from.y+(op.to.y-op.from.y)*t,z:op.from.z+(op.to.z-op.from.z)*t};
  const {x0,y0,z0,x1,y1,z1,cell,nx,ny,h,voidMask}=grid;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
   if(voidMask[j*nx+i])continue;
   const x=x0+i*cell,y=y0+j*cell,z=h[j*nx+i];
   const shade=Math.max(0,Math.min(255,Math.round(40+180*((z-z0)/Math.max(0.001,z1-z0)))));
   quad({x,y,z},{x:x+cell,y,z},{x:x+cell,y:y+cell,z},{x,y:y+cell,z},`rgb(${shade},${Math.round(shade*.8)},${Math.round(shade*.5)})`);
  }
  ctx.beginPath();[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].forEach((pt,i)=>{const s=screen({x:pt[0],y:pt[1],z:z1});if(i)ctx.lineTo(s.x,s.y);else ctx.moveTo(s.x,s.y);});ctx.closePath();ctx.strokeStyle='#65dce9';ctx.lineWidth=1.5;ctx.stroke();
  if(window.CncVisual)CncVisual.drawTool(ctx,p,op.tool,projection,zoom,performance.now()/1000);
  else{const a=screen(p);ctx.fillStyle='#ff901a';ctx.fillRect(a.x-7,a.y-46,14,46);}
  status.textContent=op.toolName+' · Riga '+op.line+' · Movimento '+(index+1)+'/'+ops.length+'\nX '+p.x.toFixed(3)+'  Y '+p.y.toFixed(3)+'  Z '+p.z.toFixed(3)+'\n'+op.raw+(op.pause?'\nM00: premere Avvia per proseguire.':'');
  seek.value=String((index+progress)/ops.length);
 }
 function loop(now){
  const dt=last?Math.min(0.1,(now-last)/1000):0;last=now;
  if(!container.hidden&&playing&&ops.length){
   const op=ops[index];
   if(op.pause){playing=false;}
   else{
    if(['mill','chamfer','drill'].includes(op.tool)&&op.type==='feed'){
     const r=toolRadius(op);
     const steps=Math.max(1,Math.ceil(op.distance/(r||1)/2));
     for(let s=0;s<=steps;s++){
      const tt=s/steps;
      const x=op.from.x+(op.to.x-op.from.x)*tt,y=op.from.y+(op.to.y-op.from.y)*tt,z=op.from.z+(op.to.z-op.from.z)*tt;
      removeAt(x,y,z,r);
     }
    }
    if(op.holeEnd&&op.tool==='drill')removeAt(op.to.x,op.to.y,op.to.z,toolRadius(op));
    progress+=dt*Number(speed.value)/Math.max(0.04,op.dwell||Math.min(1,Math.max(0.12,op.distance/200)));
    while(progress>=1&&playing){if(index===ops.length-1){progress=1;playing=false;break;}progress-=1;index++;if(ops[index].pause){progress=0;playing=false;}}
   }
  }
  if(!container.hidden)render();
  requestAnimationFrame(loop);
 }
 btn.onclick=()=>{
  try{
   const text=$('stOutput').value;project=window.__stockProject;
   if(!project)throw Error('Genera prima il programma ISO.');
   const clean=text.split(/\r?\n/).filter(l=>!/P9814/.test(l)).join('\n');
   ops=window.CncSimulation.parseISO(clean);
   if(!ops.length)throw Error('Nessun movimento ISO');
   grid=buildStock(project);snapshot=text;index=0;progress=0;playing=true;
   warn.textContent='Simulazione candidate: grezzo non-box approssimato come bounding box; rimozione altezza 2.5D; non verifica collisioni, correttori o misure reali.';
   container.hidden=false;$('stOutput').hidden=true;resize();fit();render();
  }catch(error){playing=false;alert(error.message);}
 };
 container.addEventListener('click',e=>{const a=e.target.dataset.do;if(a==='close'){playing=false;container.hidden=true;$('stOutput').hidden=false;}if(a==='play'){if(ops[index]?.pause&&index<ops.length-1){index++;progress=0;}playing=!playing;}if(a==='reset'){index=0;progress=0;playing=false;grid=buildStock(project);fit();}if(a==='top'){top=!top;fit();}if(a==='fit')fit();render();});
 speed.oninput=()=>container.querySelector('.speed-label').textContent=speed.value+'×';
 seek.oninput=()=>{playing=false;const p=Number(seek.value)*ops.length;index=Math.min(ops.length-1,Math.floor(p));progress=index===ops.length-1&&Number(seek.value)===1?1:p-index;render();};
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(0.0001,Math.min(200,zoom*Math.exp(-e.deltaY*0.001)));},{passive:false});
 let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;panX+=e.clientX-drag.x;panY+=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointerup',()=>drag=null);
 window.addEventListener('resize',()=>{if(!container.hidden){resize();fit();}});
 if(window.CncVisual)CncVisual.attachRecording({container,canvas,restart:()=>{index=0;progress=0;playing=true;},finished:()=>index>=ops.length-1&&progress>=1});
 requestAnimationFrame(loop);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();