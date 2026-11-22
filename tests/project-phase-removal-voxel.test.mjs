import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhaseRemoval as create} from '../lib/project-phase-removal.mjs';
const config=()=>({confirmed:true,min:[0,0,0],max:[4,4,4],cellSize:1,tools:[{station:1,shape:'flat-cylinder',diameter:2,cuttingLength:4}]});
const move=(x,y,z,rapid=false,tool=1)=>({x,y,z,rapid,tool});
test('grezzo iniziale e volume conservato',()=>{
 const e=create(config()),s=e.stats();assert.equal(s.totalCells,64);assert.equal(s.initialVolume,64);assert.equal(s.removedVolume,0);assert.equal(s.remainingVolume,64);
});
test('affondo cilindrico: celle rimosse e ripetizione senza doppio conteggio',()=>{
 const e=create(config()),path=[move(2,2,4,true),move(2,2,0)];
 const s=e.replay(path);assert.equal(s.removedCells,16);assert.equal(s.remainingVolume,48);
 assert.equal(e.replay([...path,move(2,2,4),move(2,2,0)]).removedCells,16);
});
test('rapidi e passaggi fuori grezzo non asportano',()=>{
 const e=create(config());assert.equal(e.replay([move(2,2,4,true),move(2,2,0,true)]).removedCells,0);
 assert.equal(e.replay([move(20,20,4,true),move(20,20,0)]).removedCells,0);
});
test('passata laterale, reset e seek riproducibili',()=>{
 const e=create(config()),p=[move(1,2,0,true),move(3,2,0)];
 const n=e.replay(p).removedCells;assert.ok(n>0);assert.equal(e.replay(p,0).removedCells,0);assert.equal(e.replay(p).removedCells,n);assert.equal(e.reset().remainingCells,64);
});
test('snapshot difensivo e dominio non divisibile',()=>{
 const c=config();c.max=[4.3,4.1,4.2];const e=create(c),s=e.snapshot();s.occupied.fill(0);s.min[0]=99;
 assert.equal(e.snapshot().occupied[0],1);assert.equal(e.snapshot().min[0],0);assert.ok(Math.abs(e.stats().initialVolume-4.3*4.1*4.2)<1e-10);
});
test('rifiuto di dati e geometrie non supportate',()=>{
 for(const override of [{confirmed:false},{cellSize:0},{cellSize:.001},{max:[0,4,4]},{tools:[{station:1,shape:'drill',diameter:2,cuttingLength:4}]}])assert.throws(()=>create({...config(),...override}));
 const e=create(config());assert.throws(()=>e.replay([move(0,0,0,true),move(1,1,0,false,2)]),/Utensile/);
 assert.throws(()=>e.replay([move(0,0,0,true),move(NaN,1,0)]),/Quota/);assert.throws(()=>e.replay([move(0,0,0,true)],2),/Indice/);
});
test('fallimento atomico e cambio utensile bloccato',()=>{
 const c=config();c.tools.push({station:2,shape:'flat-cylinder',diameter:1,cuttingLength:2});
 const e=create(c),p=[move(2,2,4,true),move(2,2,0)];e.replay(p);const before=e.snapshot();
 assert.throws(()=>e.replay([...p,move(3,2,0,false,2)]),/Cambio utensile/);assert.deepEqual(e.snapshot(),before);
 assert.throws(()=>e.replay([move(-1000000,-1000000,0,true),move(1000000,1000000,0)]),/Limite/);assert.deepEqual(e.snapshot(),before);
});
