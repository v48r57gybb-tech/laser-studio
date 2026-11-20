import test from 'node:test';
import assert from 'node:assert/strict';
import {initialProject} from '../lib/stock-ui-model.mjs';
import {checkStockInputs,stockOperationDefaults} from '../stock-feedback.mjs';
test('segnala i passi tasca con campi distinti',()=>{const p=initialProject(),t=p.tools.find(t=>t.id==='tool-4');t.loaded=true;t.fluteLength=20;t.parameters={rpm:1000,feed:200,entryFeed:50,coolant:'off'};p.operations=[{id:'tasca',type:'pocket',enabled:true,toolId:t.id,parameters:{depth:5,stepZ:4,stepOver:7}}];assert.throws(()=>checkStockInputs(p),e=>e.issues.some(i=>i.field==='stepZ')&&e.issues.some(i=>i.field==='stepOver'));});
test('quota sonda proposta entro intervallo geometrico',()=>{const p=initialProject(),v=stockOperationDefaults('probe',{clearance:5},p);assert(v.sideTipZ>=-45&&v.sideTipZ<=-8);});
test('angolo smussatore mancante identifica il campo utensile',()=>{const p=initialProject(),t=p.tools.find(t=>t.kind==='chamfer');p.operations=[{id:'smusso',type:'chamfer',enabled:true,toolId:t.id,parameters:{width:1}}];assert.throws(()=>checkStockInputs(p),e=>e.issues.some(i=>i.field==='angle'&&i.toolId===t.id));});
