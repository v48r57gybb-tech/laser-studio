import {createLinker} from './project-linker.js';
function mountLinkerPanel(section,q,status,workspaceRef){
 if(q('[data-linker]'))return;
 const box=document.createElement('div');box.dataset.linker='true';box.className='linker-panel';
 box.innerHTML=`<h3>Quote e geometria</h3><p>Collega le caratteristiche dell’analisi agli elementi del modello STEP. La quota 83 mm del condotto inclinato F019 è la decisione operatore corrente; ogni override resta tracciato.</p><label>Cerca caratteristica<input data-search type="search" placeholder="F019, condotto, sede, M6"></label><div data-list></div><div data-detail hidden></div>`;
 const list=box.querySelector('[data-list]'),detail=box.querySelector('[data-detail]'),search=box.querySelector('[data-search]');
 function rows(){const analysis=workspaceRef.current?.analysis;if(!analysis)return[];const term=search.value.trim().toLowerCase();return analysis.features.filter(f=>!term||[f.id,f.kind,f.description].join(' ').toLowerCase().includes(term));}
 function render(){list.replaceChildren();const analysis=workspaceRef.current?.analysis;if(!analysis){list.append(Object.assign(document.createElement('p'),{textContent:'Importa prima l’analisi JSON.'}));return;}for(const f of rows().slice(0,100)){const b=document.createElement('button');b.type='button';b.textContent=`${f.id} · ${f.kind} · ${f.description.slice(0,80)}`;b.onclick=()=>select(f.id);list.append(b);}if(rows().length>100)list.append(Object.assign(document.createElement('p'),{textContent:'Mostrate le prime 100 caratteristiche.'}));}
 function select(id){const linker=workspaceRef.linker;if(!linker)return;const f=linker.feature(id);detail.hidden=false;detail.replaceChildren();const title=document.createElement('h4');title.textContent=`${f.id} · ${f.kind}`;detail.append(title,Object.assign(document.createElement('p'),{textContent:f.description}));
  for(const [field,value]of Object.entries(f.values)){const line=document.createElement('p');const effective=linker.effective(f.id,field);line.textContent=`${field}: ${effective?.value??'—'} ${effective?.unit??''} · ${effective?.status??value.status}`;detail.append(line);}
  const actions=document.createElement('div');actions.className='actions';const highlight=document.createElement('button');highlight.type='button';highlight.textContent='Evidenzia nello STEP';highlight.onclick=()=>window.dispatchEvent(new CustomEvent('project:highlight',{detail:{featureId:f.id}}));actions.append(highlight);
  if(f.id==='F019'){const confirm=document.createElement('button');confirm.type='button';confirm.textContent='Conferma asse 83 mm';confirm.onclick=()=>{try{linker.override('F019','q060posizioneasseimbocco',83,'Quota 83 confermata dall’operatore');status.textContent='F019: asse a 83 mm confermato e tracciato.';select(f.id);}catch(e){status.textContent=e.message;}};actions.append(confirm);}
  detail.append(actions);}
 search.oninput=render;section.append(box);render();
}
export {mountLinkerPanel};