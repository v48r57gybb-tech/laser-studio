(function(root){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function bounds(w,h){return {x:8,y:8,width:Math.max(1,w-16),height:Math.max(1,h-16)};}
function constrain(r,w,h){const b=bounds(w,h),width=clamp(r.width,Math.min(480,b.width),b.width),height=clamp(r.height,Math.min(360,b.height),b.height);return {x:clamp(r.x,8,w-8-width),y:clamp(r.y,8,h-8-height),width,height};}
function reshape(r,edge,dx,dy,w,h){const b=bounds(w,h),mw=Math.min(480,b.width),mh=Math.min(360,b.height);let x=r.x,y=r.y,right=x+r.width,bottom=y+r.height;if(edge.includes('w'))x=clamp(x+dx,8,right-mw);if(edge.includes('e'))right=clamp(right+dx,x+mw,w-8);if(edge.includes('n'))y=clamp(y+dy,8,bottom-mh);if(edge.includes('s'))bottom=clamp(bottom+dy,y+mh,h-8);return constrain({x,y,width:right-x,height:bottom-y},w,h);}
function mount({container,canvas,frame,settings,actions,seek,status,opener,onResize,onPause,onClose}){
 if(container.dataset.simulationEditor)return;container.dataset.simulationEditor='true';
 const nodes=[...container.childNodes],make=(tag,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;return n;};
 const style=make('style');style.textContent=`
 #stockSimulationEditor[hidden]{display:none!important}
 #stockSimulationEditor{box-sizing:border-box;position:fixed;z-index:10000;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:8px;padding:10px;border:1px solid #7194ab;border-radius:12px;background:#061b2d;color:#e9f2f8;box-shadow:0 18px 70px #000a;overflow:hidden;font:15px system-ui,sans-serif}
 #stockSimulationEditor *{box-sizing:border-box}
 #stockSimulationEditor button{font:inherit;min-height:40px;border:1px solid #7194ab;border-radius:8px;background:#12394e;color:#e9f2f8;padding:6px 10px;cursor:pointer}
 #stockSimulationEditor button:focus-visible,#stockSimulationEditor [tabindex]:focus-visible{outline:3px solid #65dce9;outline-offset:-3px}
 #stockSimulationEditor .se-titlebar{display:flex;align-items:center;gap:8px;justify-content:space-between;touch-action:none;cursor:move;user-select:none}
 #stockSimulationEditor .se-window-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
 #stockSimulationEditor .se-title{margin:0;font-size:16px;white-space:nowrap}
 #stockSimulationEditor .se-workspace{display:flex;min-width:0;min-height:0;gap:8px}
 #stockSimulationEditor .se-scene{display:flex;flex:1;gap:8px;min-width:0;min-height:0}
 #stockSimulationEditor .se-view-controls{display:flex;flex-direction:column;gap:6px;flex:0 0 128px;overflow:auto;max-height:100%;margin:0}
 #stockSimulationEditor .se-view-controls button{width:100%;margin:0}
 #stockSimulationEditor .se-view-controls [data-do=close]{display:none}
 #stockSimulationEditor .stock-canvas-player{flex:1;min-width:0;min-height:0;height:100%;margin:0}
 #stockSimulationEditor canvas{width:100%!important;height:100%!important;display:block;touch-action:none}
 #stockSimulationEditor .se-inspector{flex:0 0 280px;max-width:40%;overflow:auto;min-height:0;padding:10px;background:#0c2a40;border:1px solid #52768d;border-radius:8px}
 #stockSimulationEditor .se-inspector[hidden]{display:none}
 #stockSimulationEditor .se-inspector label{display:block;margin:8px 0}
 #stockSimulationEditor .se-inspector input,#stockSimulationEditor .se-inspector select{max-width:100%;width:100%}
 #stockSimulationEditor .se-footer{display:grid;gap:4px;min-width:0}
 #stockSimulationEditor .se-footer label{display:flex;align-items:center;gap:10px}
 #stockSimulationEditor .se-footer input{flex:1;min-width:0;width:100%}
 #stockSimulationEditor .sim-status{margin:0;max-height:52px;overflow:auto;font-size:12px}
 #stockSimulationEditor .se-resizer{position:absolute;z-index:8;touch-action:none}
 #stockSimulationEditor .se-resizer[data-edge=n]{top:0;left:18px;right:18px;height:7px;cursor:n-resize}
 #stockSimulationEditor .se-resizer[data-edge=s]{bottom:0;left:18px;right:18px;height:7px;cursor:s-resize}
 #stockSimulationEditor .se-resizer[data-edge=w]{left:0;top:18px;bottom:18px;width:7px;cursor:w-resize}
 #stockSimulationEditor .se-resizer[data-edge=e]{right:0;top:18px;bottom:18px;width:7px;cursor:e-resize}
 #stockSimulationEditor .se-resizer[data-edge=nw],#stockSimulationEditor .se-resizer[data-edge=ne],#stockSimulationEditor .se-resizer[data-edge=sw],#stockSimulationEditor .se-resizer[data-edge=se]{width:20px;height:20px}
 #stockSimulationEditor .se-resizer[data-edge=nw]{top:0;left:0;cursor:nw-resize}
 #stockSimulationEditor .se-resizer[data-edge=ne]{top:0;right:0;cursor:ne-resize}
 #stockSimulationEditor .se-resizer[data-edge=sw]{bottom:0;left:0;cursor:sw-resize}
 #stockSimulationEditor .se-resizer[data-edge=se]{bottom:0;right:0;cursor:se-resize;border-right:3px solid #65dce9;border-bottom:3px solid #65dce9;border-radius:0 0 8px 0}
 #stockSimulationEditor[data-maximized=true] .se-resizer,#stockSimulationEditor:fullscreen .se-resizer{display:none}
 #stockSimulationEditor:fullscreen{left:0!important;top:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;border-radius:0}
 @media(max-width:760px){#stockSimulationEditor .se-scene{flex-direction:column}#stockSimulationEditor .se-view-controls{flex:0 0 auto;flex-direction:row;max-height:92px}#stockSimulationEditor .se-view-controls button{width:auto;flex-shrink:0}#stockSimulationEditor .se-inspector{position:absolute;z-index:7;right:12px;top:100px;bottom:100px;width:min(320px,85%);max-width:85%}#stockSimulationEditor .se-titlebar{align-items:flex-start}#stockSimulationEditor .se-window-actions{gap:4px}#stockSimulationEditor .se-window-actions button{font-size:12px;padding:4px 6px}}
 `;document.head.append(style);
 container.id='stockSimulationEditor';container.setAttribute('role','dialog');container.setAttribute('aria-labelledby','stockSimulationEditorTitle');container.tabIndex=-1;canvas.tabIndex=0;
 const header=make('header','se-titlebar'),title=make('h2','se-title'),windowActions=make('div','se-window-actions'),workspace=make('div','se-workspace'),scene=make('div','se-scene'),inspector=make('aside','se-inspector'),footer=make('footer','se-footer');title.id='stockSimulationEditorTitle';title.textContent='Editor simulazione';header.append(title,windowActions);inspector.hidden=true;inspector.setAttribute('aria-label','Impostazioni simulazione');actions.classList.add('se-view-controls');actions.setAttribute('role','toolbar');actions.setAttribute('aria-label','Vista e registrazione simulazione');scene.append(actions,frame);inspector.append(settings);settings.open=true;footer.append(seek.closest('label'),status);
 for(const n of nodes)if(n.parentNode===container)inspector.append(n);
 workspace.append(scene,inspector);container.append(header,workspace,footer);document.body.append(container);
 let maximized=true,rect=constrain({x:40,y:40,width:innerWidth*.8,height:innerHeight*.8},innerWidth,innerHeight),queued=0,wasOpen=false,returnFocus=null,drag=null;
 const schedule=()=>{if(queued)return;queued=requestAnimationFrame(()=>{queued=0;if(!container.hidden)onResize();});};
 function apply(){rect=constrain(rect,innerWidth,innerHeight);const r=maximized?bounds(innerWidth,innerHeight):rect;Object.assign(container.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});container.dataset.maximized=String(maximized);maximize.textContent=maximized?'Ripristina':'Ingrandisci';maximize.setAttribute('aria-label',maximized?'Ripristina finestra mobile e ridimensionabile':'Ingrandisci editor');schedule();}
 function button(text,label,fn){const b=make('button');b.type='button';b.textContent=text;b.title=label;b.setAttribute('aria-label',label);b.onclick=e=>{e.preventDefault();e.stopPropagation();fn();};windowActions.append(b);return b;}
 const options=button('Impostazioni','Mostra o nascondi impostazioni',()=>{inspector.hidden=!inspector.hidden;options.setAttribute('aria-expanded',String(!inspector.hidden));schedule();});options.setAttribute('aria-expanded','false');
 const maximize=button('Ripristina','Ripristina finestra mobile e ridimensionabile',()=>{maximized=!maximized;apply();});
 const full=button('Schermo intero','Attiva schermo intero',()=>{const promise=document.fullscreenElement===container?document.exitFullscreen():container.requestFullscreen();promise?.catch(()=>{full.title='Schermo intero non disponibile: usa Ingrandisci';});});full.hidden=typeof container.requestFullscreen!=='function';
 function close(){if(container.hidden)return;onPause();if(document.fullscreenElement===container)document.exitFullscreen()?.catch(()=>{});onClose();}
 button('Chiudi','Chiudi editor e metti in pausa',close);
 function visibility(){if(!container.hidden&&!wasOpen){wasOpen=true;returnFocus=document.activeElement;apply();container.focus({preventScroll:true});}else if(container.hidden&&wasOpen){wasOpen=false;onPause();if(document.fullscreenElement===container)document.exitFullscreen()?.catch(()=>{});(returnFocus?.isConnected?returnFocus:opener)?.focus({preventScroll:true});}}
 new MutationObserver(visibility).observe(container,{attributes:true,attributeFilter:['hidden']});
 new ResizeObserver(schedule).observe(frame);
 document.addEventListener('fullscreenchange',()=>{const active=document.fullscreenElement===container;full.textContent=active?'Esci schermo intero':'Schermo intero';full.setAttribute('aria-label',full.textContent);maximize.disabled=active;schedule();});
 container.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.fullscreenElement){e.preventDefault();close();}});
 header.addEventListener('dblclick',e=>{if(!e.target.closest('button')&&!document.fullscreenElement){maximized=!maximized;apply();}});
 function attach(node,edge){node.addEventListener('pointerdown',e=>{if(e.button!==0||maximized||document.fullscreenElement||e.target.closest('button'))return;e.preventDefault();e.stopPropagation();drag={node,id:e.pointerId,x:e.clientX,y:e.clientY,rect:{...rect},edge};node.setPointerCapture(e.pointerId);});node.addEventListener('pointermove',e=>{if(!drag||drag.node!==node||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;rect=edge?reshape(drag.rect,edge,dx,dy,innerWidth,innerHeight):constrain({...drag.rect,x:drag.rect.x+dx,y:drag.rect.y+dy},innerWidth,innerHeight);apply();});const end=e=>{if(drag?.node===node&&drag.id===e.pointerId){drag=null;if(node.hasPointerCapture(e.pointerId))node.releasePointerCapture(e.pointerId);}};for(const event of ['pointerup','pointercancel','lostpointercapture'])node.addEventListener(event,end);}
 attach(header,'');header.tabIndex=0;header.setAttribute('aria-label','Barra titolo: trascina o usa le frecce per spostare la finestra ripristinata');header.addEventListener('keydown',e=>{if(e.target!==header||maximized||document.fullscreenElement||!e.key.startsWith('Arrow'))return;e.preventDefault();const n=e.shiftKey?50:10;rect=constrain({...rect,x:rect.x+(e.key==='ArrowRight'?n:e.key==='ArrowLeft'?-n:0),y:rect.y+(e.key==='ArrowDown'?n:e.key==='ArrowUp'?-n:0)},innerWidth,innerHeight);apply();});
 for(const edge of ['n','s','e','w','ne','nw','se','sw']){const handle=make('div','se-resizer');handle.dataset.edge=edge;if(edge==='se'){handle.tabIndex=0;handle.setAttribute('role','button');handle.setAttribute('aria-label','Ridimensiona finestra con i tasti freccia');handle.addEventListener('keydown',e=>{if(maximized||document.fullscreenElement||!e.key.startsWith('Arrow'))return;e.preventDefault();e.stopPropagation();const n=e.shiftKey?50:10;rect=reshape(rect,'se',e.key==='ArrowRight'?n:e.key==='ArrowLeft'?-n:0,e.key==='ArrowDown'?n:e.key==='ArrowUp'?-n:0,innerWidth,innerHeight);apply();});}else handle.setAttribute('aria-hidden','true');container.append(handle);attach(handle,edge);}
 window.addEventListener('resize',apply);apply();visibility();
 return {close};
}
root.StockSimulationEditor={mount,constrain,reshape};
})(window);
