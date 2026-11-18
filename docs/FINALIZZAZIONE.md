# Finalizzazione Officina Smart CNC

## Modifiche di interfaccia
- Intestazione e dedica mantenute; tutti i testi allineati a sinistra.
- Logo rimosso dalla pagina e conservato nelle icone e nel manifest.
- Sequenza SVG/CSS automatica fresatura, foratura, maschiatura a destra; nessun comando visibile. Rispetta la preferenza di sistema per movimento ridotto. Illustrazione non collegata alle traiettorie ISO.
- Pulsante resetArc creato se mancante e collegato al reset esistente: elimina quote, eccezioni, output e riepilogo; mantiene parametri utensile. Salva lo stato azzerato.
- Infopoint eccezioni corde con esempio fori 5-6, distanza rettilinea, limiti e istruzioni.

## Implementazione
Le modifiche alla pagina e al file arc.js distribuito vengono applicate durante npm run build in dist. I sorgenti dei calcoli geometrici e della generazione ISO non vengono alterati. Le patch si interrompono se i riferimenti previsti non esistono.

## Da verificare dopo il deployment
- Logo assente nella pagina, icone ancora raggiungibili.
- Reset arco elimina le eccezioni e impedisce copia/download del vecchio output.
- Infopoint apribile e richiudibile.
- Layout desktop e mobile; preferenza movimento ridotto.
- Nuova intestazione visibile sul dominio effettivo dell’app.
