(function(){
'use strict';
function init(){
 const configs=[
  {form:'form',output:'output',mode:'straight',width:'width',prefix:'sp',title:'Tastatura iniziale Renishaw (Opzionale)'},
  {form:'arcForm',output:'arcOutput',mode:'arc',width:'aWidth',prefix:'ap',title:'Tastatura iniziale Renishaw (Opzionale)'}
 ];
 for(const c of configs){
  const form=document.getElementById(c.form);
  if(!form||document.getElementById(c.prefix+'Probe'))continue;
  const actions=form.querySelector('.actions');
  const card=document.createElement('section');
  card.className='card';
  card.id=c.prefix+'Probe';
  card.innerHTML='<h2>'+c.title+'</h2>'+
   '<div class="field"><label><input type="checkbox" id="'+c.prefix+'Enabled"> Aggiungi tastatura iniziale del pezzo</label></div>'+
   '<div class="grid">'+
   '<div class="field"><label for="'+c.prefix+'Tool">Sonda T / H</label><input id="'+c.prefix+'Tool" inputmode="numeric" value="28"></div>'+
   '<div class="field"><label for="'+c.prefix+'Safe">Z sicurezza (mm)</label><input id="'+c.prefix+'Safe" inputmode="decimal" value="100"></div>'+
   '<div class="field"><label for="'+c.prefix+'TopX">Punto Z · X (mm)</label><input id="'+c.prefix+'TopX" inputmode="decimal" value="0"></div>'+
   '<div class="field"><label for="'+c.prefix+'TopY">Punto Z · Y (mm)</label><input id="'+c.prefix+'TopY" inputmode="decimal" value="10"></div>'+
   '<div class="field"><label for="'+c.prefix+'Approach">Avvicinamento esterno (mm)</label><input id="'+c.prefix+'Approach" inputmode="decimal" value="25"></div>'+
   '<div class="field"><label for="'+c.prefix+'Inner">Punto interno misura (mm)</label><input id="'+c.prefix+'Inner" inputmode="decimal" value="10"></div>'+
   '<div class="field"><label for="'+c.prefix+'Depth">Profondità misura laterale Z (mm)</label><input id="'+c.prefix+'Depth" inputmode="decimal" value="-4"></div>'+
   '</div>'+
   '<p class="tip">La sonda utilizza G56 come origine provvisoria, aggiorna il riferimento con S3 e impiega T28/H28 con sfera Ø6 mm. La larghezza nominale è presa dalla larghezza del profilo selezionato.</p>';
  form.insertBefore(card,actions);
 }
 function read(c){
  const $=id=>document.getElementById(c.prefix+id);
  const n=id=>{const v=$(id).value.trim();return v===''?NaN:Number(v.replace(',','.'));};
  return {enabled:$('Enabled').checked,tool:n('Tool'),safe:n('Safe'),topX:n('TopX'),topY:n('TopY'),approach:n('Approach'),inner:n('Inner'),depth:n('Depth')};
 }
 function fmt(n){const x=Number(n);return Number.isFinite(x)?String(Number(x.toFixed(4)))+(Number.isInteger(Number(x.toFixed(4)))?'.':''):'0.';}
 function build(d,mode,width){
  const a=['(TASTATURA INIZIALE RENISHAW)','(ORIGINE PROVVISORIA G56 GIA IMPOSTATA)','(SONDA T'+fmt(d.tool)+' / H'+fmt(d.tool)+' - SFERA D6)','G65 P9832','G65 P9810 X'+fmt(d.topX)+' Y'+fmt(d.topY)+' F1000.','G65 P9810 Z5. F500.','G65 P9811 Z0. S3','G65 P9810 Z'+fmt(d.safe)+' F1000.','G65 P9810 X'+fmt(d.topX)+' Y'+fmt(d.topY)+' F1000.','G65 P9810 Z'+fmt(d.depth)+' F500.'];
  a.push('G65 P9812 X'+fmt(width)+' Z'+fmt(d.depth)+' R10. S3','G65 P9810 Z'+fmt(d.safe)+' F1000.');
  if(mode==='straight'){
   a.push('G65 P9810 X-'+fmt(d.approach)+' Y0. F1000.','G65 P9810 Z'+fmt(d.depth)+' F500.','G65 P9810 X-'+fmt(d.inner)+' F300.','G65 P9811 X0. S3','G65 P9810 X-'+fmt(d.approach)+' F500.');
  }else{
   a.push('G65 P9810 X'+fmt(d.topX)+' Y-'+fmt(d.approach)+' F1000.','G65 P9810 Z'+fmt(d.depth)+' F500.','G65 P9810 Y-'+fmt(d.inner)+' F300.','G65 P9811 Y0. S3','G65 P9810 Y-'+fmt(d.approach)+' F500.');
  }
  a.push('G65 P9810 Z'+fmt(d.safe)+' F1000.','G65 P9833','(FAR TRASLARE MANUALMENTE IL PEZZO DI POCHI MILLIMETRI PER COMPENSARE IL SOVRAMATERIALE)');
  return a.join('\n');
 }
 for(const c of configs){
  const form=document.getElementById(c.form);
  if(!form)continue;
  form.addEventListener('submit',()=>{
   const out=document.getElementById(c.output);
   if(!out||!out.value.trim())return;
   const d=read(c);
   if(!d.enabled)return;
   const widthEl=document.getElementById(c.width);
   const width=Number(String(widthEl?widthEl.value:'').replace(',','.'));
   if(!(d.tool>0)||!(d.safe>0)||!(d.approach>0)||!(d.inner>0)||!(d.depth<0)||!(width>0)){
    out.value='';
    alert('Controlla i dati della tastatura Renishaw: utensile, Z sicurezza, avvicinamento, punto interno, profondità negativa e larghezza profilo.');
    return;
   }
   out.value=build(d,c.mode,width)+'\n\n'+out.value;
  });
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
