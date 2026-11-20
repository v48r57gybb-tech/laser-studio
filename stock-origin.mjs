import {resolveGeometry} from './lib/stock-geometry-tools.mjs';
import {geometryFields,numericInput} from './lib/stock-ui-model.mjs';
export function rebaseOrigin(input,geometry,xy){const p=structuredClone(input),g=structuredClone(geometry);g.origin.xy=input.geometry.origin.xy;const old=resolveGeometry(g).reference;g.origin.xy=xy;const next=resolveGeometry(g).reference;for(const op of p.operations){if(!['drilling','pocket'].includes(op.type))continue;for(const axis of ['x','y']){const value=numericInput(op.parameters[axis],axis);op.parameters[axis]=Number((value+old[axis]-next[axis]).toFixed(9));}}p.geometry=g;return p;}
export function mountStockOrigin({form,getProject,replaceProject,changed}){
 const select=document.getElementById('stOrigin'),field=select?.closest('.field');
 const preview=form.querySelector('#stockPreview'),actions=preview?.querySelector('.actions');
 if(!field||!actions)throw Error('Comandi zero o anteprima 3D non trovati');
 const menu=document.createElement('div');menu.id='stockOriginPanel';menu.style.position='relative';
 const toggle=document.createElement('button');toggle.type='button';toggle.className=actions.querySelector('button')?.className??'';toggle.setAttribute('aria-label','Imposta zero pezzo');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','stockOriginChoices');
 const ns='http://www.w3.org/2000/svg',icon=document.createElementNS(ns,'svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('width','18');icon.setAttribute('height','18');icon.setAttribute('aria-hidden','true');icon.style.cssText='vertical-align:middle;margin-left:5px';
 for(const [tag,attrs]of [['circle',{cx:12,cy:12,r:9,fill:'white',stroke:'white','stroke-width':2}],['path',{d:'M12 12 L12 3 A9 9 0 0 1 21 12 Z M12 12 L12 21 A9 9 0 0 1 3 12 Z',fill:'black'}],['path',{d:'M12 1 V23 M1 12 H23',fill:'none',stroke:'black','stroke-width':1}],['circle',{cx:12,cy:12,r:9,fill:'none',stroke:'black','stroke-width':1}]]){const part=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))part.setAttribute(key,String(value));icon.append(part);}
 toggle.append(document.createTextNode('Imposta'),icon);
 field.querySelector('label').textContent='Posizione dello zero XY';
 const content=document.createElement('div');content.id='stockOriginChoices';content.hidden=true;content.style.cssText='padding:12px;min-width:200px;max-width:100%';
 const note=document.createElement('p');note.className='muted';note.textContent='Z0 resta sulla faccia superiore finita. Le posizioni XY sono riferite all’ingombro del finito; su forme non rettangolari possono non coincidere con materiale.';
 content.append(field,note);menu.append(toggle,content);
 function close(){content.hidden=true;toggle.setAttribute('aria-expanded','false');}
 toggle.onclick=()=>{const open=content.hidden;content.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)select.focus();};
 const zoomButtons=[...actions.querySelectorAll('button')].filter(b=>/^Zoom\s/.test(b.textContent));
 if(zoomButtons[0])actions.insertBefore(menu,zoomButtons[0]);else actions.append(menu);
 for(const b of zoomButtons)b.remove();
 const previewNote=preview.querySelector(':scope > p.muted');
 if(previewNote)previewNote.textContent='Trascina per ruotare; usa la rotella per lo zoom. Verde: finito. Ambra: grezzo. Anteprima geometrica, non simulazione di lavorazione o controllo collisioni.';
 const status=document.createElement('p');status.id='stockOriginStatus';status.setAttribute('role','status');actions.after(status);
 const ids={width:'stWidth',depth:'stDepth',height:'stHeight',diameter:'stDiameter',innerDiameter:'stInner',thickness:'stThickness',points:'stPoints'};
 function read(){const g=structuredClone(getProject().geometry),f={type:document.getElementById('stType').value};for(const key of geometryFields(f.type)){const raw=document.getElementById(ids[key]).value;f[key]=key==='points'?JSON.parse(raw):numericInput(raw,key);}g.finished=f;for(const key of Object.keys(g.allowances))g.allowances[key]=numericInput(document.getElementById('st_'+key).value,key);return g;}
 function sync(){status.textContent='X0/Y0: '+(select.selectedOptions[0]?.textContent??select.value)+' · Z0: faccia superiore · +Z: fuori · −Z: nel materiale.';}
 form.addEventListener('change',e=>{if(e.target!==select)return;try{const p=rebaseOrigin(getProject(),read(),select.value);replaceProject(p);changed();sync();close();toggle.focus();}catch(error){select.value=getProject().geometry.origin.xy;sync();status.textContent=error.message;e.stopImmediatePropagation();}},true);
 menu.addEventListener('keydown',e=>{if(e.key==='Escape'){close();toggle.focus();}});
 for(const event of ['input','change','click'])form.addEventListener(event,()=>requestAnimationFrame(sync));sync();
}
