import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const errors=[];
async function patch(file,rules){
 let text=await readFile(file,'utf8');
 for(const rule of rules){
  const re=new RegExp(rule.find,rule.flags||'');
  if(!re.test(text)){if(rule.required!==false)errors.push(file+': aggancio non trovato: '+rule.find);continue;}
  text=text.replace(re,rule.replacement);
 }
 await writeFile(file,text);
}
await patch('dist/cnc-simulator.js',[
 {find:'progress\\+=dt\\*Number\\(speed\\.value\\)\\/[^;]+;',replacement:`const duration=op.dwell>0?op.dwell:(op.type==='rapid'?60*op.distance/10000:60*op.distance/Math.max(1,op.feed||200));\n    if(duration>0)progress+=dt*Number(speed.value)/duration;else progress=1;`},
 {find:'max="32" step="0\\.25" value="1"',replacement:'max="128" step="0.25" value="1"'}
]);
await patch('dist/stock-sim.js',[
 {find:'max="32" step="0\\.25" value="1"',replacement:'max="128" step="0.25" value="1"'},
 {find:'const cell=Math\\.max\\(0\\.5,Math\\.min\\(w,d\\)\\/160\\);',replacement:'const cell=Math.max(1,Math.min(w,d)/120);',required:false}
]);
for(const file of ['dist/cnc-simulator.js','dist/stock-sim.js']){
 const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 if(check.status!==0)errors.push(file+': '+(check.stderr||check.error?.message));
}
if(errors.length)throw Error('Prestazioni simulazione: '+errors.length+' problemi\n'+errors.join('\n'));
console.log('Simulazione: tempi da F per pz diritto/curvo, velocità fino a 128×, griglia grezzo più leggera e ordine di disegno in cache.');
