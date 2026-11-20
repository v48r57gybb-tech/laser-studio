export function mountStockCards({form,getProject,changed}){
 const placement=form.querySelector('#stockPlacement');if(!placement)throw Error('Sezione lavorazioni sul pezzo non trovata');placement.hidden=true;
 const style=document.createElement('style');style.textContent=`
 #stockForm #stockPlacement{display:none!important}
 #stockForm .stock-fold{box-sizing:border-box;margin:12px 0;padding:12px;border:1px solid #52768d;border-radius:12px;background:#0c2a40;color:inherit;min-width:0}
 #stockForm .stock-fold>summary{cursor:pointer;padding:8px;font:inherit;list-style:none;border:1px solid #7194ab;border-radius:9px;background:#153c52}
 #stockForm .stock-fold>summary::-webkit-details-marker{display:none}
 #stockForm .stock-fold>summary:focus-visible{outline:2px solid #86edaf}
 #stockForm .stock-fold[open]>summary{margin-bottom:12px}
 #stockForm .stock-fold fieldset{box-sizing:border-box;min-width:0;border:1px solid #52768d;border-radius:10px;padding:12px;margin:10px 0}
 #stockForm .stock-op>summary{display:flex;align-items:center;justify-content:space-between;gap:12px}
 #stockForm .stock-grip{cursor:grab;touch-action:none;flex:0 0 auto;user-select:none}
 #stockForm .stock-op.stock-dragging{outline:2px solid #86edaf;opacity:.75}
 #stockForm .stock-op.stock-drop{outline:2px dashed #86edaf}
 #stockForm .stock-op-menu{margin-top:10px;padding:10px;border:1px solid #7194ab;border-radius:9px}
 `;form.append(style);
 const openState=new Map();
 function decorate(details){details.classList.add('stock-fold');}
 for(const details of form.querySelectorAll('details')){if(placement.contains(details)||details.id==='stockOriginPanel'||details.classList.contains('muted'))continue;decorate(details);}
 function tools(){for(const box of form.querySelectorAll('#stTools>fieldset'))box.style.borderRadius='10px';}
 function move(id,targetId,after){const p=getProject(),from=p.operations.findIndex(o=>o.id===id),target=p.operations.findIndex(o=>o.id===targetId);if(from<0||target<0||from===target)return;const [op]=p.operations.splice(from,1);const index=p.operations.findIndex(o=>o.id===targetId)+(after?1:0);p.operations.splice(index,0,op);changed();}
 function operations(){
 const host=form.querySelector('#stOps');if(!host)throw Error('Elenco operazioni non trovato');
 [...host.children].forEach((box,index)=>{if(box.tagName!=='FIELDSET')return;const op=getProject().operations[index];if(!op)return;
 const card=document.createElement('details');card.className='stock-fold stock-op';card.dataset.operationId=op.id;card.open=openState.get(op.id)===true;
 const summary=document.createElement('summary'),text=document.createElement('span'),grip=document.createElement('button');grip.type='button';grip.className='stock-grip';grip.textContent='⠿';grip.setAttribute('aria-label','Trascina per riordinare; usa anche Freccia su e Freccia giù');
 const toolSelect=box.querySelector('select'),legend=box.querySelector('legend'),type=legend?.textContent.replace(/^\d+\.\s*/,'')??op.type;
 function title(){text.textContent=(toolSelect?.selectedOptions[0]?.textContent??'Utensile da selezionare')+' · '+type;}title();toolSelect?.addEventListener('change',title);
 summary.append(text,grip);card.append(summary);box.before(card);card.append(box);
 for(const button of box.querySelectorAll('.actions button'))if(['Sposta su','Sposta giù','Elimina lavorazione'].includes(button.textContent))button.remove();
 const menu=document.createElement('div');menu.className='stock-op-menu';menu.hidden=true;menu.setAttribute('role','group');menu.setAttribute('aria-label','Azioni lavorazione');const remove=document.createElement('button'),cancel=document.createElement('button');remove.type=cancel.type='button';remove.textContent='Elimina lavorazione';cancel.textContent='Annulla';menu.append(remove,cancel);card.append(menu);
 remove.onclick=()=>{if(!confirm('Eliminare questa lavorazione?'))return;const p=getProject(),i=p.operations.findIndex(o=>o.id===op.id);if(i<0)return;p.operations.splice(i,1);openState.delete(op.id);changed();};cancel.onclick=()=>{menu.hidden=true;summary.focus();};
 let suppress=false,hold=null,press=null;
 function showMenu(){suppress=true;menu.hidden=false;remove.focus();}
 card.addEventListener('toggle',()=>{if(card.isConnected)openState.set(op.id,card.open);});
 summary.addEventListener('click',e=>{if(suppress){e.preventDefault();suppress=false;}});
 const clearHold=()=>{clearTimeout(hold);hold=null;press=null;};
 card.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,input,select,textarea,a'))return;press={x:e.clientX,y:e.clientY};hold=setTimeout(()=>{hold=null;showMenu();},650);});
 card.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8)clearHold();});
 for(const name of ['pointerup','pointercancel','pointerleave'])card.addEventListener(name,clearHold);
 summary.addEventListener('contextmenu',e=>{if(e.target.closest('.stock-grip'))return;e.preventDefault();clearHold();showMenu();});
 summary.addEventListener('keydown',e=>{if(e.key==='F10'&&e.shiftKey){e.preventDefault();showMenu();}if(e.key==='Escape'){menu.hidden=true;}});
 grip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
 grip.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const ops=getProject().operations,i=ops.findIndex(o=>o.id===op.id),target=ops[i+(e.key==='ArrowUp'?-1:1)];if(target){move(op.id,target.id,e.key==='ArrowDown');[...host.querySelectorAll('.stock-op')].find(c=>c.dataset.operationId===op.id)?.querySelector('.stock-grip').focus();}});
 let drag=null;function clearDrop(){for(const c of host.querySelectorAll('.stock-drop'))c.classList.remove('stock-drop');}
 grip.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();clearHold();drag={id:e.pointerId,y:e.clientY,moved:false,target:null,after:false};grip.setPointerCapture(e.pointerId);});
 grip.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.abs(e.clientY-drag.y)<6&&!drag.moved)return;drag.moved=true;card.classList.add('stock-dragging');clearDrop();const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.stock-op');drag.target=null;if(target&&target!==card&&host.contains(target)){const r=target.getBoundingClientRect();drag.target=target.dataset.operationId;drag.after=e.clientY>r.top+r.height/2;target.classList.add('stock-drop');}if(e.clientY<70)window.scrollBy(0,-18);else if(e.clientY>innerHeight-70)window.scrollBy(0,18);});
 function finish(e,cancelled=false){if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;clearDrop();card.classList.remove('stock-dragging');if(grip.hasPointerCapture(e.pointerId))grip.releasePointerCapture(e.pointerId);if(!cancelled&&d.moved&&d.target)move(op.id,d.target,d.after);}
 grip.addEventListener('pointerup',e=>finish(e));grip.addEventListener('pointercancel',e=>finish(e,true));grip.addEventListener('lostpointercapture',e=>finish(e,true));
 });
 }
 return {operations,tools};
}
