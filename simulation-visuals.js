(function(root){
'use strict';
function drawTool(ctx,p,kind,project,zoom,time){
 const scale=Math.max(1,0.85/Math.max(zoom,0.0001)),rings=[],faces=[];
 const add=(z,r)=>rings.push([z,r]);
 if(kind==='probe'){add(5,1.3);add(22,1.3);add(22,6);add(38,6);}
 else if(kind==='chamfer'){add(0,0.2);add(13,11);add(14,4);add(38,4);}
 else if(kind==='drill'){add(0,0.2);add(5,5);add(38,5);}
 else{add(0,5);add(38,5);}
 add(38,8);add(44,9);add(44,17);add(49,17);add(49,13);add(78,6);add(82,6);
 const point=(z,r,a)=>({x:p.x+r*scale*Math.cos(a),y:p.y+r*scale*Math.sin(a),z:p.z+z*scale});
 for(let j=1;j<rings.length;j++)for(let i=0;i<24;i++){
  const a=i*Math.PI/12,b=(i+1)*Math.PI/12,lo=rings[j-1],hi=rings[j],v=[point(...lo,a),point(...lo,b),point(...hi,b),point(...hi,a)];
  const shade=Math.round(105+95*(0.5+0.5*Math.cos(a-0.8)));
  faces.push({v,depth:v.reduce((s,p)=>s+p.x+p.y+p.z*0.3,0),shade,j});
 }
 faces.sort((a,b)=>a.depth-b.depth);
 ctx.save();for(const f of faces){ctx.beginPath();f.v.forEach((v,i)=>{const s=project(v);if(i)ctx.lineTo(s.x,s.y);else ctx.moveTo(s.x,s.y);});ctx.closePath();ctx.fillStyle=f.j<3&&kind!=='probe'?`rgb(${f.shade},${Math.round(f.shade*.83)},${Math.round(f.shade*.4)})`:`rgb(${f.shade},${Math.min(255,f.shade+12)},${Math.min(255,f.shade+22)})`;ctx.fill();ctx.strokeStyle='#152536';ctx.lineWidth=.35;ctx.stroke();}
 if(kind==='drill'||kind==='tap'||kind==='mill'){
  ctx.strokeStyle='#142735';ctx.lineWidth=kind==='tap'?1:2;
  for(let h=0;h<2;h++){ctx.beginPath();for(let j=0;j<=100;j++){const z=3+j*.33,a=h*Math.PI+z*(kind==='tap'?1.8:.22)+time,r=5.1,s=project(point(z,r,a));if(j)ctx.lineTo(s.x,s.y);else ctx.moveTo(s.x,s.y);}ctx.stroke();}
 }
 if(kind==='probe'){const s=project(p),r=Math.max(4,3*scale*zoom),g=ctx.createRadialGradient(s.x-r*.3,s.y-r*.4,0,s.x,s.y,r);g.addColorStop(0,'#ffccd2');g.addColorStop(.4,'#ed3759');g.addColorStop(1,'#730c25');ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,r,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
function attachRecording({container,canvas,restart,finished}){
 const button=document.createElement('button'),message=document.createElement('p'),link=document.createElement('a');
 button.type='button';button.textContent='Salva simulazione';link.hidden=true;link.textContent='Scarica video della simulazione';message.setAttribute('role','status');
 container.querySelector('.actions').append(button);container.append(message,link);
 let recorder=null,stream=null,url=null,timer=null,timeout=null,size=0,chunks=[];
 const stop=()=>{if(recorder?.state==='recording')recorder.stop();};
 function cleanup(){clearInterval(timer);clearTimeout(timeout);stream?.getTracks().forEach(t=>t.stop());button.textContent='Salva simulazione';}
 button.onclick=()=>{
  if(recorder?.state==='recording'){stop();return;}
  if(!canvas.captureStream||!root.MediaRecorder){message.textContent='Registrazione video non supportata da questo browser.';return;}
  try{
   const mime=['video/mp4','video/webm;codecs=vp8','video/webm'].find(t=>root.MediaRecorder.isTypeSupported(t));
   if(!mime){message.textContent='Nessun formato video registrabile disponibile.';return;}
   if(url){URL.revokeObjectURL(url);url=null;}link.hidden=true;chunks=[];size=0;
   stream=canvas.captureStream(25);recorder=new root.MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4000000});
   recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);size+=e.data.size;if(size>150000000)stop();}};
   recorder.onerror=()=>{cleanup();message.textContent='Errore durante la registrazione video.';};
   recorder.onstop=()=>{const type=recorder.mimeType;cleanup();if(!size){message.textContent='Registrazione vuota: nessun video salvato.';return;}url=URL.createObjectURL(new Blob(chunks,{type}));link.href=url;link.download='simulazione-cnc.'+(type.includes('mp4')?'mp4':'webm');link.hidden=false;message.textContent='Video pronto. Usa Scarica video della simulazione. Registrazione del canvas, senza audio; durata massima 5 minuti.';chunks=[];};
   recorder.start(1000);restart();button.textContent='Termina registrazione';message.textContent='Registrazione dal principio in corso, alla velocità selezionata. Non chiudere la pagina.';
   timer=setInterval(()=>{if(container.hidden||finished())stop();},200);timeout=setTimeout(stop,300000);
  }catch(error){cleanup();message.textContent='Impossibile registrare: '+error.message;}
 };
 root.addEventListener('pagehide',()=>{stop();cleanup();if(url)URL.revokeObjectURL(url);});
}
root.CncVisual={drawTool,attachRecording};
})(globalThis);
