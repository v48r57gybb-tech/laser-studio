import {resolveGeometry} from './lib/stock-geometry-tools.mjs';
import {geometryFields,numericInput} from './lib/stock-ui-model.mjs';
export function rebaseOrigin(input,geometry,xy){const p=structuredClone(input),g=structuredClone(geometry);g.origin.xy=input.geometry.origin.xy;const old=resolveGeometry(g).reference;g.origin.xy=xy;const next=resolveGeometry(g).reference;for(const op of p.operations){if(!['drilling','pocket'].includes(op.type))continue;for(const axis of ['x','y']){const value=numericInput(op.parameters[axis],axis);op.parameters[axis]=Number((value+old[axis]-next[axis]).toFixed(9));}}p.geometry=g;return p;}
export function mountStockOrigin({form,getProject,replaceProject,changed}){
 const select=document.getElementById('stOrigin'),field=select?.closest('.field');
 const preview=form.querySelector('#stockPreview'),actions=preview?.querySelector('.actions');
 if(!field||!actions)throw Error('Comandi zero o anteprima 3D non trovati');
 const menu=document.createElement('details');menu.id='stockOriginPanel';menu.style.position='relative';
 const toggle=document.createElement('summary');toggle.setAttribute('aria-label','Imposta zero pezzo');
 const reference=actions.querySelector('button');
 if(reference){const style=getComputedStyle(reference);for(const key of ['font','color','background','border','border-radius','padding','box-shadow','box-sizing','line-height','letter-spacing','min-height'])toggle.style.setProperty(key,style.getPropertyValue(key));}
 toggle.style.display='inline-flex';toggle.style.alignItems='center';toggle.style.gap='5px';toggle.style.cursor='pointer';toggle.style.listStyle='none';
 const markerStyle=document.createElement('style');markerStyle.textContent='#stockOriginPanel > summary::-webkit-details-marker{display:none} #stockOriginPanel > summary::marker{content:""}';menu.append(markerStyle);
 const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.style.cssText='display:inline-block;width:16px;height:16px;flex:0 0 16px;box-sizing:border-box;border:1px solid #fff;border-radius:50%;background:linear-gradient(#000,#000) center/1px 100% no-repeat,linear-gradient(#000,#000) center/100% 1px no-repeat,conic-gradient(#000 0deg 90deg,#fff 90deg 180deg,#000 180deg 270deg,#fff 270deg 360deg)';toggle.append(document.createTextNode('Imposta'),icon);
 field.querySelector('label').textContent='Posizione dello zero XY';
 const content=document.createElement('div');content.style.cssText='padding:12px;min-width:200px;max-width:100%';
 const note=document.createElement('p');note.className='muted';note.textContent='Z0 resta sulla faccia superiore finita. Le posizioni XY sono riferite all’ingombro del finito; su forme non rettangolari possono non coincidere con materiale.';
 content.append(field,note);menu.append(toggle,content);
 const zoomButtons=[...actions.querySelectorAll('button')].filter(b=>/^Zoom\s/.test(b.textContent));
 if(zoomButtons[0])actions.insertBefore(menu,zoomButtons[0]);else actions.append(menu);
 for(const b of zoomButtons)b.remove();
 const previewNote=preview.querySelector(':scope > p.muted');
 if(previewNote)previewNote.textContent='Trascina per ruotare; usa la rotella per lo zoom. Verde: finito. Ambra: grezzo. Anteprima geometrica, non simulazione di lavorazione o controllo collisioni.';
 const status=document.createElement('p');status.id='stockOriginStatus';status.setAttribute('role','status');actions.after(status);
 const ids={width:'stWidth',depth:'stDepth',height:'stHeight',diameter:'stDiameter',innerDiameter:'stInner',thickness:'stThickness',points:'stPoints'};
 function read(){const g=structuredClone(getProject().geometry),f={type:document.getElementById('stType').value};for(const key of geometryFields(f.type)){const raw=document.getElementById(ids[key]).value;f[key]=key==='points'?JSON.parse(raw):numericInput(raw,key);}g.finished=f;for(const key of Object.keys(g.allowances))g.allowances[key]=numericInput(document.getElementById('st_'+key).value,key);return g;}
 function sync(){status.textContent='X0/Y0: '+(select.selectedOptions[0]?.textContent??select.value)+' · Z0: faccia superiore · +Z: fuori · −Z: nel materiale.';}
 form.addEventListener('change',e=>{if(e.target!==select)return;try{const p=rebaseOrigin(getProject(),read(),select.value);replaceProject(p);changed();sync();menu.open=false;toggle.focus();}catch(error){select.value=getProject().geometry.origin.xy;sync();status.textContent=error.message;e.stopImmediatePropagation();}},true);
 menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;toggle.focus();}});
 for(const event of ['input','change','click'])form.addEventListener(event,()=>requestAnimationFrame(sync));sync();
}
