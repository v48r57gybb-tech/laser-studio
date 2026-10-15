import {createHash,timingSafeEqual} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest();
const page=`<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diagnostica LASER STUDIO</title><body><h1>Diagnostica Gemini</h1><p>Nessun PDF inviato e nessuna generazione. Inserisci la password LASER STUDIO, non la chiave API.</p><form id="f"><input id="p" type="password" autocomplete="off" required aria-label="Password LASER STUDIO"><button>Verifica configurazione</button></form><pre id="o" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre><script>document.getElementById('f').onsubmit=async e=>{e.preventDefault();const p=document.getElementById('p'),o=document.getElementById('o'),b=document.querySelector('button');b.disabled=true;o.textContent='Verifica in corso...';try{const r=await fetch(location.pathname,{method:'POST',headers:{'x-laser-password':p.value}});p.value='';o.textContent=JSON.stringify(await r.json(),null,2)}catch{p.value='';o.textContent='Connessione non riuscita.'}finally{b.disabled=false}};</script></body></html>`;
export default async function handler(req,res){
res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
const send=(status,data)=>res.status(status).json(data);
if(req.method==='GET')return res.status(200).setHeader('Content-Type','text/html; charset=utf-8').end(page);
if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(405,{error:'Metodo non consentito'});}
const password=process.env.LASER_ACCESS_PASSWORD||'',key=process.env.GEMINI_API_KEY||'';
if(password.length<20)return send(503,{error:'Password server assente o inferiore a 20 caratteri'});
if(!timingSafeEqual(hash(String(req.headers['x-laser-password']||'')),hash(password)))return send(401,{error:'Password non corretta'});
if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'Origine non consentita'});}catch{return send(403,{error:'Origine non valida'});}}
if(!key.trim())return send(503,{error:'GEMINI_API_KEY assente'});
const raw=process.env.GEMINI_MODEL||'gemini-flash-latest',model=raw.trim(),formatValid=/^[a-zA-Z0-9._-]+$/.test(raw);
const report={configuredModel:raw.length<=100?raw:'[valore troppo lungo]',formatValid,hasOuterWhitespace:raw!==model,keyHasOuterWhitespace:key!==key.trim(),generationTested:false};
try{
const names=[];let token='';const signal=AbortSignal.timeout(15000);
for(let i=0;i<10;i++){const url=new URL('https://generativelanguage.googleapis.com/v1beta/models');url.searchParams.set('pageSize','100');if(token)url.searchParams.set('pageToken',token);
const r=await fetch(url,{headers:{'x-goog-api-key':key.trim()},signal});
if(!r.ok){return send(200,{...report,googleHttpStatus:r.status,result:'Google ha rifiutato o non completato la lettura dei modelli. Nessun dettaglio sensibile esposto.',action:r.status===503?'Servizio Google temporaneamente indisponibile':r.status===429?'Verificare limiti API':r.status===400||r.status===403?'Verificare chiave e restrizioni API':'Verificare accesso API'});}
const data=await r.json();for(const m of data.models||[])if(m.supportedGenerationMethods?.includes('generateContent'))names.push(String(m.name||'').replace(/^models\//,''));
token=data.nextPageToken||'';if(!token)break;}
return send(200,{...report,modelListed:names.includes(model),listingComplete:!token,availableGenerateContentModels:names,action:!formatValid?'Correggere il formato di GEMINI_MODEL e ridistribuire':!names.includes(model)?'Selezionare un modello elencato compatibile con PDF e JSON; poi ridistribuire':'Modello elencato. Compatibilita PDF, output JSON e disponibilita della generazione richiedono una prova separata.'});
}catch(e){return send(200,{...report,error:e.name==='TimeoutError'||e.name==='AbortError'?'Timeout della lettura modelli Google':'Connessione o risposta Google non valida'});}
}
