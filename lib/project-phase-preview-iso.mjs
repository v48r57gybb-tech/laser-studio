const LIMIT=20000,TAU=2*Math.PI;
const finite=(n,k)=>{if(!Number.isFinite(n)||Math.abs(n)>1000000)throw Error(k+' non valido');return n};
export function parsePhasePreviewISO(iso){
 if(typeof iso!=='string'||iso.length>2000000)throw Error('ISO troppo grande');
 const pos={x:null,y:null,z:null},moves=[];
 let mode=null,tool=null,feed=null,metric=false,absolute=false,plane=false,ended=false;
 const push=m=>{if(moves.length>=LIMIT)throw Error('Limite anteprima 20000 punti');moves.push(m)};
 iso.split(/\r?\n/).forEach((raw,index)=>{
  const fail=s=>{throw Error('Riga '+(index+1)+': '+s)};
  const line=raw.replace(/\([^()]*\)/g,'').replace(/;.*$/,'').trim().toUpperCase();
  if(!line||line==='%')return;
  if(ended)fail('Blocchi dopo M30 non simulati');
  const token=/([A-Z])([+-]?(?:\d+\.?\d*|\.\d+))/g,words=[...line.matchAll(token)];
  if(line.replace(token,'').trim())fail('Sintassi ISO non supportata');
  const values={},seen=new Set();let motionCount=0;
  for(const [,key,text]of words){
   const n=finite(Number(text),'Parola ISO');
   if(key!=='G'&&key!=='M'){if(seen.has(key))fail('Parola duplicata: '+key);seen.add(key);values[key]=n}
   if(key==='G'){
    if(![0,1,2,3,17,21,40,43,49,54,55,56,57,58,59,80,90,94].includes(n))fail('G'+n+' non supportato: solo G17, mm, XYZ assoluti e centri I/J incrementali');
    if(n<=3){if(++motionCount>1)fail('Movimenti multipli nello stesso blocco');mode=n}
    if(n===17)plane=true;if(n===21)metric=true;if(n===90)absolute=true;
   }else if(key==='M'){if(![1,3,5,6,9,30].includes(n))fail('M'+n+' non supportato')}
   else if(!['X','Y','Z','I','J','T','H','F','S','O','N'].includes(key))fail('Parola non supportata: '+key);
  }
  if('T'in values){if(!Number.isInteger(values.T)||values.T<1||values.T>28)fail('T non valido');tool=values.T}
  if('H'in values&&values.H!==tool)fail('H diverso da T');
  if('F'in values){if(values.F<=0)fail('F deve essere positivo');feed=values.F}
  const axes=['X','Y','Z'].some(k=>k in values),center='I'in values||'J'in values;
  if(words.some(w=>w[1]==='M'&&Number(w[2])===30)){if(axes||center)fail('Movimento nel blocco M30');ended=true}
  if(!axes&&!center)return;
  if(!metric||!absolute||mode===null||tool===null)fail('Modalità o utensile non inizializzati');
  if(mode!==0&&!feed)fail('Avanzamento assente');
  const end={...pos};for(const k of ['X','Y','Z'])if(k in values)end[k.toLowerCase()]=values[k];
  const record=p=>({...p,rapid:mode===0,tool,feed:mode===0?null:feed,line:index+1});
  if(mode===0||mode===1){
   if(center)fail('I/J fuori da un arco');Object.assign(pos,end);
   if(Object.values(pos).every(Number.isFinite))push(record(pos));return;
  }
  if(!plane)fail('Arco richiede G17 esplicito');
  if(!Object.values(pos).every(Number.isFinite))fail('Inizio arco XYZ non inizializzato');
  if(!center)fail('Arco richiede centro I/J incrementale');
  if(end.z!==pos.z)fail('Archi elicoidali non supportati');
  const i=values.I??0,j=values.J??0,cx=finite(pos.x+i,'Centro X'),cy=finite(pos.y+j,'Centro Y'),r=Math.hypot(i,j),rEnd=Math.hypot(end.x-cx,end.y-cy);
  if(r<=1e-9)fail('Raggio nullo');
  if(Math.abs(r-rEnd)>Math.max(.001,r*1e-6))fail('Raggi iniziale e finale incoerenti');
  const start=Math.atan2(pos.y-cy,pos.x-cx),finish=Math.atan2(end.y-cy,end.x-cx);
  let sweep=mode===3?(finish-start+TAU)%TAU:-((start-finish+TAU)%TAU);
  if(Math.hypot(end.x-pos.x,end.y-pos.y)<1e-9)sweep=mode===3?TAU:-TAU;
  const step=Math.min(Math.PI/36,2*Math.acos(Math.max(-1,Math.min(1,1-.02/r))));
  const count=Math.max(1,Math.ceil(Math.abs(sweep)/step));
  if(!Number.isFinite(count)||count>LIMIT-moves.length)fail('Limite anteprima 20000 punti');
  for(let s=1;s<=count;s++){
   const a=start+sweep*s/count,p=s===count?end:{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a),z:pos.z};
   finite(p.x,'X arco');finite(p.y,'Y arco');push({...record(p),arc:mode});
  }
  Object.assign(pos,end);
 });
 if(!moves.length)throw Error('Nessun movimento XYZ simulabile');
 return moves;
}
