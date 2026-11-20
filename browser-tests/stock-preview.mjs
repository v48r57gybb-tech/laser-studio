import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4174','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
let browser;const results=[];await mkdir('browser-results',{recursive:true});
try{
 let ready=false;for(let i=0;i<50;i++){try{ready=(await fetch('http://127.0.0.1:4174')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,200));}assert(ready);
 browser=await chromium.launch();
 for(const width of [1280,390]){const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));try{await page.goto('http://127.0.0.1:4174',{waitUntil:'networkidle'});await page.selectOption('#partType','stock');await page.waitForFunction(()=>document.querySelector('#stockPreview')?.dataset.valid==='true');await page.locator('#stWidth').fill('150');await page.waitForFunction(()=>document.querySelector('#stockPreviewStatus').textContent.includes('150 ×'));await page.locator('#stWidth').fill('0');await page.waitForFunction(()=>document.querySelector('#stockPreview').dataset.valid==='false');await page.locator('#stWidth').fill('100');for(const type of ['box','plate','cylinder','tube','L','U','T','custom']){await page.selectOption('#stType',type);await page.waitForFunction(()=>document.querySelector('#stockPreview').dataset.valid==='true');await page.locator('#stockPreview').getByRole('button',{name:'Dall’alto',exact:true}).click();await page.locator('#stockPreview').getByRole('button',{name:'Vista 3D',exact:true}).click();}assert.deepEqual(errors,[]);results.push({width,status:'superato'});}catch(e){results.push({width,status:'fallito',error:e.stack,pageErrors:errors});}await page.screenshot({path:`browser-results/anteprima-3d-${width}.png`,fullPage:true});await page.close();}
}finally{await browser?.close();server.kill();await writeFile('browser-results/anteprima-3d.json',JSON.stringify(results,null,2));}console.log(JSON.stringify(results,null,2));assert(results.length===2&&results.every(r=>r.status==='superato'),'Test anteprima 3D fallito');
