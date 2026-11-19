import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { Script, createContext } from 'node:vm';
function once(text,before,after){if(text.split(before).length!==2)throw new Error('Esempi iniziali: riferimento non univoco: '+before);return text.replace(before,after);}
export function resetSaved(text,key){return once(text,"const saved = JSON.parse(localStorage.getItem('"+key+"') || 'null');",'const saved = null;');}
export function checkExample(code,core,arc){
 const boundary=arc?'  function initArcUI() {':"if (typeof document !== 'undefined') {";
 const pos=code.indexOf(boundary);if(pos<0)throw new Error('Confine generatore non trovato');
 const prefix=code.slice(0,pos),end=arc?'globalThis.demoOutput = generateArcISO({...arcDefaults,aRules:[]});})();':'globalThis.demoOutput = generate({...defaults});';
 const context=createContext({});new Script(core).runInContext(context,{timeout:2000});new Script(prefix+'\n'+end).runInContext(context,{timeout:2000});
 const iso=arc?context.demoOutput?.iso:context.demoOutput;
 if(typeof iso!=='string'||!iso.startsWith('%')||!iso.includes('M30')||/NaN|undefined|Infinity/.test(iso))throw new Error('Esempio iniziale non genera un ISO valido: '+(arc?'arco':'dritto'));
 return {mode:arc?'arc':'straight',generated:true,lines:iso.split('\n').length};
}
export async function apply(){
 const core=await readFile('dist/cnc-preforo.js','utf8'),updates=[],checks=[];
 for(const[file,key,arc]of [['iso-v2.js','iso-smart-v2',false],['arc.js','iso-smart-arc',true]]){\
  const source=resetSaved(await readFile('dist/'+file,'utf8'),key);new Script(source);checks.push(checkExample(source,core,arc));updates.push([file,source]);
 }
 let ui=await readFile('dist/preforo-ui.js','utf8');
 ui=once(ui,"let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}catch{}",'let saved={};');new Script(ui);
 let html=await readFile('dist/index.html','utf8');
 html=once(html,'<script src="preforo-ui.js"></script>','<script src="preforo-ui.js"></script>\n<script src="generation-demo.js"></script>\n<script src="cnc-simulator.js"></script>');
 new Script(await readFile('generation-demo.js','utf8'));
 for(const[file,source]of updates)await writeFile('dist/'+file,source);
 await writeFile('dist/preforo-ui.js',ui);await writeFile('dist/index.html',html);
 await copyFile('generation-demo.js','dist/generation-demo.js');
 await copyFile('cnc-simulator.js','dist/cnc-simulator.js');
 console.log('Esempi iniziali generati e verificati:',JSON.stringify(checks));
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file://').href)await apply();
