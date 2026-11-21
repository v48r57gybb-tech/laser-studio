(function(root){
'use strict';
function mount({container,canvas,actions,seek}){
 const fit=actions.querySelector('[data-do="fit"]');if(!fit)throw Error('Comando Inquadra non trovato');
 const box=document.createElement('div'),button=document.createElement('button'),message=document.createElement('p'),link=document.createElement('a');
 box.className='stock-save-simulation';box.style.cssText='display:flex;flex-direction:column;gap:6px;flex-shrink:0';button.type='button';button.textContent='Salva simulazione';button.disabled=true;button.style.cssText='display:block!important;width:100%;min-height:48px';message.style.cssText='margin:0;font-size:12px;line-height:1.4;overflow-wrap:anywhere';message.setAttribute('role','status');message.setAttribute('aria-live','polite');link.hidden=true;box.append(button,message,link);fit.after(box);
 let session=null,pending=false,url=null,disposed=false;
 const supported=()=>typeof canvas.captureStream==='function'&&typeof root.MediaRecorder==='function';
 const initial=()=>supported()?'Il programma completo viene registrato automaticamente. Al termine puoi salvare il video. Limiti: 5 minuti o 150 MB.':'Registrazione video non supportata da questo browser.';
 message.textContent=initial();
 function release(s){clearTimeout(s.timer);s.stream?.getTracks().forEach(t=>t.stop());}
 function revoke(){if(url){root.URL.revokeObjectURL(url);url=null;}link.removeAttribute('href');button.disabled=true;}
 function stop(s,complete){if(!s||s.stopping)return;s.stopping=true;s.complete=complete;clearTimeout(s.timer);if(s.recorder?.state!=='inactive')s.recorder.stop();else release(s);}
 function cancel(text){pending=false;if(session){const old=session;session=null;stop(old,false);}if(text)message.textContent=text;}
 function prepare(key,resume){cancel();revoke();button.textContent='Salva simulazione';pending=!key&&resume===true;message.textContent=pending?'Preparazione della registrazione del programma completo…':initial();}
 function start(){pending=false;if(disposed)return;if(!supported()){message.textContent=initial();return;}
  const s={stream:null,recorder:null,chunks:[],size:0,complete:false,stopping:false,timer:null};session=s;
  try{const mime=['video/mp4','video/webm;codecs=vp8','video/webm'].find(t=>root.MediaRecorder.isTypeSupported(t));if(!mime)throw Error('Nessun formato video registrabile disponibile');
   s.stream=canvas.captureStream(25);s.recorder=new root.MediaRecorder(s.stream,{mimeType:mime,videoBitsPerSecond:4000000});
   s.recorder.ondataavailable=e=>{if(session!==s||!e.data.size)return;s.chunks.push(e.data);s.size+=e.data.size;if(s.size>150000000){s.complete=false;message.textContent='Limite di 150 MB raggiunto: video incompleto, non proposto come simulazione completa.';stop(s,false);}};
   s.recorder.onerror=()=>{if(session===s){message.textContent='Errore durante la registrazione; nessun video completo disponibile.';stop(s,false);}};
   s.recorder.onstop=()=>{release(s);if(session!==s)return;session=null;if(!s.complete||!s.size){if(s.complete)message.textContent='Registrazione vuota: nessun video disponibile.';s.chunks=[];return;}url=root.URL.createObjectURL(new Blob(s.chunks,{type:s.recorder.mimeType}));s.chunks=[];link.href=url;link.download='simulazione-cnc.'+(s.recorder.mimeType.includes('mp4')?'mp4':'webm');button.disabled=false;button.textContent='Salva simulazione';message.textContent='Simulazione completa terminata. Vuoi salvarla? Premi Salva simulazione per scaricare il video.';};
   s.recorder.start(1000);message.textContent='Registrazione automatica in corso, senza audio. Il salvataggio sarà proposto qui al termine.';
   s.timer=setTimeout(()=>{if(session===s){message.textContent='Limite di 5 minuti raggiunto: video incompleto, non proposto come simulazione completa.';stop(s,false);}},300000);
  }catch(e){release(s);if(session===s)session=null;message.textContent='Impossibile registrare: '+e.message;}
 }
 function update({hidden,full,running,done}){if(disposed)return;if(hidden){if(pending||session)cancel('Registrazione interrotta alla chiusura della simulazione.');return;}if(!full){if(pending||session)cancel();return;}if(pending&&running&&!done)start();if(session&&!session.stopping&&done){message.textContent='Simulazione completa terminata. Preparazione del video…';stop(session,true);}}
 button.onclick=()=>{if(!url)return;link.click();message.textContent='Download del video richiesto. Puoi salvarlo nuovamente con lo stesso pulsante.';};
 seek.addEventListener('input',()=>{if(pending||session)cancel('Registrazione interrotta: la posizione è stata cambiata manualmente. Riavvia il programma completo per registrarlo.');});
 root.addEventListener('pagehide',()=>{disposed=true;cancel();revoke();});
 return {prepare,update,cancel};
}
root.StockSimulationSave={mount};
})(window);
