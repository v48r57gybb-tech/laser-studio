(function(){
'use strict';
function install(p){
 const C=globalThis.CncPreforo,k=n=>C.key(p,n),$=n=>document.getElementById(k(n));
 const form=document.getElementById(p?'arcForm':'form');if(!form||!$('drillMode')||form.dataset.preforoReady)return;form.dataset.preforoReady='true';
 const storageKey='cnc-preforo-'+(p||'straight');let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}catch{}
 function field(name,labelText,options,tipText){
  const box=document.createElement('div');box.className='field';box.id='field-'+k(name);
  const label=document.createElement('label');label.htmlFor=k(name);label.textContent=labelText+' ';
  const info=document.createElement('button');info.type='button';info.className='info';info.textContent='i';info.setAttribute('aria-label','Informazioni: '+labelText);info.setAttribute('aria-expanded','false');
  const tip=document.createElement('p');tip.className='tip';tip.hidden=true;tip.id='preforo-tip-'+k(name);tip.textContent=tipText;info.setAttribute('aria-controls',tip.id);info.onclick=()=>{tip.hidden=!tip.hidden;info.setAttribute('aria-expanded',String(!tip.hidden));};label.append(info);
  const input=document.createElement(options?'select':'input');input.id=k(name);if(options)for(const[v,t]of options)input.add(new Option(t,v));else{input.type='text';input.inputMode='decimal';input.autocomplete='off';}
  const err=document.createElement('span');err.className='err';err.id='err-'+k(name);box.append(label,input,tip,err);return box;
 }
 const toolField=document.getElementById('field-'+k('tapTool'));if(!toolField)throw new Error('Sezione maschiatura mancante');
 toolField.before(field('tapKind','Tipo di maschio',[['cut','Ad asportazione'],['form','A rullare (deformazione)']],'Base richiesta: asportazione D − P; rullatura D − P/2. Il preforo proposto resta correggibile. Verificare utensile, materiale e tolleranze prima di lavorare.'));
 document.getElementById('field-'+k('tapPitch')).before(field('tapNominal','Diametro nominale filetto personalizzato (mm)',null,'Per il filetto personalizzato inserisci il diametro nominale D; il passo P resta nel campo dedicato. Non viene dedotto dal nome libero.'));
 document.getElementById('field-'+k('tapZ')).after(field('tapCoolant','Refrigerante maschiatura',[['M8','Acqua esterna (M8)'],['M18','Acqua interna (M18)']],'Scelta indipendente dal refrigerante della punta. Usa i codici M8/M18 previsti sulla tua macchina; verificare disponibilità e spegnimento con M9.'));
 $('tapKind').value=saved.tapKind||'cut';$('tapNominal').value=saved.tapNominal??6;$('tapCoolant').value=saved.tapCoolant||'M8';
 const note=document.createElement('div');note.className='notice';note.hidden=true;note.setAttribute('role','status');document.getElementById('field-'+k('drillCustomDia')).after(note);
 const modeTip=document.getElementById((p?'arctip-':'tip-')+k('drillMode'));if(modeTip)modeTip.textContent='Due punte doppio diametro, diametro personalizzato oppure preforo automatico. La modalità automatica attiva la maschiatura: scegli filetto e tipo di maschio. La formula propone la base; il diametro può essere corretto manualmente.';
 const diaTip=document.getElementById((p?'arctip-':'tip-')+k('drillCustomDia'));if(diaTip)diaTip.textContent='Diametro effettivo della punta. In automatico parte dalla formula scelta, ma puoi correggerlo, per esempio da 5,5 a 5,55. La correzione resta finché non cambiano filetto, passo o tipo maschio. L’ISO usa questo valore.';
 let previous=saved.signature||null,wasAuto=$('drillMode').value==='auto';
 function data(){return C.enrich({[k('thread')]:$('thread').value,[k('tapPitch')]:$('tapPitch').value,[k('drillCustomDia')]:$('drillCustomDia').value,[k('tap')]:$('tap').checked,[k('drillMode')]:$('drillMode').value},p);}
 function store(){try{localStorage.setItem(storageKey,JSON.stringify({tapKind:$('tapKind').value,tapNominal:$('tapNominal').value,tapCoolant:$('tapCoolant').value,signature:previous}));}catch{}}
 function sync(recalculate=true){
  const auto=$('drillMode').value==='auto';if(auto)$('tap').checked=true;$('tap').disabled=auto;const active=$('tap').checked,custom=$('thread').value==='custom';
  for(const n of ['tapKind','tapNominal','tapCoolant'])document.getElementById('field-'+k(n)).hidden=!active||(n==='tapNominal'&&!custom);
  if(!custom){const standard={M3:.5,M4:.7,M5:.8,M6:1,M8:1.25,M10:1.5,M12:1.75,M16:2};$('tapPitch').value=standard[$('thread').value]??'';}
  const d=data(),sig=C.signature(d,p);if(auto&&recalculate&&(sig!==previous||!wasAuto)){const n=C.propose(d,p);$('drillCustomDia').value=Number.isFinite(n)?String(n):'';}previous=sig;wasAuto=auto;
  const label=document.querySelector('label[for="'+k('drillCustomDia')+'"]');if(label?.firstChild?.nodeType===3)label.firstChild.textContent=auto?'Diametro preforo effettivo (mm) ':'Diametro punta personalizzato (mm) ';
  document.getElementById('field-'+k('drillCustomDia')).hidden=!['auto','custom'].includes($('drillMode').value);note.hidden=!auto;
  if(auto){const n=C.propose(data(),p),a=C.number($('drillCustomDia').value);note.textContent=Number.isFinite(n)?'Preforo base: Ø '+String(n).replace('.',',')+' mm · '+($('tapKind').value==='form'?'D − P/2':'D − P')+'. Diametro effettivo: '+(Number.isFinite(a)?'Ø '+String(a).replace('.',',')+' mm.':'da inserire.')+' Valore di base da verificare; correzione manuale consentita.':'Completa diametro nominale e passo del filetto per proporre il preforo.';}store();
 }
 function invalidate(){const ids=p?['arcOutput','arcCopy','arcDownload','arcStatus']:['output','copy','download','status'];document.getElementById(ids[0]).value='';document.getElementById(ids[1]).disabled=document.getElementById(ids[2]).disabled=true;const s=document.getElementById(ids[3]);s.className='notice';s.textContent='Dati modificati: controlla e genera nuovamente.';}
 function edit(e){for(const n of ['tapKind','tapNominal','tapCoolant']){document.getElementById('field-'+k(n)).classList.remove('bad');document.getElementById('err-'+k(n)).textContent='';}sync(true);if(e.type==='change'&&e.target===$('drillMode')&&$('drillMode').value==='auto')queueMicrotask(()=>{const t=$('thread');t.closest('.card').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});t.focus({preventScroll:true});});}
 for(const event of ['input','change']){form.addEventListener(event,edit,true);form.addEventListener(event,()=>{sync(false);invalidate();});}
 form.addEventListener('submit',()=>sync(false));form.addEventListener('preforo:loaded',()=>{previous=C.signature(data(),p);sync(false);});sync(true);
 const button=document.getElementById(p?'resetArc':'resetStraight'),heading=form.querySelector('.card h2');if(!button||!heading)throw new Error('Pulsante nuova generazione o titolo non trovato');const bar=document.createElement('div');bar.className='part-heading';heading.before(bar);bar.append(heading,button);button.textContent='Nuova generazione';button.removeAttribute('style');for(const[n,v]of [['background','#166e42'],['color','#ffffff'],['border-color','#54d98c']])button.style.setProperty(n,v,'important');button.addEventListener('click',()=>{sync(false);store();});
}
function init(){const style=document.createElement('style');style.textContent='.part-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:20px}.part-heading h2{margin:0}.part-heading button{min-height:44px}@media(max-width:520px){.part-heading{align-items:flex-start;flex-direction:column}}';document.head.append(style);install('');install('a');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
