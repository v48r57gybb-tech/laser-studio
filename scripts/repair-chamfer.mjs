import {readFile,writeFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {pathToFileURL} from 'node:url';
export function patchChamfer(source,arc=false){
 let text=source;
 const k=n=>arc?'a'+n[0].toUpperCase()+n.slice(1):n;
 const q=k('chamferQ'),cycle=k('chamferCycle'),on=k('chamfer');
 function once(before,after){if(text.split(before).length!==2)throw Error('Svasatura: riferimento non univoco '+before);text=text.replace(before,after);}
 function all(before,after){if(!text.includes(before))throw Error('Svasatura: riferimento mancante '+before);text=text.split(before).join(after);}
 once(k('chamferAngle')+": '90',",k('chamferAngle')+": '90',\n    "+cycle+": 'G81',\n    "+q+": 1,");
 all("'"+k('chamferTool')+"', '"+k('chamferAngle')+"',", "'"+k('chamferTool')+"', '"+k('chamferAngle')+"', '"+cycle+"', '"+q+"',");
 once("'"+k('chamferTool')+"', '"+k('chamferZ')+"',", "'"+k('chamferTool')+"', '"+q+"', '"+k('chamferZ')+"',");
 once(k('chamferAngle')+": 'Angolo svasatore',",k('chamferAngle')+": 'Angolo svasatore',\n      "+cycle+": 'Strategia svasatura',\n      "+q+": 'Incremento Q svasatura (mm)',");
 once(k('chamferAngle')+": [['60', '60°'], ['90', '90°'], ['100', '100°']],",k('chamferAngle')+": [['60', '60°'], ['90', '90°'], ['100', '100°']],\n      "+cycle+": [['G81','G81 · Continua senza Q'],['G73','G73 · Rottura truciolo con Q'],['G83','G83 · Scarico a R con Q']],");
 if(text.split('if (d.'+on+') {').length!==3)throw Error('Blocchi svasatura inattesi');
 text=text.replace('if (d.'+on+') {','if (d.'+on+') {\n      if (![\'G81\',\'G73\',\'G83\'].includes(d.'+cycle+')) bad(\''+cycle+'\',\'Seleziona una strategia svasatura valida.\');\n      if ([\'G73\',\'G83\'].includes(d.'+cycle+') && (!Number.isFinite(Number(d.'+q+')) || Number(d.'+q+') <= 0)) bad(\''+q+'\',\'Q svasatura deve essere positiva.\');');
 const old="'G98 G82 Z' + f(d."+k('chamferZ')+") + ' R' + f(d."+k('r')+") + ' P500 F' + f(d."+k('chamferF')+")";
 const replacement="'G98 ' + d."+cycle+" + ' Z' + f(d."+k('chamferZ')+") + ' R' + f(d."+k('r')+") + (['G73', 'G83'].includes(d."+cycle+") ? ' Q' + f(d."+q+") : '') + ' F' + f(d."+k('chamferF')+")";
 once(old,replacement);
 const anchor=arc?"$('field-aQ').hidden = $('aDrillCycle').value === 'G81';":"$('field-q').hidden = $('drillCycle').value === 'G81';";
 once(anchor,anchor+"\n    $('field-"+q+"').hidden = !$('"+on+"').checked || $('"+cycle+"').value === 'G81';");
 new Script(text);
 return text;
}
export function patchButton(source){
 let text=source;
 const before='  function loop(){';
 if(text.split(before).length!==2)throw Error('Simulatore: loop non univoco');
 text=text.replace(before,before+'\n   updateSimButtonState();');
 const initial="  textarea.addEventListener('change', updateSimButtonState);";
 if(!text.includes(initial))throw Error('Simulatore: collegamento output mancante');
 text=text.replace(initial,initial+'\n  updateSimButtonState();');
 new Script(text);return text;
}
export function checkChamfer(source,core,arc=false){
 const boundary=arc?'  function initArcUI() {':"if (typeof document !== 'undefined') {";
 const pos=source.indexOf(boundary);if(pos<0)throw Error('Confine generatore mancante');
 const key=n=>arc?'a'+n[0].toUpperCase()+n.slice(1):n;
 for(const cycle of ['G81','G73','G83']){
  const context=createContext({});new Script(core).runInContext(context,{timeout:2000});
  const data=`{...${arc?'arcDefaults':'defaults'},${key('chamfer')}:true,${key('chamferCycle')}:${JSON.stringify(cycle)},${key('chamferQ')}:0.75${arc?',aRules:[]':''}}`;
  const call=arc?'generateArcISO':'generate';
  new Script(source.slice(0,pos)+`\nglobalThis.result=${call}(${data});`+(arc?'})();':'')).runInContext(context,{timeout:2000});
  const iso=arc?context.result.iso:context.result;
  const block=iso.split('SVASATORE')[1]?.split('G80')[0]||'';
  if(!block.includes('G98 '+cycle+' ') || (cycle==='G81'?/\bQ[-\d]/.test(block):!block.includes(' Q0.75')))throw Error('Test ISO svasatura fallito '+cycle);
  const invalid=data.replace(':0.75',':0');
  let failed=false;try{const invalidContext=createContext({});new Script(core).runInContext(invalidContext,{timeout:2000});new Script(source.slice(0,pos)+`\nglobalThis.invalid=${call}(${invalid});`+(arc?'})();':'')).runInContext(invalidContext,{timeout:2000});}catch(error){if(!String(error.message).includes('Q svasatura'))throw error;failed=true;}
  if(cycle!=='G81'&&!failed)throw Error('Q nulla accettata per '+cycle);
 }
}
export async function apply(){
 const core=await readFile('dist/cnc-preforo.js','utf8'),updates=[];
 for(const [file,arc] of [['iso-v2.js',false],['arc.js',true]]){
  const source=patchChamfer(await readFile('dist/'+file,'utf8'),arc);
  checkChamfer(source,core,arc);updates.push([file,source]);
 }
 updates.push(['cnc-simulator.js',patchButton(await readFile('dist/cnc-simulator.js','utf8'))]);
 for(const [file,text] of updates)await writeFile('dist/'+file,text);
 console.log('Svasatura: sei test ISO e controlli Q completati; attivazione simulatore aggiornata. Interprete 3D invariato.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await apply();
