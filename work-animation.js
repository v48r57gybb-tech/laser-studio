(function(){
'use strict';
const SCENE_MS=4000;
const SCENES=['probe','mill','drill','chamfer','tap'];
function init(){
 const canvas=document.getElementById('workAnimation');
 if(!canvas)return;
 const ctx=canvas.getContext('2d');
 const W=canvas.width,H=canvas.height;
 function base(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#031627';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#123c54';ctx.lineWidth=1;
  for(let x=40;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=40;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.fillStyle='#123c54';ctx.strokeStyle='#7194aa';ctx.lineWidth=3;
  ctx.beginPath();ctx.rect(120,160,660,60);ctx.fill();ctx.stroke();
 }
 function title(t){ctx.fillStyle='#eaf4fc';ctx.font='700 22px system-ui';ctx.textAlign='center';ctx.fillText(t,W/2,42);}
 function probe(p){
  base();title('Tastatura iniziale · Sonda');
  const y=160-60*Math.sin(Math.PI*p);
  ctx.strokeStyle='#00dce9';ctx.lineWidth=6;
  ctx.beginPath();ctx.moveTo(450,60);ctx.lineTo(450,y);ctx.stroke();
  ctx.fillStyle='#00dce9';ctx.beginPath();ctx.arc(450,y,12,0,Math.PI*2);ctx.fill();
  if(p>.45&&p<.6){ctx.strokeStyle='#54d98c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(450,y+12,20,0,Math.PI*2);ctx.stroke();}
 }
 function mill(p){
  base();title('Fresatura rifili');
  const x=160+580*p;
  ctx.fillStyle='#ff901a';ctx.beginPath();ctx.arc(x,130,26,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#031a2c';ctx.lineWidth=4;
  for(let i=0;i<4;i++){const a=performance.now()/90+i*Math.PI/2;ctx.beginPath();ctx.moveTo(x,130);ctx.lineTo(x+18*Math.cos(a),130+18*Math.sin(a));ctx.stroke();}
 }
 function drill(p){
  base();title('Foratura');
  const y=80+70*p;
  ctx.fillStyle='#ff901a';ctx.beginPath();ctx.moveTo(450,y-40);ctx.lineTo(432,y);ctx.lineTo(468,y);ctx.closePath();ctx.fill();
  ctx.fillStyle='#7194aa';ctx.fillRect(438,y-70,24,32);
 }
 function chamfer(p){
  base();title('Svasatura');
  const y=90+55*p;
  ctx.fillStyle='#ff901a';ctx.beginPath();ctx.moveTo(425,y);ctx.lineTo(475,y);ctx.lineTo(450,y+38);ctx.closePath();ctx.fill();
  ctx.fillStyle='#7194aa';ctx.fillRect(438,y-45,24,45);
 }
 function tap(p){
  base();title('Maschiatura');
  const y=85+60*p;
  ctx.fillStyle='#00dce9';ctx.fillRect(436,y-60,28,60);
  ctx.strokeStyle='#031a2c';ctx.lineWidth=3;
  for(let i=0;i<5;i++){const yy=y-52+i*12;ctx.beginPath();ctx.moveTo(436,yy);ctx.lineTo(464,yy+6);ctx.stroke();}
 }
 const drawers={probe,mill,drill,chamfer,tap};
 function frame(now){
  const total=SCENES.length*SCENE_MS;
  const t=now%total;
  const scene=SCENES[Math.floor(t/SCENE_MS)];
  const p=(t%SCENE_MS)/SCENE_MS;
  drawers[scene](p);
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
