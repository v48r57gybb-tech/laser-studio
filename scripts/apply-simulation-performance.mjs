import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const staged=new Map();
function replaceOne(text,pattern,value,label){
 const matches=[...text.matchAll(new RegExp(pattern.source,'g'))];
 if(matches.length!==1)throw Error(label+': atteso 1 aggancio, trovati '+matches.length);
 return text.replace(pattern,()=>value);
}
for(const file of ['dist/cnc-simulator.js','dist/stock-sim.js']){
 let s=await readFile(file,'utf8');
 s=replaceOne(s,/max="32" step="0\.25" value="1"/,'max="128" step="0.25" value="1"',file+' velocità');
 if(file==='dist/cnc-simulator.js'){
  s=replaceOne(s,/progress\+=dt\*Number\(speed\.value\)\/[^;]+;/,"const duration=op.dwell>0?op.dwell:(op.type==='rapid'?60*(op.travelDistance??op.distance)/10000:60*(op.travelDistance??op.distance)/Math.max(1,op.feed||200));\nif(duration>0)progress+=dt*Number(speed.value)/duration;else progress=1;",file+' tempi');
  s=replaceOne(s,/while\(progress>=1&&playing\)\{/,'let advanceGuard=0;while(progress>=1&&playing&&advanceGuard++<250){',file+' budget');
 }else{
  s=replaceOne(s,/motionDebt=next\.remaining;/,'motionDebt=Math.min(next.remaining,0.05);',file+' residuo');
  s=replaceOne(s,/rapidFeed:rapidNominalFeed,onAdvance:/,'rapidFeed:rapidNominalFeed,maxSteps:40,onAdvance:',file+' budget');
 }
 const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:s,encoding:'utf8'});
 if(check.error||check.status!==0)throw Error(file+': '+(check.error?.message||check.stderr));
 staged.set(file,s);
}
for(const [file,s] of staged)await writeFile(file,s);
console.log('TEST budget-v2: grezzo 40 movimenti/frame, residuo massimo 0.05 s; diritto/curvo 250 movimenti/frame. ISO invariato. Crash non ancora collaudato.');
