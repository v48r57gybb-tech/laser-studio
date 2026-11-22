import {readFile,writeFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {patchChamfer,checkChamfer} from './repair-chamfer.mjs';
import {patchSimulationArcs} from './simulation-arcs.mjs';
const core=await readFile('dist/cnc-preforo.js','utf8'),updates=[];
for(const [file,arc] of [['iso-v2.js',false],['arc.js',true]]){
 const source=patchChamfer(await readFile('dist/'+file,'utf8'),arc);
 checkChamfer(source,core,arc);updates.push([file,source]);
}
const simulator=patchSimulationArcs(await readFile('dist/cnc-simulator.js','utf8'));
const context=createContext({});new Script(simulator).runInContext(context,{timeout:3000});
const parse=context.CncSimulation?.parseISO;
if(typeof parse!=='function')throw Error('Interprete simulatore non disponibile');
for(const cycle of [73,81,82,83,84]){
 const ops=parse('G90\nG0 X10 Y0 Z50\nG98 G'+cycle+' Z-10 R3 Q2 F100\nX20\nX30\nG80\nM30');
 if(ops.filter(o=>o.holeEnd).length!==3)throw Error('Simulatore: ciclo incompleto G'+cycle);
 for(const op of ops)if(op.from.x>=10&&op.from.x!==op.to.x&&op.to.z!==50)throw Error('Simulatore: trasferimento sotto quota G98');
}
for(const [file,text] of updates)await writeFile('dist/'+file,text);
await writeFile('dist/cnc-simulator.js',simulator);
console.log('Svasatura, Q, cinque cicli e archi nominali G2/G3 verificati nella build; non è collaudo browser o macchina.');
