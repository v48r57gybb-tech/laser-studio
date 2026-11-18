const defaults = {
  length: 1000,
  count: 13,
  pitch: 80,
  left: 20,
  right: 20,
  width: 16.5,
  height: 10,
  millTool: 6,
  millD: 6,
  diameter: 10,
  comp: 'off',
  millS: 2700,
  millF: 270,
  step: 4,
  millZ: -12,
  span: 20,
  clear: 5,
  safe: 200,
  drillTool: 4,
  drillCycle: 'G83',
  drillMode: 'custom',
  drillCustomDia: 6.8,
  drillCoolant: 'M8',
  drillS: 1850,
  drillF: 180,
  drillZ: -13,
  q: 2,
  r: 3,
  initial: 50,
  chamfer: false,
  chamferTool: 5,
  chamferAngle: '90',
  chamferZ: -2,
  chamferS: 2000,
  chamferF: 200,
  tap: false,
  tapTool: 7,
  thread: 'M4',
  custom: '',
  tapPitch: 0.7,
  tapS: 300,
  tapZ: -13
};

const threads = { M3: 0.5, M4: 0.7, M5: 0.8, M6: 1, M8: 1.25, M10: 1.5, M12: 1.75, M16: 2 };

const fmt = n => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0.';
  const rounded = Number(num.toFixed(4));
  return String(rounded) + (Number.isInteger(rounded) ? '.' : '');
};

const toolsList = Array.from({ length: 28 }, (_, i) => [i + 1, 'T' + (i + 1) + ' / H' + (i + 1)]);

function errors(d) {
  const e = {};
  const bad = (k, m) => { if (!e[k]) e[k] = m; };

  for (const k of ['length', 'count', 'pitch', 'left', 'right', 'width', 'height', 'millTool', 'millD', 'diameter', 'millS', 'millF', 'step', 'millZ', 'span', 'clear', 'safe', 'drillTool', 'drillS', 'drillF', 'drillZ', 'r', 'initial']) {
    if (!Number.isFinite(Number(d[k]))) bad(k, 'Inserisci un numero valido.');
  }

  for (const k of ['length', 'diameter', 'millS', 'millF', 'step', 'span', 'clear', 'safe', 'drillS', 'drillF', 'r', 'initial']) {
    if (!(Number(d[k]) > 0)) bad(k, 'Inserisci un valore maggiore di zero.');
  }

  if (['G83', 'G73'].includes(d.drillCycle)) {
    if (!Number.isFinite(Number(d.q)) || !(Number(d.q) > 0)) bad('q', 'Incremento Q positivo richiesto per ' + d.drillCycle);
  }

  if (d.drillMode === 'custom' && !(Number(d.drillCustomDia) > 0)) bad('drillCustomDia', 'Inserisci un diametro punta valido.');

  if (![16.5, 23].includes(Number(d.width))) bad('width', 'Scegli 16,5 o 23 mm.');
  if (![10, 13.5].includes(Number(d.height))) bad('height', 'Scegli 10 o 13,5 mm.');
  if (!Number.isInteger(Number(d.count)) || Number(d.count) < 1 || Number(d.count) > 1000) bad('count', 'Numero intero da 1 a 1000.');
  if (Number(d.pitch) < 0 || (Number(d.count) > 1 && Number(d.pitch) <= 0)) bad('pitch', 'Interasse positivo per più fori.');

  for (const k of ['left', 'right']) {
    if (Number(d[k]) < 0) bad(k, 'La distanza non può essere negativa.');
  }

  if (Number.isFinite(Number(d.left) + (Number(d.count) - 1) * Number(d.pitch) + Number(d.right)) && Math.abs(Number(d.left) + (Number(d.count) - 1) * Number(d.pitch) + Number(d.right) - Number(d.length)) > 0.001) {
    for (const k of ['length', 'count', 'pitch', 'left', 'right']) bad(k, 'Quote non coerenti: SX + (fori − 1) × interasse + DX deve uguagliare la lunghezza.');
  }

  if (Number(d.span) <= Number(d.width) / 2 + Number(d.diameter) / 2) bad('span', 'Y esterno deve superare metà larghezza + raggio fresa.');
  if (Number(d.safe) <= Math.max(Number(d.initial), Number(d.clear))) bad('safe', 'Il ritiro deve superare Z iniziale e Z tra passate.');
  if (Number(d.initial) <= Number(d.r)) bad('initial', 'La quota iniziale deve superare R.');

  for (const k of ['millZ', 'drillZ']) {
    if (!(Number(d[k]) < -Number(d.height))) bad(k, 'Lavorazione passante: quota Z deve superare -' + d.height + ' mm.');
  }

  if (Number(d.step) > 0 && Math.ceil(-Number(d.millZ) / Number(d.step)) > 1000) bad('step', 'Massimo 1000 passate.');
  if (!['off', 'wear'].includes(d.comp)) bad('comp', 'Seleziona la compensazione.');

  if (d.chamfer) {
    if (!Number.isFinite(Number(d.chamferZ)) || Number(d.chamferZ) >= 0 || Number(d.chamferZ) < -10) bad('chamferZ', 'Profondità svasatura da -1.0 a -10.0 mm.');
    if (!(Number(d.chamferS) > 0)) bad('chamferS', 'Giri maggiori di zero.');
    if (!(Number(d.chamferF) > 0)) bad('chamferF', 'Avanzamento maggiore di zero.');
  }

  if (d.tap) {
    if (![-13, -16].includes(Number(d.tapZ)) || Number(d.tapZ) >= -Number(d.height)) bad('tapZ', 'Scegli quota passante (-13 o -16).');
    if (!(Number(d.tapS) > 0)) bad('tapS', 'Giri maggiori di zero.');
    if (!(Number(d.tapPitch) > 0)) bad('tapPitch', 'Passo maggiore di zero.');
    if (d.thread !== 'custom' && (!threads[d.thread] || threads[d.thread] !== Number(d.tapPitch))) bad('thread', 'Seleziona nuovamente il filetto.');
    if (d.thread === 'custom' && !/^[A-Za-z0-9 .,_xX/+-]{1,32}$/.test(d.custom)) bad('custom', 'Nome da 1 a 32 caratteri.');
    if (!Number.isFinite(Number(d.tapS) * Number(d.tapPitch)) || Number(d.tapS) * Number(d.tapPitch) <= 0) bad('tapS', 'Avanzamento non valido.');
  }

  return e;
}

function generate(d) {
  const e = errors(d);
  if (Object.keys(e).length) throw Error(Object.values(e)[0]);
  const f = fmt;
  const count = Number(d.count);
  const pitch = Number(d.pitch);
  const left = Number(d.left);
  const xs = Array.from({ length: count }, (_, i) => left + i * pitch);

  let title = 'RIFILI + FORATURE';
  if (d.chamfer) title += ' + SVASATURA';
  if (d.tap) title += ' + MASCHIATURA';

  const a = [
    '%',
    'O0001 (' + title + ')',
    '(PEZZO DIRITTO L' + f(d.length) + ' LARGHEZZA ' + f(d.width) + ' H' + f(d.height) + ')',
    '(FORI ' + count + ' - INTERASSE ' + f(pitch) + ')',
    '(ZERO G56: X0 PIANO SX BATTUTA - Y0 MEZZERIA - Z0 SUPERIORE)',
    'G21 G17 G90 G94',
    'G40 G49 G80',
    'G56',
    '',
    'T' + d.millTool + ' M6 (FRESA RIFILI D' + d.diameter + ')',
    'G0 G43 H' + d.millTool + ' Z' + f(d.safe),
    'S' + f(d.millS) + ' M3'
  ];

  const depths = [];
  for (let z = Number(d.step); z < -Number(d.millZ) - 1e-8; z += Number(d.step)) depths.push(-z);
  depths.push(Number(d.millZ));

  const sides = [
    ['SINISTRO', -Number(d.diameter) / 2, 'G42'],
    ['DESTRO', Number(d.length) + Number(d.diameter) / 2, 'G41']
  ];

  for (const [side, x, c] of sides) {
    a.push('', '(RIFILO ' + side + ')', 'G0 X' + f(x) + ' Y' + f(d.span));
    for (const z of depths) {
      a.push('G0 Z' + f(d.clear));
      if (d.comp === 'wear') a.push('G0 Y' + f(Number(d.span) + 10), 'G1 ' + c + ' D' + d.millD + ' Y' + f(d.span) + ' F' + f(d.millF));
      a.push('G1 Z' + f(z) + ' F' + f(d.millF), 'G1 Y' + f(-d.span) + ' F' + f(d.millF), 'G0 Z' + f(d.clear));
      if (d.comp === 'wear') a.push('G1 G40 Y' + f(-Number(d.span) - 10) + ' F' + f(d.millF));
      a.push('G0 Y' + f(d.span));
    }
    a.push('G0 Z' + f(d.safe));
  }
  a.push('', 'M9', 'M5', 'M1');

  const puntaDesc = d.drillMode === 'custom'
    ? 'PUNTA D' + d.drillCustomDia
    : (d.drillMode === 'step1' ? 'PUNTA DOPPIO D 5.5/9.5' : 'PUNTA DOPPIO D 6.5/11');

  let cycleBlock = 'G98 ' + d.drillCycle + ' Z' + f(d.drillZ) + ' R' + f(d.r);
  if (d.drillCycle === 'G83' || d.drillCycle === 'G73') cycleBlock += ' Q' + f(d.q);
  cycleBlock += ' F' + f(d.drillF);

  a.push(
    '',
    'T' + d.drillTool + ' M6 (' + puntaDesc + ')',
    'G0 G43 H' + d.drillTool + ' Z' + f(d.safe),
    d.drillCoolant + ' (REFRIGERANTE)',
    'S' + f(d.drillS) + ' M3',
    'G0 X' + f(xs[0]) + ' Y0.',
    'G0 Z' + f(d.initial),
    cycleBlock,
    ...xs.slice(1).map(x => 'X' + f(x)),
    'G80',
    'G0 Z' + f(d.safe),
    'M9',
    'M5',
    'M1'
  );

  if (d.chamfer) {
    a.push(
      '',
      'T' + d.chamferTool + ' M6 (SVASATORE ' + d.chamferAngle + ' GRADI)',
      'G0 G43 H' + d.chamferTool + ' Z' + f(d.safe),
      'S' + f(d.chamferS) + ' M3',
      'G0 X' + f(xs[0]) + ' Y0.',
      'G0 Z' + f(d.initial),
      'G98 G82 Z' + f(d.chamferZ) + ' R' + f(d.r) + ' P500 F' + f(d.chamferF),
      ...xs.slice(1).map(x => 'X' + f(x)),
      'G80',
      'G0 Z' + f(d.safe),
      'M9',
      'M5',
      'M1'
    );
  }

  if (d.tap) {
    const name = d.thread === 'custom' ? d.custom.toUpperCase().replace(/,/g, '.') : d.thread + 'X' + String(d.tapPitch);
    a.push(
      '',
      'T' + d.tapTool + ' M6 (MASCHIO ' + name + ')',
      'G0 G43 H' + d.tapTool + ' Z' + f(d.safe),
      'G90 G94',
      'G0 X' + f(xs[0]) + ' Y0.',
      'G0 Z' + f(d.initial),
      'M8',
      'M29 S' + f(d.tapS),
      'G98 G84 Z' + f(d.tapZ) + ' R' + f(d.r) + ' F' + f(Number(d.tapS) * Number(d.tapPitch)),
      ...xs.slice(1).map(x => 'X' + f(x)),
      'G80',
      'G0 Z' + f(d.safe),
      'M9',
      'M5',
      'M1'
    );
  }

  a.push('G49', 'G40', 'G80', 'G90', 'M30', '%');
  return a.join('\n');
}

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const numeric = ['length', 'count', 'pitch', 'left', 'right', 'millTool', 'millD', 'diameter', 'millS', 'millF', 'step', 'millZ', 'span', 'clear', 'safe', 'drillTool', 'drillCustomDia', 'drillS', 'drillF', 'drillZ', 'q', 'r', 'initial', 'chamferTool', 'chamferZ', 'chamferS', 'chamferF', 'tapTool', 'tapPitch', 'tapS'];

  const sections = [
    ['1 · Il pezzo', ['length', 'count', 'pitch', 'left', 'right', 'width', 'height']],
    ['2 · Rifili (Fresa)', ['millTool', 'millD', 'diameter', 'comp', 'millS', 'millF', 'step', 'millZ', 'span', 'clear', 'safe']],
    ['3 · Foratura (Punta)', ['drillTool', 'drillCycle', 'drillMode', 'drillCustomDia', 'drillCoolant', 'drillS', 'drillF', 'drillZ', 'q', 'r', 'initial']],
    ['4 · Svasatura (Opzionale)', ['chamfer', 'chamferTool', 'chamferAngle', 'chamferZ', 'chamferS', 'chamferF']],
    ['5 · Maschiatura (Opzionale)', ['tap', 'tapTool', 'thread', 'custom', 'tapPitch', 'tapS', 'tapZ']]
  ];

  const labels = {
    length: 'Lunghezza finita (mm)',
    count: 'Numero fori',
    pitch: 'Interasse (mm)',
    left: 'Rifilo SX → primo centro (mm)',
    right: 'Ultimo centro → rifilo DX (mm)',
    width: 'Larghezza profilo (mm)',
    height: 'Spessore profilo (mm)',
    millTool: 'Utensile fresa (Torretta T / Correttore H)',
    millD: 'Correttore raggio D fresa',
    diameter: 'Diametro fresa (mm)',
    comp: 'Compensazione raggio',
    millS: 'Giri fresa S (giri/min)',
    millF: 'Avanzamento fresa F (mm/min)',
    step: 'Profondità per passata (mm)',
    millZ: 'Z finale rifili passante (mm)',
    span: 'Corsa fuori pezzo ± Y (mm)',
    clear: 'Z tra passate (mm)',
    safe: 'Z sicurezza e cambio utensile (mm)',
    drillTool: 'Utensile punta (Torretta T / Correttore H)',
    drillCycle: 'Strategia foratura',
    drillMode: 'Tipo punta',
    drillCustomDia: 'Diametro punta personalizzato (mm)',
    drillCoolant: 'Refrigerante',
    drillS: 'Giri punta S (giri/min)',
    drillF: 'Avanzamento punta F (mm/min)',
    drillZ: 'Z finale foratura passante (mm)',
    q: 'Incremento ciclo Q (mm)',
    r: 'Piano di stacco R (mm)',
    initial: 'Z iniziale ciclo G98 (mm)',
    chamfer: 'Aggiungi svasatura dopo foratura',
    chamferTool: 'Utensile svasatore (Torretta T / Correttore H)',
    chamferAngle: 'Angolo svasatore',
    chamferZ: 'Profondità Z svasatura (mm)',
    chamferS: 'Giri svasatore S (giri/min)',
    chamferF: 'Avanzamento svasatore F (mm/min)',
    tap: 'Aggiungi maschiatura rigida M29/G84',
    tapTool: 'Utensile maschio (Torretta T / Correttore H)',
    thread: 'Filetto',
    custom: 'Nome filetto personalizzato',
    tapPitch: 'Passo maschio (mm)',
    tapS: 'Giri maschio S (giri/min)',
    tapZ: 'Z finale maschiatura passante (mm)'
  };

  const tips = {
    length: 'Lunghezza totale finita del pezzo, misurata tra i due rifili esterni.',
    count: 'Numero totale dei fori da eseguire lungo il pezzo.',
    pitch: 'Distanza costante tra il centro di un foro e il successivo.',
    left: 'Distanza dal rifilo sinistro al centro del primo foro.',
    right: 'Distanza dal centro dell’ultimo foro al rifilo destro.',
    width: 'Larghezza del profilo. La scelta aggiorna automaticamente lo spessore: 16,5 = profilo piccolo, 23 = profilo grande.',
    height: 'Spessore del profilo. Deve corrispondere alla larghezza scelta: 16,5 mm = 10 mm, 23 mm = 13,5 mm.',
    millTool: 'Numero torretta della fresa. Il correttore D viene sincronizzato automaticamente con questo valore.',
    millD: 'Numero correttore raggio della fresa. Si allinea automaticamente alla torretta T, ma può essere modificato manualmente.',
    diameter: 'Diametro della fresa impiegata per eseguire i due rifili.',
    comp: 'Con compensazione attiva il programma entra in G41/G42 con correttore D ed esce in G40.',
    millS: 'Rivoluzione della fresa per la lavorazione dei rifili.',
    millF: 'Avanzamento di lavoro della fresa durante il taglio.',
    step: 'Profondità rimossa a ogni passata di fresatura.',
    millZ: 'Quota Z finale della fresatura. Deve essere passante, cioè più negativa dello spessore del profilo.',
    span: 'Eccedenza Y oltre il bordo del pezzo per entrare e uscire dal taglio.',
    clear: 'Quota Z di stacco tra le passate di fresatura.',
    safe: 'Quota Z di sicurezza per i rapidi e il cambio utensile.',
    drillTool: 'Numero torretta della punta da foratura.',
    drillCycle: 'G83 scarica il truciolo uscendo fino a R; G73 rompe il truciolo con stacco interno; G81 fora in modo continuo.',
    drillMode: 'Scegli una punta a diametro libero oppure una punta doppio diametro predefinita.',
    drillCustomDia: 'Diametro della punta personalizzata, visibile solo con tipo punta personalizzato.',
    drillCoolant: 'M8 attiva il refrigerante esterno; M18 attiva il refrigerante interno attraverso l’utensile.',
    drillS: 'Rivoluzione della punta durante la foratura.',
    drillF: 'Avanzamento della punta durante la foratura.',
    drillZ: 'Quota Z finale della foratura. Deve essere passante rispetto allo spessore del profilo.',
    q: 'Profondità di ogni affondo per G83 e G73. Non è utilizzata da G81.',
    r: 'Piano di stacco R del ciclo di foratura.',
    initial: 'Quota Z iniziale del ciclo G98, sopra il piano R.',
    chamfer: 'Attiva la svasatura dei fori dopo la foratura.',
    chamferTool: 'Numero torretta dell’utensile svasatore.',
    chamferAngle: 'Angolo di svasatura dell’utensile.',
    chamferZ: 'Profondità Z di lavoro della svasatura, espressa come valore negativo.',
    chamferS: 'Rivoluzione dell’utensile svasatore.',
    chamferF: 'Avanzamento dell’utensile svasatore.',
    tap: 'Attiva la maschiatura rigida con M29 e ciclo G84.',
    tapTool: 'Numero torretta del maschio.',
    thread: 'Filetto da eseguire. Il passo si aggiorna automaticamente salvo filetto personalizzato.',
    custom: 'Nome del filetto personalizzato, visibile solo scegliendo “Personalizzato”.',
    tapPitch: 'Passo della maschiatura. Con filetto standard è calcolato automaticamente.',
    tapS: 'Rivoluzione del maschio. L’avanzamento F è calcolato come S × passo.',
    tapZ: 'Quota Z finale della maschiatura passante.'
  };

  const select = {
    width: [[16.5, '16,5 mm'], [23, '23 mm']],
    height: [[10, '10 mm'], [13.5, '13,5 mm']],
    millTool: toolsList,
    drillTool: toolsList,
    chamferTool: toolsList,
    tapTool: toolsList,
    diameter: [[8, 'Ø 8 mm'], [10, 'Ø 10 mm'], [12, 'Ø 12 mm']],
    comp: [['off', 'Senza compensazione (centro fresa)'], ['wear', 'Compensazione raggio attiva (G41/G42)']],
    drillCycle: [
      ['G83', 'G83 · Scarico truciolo profondo (esce a R)'],
      ['G81', 'G81 · Foratura diretta continua (senza Q)'],
      ['G73', 'G73 · Rottura truciolo rapida (stacco 0.5 mm)']
    ],
    drillMode: [['custom', 'Punta a diametro personalizzato'], ['step1', 'Punta doppio Ø 5,5 / 9,5'], ['step2', 'Punta doppio Ø 6,5 / 11']],
    drillCoolant: [['M8', 'Acqua esterna (M8)'], ['M18', 'Acqua interna attraverso utensile (M18)']],
    chamferAngle: [['60', '60°'], ['90', '90°'], ['100', '100°']],
    thread: [...Object.entries(threads).map(([n, p]) => [n, n + ' × ' + String(p).replace('.', ',')]), ['custom', 'Personalizzato']],
    tapZ: [[-13, 'Z−13 (passante per H10)'], [-16, 'Z−16 (passante consigliato per H13.5)']]
  };

  function makeField(k) {
    return '<div class="field" id="field-' + k + '">' +
      '<label for="' + k + '">' + labels[k] +
      (tips[k] ? '<button class="info" type="button" data-tip="' + k + '" aria-label="Informazioni ' + labels[k] + '">i</button>' : '') +
      '</label>' +
      (select[k]
        ? '<select id="' + k + '">' + select[k].map(([v, t]) => '<option value="' + v + '">' + t + '</option>').join('') + '</select>'
        : '<input id="' + k + '" type="' + (['tap', 'chamfer'].includes(k) ? 'checkbox' : 'text') + '" ' + (numeric.includes(k) ? 'inputmode="decimal"' : '') + ' autocomplete="off">') +
      (tips[k] ? '<p class="tip" id="tip-' + k + '" hidden>' + tips[k] + '</p>' : '') +
      '<span class="err" id="err-' + k + '"></span>' +
      '</div>';
  }

  $('fields').innerHTML = sections.map(([title, keys]) =>
    '<section class="card"><h2>' + title + '</h2><div class="grid">' +
    keys.map(makeField).join('') +
    '</div>' +
    (title.startsWith('5') ? '<div id="feedbox" class="notice"><label for="feed">Avanzamento maschiatura F automatico (mm/min)</label><output id="feed">—</output></div>' : '') +
    '</section>'
  ).join('');

  const actionsEl = document.querySelector('#form .actions');
  if (actionsEl) {
    actionsEl.innerHTML =
      '<button class="primary" type="submit">Controlla e genera ISO</button>' +
      '<button type="button" id="resetStraight" style="background:#e8f0fe;border-color:#2355d8;color:#2355d8;">Nuova generazione (Reset quote)</button>';
  }

  const archiveCard = document.createElement('section');
  archiveCard.className = 'card';
  archiveCard.id = 'archiveSection';
  archiveCard.innerHTML =
    '<h2>Archivio Programmi e Attrezzaggi</h2>' +
    '<p class="muted">Salva i parametri completi e le note di staffaggio/attrezzaggio per richiamarli istantaneamente.</p>' +
    '<div class="grid">' +
    '<div class="field"><label for="progName">Nome Programma / Codice Articolo</label><input id="progName" placeholder="Es. TRAVERSA-1000-M8" autocomplete="off"></div>' +
    '<div class="field"><label for="progNotes">Note di Attrezzaggio (Morse, staffe, battute)</label><input id="progNotes" placeholder="Es. Morsa 2, battuta SX su perno D10..." autocomplete="off"></div>' +
    '</div>' +
    '<div class="actions" style="margin-top:15px;"><button type="button" id="btnSaveArchive" class="primary" style="background:#20804b;">Salva nell\'archivio</button></div>' +
    '<div id="archiveTableContainer" style="margin-top:20px;overflow-x:auto;"></div>';

  const mainEl = document.querySelector('main');
  if (mainEl && !$('archiveSection')) mainEl.appendChild(archiveCard);

  let d = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem('iso-smart-v2') || 'null');
    if (saved) {
      for (const k of Object.keys(defaults)) if (Object.hasOwn(saved, k)) d[k] = saved[k];
    }
  } catch (e) {}

  for (const k of Object.keys(defaults)) {
    if (['tap', 'chamfer'].includes(k)) $(k).checked = d[k] === true;
    else $(k).value = d[k];
  }

  function read() {
    const a = {};
    for (const k of Object.keys(defaults)) {
      const el = $(k);
      a[k] = ['tap', 'chamfer'].includes(k) ? el.checked : numeric.includes(k) ? (el.value.trim() === '' ? NaN : Number(el.value.replace(',', '.'))) : el.value;
    }
    return a;
  }

  function sync() {
    const onTap = $('tap').checked;
    const custom = $('thread').value === 'custom';
    for (const k of ['tapTool', 'thread', 'custom', 'tapPitch', 'tapS', 'tapZ']) $('field-' + k).hidden = !onTap || (k === 'custom' && !custom);
    $('feedbox').hidden = !onTap;
    $('tapPitch').readOnly = !custom;
    if (!custom) $('tapPitch').value = threads[$('thread').value] ?? '';

    const onChamfer = $('chamfer').checked;
    for (const k of ['chamferTool', 'chamferAngle', 'chamferZ', 'chamferS', 'chamferF']) $('field-' + k).hidden = !onChamfer;

    const onComp = $('comp').value === 'wear';
    $('field-millD').hidden = !onComp;

    $('field-drillCustomDia').hidden = $('drillMode').value !== 'custom';
    $('field-q').hidden = $('drillCycle').value === 'G81';

    const v = read();
    const feed = Number(v.tapS) * Number(v.tapPitch);
    $('feed').textContent = Number.isFinite(feed) && v.tapS > 0 && v.tapPitch > 0 ? fmt(feed) + ' mm/min' : '—';
  }

  function clear() {
    for (const k of Object.keys(defaults)) {
      $('field-' + k).classList.remove('bad', 'good');
      $('err-' + k).textContent = '';
    }
  }

  function invalidate() {
    clear();
    $('output').value = '';
    $('copy').disabled = $('download').disabled = true;
    $('status').className = 'notice';
    $('status').textContent = 'Dati modificati: controlla e genera nuovamente.';
    sync();
    try {
      localStorage.setItem('iso-smart-v2', JSON.stringify(read()));
    } catch (e) {}
  }

  $('form').addEventListener('input', invalidate);
  $('form').addEventListener('change', invalidate);
  $('form').addEventListener('click', e => {
    const b = e.target.closest('[data-tip]');
    if (!b) return;
    e.preventDefault();
    const t = $('tip-' + b.dataset.tip);
    if (t) t.hidden = !t.hidden;
  });

  $('millTool').addEventListener('change', () => {
    $('millD').value = $('millTool').value;
  });

  $('width').addEventListener('change', () => {
    $('height').value = Number($('width').value) === 16.5 ? '10' : '13.5';
  });

  $('height').addEventListener('change', () => {
    $('width').value = Number($('height').value) === 10 ? '16.5' : '23';
  });

  $('resetStraight').onclick = () => {
    for (const k of ['length', 'count', 'pitch', 'left', 'right']) {
      $(k).value = '';
    }
    $('output').value = '';
    $('copy').disabled = $('download').disabled = true;
    $('status').className = 'notice';
    $('status').textContent = 'Quote azzerate. Inserisci lunghezza, fori e interasse del nuovo pezzo.';
    clear();
    $('length').focus();
  };

  $('form').addEventListener('submit', e => {
    e.preventDefault();
    clear();
    sync();
    $('output').value = '';
    $('copy').disabled = $('download').disabled = true;
    const v = read();
    const errs = errors(v);
    const keys = Object.keys(errs);
    if (keys.length) {
      for (const k of keys) {
        $('field-' + k).classList.add('bad');
        $('err-' + k).textContent = errs[k];
      }
      $('status').className = 'notice error';
      $('status').textContent = 'Correggi i campi evidenziati prima di generare.';
      return;
    }
    for (const k of Object.keys(defaults)) if (!$('field-' + k).hidden) $('field-' + k).classList.add('good');
    $('status').className = 'notice success';
    $('status').textContent = 'Dati coerenti · Programma ISO dritto generato.';
    $('output').value = generate(v);
    $('copy').disabled = $('download').disabled = false;
  });

  $('copy').onclick = async () => {
    try {
      await navigator.clipboard.writeText($('output').value);
      $('status').textContent = 'Programma copiato negli appunti.';
    } catch (e) {
      $('output').focus();
      $('output').select();
    }
  };

  $('download').onclick = () => {
    const u = URL.createObjectURL(new Blob([$('output').value], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = u;
    a.download = 'programma-iso-dritto.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  };

  function getArchive() {
    try {
      return JSON.parse(localStorage.getItem('cnc-iso-archive') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveArchive(list) {
    try {
      localStorage.setItem('cnc-iso-archive', JSON.stringify(list));
    } catch (e) {}
    renderArchive();
  }

  function renderArchive() {
    const list = getArchive();
    const container = $('archiveTableContainer');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = '<p class="muted">Nessun programma salvato in archivio.</p>';
      return;
    }

    container.innerHTML =
      '<table style="width:100%;border-collapse:collapse;font-size:15px;">' +
      '<thead><tr style="background:#eef4ff;text-align:left;border-bottom:2px solid #18243a;">' +
      '<th style="padding:10px;">Tipo</th>' +
      '<th style="padding:10px;">Nome Programma</th>' +
      '<th style="padding:10px;">Note Attrezzaggio</th>' +
      '<th style="padding:10px;text-align:right;">Azioni</th>' +
      '</tr></thead><tbody>' +
      list.map((item, idx) =>
        '<tr style="border-bottom:1px solid #ccd6e0;">' +
        '<td style="padding:10px;"><strong>' + (item.type === 'arc' ? 'Arco' : 'Dritto') + '</strong></td>' +
        '<td style="padding:10px;">' + item.name + '</td>' +
        '<td style="padding:10px;color:#42516a;">' + (item.notes || '—') + '</td>' +
        '<td style="padding:10px;text-align:right;">' +
        '<button type="button" data-load="' + idx + '" style="padding:6px 12px;font-size:13px;margin-right:6px;">Carica</button>' +
        '<button type="button" data-delitem="' + idx + '" style="padding:6px 12px;font-size:13px;background:#ffe0e7;color:#ad1632;border-color:#ad1632;">Elimina</button>' +
        '</td></tr>'
      ).join('') +
      '</tbody></table>';
  }

  $('btnSaveArchive').onclick = () => {
    const name = $('progName').value.trim();
    if (!name) {
      alert('Inserisci un nome o codice per il programma prima di salvare.');
      $('progName').focus();
      return;
    }
    const notes = $('progNotes').value.trim();
    const isArc = $('partType').value === 'arc';

    const item = {
      id: Date.now(),
      name: name,
      notes: notes,
      type: isArc ? 'arc' : 'straight',
      date: new Date().toLocaleDateString('it-IT'),
      data: isArc
        ? (window.readArcData ? window.readArcData() : null)
        : read()
    };

    const list = getArchive();
    list.unshift(item);
    saveArchive(list);
    $('progName').value = '';
    $('progNotes').value = '';
    alert('Programma "' + name + '" salvato con successo nell\'archivio.');
  };

  $('archiveSection').addEventListener('click', e => {
    const loadBtn = e.target.closest('[data-load]');
    if (loadBtn) {
      const idx = Number(loadBtn.dataset.load);
      const list = getArchive();
      const item = list[idx];
      if (!item) return;

      if (item.type === 'straight') {
        $('partType').value = 'straight';
        $('partType').dispatchEvent(new Event('change'));
        for (const k of Object.keys(item.data)) {
          if ($(k)) {
            if (['tap', 'chamfer'].includes(k)) $(k).checked = item.data[k] === true;
            else $(k).value = item.data[k];
          }
        }
        $('form').dispatchEvent(new Event('submit'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (item.type === 'arc' && window.loadArcData) {
        $('partType').value = 'arc';
        $('partType').dispatchEvent(new Event('change'));
        window.loadArcData(item.data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const delBtn = e.target.closest('[data-delitem]');
    if (delBtn) {
      const idx = Number(delBtn.dataset.delitem);
      const list = getArchive();
      if (confirm('Vuoi davvero eliminare questo programma dall\'archivio?')) {
        list.splice(idx, 1);
        saveArchive(list);
      }
    }
  });

  sync();
  clear();
  renderArchive();
}
