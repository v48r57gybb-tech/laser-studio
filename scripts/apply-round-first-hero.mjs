import {readFile,writeFile} from 'node:fs/promises';
import {Script,runInNewContext} from 'node:vm';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const path='dist/hero-workpiece.js',before=await readFile(path,'utf8');let code=before;
const once=(a,b)=>{assert.equal(code.split(a).length,2,'Scena tonda: riferimento cambiato '+a.slice(0,90));code=code.replace(a,b);};
const helpers=String.raw`function roundAngle(x,y){return (Math.atan2(y,x)+3*Math.PI/4+2*Math.PI)%(2*Math.PI);}
function roundPoint(radius,p){const a=-3*Math.PI/4+clamp(p)*2*Math.PI;return {x:radius*Math.cos(a),y:radius*Math.sin(a)};}
function roundContour(p){const u=Math.min(12-1e-8,clamp(p)*12),pass=Math.floor(u);return {...roundPoint(130-12*(pass%4),u-pass),z:-16*(Math.floor(pass/4)+1),kind:'mill'};}
function roundStockLevel(x,y,p){const r=Math.hypot(x,y);if(r<=FINISH)return 0;if(p>=1)return BOTTOM;const u=clamp(p)*12,pass=Math.floor(u),angle=roundAngle(x,y);let h=0;for(let k=0;k<=pass&&k<12;k++)if(Math.abs(r-(130-12*(k%4)))<=6&&(k<pass||angle<=(u-pass)*2*Math.PI))h=Math.min(h,-16*(Math.floor(k/4)+1));return h;}
`;
once('function pocketRow(p){',helpers+'function pocketRow(p){');
once('if((Math.abs(x)>FINISH||Math.abs(y)>FINISH)&&contour>0){if(contour>=1)', 'if((s.scene===0?Math.hypot(x,y)>FINISH:Math.abs(x)>FINISH||Math.abs(y)>FINISH)&&contour>0){if(s.scene===0)h=roundStockLevel(x,y,contour);else if(contour>=1)');
once('if(h>BOTTOM&&edge>0&&Math.max(Math.abs(x),Math.abs(y))>=84&&swept(x,y,edgePath,edge,6))h=Math.min(h,-2);', 'if(h>BOTTOM&&edge>0&&(s.scene===0?Math.hypot(x,y)>=84&&roundAngle(x,y)<=edge*2*Math.PI:Math.max(Math.abs(x),Math.abs(y))>=84&&swept(x,y,edgePath,edge,6)))h=Math.min(h,-2);');
once("else if(key==='contour')pose={...pathPoint(contourPath,(p*3)%1),z:-16*Math.min(3,Math.floor(p*3)+1),kind:'mill'};", "else if(key==='contour')pose=s.scene===0?roundContour(p):{...pathPoint(contourPath,(p*3)%1),z:-16*Math.min(3,Math.floor(p*3)+1),kind:'mill'};");
once("else if(key==='finish')pose={...pathPoint(finishPath,p),z:-48,kind:'finish'};", "else if(key==='finish')pose={...(s.scene===0?roundPoint(92,p):pathPoint(finishPath,p)),z:-48,kind:'finish'};");
once("else if(key==='edge')pose={...pathPoint(edgePath,p),z:-4,kind:'chamfer'};", "else if(key==='edge')pose={...(s.scene===0?roundPoint(86,p):pathPoint(edgePath,p)),z:-4,kind:'chamfer'};");
once('function drawEdge(s){const p=s.progress.edge||0;if(!p)return;',String.raw`function drawEdge(s){const p=s.progress.edge||0;if(!p)return;if(s.scene===0){for(let k=0;k<Math.ceil(p*96);k++){const a=-3*Math.PI/4+k*2*Math.PI/96,b=-3*Math.PI/4+Math.min(p*2*Math.PI,(k+1)*2*Math.PI/96);polygon([point(84*Math.cos(a),84*Math.sin(a),0),point(84*Math.cos(b),84*Math.sin(b),0),point(88*Math.cos(b),88*Math.sin(b),-2),point(88*Math.cos(a),88*Math.sin(a),-2)],'#c2d5df');}return;}`);
new Script(code);const old={},next={};runInNewContext(before,old);runInNewContext(code,next);const a=old.OfficinaHeroDemo,b=next.OfficinaHeroDemo;
function at(api,scene,key,p=.999){let ms=scene?api.durations[0]:0;for(const op of api.scenes[scene].stages){if(op[0]===key)return api.stateAt(ms+op[2]*p);ms+=op[2];}throw Error(key);}
const H=b.surfaceAt(at(b,0,'finish')).heights;let inside=0,outside=0;for(let j=0;j<48;j++)for(let i=0;i<48;i++){const r=Math.hypot(-96+(i+.5)*4,-96+(j+.5)*4);if(r>88){assert.equal(H[j*48+i],-48);outside++;}else{assert.equal(H[j*48+i],0);inside++;}}assert(inside>0&&outside>0);
let previous=Infinity;for(let p=.12;p<=.9;p+=.025){const h=b.surfaceAt(at(b,0,'contour',p)).heights,v=h.reduce((s,z)=>s+z+48,0);assert(v<=previous+.01);previous=v;}
for(const [key,r]of [['finish',92],['edge',86]])for(const p of [.2,.5,.8]){const t=b.toolAt(at(b,0,key,p));assert(Math.abs(Math.hypot(t.x,t.y)-r)<1e-8);}
for(const op of b.scenes[1].stages)for(const p of [.2,.7]){const original=a.surfaceAt(at(a,1,op[0],p)).heights,changed=b.surfaceAt(at(b,1,op[0],p)).heights;assert.deepEqual(Array.from(changed),Array.from(original));assert.deepEqual(JSON.parse(JSON.stringify(b.toolAt(at(b,1,op[0],p)))),JSON.parse(JSON.stringify(a.toolAt(at(a,1,op[0],p)))));}
await writeFile(path,code);
const tests=(await readFile('tests/hero-two-scenes.cjs','utf8')).replace("fs.readFileSync('hero-two-scenes.js'", "fs.readFileSync('dist/hero-workpiece.js'");const checked=spawnSync(process.execPath,['-e',tests],{encoding:'utf8'});assert.equal(checked.status,0,checked.stdout+'\n'+checked.stderr);process.stdout.write(checked.stdout);
console.log('PASS prima scena: grezzo quadrato trasformato in tondo con sgrossatura circolare progressiva, finitura e smusso circolari. Seconda scena identica nei dati geometrici e nei percorsi. Resa visiva browser da verificare.');
