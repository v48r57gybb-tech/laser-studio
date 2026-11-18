# Esempi iniziali e presentazione generazione

- Ogni caricamento della pagina parte dai defaults completi di dritto e arco, senza ripristinare vecchie quote o eccezioni. L’arco usa R990, 19 fori, corda 172.568, estremità in arco 64.795, profilo 23 x 13.5, tangente Y+, curva destra e rifili radiali.
- Le impostazioni demo iniziali hanno svasatura e maschiatura disattivate.
- Nessuna cancellazione delle chiavi dell’archivio. Reset manuale e cambi modalità non ricaricano gli esempi durante la sessione.
- Ogni build esegue i generatori reali con i defaults in ambiente isolato e si interrompe su errore, output assente o valori non finiti. Non è un collaudo CNC.
- Dopo generazione valida: pannello Motore di calcolo, barra verde, percentuale e coordinate reali presentate progressivamente per almeno 5000 ms. Si tratta della presentazione del risultato già calcolato, non di simulazione macchina.
- ISO nascosto e copia/download disabilitati fino al termine; successivamente risultato visibile e scorrimento alla sezione.
- Errori immediati; modifiche, reset o cambio modalità annullano la presentazione pendente.
- Test locali della temporizzazione, annullamento, riavvio, estrazione coordinate e sintassi superati; build completo e prove browser da verificare dopo integrazione.
