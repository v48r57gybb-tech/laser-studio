
// Access presentation only; authentication, vault and trial remain unchanged.
{
  const look=document.createElement('style');look.id='officinaAccessDesign';look.textContent=accessStyles;document.head.append(look);
  const choices=gate.querySelector('section[aria-label="Scegli accesso"]');
  if(choices){
    const description=choices.querySelector('p');
    if(description)description.textContent='Amministratore: password locale esistente, nessun timer. Visitatore: prova temporanea, senza archivi personali. Il limite è di 5 minuti.';
    const admin=choices.querySelector('button');
    if(admin){admin.setAttribute('aria-controls',form.id);admin.setAttribute('aria-expanded',String(!form.hidden));admin.addEventListener('click',()=>admin.setAttribute('aria-expanded',String(!form.hidden)));}
  }
  const intro=gate.querySelector('h1')?.nextElementSibling;
  if(intro?.tagName==='P'&&intro.textContent.trim()==='Password richiesta a ogni apertura, ricaricamento e nuova scheda.')intro.remove();
  if(!document.getElementById('officinaSubmit').disabled&&(note.textContent.startsWith('Primo accesso locale:')||note.textContent==='Inserisci la password esistente del tuo archivio locale. Nessuna nuova registrazione.'))note.textContent='';
  const details=document.createElement('details');
  const summary=document.createElement('summary');summary.textContent='Informazioni sull’archivio locale';
  const explanation=document.createElement('p');explanation.textContent='Al primo accesso scegli una password di almeno 12 caratteri: protegge l’archivio solo in questo browser e a questo indirizzo. La password non è recuperabile. Cambiare indirizzo non trasferisce l’archivio. La prova visitatore è dimostrativa e il suo limite locale può essere aggirato.';
  details.append(summary,explanation);form.append(details);
}
