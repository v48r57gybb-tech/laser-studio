(function(root) {
'use strict';
const key=(p,n)=>p?p+n[0].toUpperCase()+n.slice(1):n;
const number=v=>v===null||v===undefined||String(v).trim()===''?NaN:Number(String(v).replace(',','.'));
function nominal(d,p=''){const t=d[key(p,'thread')];if(t==='custom')return number(d[key(p,'tapNominal')]);const m=/^M(\d+(?:[.,]\d+)?)$/.exec(String(t));return m?number(m[1]):NaN;}
function base(diameter,pitch,kind){const D=number(diameter),P=number(pitch);if(!Number.isFinite(D)||!Number.isFinite(P)||D<=0||P<=0||P>=D||!['cut','form'].includes(kind))return NaN;return Number((D-P/(kind==='form'?2:1)).toFixed(4));}
function propose(d,p=''){return base(nominal(d,p),d[key(p,'tapPitch')],d[key(p,'tapKind')]||'cut');}
function signature(d,p=''){return JSON.stringify([d[key(p,'thread')],nominal(d,p),number(d[key(p,'tapPitch')]),d[key(p,'tapKind')]||'cut']);}
function validate(d,p=''){const k=n=>key(p,n),e={};if(d[k('tap')]||d[k('drillMode')]==='auto'){if(!['cut','form'].includes(d[k('tapKind')]||'cut'))e[k('tapKind')]='Seleziona asportazione o rullatura.';if(!['M8','M18'].includes(d[k('tapCoolant')]||'M8'))e[k('tapCoolant')]='Seleziona M8 o M18.';}if(d[k('drillMode')]==='auto'){if(d[k('tap')]!==true)e[k('tap')]='Il preforo automatico richiede la maschiatura attiva.';if(!Number.isFinite(propose(d,p)))e[k('thread')]='Controlla diametro nominale, passo e tipo di maschio.';if(d[k('thread')]==='custom'&&!(nominal(d,p)>0))e[k('tapNominal')]='Inserisci il diametro nominale positivo.';const a=number(d[k('drillCustomDia')]);if(!Number.isFinite(a)||a<=0||!(a<nominal(d,p)))e[k('drillCustomDia')]='Il preforo deve essere positivo e inferiore al diametro nominale.';}return e;}
function prepare(d,p=''){const a={...d};if(a[key(p,'drillMode')]==='auto')a[key(p,'drillMode')]='custom';return a;}
function enrich(d,p=''){const a={...d};for(const [n,f]of [['tapKind','cut'],['tapNominal',6],['tapCoolant','M8']]){const k=key(p,n),el=root.document?.getElementById(k),v=el?el.value:(a[k]??f);a[k]=n==='tapNominal'?number(v):v;}return a;}
function load(data,p=''){for(const[n,f]of [['tapKind','cut'],['tapNominal',6],['tapCoolant','M8']]){const k=key(p,n),el=root.document?.getElementById(k);if(el)el.value=data?.[k]??f;}root.document?.getElementById(p?'arcForm':'form')?.dispatchEvent(new Event('preforo:loaded'));}
root.CncPreforo=Object.freeze({key,number,nominal,base,propose,signature,validate,prepare,enrich,load});
})(globalThis);
