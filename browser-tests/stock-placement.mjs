import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4175','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});let browser;const results=[];await mkdir('browser-results',{recursive:true});
async function saved(page,axis){return page.locator('#stOps [data-operation-field="'+axis+'"]').first().inputValue();}
async function near(actual,expected,tolerance=.001){assert(Number.isFinite(Number(actual))&&Math.abs(Number(actual)-expected)<=tolerance,'Atteso '+expected+', ottenuto '+actual);}
try{let ready=false;for(let i=0;i<50;i++){try{ready=(await fetch('http://127.0.0.1:4175')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,200));}assert(ready);browser=await chromium.launch();
for(const width of [1280,390]){const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());try{
 await page.goto('http://127.0.0.1:4175',{waitUntil:'networkidle'});await page.selectOption('#partType','stock');
 await page.getByRole('button',{name:'Nuovo foro',exact:true}).click();assert.equal(await page.locator('#stOps [data-operation-field="x"]').count(),0);
 await page.locator('#stockPlacementX').fill('25');await page.locator('#stockPlacementY').fill('-30');await page.locator('#stockPlacement_depth').fill('6');await page.locator('#stockPlacementApply').click();await near(await saved(page,'x'),25);await near(await saved(page,'y'),-30);await near(await saved(page,'depth'),6);
 await page.locator('#stockPlacementX').fill('40');await page.locator('#stockPlacementY').click();await near(await saved(page,'x'),25);await page.locator('#stockPlacementCancel').click();await near(await saved(page,'x'),25);
 await page.locator('#stockPlacementDrawing').click();await near(await saved(page,'x'),25);await near(await saved(page,'y'),-30);const proposedX=await page.inputValue('#stockPlacementX'),proposedY=await page.inputValue('#stockPlacementY');
 const tolerance=await page.locator('#stockPlacementDrawing').evaluate(e=>1/Math.abs(e.getScreenCTM().a)+.001);await near(proposedX,50,tolerance);await near(proposedY,-50,tolerance);
 await page.locator('#stockPlacementApply').click();await near(await saved(page,'x'),Number(proposedX));await near(await saved(page,'y'),Number(proposedY));
 await page.selectOption('#stOrigin','center');await page.locator('#stockPlacementX').fill('0');await page.locator('#stockPlacementY').fill('0');await page.locator('#stockPlacementApply').click();await near(await saved(page,'x'),0);await near(await saved(page,'y'),0);
 await page.getByRole('button',{name:'Nuova tasca',exact:true}).click();await page.locator('#stockPlacement_length').fill('35');await page.locator('#stockPlacement_width').fill('25');await page.locator('#stockPlacement_depth').fill('4');await page.locator('#stockPlacementApply').click();assert.equal(await page.locator('#stOps [data-operation-field="x"]').count(),2);
 await page.getByRole('button',{name:'Nuova asola',exact:true}).click();await page.locator('#stockPlacementCancel').click();assert.equal(await page.locator('#stOps [data-operation-field="x"]').count(),2);assert.deepEqual(errors,[]);
 results.push({width,status:'superato',scope:'creazione e modifica a bozza, quote e profondità, clic facoltativo entro un pixel, conferma, annulla, zero centrale e tasca'});
}catch(e){results.push({width,status:'fallito',error:e.stack,pageErrors:errors,statusText:await page.locator('#stockPlacementStatus').textContent()});}await page.screenshot({path:'browser-results/posizionamento-'+width+'.png',fullPage:true});await page.close();}
}finally{await browser?.close();server.kill();await writeFile('browser-results/posizionamento.json',JSON.stringify(results,null,2));}console.log(JSON.stringify(results,null,2));assert(results.length===2&&results.every(r=>r.status==='superato'),'Test posizionamento non superato');
