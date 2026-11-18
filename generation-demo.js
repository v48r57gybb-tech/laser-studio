(function(root){
'use strict';
const DURATION=5000;
function progress(elapsed){return Math.min(100,Math.max(0,Math.floor(elapsed/DURATION*100)));}
function frames(iso){const positions={X:'—',Y:'—',Z:'—'};return iso.split(/\r?\n/).map((line,i)=>{if(!line.trim().startsWith('('))for(const m of line.matchAll(/(?:^|\s)([XYZ])(-?\d+(?:\.\d*)?)/g))positions[m[1]]=m[2];return {...positions,block:i+1};});}
function createGate({now,request,cancel}){let id=null,version=0,running=false;function stop(){version++;if(id!==null)cancel(id);id=null;running=false;}return {get running(){return running;},stop,start(update,done){stop();running=true;const v=version,start=now();function tick(){if(v!==version)return;const elapsed=now()-start;update(progress(elapsed));if(elapsed>=DURATION){id=null;running=false;done();}else id=request(tick);}tick();}};}
root.CncGenerationDemo=Object.freeze({DURATION,progress,frames,createGate});
if(!root.document)return;
function init(){
 const style=document.createElement('style');style.textContent='.engine-panel{border:1px solid #54d98c;border-radius:14px;padding:18px;background:#0d3028;margin:16px 0}.engine-panel h3{margin:0 0 8px;color:#c8ffdb}.engine-track{height:16px;background:#031d18;border-radius:9px;overflow:hidden}.engine-fill{height:100%;width:0;background:linear-gradient(90deg,#168044,#54df88)}.engine-values{white-space:pre-wrap;font:14px/1.6 monospace;color:#c8ffdb}.engine-caption{font-size:13px;color:#bdd0de}';document.head.append(style);
 const states=[];
 for(const arc of [false,true]){
  const form=document.getElementById(arc?'arcForm':'form'),card=document.getElementById(arc?'arcOutputCard':'straightOutput'),output=document.getElementById(arc?'arcOutput':'output'),copy=document.getElementById(arc?'arcCopy':'copy'),download=document.getElementById(arc?'arcDownload':'download'),status=document.getElementById(arc?'arcStatus':'status');
  if(!form||!card||!output||!copy||!download||!status)throw new Error('Interfaccia generazione incompleta');
  const panel=document.createElement('section');panel.className='engine-panel';panel.hidden=true;panel.innerHTML='<h3>Motore di calcolo</h3><p class="engine-caption">Presentazione del risultato · 5 secondi</p><div class="engine-track" role="progressbar" aria-label="Avanzamento presentazione del risultato" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="engine-fill"></div></div><output class="engine-percent">0%</output><p class="engine-phase" aria-live="polite"></p><pre class="engine-values"></pre>';form.append(panel);
  const track=panel.querySelector('.engine-track'),fill=panel.querySelector('.engine-fill'),phase=panel.querySelector('.engine-phase'),percentText=panel.querySelector('.engine-percent'),values=panel.querySelector('.engine-values');
  const gate=createGate({now:()=>performance.now(),request:fn=>requestAnimationFrame(fn),cancel:id=>cancelAnimationFrame(id)});let buttons=[];
  function release(){for(const[b,disabled]of buttons)b.disabled=disabled;buttons=[];form.removeAttribute('aria-busy');}
  function abort(){if(!gate.running)return;gate.stop();release();output.value='';copy.disabled=download.disabled=true;card.hidden=true;panel.hidden=true;status.className='notice';status.textContent='Generazione annullata: controlla e genera nuovamente.';}
  form.addEventListener('submit',e=>{if(gate.running){e.preventDefault();e.stopImmediatePropagation();return;}card.hidden=true;output.value='';copy.disabled=download.disabled=true;panel.hidden=true;},true);
  form.addEventListener('submit',()=>{
   const iso=output.value;if(!iso.trim()){card.hidden=true;return;}
   const data=frames(iso),count=document.getElementById(arc?'aCount':'count')?.value||'—';output.value='';copy.disabled=download.disabled=true;card.hidden=true;panel.hidden=false;form.setAttribute('aria-busy','true');buttons=[...form.querySelectorAll('button[type="submit"]')].map(b=>[b,b.disabled]);for(const[b]of buttons)b.disabled=true;status.className='notice';status.textContent='Programma calcolato. Preparazione della visualizzazione…';let lastPhase=-1;
   const labels=['Controllo coerenza dati completato','Presentazione geometrie e quote','Preparazione elenco fori','Composizione vista programma ISO','Apertura programma'];
   gate.start(percent=>{fill.style.width=percent+'%';track.setAttribute('aria-valuenow',String(percent));percentText.textContent=percent+'%';const index=Math.min(4,Math.floor(percent/20));if(index!==lastPhase){phase.textContent=labels[index];lastPhase=index;}const row=data[Math.min(data.length-1,Math.floor(percent/100*(data.length-1)))];values.textContent='Fori nel programma: '+count+'\nBlocchi presentati: '+row.block+' / '+data.length+'\nX '+row.X+'    Y '+row.Y+'    Z '+row.Z;},()=>{release();output.value=iso;copy.disabled=download.disabled=false;card.hidden=false;phase.textContent='100% · Programma disponibile';status.className='notice success';status.textContent='Programma ISO disponibile.';card.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  });
  for(const event of ['input','change'])form.addEventListener(event,abort,true);
  form.addEventListener('click',e=>{if(e.target.closest('#resetStraight,#resetArc'))abort();},true);
  card.hidden=true;states.push({abort,card,output});
 }
 const mode=document.getElementById('partType');mode?.addEventListener('change',()=>{for(const s of states){s.abort();if(!s.output.value.trim())s.card.hidden=true;}});
 root.addEventListener('pagehide',()=>{for(const s of states)s.abort();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(globalThis);
