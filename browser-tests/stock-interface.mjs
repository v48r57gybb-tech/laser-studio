import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
let browser;
const results=[];
await mkdir('browser-results',{recursive:true});
try{
 let ready=false;
 for(let n=0;n<50;n++){try{ready=(await fetch('http://127.0.0.1:4173')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,200));}
 assert(ready,'Server dist non disponibile');
 browser=await chromium.launch({headless:true});
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  const name=String(viewport.width);
  try{
   await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
   await page.selectOption('#partType','stock');
   await page.locator('#stockName').waitFor({state:'visible'});
   assert.equal(await page.inputValue('#stWidth'),'100');
   assert.equal(await page.inputValue('#stMargin'),'5');
   assert.equal(await page.locator('#stDiameter').isVisible(),false);
   assert.equal(await page.locator('#stTools fieldset').count(),1);
   await page.selectOption('#stType','tube');
   assert(await page.locator('#stInner').isVisible());
   assert.equal(await page.locator('#stWidth').isVisible(),false);
   await page.getByRole('button',{name:'Nuova generazione',exact:true}).click();
   await page.locator('#stTools input[type=checkbox]').check();
   const fields=page.locator('#stTools input[type=number]');
   await fields.nth(0).fill('1200');
   await fields.nth(1).fill('240');
   await page.locator('#stockForm button[type=submit]').click();
   let iso=await page.inputValue('#stOutput');
   assert.match(iso,/S1200\b/);
   assert.match(iso,/F240\b/);
   await page.locator('#stockName').fill('Prova browser '+name);
   assert.equal(await page.inputValue('#stOutput'),'');
   await page.getByText('Archivio e scambio progetto',{exact:true}).click();
   await page.locator('#stSave').click();
   assert.match(await page.locator('#stStatus').innerText(),/Progetto salvato/);
   await page.locator('#stTools input[type=number]').nth(1).fill('260');
   await page.locator('#stockForm button[type=submit]').click();
   iso=await page.inputValue('#stOutput');
   assert.match(iso,/F260\b/);
   await page.locator('#stSave').click();
   await page.selectOption('#stockArchivePicker',{label:'Prova browser '+name});
   await page.locator('#stLoad').click();
   assert.equal(await page.locator('#stTools input[type=number]').nth(1).inputValue(),'260');
   assert(await page.locator('#stTools input[type=checkbox]').isChecked());
   await page.getByRole('button',{name:'Nuova generazione',exact:true}).click();
   assert.equal(await page.inputValue('#stOutput'),'');
   assert.equal(await page.locator('#stTools input[type=checkbox]').isChecked(),false);
   await page.selectOption('#partType','straight');
   assert(await page.locator('#form').isVisible());
   await page.selectOption('#partType','arc');
   assert(await page.locator('#arcForm').isVisible());
   assert.deepEqual(errors,[],'Errori JavaScript nel browser');
   results.push({viewport,status:'superato',scope:'campi, utensili, generazione, archivio, reset e cambio modalità; non CNC, simulazione o collaudo completo Dritto/Arco'});
  }catch(e){results.push({viewport,status:'fallito',error:e.stack,pageErrors:errors});}
  await page.screenshot({path:'browser-results/schermata-'+name+'.png',fullPage:true});
  await context.close();
 }
}finally{
 await browser?.close();server.kill();
 await writeFile('browser-results/risultati.json',JSON.stringify(results,null,2));
}
console.log(JSON.stringify(results,null,2));
assert(results.length===2&&results.every(r=>r.status==='superato'),'Collaudo browser non superato');
