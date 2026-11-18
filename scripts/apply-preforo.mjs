import { readFile, writeFile, copyFile } from 'node:fs/promises';
export function patchGenerator(source,p=''){
 const key=n=>p?p+n[0].toUpperCase()+n.slice(1):n;let text=source;
 function replace(before,after){const count=typeof before==='string'?text.split(before).length-1:[...text.matchAll(new RegExp(before.source,'g'))].length;if(count!==1)throw new Error('Patch '+(p||'straight')+': atteso un riferimento, trovati '+count+': '+before);text=text.replace(before,after);}
 replace("['step2', 'Punta doppio Ø 6,5 / 11']]","['step2', 'Punta doppio Ø 6,5 / 11'], ['auto', 'Punta per preforo automatico']]");
 replace('const e = {};',`const e = globalThis.CncPreforo.validate(d, '${p}');\n    d = globalThis.CncPreforo.prepare(d, '${p}');`);
 const generator=p?'generateArcISO':'generate';
 replace(`function ${generator}(d) {`,`function ${generator}(d) {\n    const preforoErrors = globalThis.CncPreforo.validate(d, '${p}');\n    if(Object.keys(preforoErrors).length) throw Error(Object.values(preforoErrors)[0]);\n    d = globalThis.CncPreforo.prepare(d, '${p}');`);
 replace('return a;',`return globalThis.CncPreforo.enrich(a, '${p}');`);
 replace(/'M8',(\s*)'M29 S'/,`d.${key('tapCoolant')} || 'M8',$1'M29 S'`);
 if(p)replace("$('arcForm').dispatchEvent(new Event('submit'));","globalThis.CncPreforo.load(data, 'a');\n      $('arcForm').dispatchEvent(new Event('submit'));");
 else replace("$('form').dispatchEvent(new Event('submit'));","globalThis.CncPreforo.load(item.data, '');\n        $('form').dispatchEvent(new Event('submit'));");
 return text;
}
export async function apply(){
 const updates=[];for(const[file,p]of [['iso-v2.js',''],['arc.js','a']])updates.push([file,patchGenerator(await readFile('dist/'+file,'utf8'),p)]);
 let html=await readFile('dist/index.html','utf8');const first='<script src="iso-v2.js"></script>',last='<script src="arc.js"></script>';if(!html.includes(first)||!html.includes(last))throw new Error('Riferimenti script HTML mancanti');
 html=html.replace(first,'<script src="cnc-preforo.js"></script>\n'+first).replace(last,last+'\n<script src="preforo-ui.js"></script>');
 for(const[file,content]of updates)await writeFile('dist/'+file,content);for(const file of ['cnc-preforo.js','preforo-ui.js'])await copyFile(file,'dist/'+file);await writeFile('dist/index.html',html);
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file://').href)await apply();
