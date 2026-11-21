import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
let sim=await readFile('dist/stock-sim.js','utf8');
const once=(a,b)=>{assert.equal(sim.split(a).length,2,'Barra simulatore: integrazione cambiata '+a.slice(0,80));sim=sim.replace(a,b);};
once("const playerRewind=playerButton('rewind','Torna all’inizio della selezione','#ffffff',()=>{if(ops.length)scopeChoose(scopeKey,false);});",'playerBar.append(playerAll);scopeRepeat.remove();');
once("scopeKey?'Fine lavorazione: premi la freccia blu per la successiva o la freccia bianca per ricominciare.':'Fine programma.'","scopeKey?'Fine lavorazione: blu per la successiva, verde per tutto il programma.':'Fine programma: verde per ripartire dall’inizio.'");
const wheel=String.raw`function playerWheelSpeed(value,min,max,step,delta){if(!Number.isFinite(delta)||delta===0)return value;const jump=Math.max(5,step),next=min+Math.round((value+(delta<0?jump:-jump)-min)/step)*step;return Math.max(min,Math.min(max,next));}
speed.addEventListener('wheel',e=>{if(e.ctrlKey||e.deltaY===0)return;e.preventDefault();e.stopImmediatePropagation();const min=Number(speed.min),max=Number(speed.max),step=Number(speed.step)||.25,next=playerWheelSpeed(Number(speed.value),min,max,step,e.deltaY);if(next!==Number(speed.value)){speed.value=String(next);speed.dispatchEvent(new Event('input',{bubbles:true}));}},{passive:false,capture:true});
`;
once('const playerAll=',wheel+'const playerAll=');
assert(!/\bplayerRewind\b/.test(sim));
const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:sim,encoding:'utf8'});assert.equal(check.status,0,check.stderr);
const change=Function(wheel.slice(0,wheel.indexOf("speed.addEventListener"))+';return playerWheelSpeed;')();
assert.equal(change(50,.25,128,.25,-100),55);assert.equal(change(50,.25,128,.25,100),45);assert.equal(change(127,.25,128,.25,-100),128);assert.equal(change(1,.25,128,.25,100),.25);assert.equal(change(50,.25,128,.25,0),50);assert.equal(change(50,.25,128,.25,-1),55);
const handler=wheel.slice(wheel.indexOf("speed.addEventListener"));let callback,options,inputs=0,prevented=0,stopped=0;const speed={min:'.25',max:'128',step:'.25',value:'50',addEventListener(n,fn,o){assert.equal(n,'wheel');callback=fn;options=o;},dispatchEvent(e){assert.equal(e.type,'input');inputs++;}};Function('speed','playerWheelSpeed','Event',handler)(speed,change,Event);callback({deltaY:-100,ctrlKey:false,preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}});assert.equal(speed.value,'55');assert.equal(inputs,1);assert.equal(prevented,1);assert.equal(stopped,1);assert.deepEqual(options,{passive:false,capture:true});callback({deltaY:100,ctrlKey:true});assert.equal(speed.value,'55');
await writeFile('dist/stock-sim.js',sim);
console.log('PASS: barra blu/pausa/verde; repeat rimosso; rotellina 5x per evento, limiti e input verificati; Ctrl+rotellina preservato. Funzioni di blu, pausa e verde invariate. Collaudo browser ancora necessario.');
