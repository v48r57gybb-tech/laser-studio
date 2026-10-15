import analyze from './analyze.js';
export async function run(req,res,handler=analyze,now=Date.now,pause=ms=>new Promise(r=>setTimeout(r,ms))){
 const start=now();let body=req.body;try{if(typeof body==='string')body=JSON.parse(body);}catch{}
 const allowed=body?.retryConsent===true;let attempts=0;
 while(true){let status=200,payload;const capture={setHeader:(...args)=>res.setHeader(...args),status(n){status=n;return this;},json(o){payload=o;return this;}};
 attempts++;await handler(req,capture);
 const overloaded=status===502&&typeof payload?.error==='string'&&payload.error.includes('(HTTP 503)');
 if(allowed&&overloaded&&attempts===1&&now()-start<4000){await pause(2000);continue;}
 res.setHeader('X-Laser-Attempts',String(attempts));
 if(overloaded){status=503;payload={...payload,error:'Google Gemini resta temporaneamente sovraccarico. Nessun PDF generato. Richieste effettuate: '+attempts+'.',attempts};}
 return res.status(status).json(payload);
 }
}
export default async function handler(req,res){try{return await run(req,res);}catch{console.error('LASER_ANALYZE_WRAPPER_FAILED');return res.status(500).json({error:'Errore interno. Nessun risultato verificato; non riprovare subito.'});}}
