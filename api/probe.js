import {createHash,timingSafeEqual} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest();
const html=`<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test generazione Gemini</title><h1>Test generazione Gemini</h1><p>Al massimo due richieste: testo, poi JSON. Possibili costi e consumo quota API. Nessun PDF, nessun retry o cambio modello.</p><form id="f"><input id="p" type="password" autocomplete="off" required aria-label="Password LASER STUDIO"><label><input id="c" type="checkbox" required>Autorizzo le due richieste API e gli eventuali costi</label><button>Avvia test</button></form><pre id="o" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre><script>document.getElementById('f').onsubmit=async e=>{e.preventDefault();const p=document.getElementById('p'),b=document.querySelector('button'),o=document.getElementById('o');b.disabled=true;o.textContent='Test in corso...';try{const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json','x-laser-password':p.value},body:JSON.stringify({consent:true})});p.value='';o.textContent=JSON.stringify(await r.json(),null,2)}catch{p.value='';o.textContent='Connessione non riuscita. Non riprovare automaticamente.'}finally{b.disabled=false}};</script></html>`;
export default async function handler(req,res){
res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');const send=(n,o)=>res.status(n).json(o);
if(req.method==='GET')return res.status(200).setHeader('Content-Type','text/html; charset=utf-8').end(html);
if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(405,{error:'Metodo non consentito'});}
const password=process.env.LASER_ACCESS_PASSWORD||'',key=process.env.GEMINI_API_KEY||'';
if(password.length<20)return send(503,{error:'Configurazione password incompleta'});
if(!timingSafeEqual(hash(String(req.headers['x-laser-password']||'')),hash(password)))return send(401,{error:'Password non corretta'});
if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'Origine non consentita'});}catch{return send(403,{error:'Origine non valida'});}}
let body=req.body;try{if(typeof body==='string')body=JSON.parse(body);}catch{return send(400,{error:'JSON non valido'});}
if(body?.consent!==true)return send(400,{error:'Autorizzazione API richiesta'});
const model=process.env.GEMINI_MODEL||'gemini-flash-latest';
if(!/^[a-zA-Z0-9._-]+$/.test(model)||!key)return send(503,{error:'Modello o chiave non configurati correttamente'});
const clean=value=>{let s=String(value||'');for(const secret of [key,key.trim(),password])if(secret)s=s.split(secret).join('[REDACTED]');return s.replace(/AIza[A-Za-z0-9_-]+/g,'[REDACTED]').slice(0,1500);};
const tests=[];const signal=AbortSignal.timeout(18000);
try{for(const stage of ['text','json']){const config={maxOutputTokens:1024};if(stage==='json')config.responseMimeType='application/json';
const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{role:'user',parts:[{text:stage==='json'?'Return only the JSON object {"ok":true}.':'Reply with exactly OK.'}]}],generationConfig:config}),signal});
let data;try{data=await r.json();}catch{return send(200,{model,tests,failedStage:stage,httpStatus:r.status,error:'Risposta Google non JSON',pdfTested:false});}
if(!r.ok)return send(200,{model,tests,failedStage:stage,httpStatus:r.status,googleStatus:clean(data.error?.status),googleMessage:clean(data.error?.message),pdfTested:false});
const candidate=data.candidates?.[0],text=(candidate?.content?.parts||[]).filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('');
let valid=false;if(stage==='text')valid=text.trim()==='OK';else{try{valid=JSON.parse(text).ok===true;}catch{}}
tests.push({stage,httpStatus:r.status,finishReason:candidate?.finishReason||null,expectedOutputReceived:valid,usage:data.usageMetadata?{promptTokenCount:data.usageMetadata.promptTokenCount,candidatesTokenCount:data.usageMetadata.candidatesTokenCount}:null});
if(!valid)return send(200,{model,tests,failedStage:stage,error:'Output atteso assente o incompleto',pdfTested:false});}
return send(200,{model,tests,result:'Test testo e JSON riusciti. PDF e prompt applicativo non ancora verificati.',pdfTested:false});
}catch(e){return send(200,{model,tests,error:e.name==='TimeoutError'||e.name==='AbortError'?'Timeout complessivo test':'Errore connessione Google',pdfTested:false});}
}
