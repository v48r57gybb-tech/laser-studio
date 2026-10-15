import assert from 'node:assert/strict';
import {uBendPlan} from '../lib/bends.js';
const p=uBendPlan({left:50,web:110,right:60,thickness:5,radius:5});
assert.deepEqual(p.straightLengths,[40,90,50]);
assert.ok(Math.abs(p.allowancePerBend-7*Math.PI/2)<1e-10);
assert.ok(Math.abs(p.totalLength-(220-2*p.deductionPerBend))<1e-10);
assert.equal(p.productionReady,false);
for(const patch of [{k:NaN},{k:-1},{k:0.8},{thickness:0},{radius:-1},{web:10},{left:5},{right:5},{left:Infinity}])assert.throws(()=>uBendPlan({left:50,web:110,right:60,thickness:5,radius:5,...patch}));
console.log('13 controlli numerici superati; nessuna verifica del PDF o della generazione AI.');
