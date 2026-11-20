import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4175','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
let browser;const results=[];await mkdir('browser-results',{recursive:true});
async function state(page){return page.evaluate(()=>({origin:document.querySelector('#stOrigin')?.value,x:document.querySelector('#stockPlacementX')?.value,y:document.querySelector('#stockPlacementY')?.value,status:document.querySelector('#stockPlacementStatus')?.textContent,clicks:window.__placementClicks,operations:[...document.querySelectorAll('[data-operation-field="x"],[data-operation-field="y"]')].map(i=>({axis:i.dataset.operationField,value:i.value}))}));}
function near(actual,expected,tolerance,label){assert(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,`${label}: atteso ${expected}, ottenuto ${actual}, tolleranza ${tolerance}`);}
async function exact(page,x,y){const s=await state(page);near(Number(s.x),x,.001,'X numerica');near(Number(s.y),y,.001,'Y numerica');for(const [axis,value]of [['x',x],['y',y]]){const fields=s.operations.filter(i=>i.axis===axis);assert.equal(fields.length,1);near(Number(fields[0].value),value,.001,axis+' scheda');}}
async function clickCenter(page,x,y){const count=await page.evaluate(()=>window.__placementClicks.length);await page.locator('#stockPlacementDrawing').click();const s=await state(page);assert.equal(s.clicks.length,count+1,'Il clic deve raggiungere SVG');const c=s.clicks.at(-1),det=c.a*c.d-c.b*c.c;assert(Number.isFinite(det)&&Math.abs(det)>1e-9);const tx=(Math.abs(c.d)+Math.abs(c.c))/Math.abs(det),ty=(Math.abs(c.b)+Math.abs(c.a))/Math.abs(det);near(c.svgX,c.centerX,tx,'Clic X entro un pixel CSS');near(c.svgY,c.centerY,ty,'Clic Y entro un pixel CSS');await exact(page,x+c.svgX-c.centerX,y-c.svgY+c.centerY);}
try{
 let ready=false;for(let i=0;i<50;i++){try{ready=(await fetch('http://127.0.0.1:4175')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,200));}assert(ready);browser=await chromium.launch();
 for(const width of [1280,390]){const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));try{
  await page.goto('http://127.0.0.1:4175',{waitUntil:'networkidle'});
  await page.evaluate(()=>{window.__placementClicks=[];document.addEventListener('click',e=>{const svg=document.querySelector('#stockPlacementDrawing');if(svg?.contains(e.target)){const m=svg.getScreenCTM(),v=svg.viewBox.baseVal,p=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse());window.__placementClicks.push({target:e.target.tagName,clientX:e.clientX,clientY:e.clientY,svgX:p.x,svgY:p.y,centerX:v.x+v.width/2,centerY:v.y+v.height/2,a:m.a,b:m.b,c:m.c,d:m.d});}},true);});
  await page.selectOption('#partType','stock');await page.getByRole('button',{name:'Nuovo foro',exact:true}).click();await exact(page,50,-50);
  await page.locator('#stockPlacementX').fill('25');await page.locator('#stockPlacementY').click();await exact(page,25,-50);
  await clickCenter(page,50,-50);
  await page.locator('#stockPlacementX').fill('50');await page.locator('#stockPlacementX').press('Tab');await page.locator('#stockPlacementY').fill('-50');await page.locator('#stockPlacementY').press('Tab');await exact(page,50,-50);
  await page.selectOption('#stOrigin','center');await page.waitForTimeout(100);await clickCenter(page,0,0);
  await page.locator('#stockPlacementX').fill('0');await page.locator('#stockPlacementX').press('Tab');await page.locator('#stockPlacementY').fill('0');await page.locator('#stockPlacementY').press('Tab');await exact(page,0,0);
  await page.getByRole('button',{name:'Nuova tasca',exact:true}).click();assert.equal(await page.locator('#stockPlacementOperation option').count(),3);assert.deepEqual(errors,[]);results.push({width,status:'superato',state:await state(page)});
 }catch(e){results.push({width,status:'fallito',error:e.stack,pageErrors:errors,state:await state(page)});}await page.screenshot({path:`browser-results/posizionamento-${width}.png`,fullPage:true});await page.close();}
}finally{await browser?.close();server.kill();await writeFile('browser-results/posizionamento.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));assert(results.length===2&&results.every(r=>r.status==='superato'),'Test posizionamento fallito: consultare valori e traccia JSON');
