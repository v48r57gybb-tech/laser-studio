import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4175','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
let browser;const results=[];
await mkdir('browser-results',{recursive:true});
async function snapshot(page){return page.evaluate(()=>{const q=s=>document.querySelector(s),svg=q('#stockPlacementDrawing'),m=svg?.getScreenCTM(),b=svg?.getBoundingClientRect();return {origin:q('#stOrigin')?.value,x:q('#stockPlacementX')?.value,y:q('#stockPlacementY')?.value,status:q('#stockPlacementStatus')?.textContent,focused:document.activeElement?.id,viewBox:svg?.getAttribute('viewBox'),rect:b?{x:b.x,y:b.y,width:b.width,height:b.height}:null,matrix:m?{a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f}:null,operationCoordinates:[...document.querySelectorAll('[data-operation-field="x"],[data-operation-field="y"]')].map(i=>({id:i.dataset.operationId,axis:i.dataset.operationField,value:i.value}))};});}
async function expectCoordinate(page,id,expected){const actual=Number(await page.inputValue(id));assert(Number.isFinite(actual)&&Math.abs(actual-expected)<.1,`${id}: atteso ${expected}, ottenuto ${actual}; ${JSON.stringify(await snapshot(page))}`);}
try{
 let ready=false;for(let i=0;i<50;i++){try{ready=(await fetch('http://127.0.0.1:4175')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,200));}assert(ready);
 browser=await chromium.launch();
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],trace=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:4175',{waitUntil:'networkidle'});
   await page.evaluate(()=>{window.__placementClicks=[];document.addEventListener('click',e=>{const svg=document.querySelector('#stockPlacementDrawing');if(svg?.contains(e.target)){const m=svg.getScreenCTM(),p=m?new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()):null;window.__placementClicks.push({target:e.target.tagName,clientX:e.clientX,clientY:e.clientY,svgX:p?.x,svgY:p?.y});}},true);});
   await page.selectOption('#partType','stock');
   await page.getByRole('button',{name:'Nuovo foro',exact:true}).click();
   assert.equal(await page.inputValue('#stockPlacementX'),'50');assert.equal(await page.inputValue('#stockPlacementY'),'-50');
   await page.locator('#stockPlacementX').fill('25');await page.locator('#stockPlacementY').click();assert.equal(await page.inputValue('#stockPlacementX'),'25');
   const svg=page.locator('#stockPlacementDrawing');
   trace.push({step:'before-top-left-click',state:await snapshot(page)});
   await svg.click();
   trace.push({step:'after-top-left-click',state:await snapshot(page)});
   await expectCoordinate(page,'#stockPlacementX',50);await expectCoordinate(page,'#stockPlacementY',-50);
   await page.selectOption('#stOrigin','center');await page.waitForTimeout(100);
   trace.push({step:'before-center-click',state:await snapshot(page)});
   await svg.click();
   trace.push({step:'after-center-click',state:await snapshot(page)});
   await expectCoordinate(page,'#stockPlacementX',0);await expectCoordinate(page,'#stockPlacementY',0);
   await page.getByRole('button',{name:'Nuova tasca',exact:true}).click();assert.equal(await page.locator('#stockPlacementOperation option').count(),3);assert.deepEqual(errors,[]);
   results.push({width,status:'superato',trace,clicks:await page.evaluate(()=>window.__placementClicks)});
  }catch(e){results.push({width,status:'fallito',error:e.stack,pageErrors:errors,trace,state:await snapshot(page),clicks:await page.evaluate(()=>window.__placementClicks)});}
  await page.screenshot({path:`browser-results/posizionamento-${width}.png`,fullPage:true});await page.close();
 }
}finally{await browser?.close();server.kill();await writeFile('browser-results/posizionamento.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));assert(results.length===2&&results.every(r=>r.status==='superato'),'Test posizionamento fallito: consultare valori e traccia JSON');
