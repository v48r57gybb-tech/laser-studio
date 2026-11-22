import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function fixture(supported=true){
 const nodes=[],handlers={},recorders=[],timers=[],revoked=[];
 function node(tag){const n={tag,style:{},children:[],disabled:false,textContent:'',hidden:false,setAttribute(){},removeAttribute(k){delete this[k];},append(...items){this.children.push(...items);},after(item){this.next=item;},addEventListener(k,fn){this[k]=fn;},click(){this.clicks=(this.clicks||0)+1;this.onclick?.();}};nodes.push(n);return n;}
 const fit=node('fit'),actions={querySelector:()=>fit},container={hidden:false},seek=node('seek');let stopped=0;
 const canvas={captureStream:()=>({getTracks:()=>[{stop(){stopped++;}}]})};
 class Recorder{static isTypeSupported(){return true;}constructor(stream,options){this.state='inactive';this.mimeType=options.mimeType;recorders.push(this);}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:{size:12}});this.onstop?.();}}
 const window={MediaRecorder:supported?Recorder:undefined,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:u=>revoked.push(u)},addEventListener:(k,fn)=>handlers[k]=fn};
 runInNewContext(readFileSync('stock-simulation-save.js','utf8'),{window,document:{createElement:node},Blob:class{},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){}});
 const controller=window.StockSimulationSave.mount({container,canvas,actions,seek}),box=fit.next,[button,message,link]=box.children;
 const update=(extra={})=>controller.update({hidden:false,full:true,running:true,done:false,...extra});
 return {controller,update,button,message,link,fit,box,recorders,seek,handlers,timers,revoked,stopped:()=>stopped};
}
const f=fixture();assert.equal(f.fit.next,f.box);assert.equal(f.button.textContent,'Salva simulazione');assert(f.button.disabled);
f.controller.prepare('drill',true);f.update({full:false});assert.equal(f.recorders.length,0);
f.controller.prepare('',true);f.update({running:false});assert.equal(f.recorders.length,0);f.update();assert.equal(f.recorders.length,1);assert.equal(f.recorders[0].state,'recording');
f.update({running:false});assert.equal(f.recorders[0].state,'recording');f.update({done:true,running:false});assert(!f.button.disabled);assert.match(f.message.textContent,/Vuoi salvarla/);assert.equal(f.link.clicks,undefined);assert.equal(f.stopped(),1);f.button.onclick();assert.equal(f.link.clicks,1);
f.controller.prepare('',true);assert(f.button.disabled);assert.equal(f.revoked.length,1);f.update();assert.equal(f.recorders.length,2);f.seek.input();assert(f.button.disabled);assert.match(f.message.textContent,/posizione/);f.update({done:true,running:false});assert(f.button.disabled);
f.controller.prepare('',true);f.update();f.update({hidden:true});assert(f.button.disabled);assert.match(f.message.textContent,/chiusura/);
f.controller.prepare('',true);f.update();f.timers.at(-1)();assert(f.button.disabled);assert.match(f.message.textContent,/5 minuti/);f.update({done:true});assert(f.button.disabled);
f.controller.prepare('',true);f.update();f.recorders.at(-1).ondataavailable({data:{size:150000001}});assert(f.button.disabled);assert.match(f.message.textContent,/150 MB/);
f.controller.prepare('',true);f.update();f.handlers.pagehide();assert(f.button.disabled);
const unsupported=fixture(false);unsupported.controller.prepare('',true);unsupported.update();assert(unsupported.button.disabled);assert.match(unsupported.message.textContent,/non supportata/);
console.log('PASS salvataggio: pulsante sotto Inquadra; solo programma completo; pausa conservata; proposta a fine registrazione; download solo su clic; nuova esecuzione, seek, chiusura, limiti e browser non supportato gestiti. Browser reale e codifica video da collaudare.');
