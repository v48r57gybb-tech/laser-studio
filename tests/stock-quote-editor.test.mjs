import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../lib/stock-workspace.mjs';
import {quoteFields,initialQuote,applyQuote,quoteRows} from '../stock-quote-editor.mjs';

function project(){
  const p=createProject('TEST QUOTE INTELLIGENTI');
  p.geometry.finished={type:'box',width:100,depth:100,height:20};
  p.setup={safeZ:20,changeZ:200,externalMargin:5,topFacedConfirmed:false,externalFinishedConfirmed:false,finishStockConfirmed:false};
  const face=p.tools.find(t=>t.kind==='face');
  const mill=p.tools.find(t=>t.kind==='mill'&&t.diameter===4);
  face.loaded=true;
  mill.loaded=true;
  mill.fluteLength=20;
  mill.parameters={rpm:2000,feed:500,entryFeed:100,coolant:'off'};
  p.tools.push({id:'test-drill',station:11,kind:'drill',diameter:6.8,tipAngle:118,fluteLength:20,loaded:true,parameters:{rpm:2000,feed:500,entryFeed:100,coolant:'off'}});
  p.operations=[
    {id:'holes',type:'drilling',enabled:true,toolId:'test-drill',parameters:{pattern:'line',x:20,y:-20,count:3,pitch:10,angle:0,depth:8,rPlane:2,cycle:'G81',q:1,breakthroughConfirmed:false}},
    {id:'pocket',type:'pocket',enabled:true,toolId:mill.id,parameters:{shape:'rounded-rectangle',x:50,y:-50,length:40,width:20,radius:5,angle:0,depth:4,stepZ:2,stepOver:1,entry:'ramp',rampAngle:3,finishLeadMargin:1,finish:false}}
  ];
  return p;
}

test('le quote iniziali sono coerenti con il pezzo finito e lo zero',()=>{
  const p=project(),operation=p.operations[1];
  const values=initialQuote(operation,p.geometry);
  assert.equal(values.x,50);
  assert.equal(values.y,-50);
  assert.equal(values.length,40);
  assert.equal(values.width,20);
});

test('la modifica delle quote viene validata prima di alterare il progetto',()=>{
  const p=project(),operation=p.operations[0];
  const values=initialQuote(operation,p.geometry);
  values.count=4;
  values.pitch=15;
  const updated=applyQuote(operation,values);
  assert.equal(updated.count,4);
  assert.equal(updated.pitch,15);
  assert.throws(()=>applyQuote(operation,{...values,pitch:0}),/Interasse positivo/);
  assert.throws(()=>applyQuote(operation,{...values,depth:''}),/Profondità richiesto/);
});

test('la tabella riflette fori espansi e lavorazioni attive',()=>{
  const p=project(),rows=quoteRows(p,p.geometry);
  assert.equal(rows.length,2);
  assert.equal(rows[0].count,3);
  assert.equal(rows[1].count,1);
  assert.match(rows[0].description,/3 foro\/i/);
  assert.match(rows[1].description,/Tasca/);
});

test('i campi dell’editor corrispondono allo schema della lavorazione',()=>{
  const p=project();
  assert(quoteFields(p.operations[0]).some(f=>f.key==='pitch'));
  assert(quoteFields(p.operations[1]).some(f=>f.key==='stepOver'));
  assert.throws(()=>quoteFields({type:'unknown',parameters:{}}),/non supportato/);
});
