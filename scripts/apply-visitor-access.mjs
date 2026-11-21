import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const path='dist/local-access.js';
const original=await readFile(path,'utf8');
assert(original.includes('async function runScripts()'),'Accesso locale non riconosciuto');
assert(original.includes('async function boot()'),'Avvio amministratore non riconosciuto');
assert(!original.includes('const guestMaps=[]'),'Interfaccia visitatore già applicata');
const addition=String.raw`
// Local demonstration only: no server authentication and no one-use guarantee.
{
  const choices=document.createElement('section');
  choices.setAttribute('aria-label','Scegli accesso');
  const heading=document.createElement('h2');heading.textContent='Scegli come entrare';
  const admin=document.createElement('button');admin.type='button';admin.textContent='Amministratore';
  const visitor=document.createElement('button');visitor.type='button';visitor.textContent='Visitatore · prova 5 minuti';
  const info=document.createElement('p');info.textContent='Amministratore: password locale esistente, nessun timer. Visitatore: prova temporanea senza archivio personale. Il limite è solo dimostrativo e può essere aggirato.';
  const recovery=[document.getElementById('officinaBackup'),document.getElementById('officinaRestore')];
  choices.append(heading,admin,visitor,info);gate.insertBefore(choices,form);
  form.hidden=true;recovery.forEach(n=>n.hidden=true);
  admin.onclick=()=>{form.hidden=false;recovery.forEach(n=>n.hidden=false);password.focus();};
  let guestActive=false,guestEnded=false,guestTimer=null,guestClock=null,adminAttempted=false;
  form.addEventListener('submit',()=>{adminAttempted=true;admin.disabled=true;visitor.disabled=true;},true);
  const guestMaps=[];
  function temporaryStorage(){
    const values=new Map();guestMaps.push(values);
    return Object.freeze({getItem:k=>values.get(String(k))??null,setItem(k,v){if(!guestActive||guestEnded)throw Error('Prova terminata');values.set(String(k),String(v));},removeItem(k){if(!guestActive||guestEnded)throw Error('Prova terminata');values.delete(String(k));},clear(){if(!guestActive||guestEnded)throw Error('Prova terminata');values.clear();},key:i=>Array.from(values.keys())[i]??null,get length(){return values.size;}});
  }
  function finishGuest(){
    if(guestEnded)return;guestEnded=true;guestActive=false;locking=true;
    clearInterval(guestTimer);guestMaps.forEach(m=>m.clear());
    hide();gate.textContent='Prova visitatore terminata. Ritorno alla schermata di accesso…';
    location.reload();
  }
  function checkGuestTime(){
    if(!guestActive||!guestClock)return;
    const left=Math.min(guestClock.wall-Date.now(),guestClock.mono-performance.now());
    if(left<=0){finishGuest();return;}
    guestClock.label.textContent='Visitatore · '+Math.ceil(left/1000)+' secondi · dati temporanei';
  }
  document.addEventListener('visibilitychange',checkGuestTime);
  window.addEventListener('focus',checkGuestTime);
  window.addEventListener('pagehide',()=>{if(guestActive){guestActive=false;guestEnded=true;clearInterval(guestTimer);guestMaps.forEach(m=>m.clear());}});
  visitor.onclick=async()=>{
    if(started||adminAttempted||guestActive||guestEnded)return;
    visitor.disabled=true;admin.disabled=true;form.hidden=true;recovery.forEach(n=>n.hidden=true);
    try{
      for(const name of ['localStorage','sessionStorage','indexedDB']){
        if(Object.getOwnPropertyDescriptor(window,name)?.configurable===false)throw Error('Il browser non consente una prova isolata. Nessun dato personale è stato aperto.');
      }
      guestActive=true;
      const guestLocal=temporaryStorage(),guestSession=temporaryStorage();
      Object.defineProperty(window,'localStorage',{get:()=>guestLocal,configurable:false});
      Object.defineProperty(window,'sessionStorage',{get:()=>guestSession,configurable:false});
      Object.defineProperty(window,'indexedDB',{get:()=>{throw Error('Database personale non disponibile nella prova visitatore');},configurable:false});
      window.OfficinaVault=Object.freeze({flush:async()=>{if(!guestActive||guestEnded)throw Error('Prova terminata');}});
      form.remove();gate.textContent='Caricamento prova visitatore…';
      await runScripts();
      if(!guestActive||guestEnded)return;
      const mode=document.getElementById('partType');
      if(!mode||!document.getElementById('stockForm'))throw Error('Sezione lavorazione da grezzo non trovata');
      mode.value='stock';mode.dispatchEvent(new Event('change',{bubbles:true}));
      const bar=document.createElement('aside');bar.id='officinaVaultBar';
      const label=document.createElement('span');label.setAttribute('role','timer');
      const leave=document.createElement('button');leave.type='button';leave.textContent='Esci dalla prova';leave.onclick=finishGuest;
      bar.append(label,leave);document.body.prepend(bar);
      guestClock={wall:Date.now()+300000,mono:performance.now()+300000,label};
      checkGuestTime();guestTimer=setInterval(checkGuestTime,100);
      gate.hidden=true;document.documentElement.classList.remove('officina-locked');
      window.dispatchEvent(new Event('resize'));
    }catch(error){
      guestActive=false;guestEnded=true;locking=true;clearInterval(guestTimer);guestMaps.forEach(m=>m.clear());
      hide();gate.textContent='Impossibile avviare la prova: '+error.message;
      const retry=document.createElement('button');retry.type='button';retry.textContent='Torna agli accessi';retry.onclick=()=>location.reload();gate.append(retry);
    }
  };
}
`;
const combined=original+'\n'+addition;
const checked=spawnSync(process.execPath,['--input-type=module','--check'],{input:combined,encoding:'utf8'});
assert.equal(checked.status,0,checked.stderr);
assert.equal(combined.slice(0,original.length),original,'Il codice amministratore deve restare invariato');
await writeFile(path,combined);
console.log('Interfaccia amministratore/visitatore aggiunta; sintassi verificata. Collaudo browser ancora necessario.');
