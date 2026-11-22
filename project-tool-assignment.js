const STORE='officina-project-tool-library-v1';
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=1000000;
export const toolSignature=t=>[t.kind,t.diameter,t.fluteLength??null,t.neckDiameter??null,t.neckLength??null,t.overallLength??null].join('|');
export function diameterHint(family,source){
 const s=String(source??''),number=x=>Number(x.replace(',','.'));
 if(family==='face')return 50;
 if(family==='mill'){const m=/(?:finale|quindi)\s*(?:[Øø]|≤|<=)\s*(\d+(?:[.,]\d+)?)/i.exec(s);return m?number(m[1]):/interpolazione|fresa a disco|oppure/i.test(s)?null:40;}
 if(family==='drill'){if(/preforo/i.test(s))return null;const values=[...s.matchAll(/[Øø]\s*(\d+(?:[.,]\d+)?)/g)].map(m=>number(m[1]));return new Set(values).size===1?values[0]:null;}
 return null;
}
export function depthHint(description){const m=/piano geometrico\s*[−-]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm\s*)?sotto/i.exec(String(description??''));return m?Number(m[1].replace(',','.')):null;}
export function readProjectToolLibrary(storage){
 const raw=storage.getItem(STORE);if(raw===null)return {raw,records:[]};
 let data;try{data=JSON.parse(raw)}catch{throw Error('Libreria progetto non leggibile: originale preservato')}
 if(data?.version!==1||!Array.isArray(data.records)||data.records.length>2000)throw Error('Formato libreria progetto non valido');
 const signatures=new Set();for(const t of data.records){if(!['face','mill','drill','chamfer','spot','probe'].includes(t.kind)||!positive(t.diameter))throw Error('Utensile libreria non valido');for(const k of ['fluteLength','neckDiameter','neckLength','overallLength'])if(t[k]!=null&&!positive(t[k]))throw Error('Geometria libreria non valida');if(!t.parameters||typeof t.parameters!=='object')throw Error('Parametri libreria mancanti');for(const k of ['rpm','feed','entryFeed'])if(t.parameters[k]!==null&&!positive(t.parameters[k]))throw Error('Parametri libreria non validi');if(t.parameters.rpm!==null&&!Number.isInteger(t.parameters.rpm))throw Error('Giri libreria non validi');if(!['off','M8','M18'].includes(t.parameters.coolant))throw Error('Refrigerante libreria non valido');const key=toolSignature(t);if(signatures.has(key))throw Error('Doppioni libreria: originale preservato');signatures.add(key)}
 return {raw,records:data.records};
}
export function mergeProjectToolLibrary(records,tools){const map=new Map(records.map(t=>[toolSignature(t),structuredClone(t)]));for(const t of tools){const record={kind:t.kind,diameter:t.diameter,parameters:structuredClone(t.parameters),origin:'generic-simulation'};for(const k of ['fluteLength','neckDiameter','neckLength','overallLength'])if(t[k]!=null)record[k]=t[k];const key=toolSignature(record);if(!map.has(key))map.set(key,record)}if(map.size>2000)throw Error('Limite libreria progetto raggiunto');return [...map.values()]}
let registered=false;
export function registerProjectToolAssignment({suggestFamilies,prepareAutomaticTools,applyNominalTools}){
 if(typeof document==='undefined'||registered)return;registered=true;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 document.addEventListener('project-analysis-updated',event=>{
  if(event.target?.id!=='projectAnalysisPanel')return;
  const panel=event.target.querySelector('#projectOperationsPanel'),analysis=event.detail;if(!panel||!Array.isArray(analysis?.proposals))return;
  let project={tools:[]};
  const proposals=new Map(analysis.proposals.map(p=>[p.id,p]));
  for(const phase of panel.querySelectorAll('[data-phase-id]')){
   const controls=el('div'),heightLabel=el('label','Altezza massima pezzo nel piazzamento (mm, nominale) '),height=el('input');height.type='number';height.min='.01';height.max='1000000';height.step='any';height.value=analysis.part?.code==='RIC0075'?({SETUP01:'76.5',SETUP02:'76.5',SETUP03:'150',SETUP05:'150'}[phase.dataset.phaseId]??''):'';heightLabel.append(height);controls.append(heightLabel);
   controls.append(el('p','Montaggio proposto: max(profondità, altezza del pezzo) + 5 mm. Non è una verifica collisioni. Il tagliente è distinto dalla sporgenza. Libreria digitale locale solo per Lavorazione da progetto; T/H/D sono assegnati nel progetto corrente, non salvati come identità utensile.'));
   const rows=[];
   for(const card of phase.querySelectorAll('.project-operation')){
    const id=/^OP\d{3}\b/.exec(card.querySelector('summary')?.textContent??'')?.[0],proposal=proposals.get(id);if(!proposal)continue;
    const recommendation=suggestFamilies(proposal),target=card.querySelector('.project-operation-tools');if(!target)continue;
    for(const [index,f]of recommendation.families.entries()){
     if(!f.supported)continue;
     const d=el('details');d.append(el('summary',id+' · '+f.family+' · configurazione automatica nominale'));
     const enabled=el('input');enabled.type='checkbox';enabled.checked=!recommendation.alternativesRequireReview||index===0;
     const label=el('label','Includi questa proposta ');label.append(enabled);d.append(label);
     function number(label,value){const l=el('label',label+' '),n=el('input');n.type='number';n.min='.01';n.max='1000000';n.step='any';n.value=value==null?'':String(value);l.append(n);d.append(l);return n}
     const diameter=number('Diametro utensile mm (proposta modificabile)',diameterHint(f.family,recommendation.source));
     const depth=number('Profondità locale lavorazione mm (vuota se da definire)',f.family==='face'&&id==='OP002'&&analysis.part?.code==='RIC0075'?2:depthHint(proposal.description));
     rows.push({id,family:f.family,diameter,depth,enabled});target.append(d);
    }
   }
   const button=el('button','Assegna utensili della fase');button.type='button';
   const status=el('p','Assegnazioni non ancora preparate.'),output=el('ul');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   controls.append(button,status,output);phase.insertBefore(controls,phase.children[1]??null);
   controls.addEventListener('input',()=>{output.replaceChildren();status.textContent='Altezza modificata: riassegnare gli utensili.'});
   for(const row of rows)for(const field of [row.enabled,row.diameter,row.depth])field.addEventListener('input',()=>{output.replaceChildren();status.textContent='Configurazione modificata: riassegnare gli utensili.'});
   button.onclick=()=>{
    try{
     const h=Number(height.value);if(!height.value.trim()||!positive(h)||!height.checkValidity())throw Error('Definire altezza nominale del pezzo nel piazzamento');
     const library=readProjectToolLibrary(localStorage),requests=[],pending=[];
     for(const row of rows){if(!row.enabled.checked)continue;const diameter=Number(row.diameter.value),depth=row.depth.value.trim()?Number(row.depth.value):null;if(!row.diameter.value.trim()||!positive(diameter)||!row.diameter.checkValidity()){pending.push(row.id+' '+row.family+': diametro da definire');continue}if(depth!==null&&(!positive(depth)||!row.depth.checkValidity()))throw Error(row.id+': profondità non valida');
      const needed=depth===null?null:depth+5;
      const available=[...project.tools,...library.records].filter(t=>t.kind===row.family&&t.diameter===diameter&&(needed===null||positive(t.fluteLength)&&t.fluteLength>=needed)).sort((a,b)=>(a.fluteLength??Infinity)-(b.fluteLength??Infinity))[0];
      const r={operationId:row.id,family:row.family,diameter,operationType:row.family==='face'?'facing':row.family==='mill'?'roughing':row.family==='drill'?'drilling':row.family==='chamfer'?'chamfer':row.family,depth,clearanceMargin:5};
      if(available){for(const k of ['fluteLength','neckDiameter','neckLength','overallLength'])if(available[k]!=null)r[k]=available[k]}else if(needed!==null)r.fluteLength=needed;
      requests.push(r);
     }
     const next=prepareAutomaticTools(project,requests,{applyNominalTools,loadProfile:t=>{const p=library.records.find(r=>toolSignature(r)===toolSignature(t));if(p)t.parameters=structuredClone(p.parameters)}});
     for(const t of next.project.tools)if(['drill','chamfer','spot'].includes(t.kind)){t.nominalAssumptions??={};for(const [k,v]of Object.entries({rpm:2000,feed:200,entryFeed:100}))if(t.parameters[k]===null){t.parameters[k]=v;t.nominalAssumptions[k]=v}}
     const records=mergeProjectToolLibrary(library.records,next.project.tools);
     if(localStorage.getItem(STORE)!==library.raw)throw Error('Libreria cambiata in altra scheda: riprovare');
     if(requests.length)localStorage.setItem(STORE,JSON.stringify({version:1,records}));
     project=next.project;
     for(const a of next.assignments){const t=project.tools.find(t=>t.id===a.toolId),projection=Math.max(a.mounting.requiredDepth??0,h)+5;a.mounting.proposedReach=projection;
      output.append(el('li',`${a.operationId} · ${t.kind} Ø${t.diameter} · T${a.addresses.T}/H${a.addresses.H}${a.addresses.D===null?' · D non previsto per questa famiglia':'/D'+a.addresses.D+' (nominale, non ancora collegato al percorso)'} · tagliente ${t.fluteLength??'da definire'} mm · sporgenza proposta ${projection} mm · S${t.parameters.rpm??'da definire'} F${t.parameters.feed??'da definire'} · ${a.mounting.requiredDepth===null?'profondità da definire · ':''}nominale, collisioni non verificate`));
     }
     for(const p of [...pending,...next.pending.map(p=>p.operationId+': '+p.reason)])output.append(el('li',p));
     status.textContent=`${next.assignments.length} assegnazioni nominali · ${records.length} utensili nella libreria locale progetto. Nessun utensile dichiarato caricato in macchina. Filettatura, barenatura, disco e misurazione restano senza adattatore; alternative non selezionate escluse. ISO e simulazione non collegati.`;
     phase.dispatchEvent(new CustomEvent('project-phase-tools-assigned',{bubbles:true,detail:{phaseId:phase.dataset.phaseId,assignments:structuredClone(next.assignments),tools:structuredClone(project.tools),readyForISO:false}}));
    }catch(e){output.replaceChildren();status.textContent='Assegnazione non completata: '+e.message;}
   };
  }
 });
}
