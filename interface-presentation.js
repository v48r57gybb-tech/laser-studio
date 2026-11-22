(function(){
'use strict';
function init(){
 const mode=document.getElementById('partType'),figure=document.querySelector('header .cnc-demo'),copy=document.querySelector('header .hero-copy');
 if(!mode||!figure||!copy||figure.dataset.presentationReady)return;
 figure.dataset.presentationReady='true';
 for(const p of copy.querySelectorAll('p'))if(p.textContent.trim()==='Rifili · Forature · Svasature · Maschiature · Tastatura')p.remove();
 const card=mode.closest('section'),heading=card?.querySelector('h2'),label=document.querySelector('label[for="partType"]');
 if(heading)heading.textContent='Modalità di lavorazione';if(label)label.textContent='Scegli il generatore da utilizzare';
 const description=card?.querySelector('p.muted'),svg=figure.querySelector('svg');
 const operations=document.createElement('figcaption');operations.className='hero-operation-list';operations.textContent='Tastatura · Rifili · Forature · Svasature · Maschiature · Lamature';figure.append(operations);
 if(svg){const mill=svg.querySelector('.scene-mill text');if(mill)mill.textContent='Rifili';}
 const warnings=document.createElement('details'),summary=document.createElement('summary');warnings.id='machiningWarnings';summary.textContent='Avvertenze';warnings.append(summary);
 const notes=['stockNominalProgrammingPolicy','stockNominalNotice'].map(id=>document.getElementById(id)).filter(Boolean);
 for(const note of notes)warnings.append(note);
 if(notes.length&&card)card.append(warnings);
 const style=document.createElement('style');style.textContent='#machiningWarnings{margin-top:14px}#machiningWarnings>summary{display:list-item;width:fit-content;cursor:pointer;color:#ff969f;border:1px solid #98515e;border-radius:8px;padding:7px 12px;font-size:14px;font-weight:600;background:#351e2b}#machiningWarnings>summary:focus-visible{outline:3px solid #ff901a;outline-offset:3px}#machiningWarnings .notice{font-size:14px;margin:10px 0 0}header .hero-operation-list{font-size:12px;line-height:1.55;color:#bdd0de;text-align:center;margin:8px 0 0}header .hero-stock-scene{display:block;width:100%;height:auto;border:1px solid #376078;border-radius:18px}';document.head.append(style);
 const canvas=document.createElement('canvas');canvas.width=520;canvas.height=460;canvas.className='hero-stock-scene';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Animazione dimostrativa della lavorazione da grezzo');figure.append(canvas);
 const ctx=canvas.getContext('2d'),names=['Spianatura','Contornatura','Smussatura','Foratura','Svasatura','Maschiatura','Tasche','Pezzo finito'];
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let raf=0,start=0,inView=true,lastScene=-1;
 const clamp=v=>Math.max(0,Math.min(1,v));
 const iso=(x,y,z)=>[130+.77*x-.52*y,158+.25*x+.32*y-.76*z];
 function path(points,close=true){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));if(close)ctx.closePath();}
 function polygon(points,fill,stroke){path(points);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.8;ctx.stroke();}}
 function ellipse(x,y,z,rx,ry,fill,stroke){const p=iso(x,y,z);ctx.beginPath();ctx.ellipse(...p,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
 function outline(a,b,z){return [[-a+7,-b], [a-7,-b],[a,-b+7],[a,b-7],[a-7,b],[-a+7,b],[-a,b-7],[-a,-b+7]].map(([x,y])=>iso(x,y,z));}
 function trace(points,fraction,color){const all=[...points,points[0]],lengths=all.slice(1).map((p,i)=>Math.hypot(p[0]-all[i][0],p[1]-all[i][1]));let left=lengths.reduce((a,b)=>a+b,0)*clamp(fraction);ctx.beginPath();ctx.moveTo(...all[0]);for(let i=0;i<lengths.length&&left>0;i++){const q=Math.min(1,left/lengths[i]);ctx.lineTo(all[i][0]+(all[i+1][0]-all[i][0])*q,all[i][1]+(all[i+1][1]-all[i][1])*q);left-=lengths[i];}ctx.lineWidth=1.6;ctx.strokeStyle=color;ctx.stroke();}
 function tool(x,y,z,kind,p,time){const [px,py]=iso(x,y,z),g=ctx.createLinearGradient(px-14,0,px+14,0);g.addColorStop(0,'#587185');g.addColorStop(.45,'#f0f6fa');g.addColorStop(1,'#668399');ctx.fillStyle=g;ctx.fillRect(px-13,py-78,26,24);polygon([[px-13,py-54],[px+13,py-54],[px+6,py-45],[px-6,py-45]],g);ctx.fillRect(px-4,py-45,8,23);
 const color=kind===5?'#54d98c':kind===2||kind===4?'#e6a9e9':'#65e9f2';ctx.fillStyle=g;
 if(kind===0){ctx.fillRect(px-22,py-20,44,15);ctx.beginPath();ctx.ellipse(px,py-5,22,5,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=color;ctx.stroke();}
 else if(kind===2||kind===4){polygon([[px-11,py-22],[px+11,py-22],[px,py]],g,color);}
 else if(kind===3){polygon([[px-4,py-23],[px+4,py-23],[px+4,py-5],[px,py],[px-4,py-5]],g);}
 else{ctx.fillRect(px-5,py-23,10,23);}
 ctx.strokeStyle=color;ctx.lineWidth=1;const shift=(time/160*(kind===5&&p>.5?-1:1))%5;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(px-4,py-21+i*5+shift);ctx.lineTo(px+4,py-18+i*5+shift);ctx.stroke();}
 }
 function draw(time,still=false){if(!ctx)return;const elapsed=still?32:((time-start)/1000)%34,scene=Math.min(7,Math.floor(elapsed/4.5)),p=scene===7?1:(elapsed%4.5)/4.5,q=clamp((p-.15)/.7);
 ctx.setTransform(2,0,0,2,0,0);ctx.globalAlpha=1;ctx.fillStyle='#031627';ctx.fillRect(0,0,260,230);ctx.globalAlpha=elapsed>33?34-elapsed:1;
 const z=scene===0?34-4*q:30,a=scene===0?75:scene===1?75-10*q:65,b=scene<1?45:scene===1?45-7*q:38;
 const steel=ctx.createLinearGradient(50,100,210,170);steel.addColorStop(0,'#698495');steel.addColorStop(.5,'#dce7ee');steel.addColorStop(1,'#7c9bab');
 polygon([[20,188],[240,188],[240,193],[20,193]],'#376078');
 polygon([iso(-a,b,0),iso(a,b,0),iso(a,b,z),iso(-a,b,z)],'#59778c','#8da6b7');polygon([iso(a,-b,0),iso(a,b,0),iso(a,b,z),iso(a,-b,z)],'#37586f','#7f9cae');polygon(outline(a,b,z),steel,'#a7c0ce');
 {ctx.strokeStyle='#aac6d2';ctx.lineWidth=.45;for(let k=-30;k<=30;k+=10){path([iso(-a+8,k,z),iso(a-8,k,z)],false);ctx.stroke();}}
 if(scene===1)trace(outline(a,b,z+.2),q,'#65f3ff');if(scene>=2)trace(outline(a-1,b-1,z+.4),scene===2?q:1,'#f5f8ff');
 const holes=[[-36,-14],[0,-14],[36,-14]],count=scene<3?0:scene===3?Math.min(3,Math.floor(q*3)+1):3;
 holes.slice(0,count).forEach(([x,y],i)=>{ellipse(x,y,z,5,2.7,'#031627','#7898aa');if(scene>=4&&i===0){ellipse(x,y,z,8.5,4.4,'#829dad','#d5a4e0');ellipse(x,y,z+.2,4.5,2.3,'#031627');}if(scene>=5&&i===1){ellipse(x,y,z,6,3,'#031627','#54d98c');const [hx,hy]=iso(x,y,z);ctx.strokeStyle='#54d98c';for(let n=0;n<3;n++){path([[hx-3,hy+n],[hx+3,hy+n+1]],false);ctx.stroke();}}});
 if(scene>=6){const f=scene===6?Math.max(.12,q):1,l=-21,r=l+42*f,top=[iso(l,10,z),iso(r,10,z),iso(r,29,z),iso(l,29,z)];polygon(top,'#203e53','#b9d2de');polygon([iso(l+2,12,z-7),iso(r-2,12,z-7),iso(r-2,27,z-7),iso(l+2,27,z-7)],'#66899d');}
 if(scene<7){let x=0,y=0;if(scene===0){const row=Math.min(3,Math.floor(q*4)),u=(q*4)%1;x=row%2?55-110*u:-55+110*u;y=-27+row*18;}if(scene===1||scene===2){const u=q*4,k=Math.min(3,Math.floor(u)),v=u-k;[x,y]=k===0?[-65+130*v,-38]:k===1?[65,-38+76*v]:k===2?[65-130*v,38]:[-65,38-76*v];}if(scene===3)[x,y]=holes[Math.min(2,Math.floor(q*3))];if(scene===4)[x,y]=holes[0];if(scene===5)[x,y]=holes[1];if(scene===6){x=-18+36*q;y=19+7*Math.sin(q*Math.PI*6);}const lift=p<.15?20*(1-p/.15):p>.85?20*(p-.85)/.15:0;tool(x,y,z+lift+3,scene,p,time);}
 ctx.globalAlpha=1;ctx.textAlign='center';ctx.font='15px system-ui';ctx.fillStyle='#8cebf4';ctx.fillText(names[scene],130,214);if(lastScene!==scene){canvas.setAttribute('aria-label','Animazione dimostrativa grezzo: '+names[scene]);lastScene=scene;}
 }
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0;}
 function tick(time){raf=0;if(mode.value!=='stock'||document.hidden||!inView)return;draw(time,reduced.matches);if(!reduced.matches)raf=requestAnimationFrame(tick);}
 function resume(){stop();if(mode.value==='stock'&&!document.hidden&&inView)raf=requestAnimationFrame(tick);}
 function sync(){const stock=mode.value==='stock';svg?.toggleAttribute('hidden',stock);canvas.hidden=!stock;operations.hidden=stock;warnings.hidden=!stock;notes.forEach(note=>note.hidden=!stock);if(description)description.textContent=stock?'Parti da un grezzo e configura le operazioni per ottenere il pezzo finito.':mode.value==='arc'?'Configura il pezzo curvo ad arco e le lavorazioni dedicate.':'Configura il pezzo dritto e le lavorazioni dedicate.';start=performance.now();resume();}
 mode.addEventListener('change',sync);document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);window.addEventListener('pagehide',stop);
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;resume();}).observe(figure);
 sync();
}
document.addEventListener('DOMContentLoaded',init,{once:true});
})();
