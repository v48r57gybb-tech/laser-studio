(function(){
'use strict';
function init(){
 const configs=[
  {
   form:'form',
   fieldsContainer:'fields',
   output:'output',
   mode:'straight',
   widthId:'width',
   prefix:'sp',
   title:'Tastatura iniziale Renishaw (Opzionale)',
   tip:'La sonda utilizza G56 come origine provvisoria, aggiorna il riferimento con S3 e impiega T/H selezionato con sfera Ø6 mm. Misura Z superiore, mezzeria larghezza Y0 e battuta SX con sovramateriale.'
  },
  {
   form:'arcForm',
   fieldsContainer:'arcFields',
   output:'arcOutput',
   mode:'arc',
   widthId:'aWidth',
   prefix:'ap',
   title:'Tastatura iniziale Renishaw (Opzionale)',
   tip:'La sonda utilizza G56 come origine provvisoria, aggiorna il riferimento con S3 e impiega T/H selezionato con sfera Ø6 mm. Misura Z superiore, mezzeria curvatura su X e battuta grezza iniziale su Y.'
  }
 ];

 const toolsList = Array.from({ length: 28 }, (_, i) => [i + 1, 'T' + (i + 1) + ' / H' + (i + 1)]);

 const probeTips = {
  Profile: 'Seleziona se eseguire la tastatura per il profilo grande (23×13,5 mm), per il profilo piccolo (16,5×10 mm) oppure sincronizzarla in automatico con la selezione del pezzo.',
  Tool: 'Numero di stazione della torretta e correttore lunghezza H associato per la sonda Renishaw (predefinito T28 / H28).',
  Safe: 'Quota Z di sicurezza e svincolo rapido (G65 P9810) durante gli spostamenti sopra il pezzo e prima di spegnere la sonda.',
  TopX: 'Coordinata X sul grezzo dove la sfera della sonda scende per rilevare la superficie superiore del pezzo.',
  TopY: 'Coordinata Y sul grezzo dove la sfera della sonda scende per rilevare la superficie superiore del pezzo.',
  Approach: 'Distanza fuori dal grezzo da cui la sonda avvia l’avvicinamento protetto prima del contatto con la battuta.',
  Inner: 'Quota intermedia di sicurezza prima dell’inizio della corsa di misura effettiva verso la faccia.',
  Depth: 'Profondità negativa Z a cui si posiziona il centro della sfera per eseguire le misure sui fianchi del profilo.'
 };

 for(const c of configs){
  const form=document.getElementById(c.form);
  const container=document.getElementById(c.fieldsContainer);
  if(!form||!container||document.getElementById(c.prefix+'ProbeCard'))continue;

  const card=document.createElement('section');
  card.className='card';
  card.id=c.prefix+'ProbeCard';

  function makeProbeField(k, label, content){
   return '<div class="field" id="field-'+c.prefix+k+'">' +
     '<label for="'+c.prefix+k+'">'+label+
     '<button class="info" type="button" data-probetip="'+c.prefix+k+'" aria-label="Informazioni '+label+'">i</button>' +
     '</label>' +
     content +
     '<p class="tip" id="probetip-'+c.prefix+k+'" hidden>'+probeTips[k]+'</p>' +
     '</div>';
  }

  const profileSelectHtml = '<select id="'+c.prefix+'Profile">' +
    '<option value="auto" selected>Automatico (sincronizzato con il pezzo)</option>' +
    '<option value="big">Profilo grande (Larghezza 23 mm · Spessore 13,5 mm)</option>' +
    '<option value="small">Profilo piccolo (Larghezza 16,5 mm · Spessore 10 mm)</option>' +
    '</select>';

  const toolSelectHtml = '<select id="'+c.prefix+'Tool">' +
    toolsList.map(([v, t]) => '<option value="'+v+'"'+(v===28?' selected':'')+'>'+t+'</option>').join('') +
    '</select>';

  card.innerHTML='<h2>'+c.title+'</h2>'+
   '<div class="field">'+
     '<label><input type="checkbox" id="'+c.prefix+'Enabled"> Aggiungi tastatura iniziale del pezzo</label>'+
   '</div>'+
   '<div id="'+c.prefix+'Body" hidden>'+
     '<div class="grid">'+
       makeProbeField('Profile', 'Profilo di riferimento tastatura', profileSelectHtml) +
       makeProbeField('Tool', 'Sonda (Torretta T / Correttore H)', toolSelectHtml) +
       makeProbeField('Safe', 'Z sicurezza svincolo (mm)', '<input id="'+c.prefix+'Safe" inputmode="decimal" value="100" autocomplete="off">') +
       makeProbeField('TopX', 'Punto Z · Quota X (mm)', '<input id="'+c.prefix+'TopX" inputmode="decimal" value="0" autocomplete="off">') +
       makeProbeField('TopY', 'Punto Z · Quota Y (mm)', '<input id="'+c.prefix+'TopY" inputmode="decimal" value="10" autocomplete="off">') +
       makeProbeField('Approach', 'Quota avvicinamento esterno (mm)', '<input id="'+c.prefix+'Approach" inputmode="decimal" value="25" autocomplete="off">') +
       makeProbeField('Inner', 'Punto interno di misura (mm)', '<input id="'+c.prefix+'Inner" inputmode="decimal" value="10" autocomplete="off">') +
       makeProbeField('Depth', 'Profondità misura laterale Z (mm)', '<input id="'+c.prefix+'Depth" inputmode="decimal" value="-4" autocomplete="off">') +
     '</div>'+
     '<p class="tip">'+c.tip+'</p>'+
   '</div>';

  const cards=container.querySelectorAll('section.card');
  if(cards.length>=2){
   container.insertBefore(card,cards[1]);
  }else{
   container.appendChild(card);
  }

  const chk=document.getElementById(c.prefix+'Enabled');
  const body=document.getElementById(c.prefix+'Body');
  if(chk&&body){
   chk.addEventListener('change',function(){
    body.hidden=!this.checked;
   });
  }

  card.addEventListener('click', function(e){
   const btn = e.target.closest('[data-probetip]');
   if(!btn) return;
   e.preventDefault();
   const tipBox = document.getElementById('probetip-' + btn.dataset.probetip);
   if(tipBox) tipBox.hidden = !tipBox.hidden;
  });
 }

 function read(c){
  const $=id=>document.getElementById(c.prefix+id);
  const n=id=>{const el=$(id);if(!el)return NaN;const v=el.value.trim();return v===''?NaN:Number(v.replace(',','.'));};
  const chk=$('Enabled');
  return {
   enabled:chk?chk.checked:false,
   profile:$('Profile')?$('Profile').value:'auto',
   tool:n('Tool'),
   safe:n('Safe'),
   topX:n('TopX'),
   topY:n('TopY'),
   approach:n('Approach'),
   inner:n('Inner'),
   depth:n('Depth')
  };
 }

 function fmt(n){
  const x=Number(n);
  return Number.isFinite(x)?String(Number(x.toFixed(4)))+(Number.isInteger(Number(x.toFixed(4)))?'.':''):'0.';
 }

 function buildStraightProbe(d,width){
  return [
   '(----------------------------------------)',
   '(TASTATURA INIZIALE RENISHAW - PEZZO DRITTO)',
   '(ORIGINE PROVVISORIA G56 GIA IMPOSTATA)',
   '(SONDA T'+fmt(d.tool)+' / H'+fmt(d.tool)+' - SFERA D6)',
   '(PROFILO LARGHEZZA NOMINALE '+fmt(width)+' MM)',
   '(----------------------------------------)',
   'G21 G17 G90 G94 G40 G80',
   'G56',
   'T'+fmt(d.tool)+' M6',
   'G0 G43 H'+fmt(d.tool)+' Z'+fmt(d.safe),
   'G65 P9832 (ACCENSIONE SONDA)',
   '',
   '(MISURA Z SUPERIORE)',
   'G65 P9810 X'+fmt(d.topX)+' Y'+fmt(d.topY)+' F1000.',
   'G65 P9810 Z5. F500.',
   'G65 P9811 Z0. S3',
   'G65 P9810 Z'+fmt(d.safe)+' F1000.',
   '',
   '(MISURA Y0 MEZZERIA PROFILO)',
   'G65 P9810 X'+fmt(d.topX)+' Y'+fmt(d.topY)+' F1000.',
   'G65 P9810 Z10. F500.',
   'G65 P9812 Y'+fmt(width)+' Z'+fmt(d.depth)+' R10. S3',
   'G65 P9810 Z'+fmt(d.safe)+' F1000.',
   '',
   '(MISURA X BATTUTA SINISTRA CON SOVRAMATERIALE)',
   'G65 P9810 X-'+fmt(d.approach)+' Y0. F1000.',
   'G65 P9810 Z'+fmt(d.depth)+' F500.',
   'G65 P9810 X-'+fmt(d.inner)+' F300.',
   'G65 P9811 X-5. S3 (ORIGINE FINITA TRASLATA A X0)',
   '',
   '(DISIMPEGNO E SPEGNIMENTO SONDA)',
   'G65 P9810 X-'+fmt(d.approach)+' F500.',
   'G65 P9810 Z'+fmt(d.safe)+' F1000.',
   'G65 P9833 (SPEGNIMENTO SONDA)',
   'M01',
   ''
  ].join('\n');
 }

 function buildArcProbe(d,width){
  return [
   '(----------------------------------------)',
   '(TASTATURA INIZIALE RENISHAW - PEZZO AD ARCO)',
   '(ORIGINE PROVVISORIA G56 GIA IMPOSTATA)',
   '(SONDA T'+fmt(d.tool)+' / H'+fmt(d.tool)+' - SFERA D6)',
   '(PROFILO LARGHEZZA NOMINALE '+fmt(width)+' MM)',
   '(----------------------------------------)',
   'G21 G17 G90 G94 G40 G80',
   'G56',
   'T'+fmt(d.tool)+' M6',
   'G0 G43 H'+fmt(d.tool)+' Z'+fmt(d.safe),
   'G65 P9832 (ACCENSIONE SONDA)',
   '',
   '(MISURA Z SUPERIORE)',
   'G65 P9810 X'+fmt(d.topX)+' Y'+fmt(d.topY)+' F1000.',
   'G65 P9810 Z5. F500.',
   'G65 P9811 Z0. S3',
   'G65 P9810 Z'+fmt(d.safe)+' F1000.',
   '',
   '(MISURA X MEZZERIA CURVATURA)',
   'G65 P9810 X'+fmt(d.topX)+' Y'+fmt(d.topY)+' F1000.',
   'G65 P9810 Z10. F500.',
   'G65 P9812 X'+fmt(width)+' Z'+fmt(d.depth)+' R10. S3',
   'G65 P9810 Z'+fmt(d.safe)+' F1000.',
   '',
   '(MISURA Y BATTUTA GREZZA INIZIALE)',
   'G65 P9810 X'+fmt(d.topX)+' Y-'+fmt(d.approach)+' F1000.',
   'G65 P9810 Z'+fmt(d.depth)+' F500.',
   'G65 P9810 Y-'+fmt(d.inner)+' F300.',
   'G65 P9811 Y0. S3',
   '',
   '(DISIMPEGNO E SPEGNIMENTO SONDA)',
   'G65 P9810 Y-'+fmt(d.approach)+' F500.',
   'G65 P9810 Z'+fmt(d.safe)+' F1000.',
   'G65 P9833 (SPEGNIMENTO SONDA)',
   '(FAR TRASLARE MANUALMENTE IL PEZZO DI POCHI MILLIMETRI PER COMPENSARE IL SOVRAMATERIALE)',
   'M00 (VERIFICA RIFERIMENTO PRIMA DELLA FRESATURA)',
   ''
  ].join('\n');
 }

 for(const c of configs){
  const form=document.getElementById(c.form);
  if(!form)continue;

  form.addEventListener('submit',()=>{
   const out=document.getElementById(c.output);
   if(!out||!out.value.trim())return;

   const d=read(c);
   if(!d.enabled)return;

   let width=23;
   if(d.profile==='big') width=23;
   else if(d.profile==='small') width=16.5;
   else{
    const widthEl=document.getElementById(c.widthId);
    width=Number(String(widthEl?widthEl.value:'').replace(',','.'));
   }

   if(!(d.tool>0)||!(d.safe>0)||!(d.approach>0)||!(d.inner>0)||!(d.depth<0)||!(width>0)){
    out.value='';
    alert('Controlla i dati della tastatura Renishaw: profilo, numero utensile, Z sicurezza, quota avvicinamento, punto interno e profondità negativa.');
    return;
   }

   const probeBlock = c.mode==='straight'
    ? buildStraightProbe(d,width)
    : buildArcProbe(d,width);

   const isoLines = out.value.split('\n');
   if(isoLines.length>2 && isoLines[0].trim()==='%' && isoLines[1].trim().startsWith('O')){
    const head = isoLines.slice(0,2).join('\n');
    const rest = isoLines.slice(2).join('\n');
    out.value = head + '\n' + probeBlock + rest;
   }else{
    out.value = probeBlock + '\n' + out.value;
   }
  });
 }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
