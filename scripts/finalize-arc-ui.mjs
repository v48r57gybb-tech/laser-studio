import { readFile, writeFile } from 'node:fs/promises';
let arc = await readFile('dist/arc.js','utf8');
function patch(before, after) {
 if(!arc.includes(before)) throw new Error('Aggiornamento interfaccia arco: riferimento mancante: ' + before);
 arc = arc.replace(before, after);
}
patch("const resetArcBtn = $('resetArc');", `if (!$('resetArc')) {
      const actions = $('arcForm').querySelector('.actions');
      if (!actions) throw new Error('Barra azioni arco mancante');
      const newResetButton = document.createElement('button');
      newResetButton.type = 'button';
      newResetButton.id = 'resetArc';
      newResetButton.textContent = 'Nuova generazione (Reset quote)';
      actions.appendChild(newResetButton);
    }
    const resetArcBtn = $('resetArc');`);
patch('<h3>Eccezioni corde consecutive</h3>', '<h3>Eccezioni corde consecutive <button class="info" type="button" data-arctip="rules" aria-controls="arctip-rules" aria-label="Informazioni sulle eccezioni corda">i</button></h3><div class="tip" id="arctip-rules" hidden>La corda standard vale per tutte le coppie consecutive. Una eccezione cambia solo la coppia indicata: Dal foro 5 e Corda 180 significa 180 mm tra i centri dei fori 5 e 6. Tutte le altre coppie mantengono la corda standard. Inserisci la distanza rettilinea fra i centri, non lo sviluppo lungo arco. Puoi aggiungere più eccezioni per coppie diverse; usa una sola regola per ciascuna coppia. Il numero Dal foro deve essere compreso fra 1 e numero fori meno 1; la corda deve essere positiva e minore di due volte il raggio della linea centri. Rimuovi cancella soltanto quella eccezione.</div>');
patch("$('arcStatus').textContent = 'Quote arco azzerate. Inserisci raggio, numero fori e corde del nuovo pezzo.';", `$('arcStatus').textContent = 'Quote arco azzerate. Inserisci raggio, numero fori e corde del nuovo pezzo.';
        if ($('arcSummary')) $('arcSummary').textContent = '—';
        try { localStorage.setItem('iso-smart-arc', JSON.stringify(readArc())); } catch (err) {}`);
await writeFile('dist/arc.js',arc);
