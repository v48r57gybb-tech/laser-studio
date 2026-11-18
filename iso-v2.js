const defaults = {
  length: 1000,
  count: 13,
  pitch: 80,
  left: 20,
  right: 20,
  width: 16.5,
  height: 10,
  millT: 6,
  millH: 6,
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
  drillT: 4,
  drillH: 4,
  drillType: 'tap',
  drillCoolant: 'M8',
  drillS: 1850,
  drillF: 180,
  drillZ: -13,
  q: 2,
  r: 3,
  initial: 50,
  chamfer: false,
  chamferT: 5,
  chamferH: 5,
  chamferAngle: '90',
  chamferZ: -2,
  chamferS: 2000,
  chamferF: 200,
  tap: false,
  tapT: 7,
  tapH: 7,
  thread: 'M4',
  custom: '',
  tapPitch: 0.7,
  tapS: 300,
  tapZ: -13
};

const threads = { M3: 0.5, M4: 0.7, M5: 0.8, M6: 1, M8: 1.25, M10: 1.5, M12: 1.75, M16: 2 };
const tapDrillDiameters = { M3: 2.5, M4: 3.3, M5: 4.2, M6: 5.0, M8: 6.8, M10: 8.5, M12: 10.2, M16: 14.0 };

const fmt = n => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0.';
  const rounded = Number(num.toFixed(4));
  return String(rounded) + (Number.isInteger(rounded) ? '.' : '');
};

function errors(d) {
  const e = {};
  const bad = (k, m) => { if (!e[k]) e[k] = m; };

  for (const k of ['length', 'count', 'pitch', 'left', 'right', 'width', 'height', 'millT', 'millH', 'millD', 'diameter', 'millS', 'millF', 'step', 'millZ', 'span', 'clear', 'safe', 'drillT', 'drillH', 'drillS', 'drillF', 'drillZ', 'q', 'r', 'initial']) {
    if (!Number.isFinite(Number(d[k]))) bad(k, 'Inserisci un numero valido.');
  }

  for (const k of ['length', 'diameter', 'millS', 'millF', 'step', 'span', 'clear', 'safe', 'drillS', 'drillF', 'q', 'r', 'initial']) {
    if (!(Number(d[k]) > 0)) bad(k, 'Inserisci un valore maggiore di zero.');
  }

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
    if (!Number.isFinite(Number(d.chamferT)) || !Number.isFinite(Number(d.chamferH))) bad('chamferT', 'Numero torretta/altezza non valido.');
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
    'T' + d.millT + ' M6 (FRESA RIFILI D' + d.diameter + ')',
    'G0 G43 H' + d.millH + ' Z' + f(d.safe),
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
  a.push('', 'M9', 'M5');

  // FORATURA
  const puntaDesc = d.drillType === 'tap'
    ? (d.tap ? 'PREFORO ' + d.thread : 'PUNTA STANDARD')
    : (d.drillType === 'step1' ? 'PUNTA DOPPIO D 5.5/9.5' : 'PUNTA DOPPIO D 6.5/11');

  a.push(
    '',
    'T' + d.drillT + ' M6 (' + puntaDesc + ')',
    'G0 G43 H' + d.drillH + ' Z' + f(d.safe),
    d.drillCoolant + ' (REFRIGERANTE)',
    'S' + f(d.drillS) + ' M3',
    'G0 X' + f(xs[0]) + ' Y0.',
    'G0 Z' + f(d.initial),
    'G98 G83 Z' + f(d.drillZ) + ' R' + f(d.r) + ' Q' + f(d.q) + ' F' + f(d.drillF),
    ...xs.slice(1).map(x => 'X' + f(x)),
    'G80',
    'G0 Z' + f(d.safe),
    'M9',
    'M5'
  );

  // SVASATURA
  if (d.chamfer) {
    a.push(
      '',
      'T' + d.chamferT + ' M6 (SVASATORE ' + d.chamferAngle + ' GRADI)',
      'G0 G43 H' + d.chamferH + ' Z' + f(d.safe),
      'S' + f(d.chamferS) + ' M3',
      'G0 X' + f(xs[0]) + ' Y0.',
      'G0 Z' + f(d.initial),
      'G98 G82 Z' + f(d.chamferZ) + ' R' + f(d.r) + ' P500 F' + f(d.chamferF),
      ...xs.slice(1).map(x => 'X' + f(x)),
      'G80',
      'G0 Z' + f(d.safe),
      'M9',
      'M5'
    );
  }

  // MASCHIATURA
  if (d.tap) {
    const name = d.thread === 'custom' ? d.custom.toUpperCase().replace(/,/g, '.') : d.thread + 'X' + String(d.tapPitch);
    a.push(
      '',
      'T' + d.tapT + ' M6 (MASCHIO ' + name + ')',
      'G0 G43 H' + d.tapH + ' Z' + f(d.safe),
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
      'M5'
    );
  }

  a.push('G49', 'G40', 'G80', 'G90', 'M30', '%');
  return a.join('\n');
}

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const numeric = ['length', 'count', 'pitch', 'left', 'right', 'millT', 'millH', 'millD', 'diameter', 'millS', 'millF', 'step', 'millZ', 'span', 'clear', 'safe', 'drillT', 'drillH', 'drillS', 'drillF', 'drillZ', 'q', 'r', 'initial', 'chamferT', 'chamferH', 'chamferZ', 'chamferS', 'chamferF', 'tapT', 'tapH', 'tapPitch', 'tapS'];

  const sections = [
    ['1 · Il pezzo', ['length', 'count', 'pitch', 'left', 'right', 'width', 'height']],
    ['2 · Rifili (Fresa)', ['millT', 'millH', 'millD', 'diameter', 'comp', 'millS', 'millF', 'step', 'millZ', 'span', 'clear', 'safe']],
    ['3 · Foratura (Punta)', ['drillT', 'drillH', 'drillType', 'drillCoolant', 'drillS', 'drillF', 'drillZ', 'q', 'r', 'initial']],
    ['4 · Svasatura (Opzionale)', ['chamfer', 'chamferT', 'chamferH', 'chamferAngle', 'chamferZ', 'chamferS', 'chamferF']],
    ['5 · Maschiatura (Opzionale)', ['tap', 'tapT', 'tapH', 'thread', 'custom', 'tapPitch', 'tapS', 'tapZ']]
  ];

  const labels = {
    length: 'Lunghezza finita (mm)',
    count: 'Numero fori',
    pitch: 'Interasse (mm)',
    left: 'Rifilo SX → primo centro (mm)',
    right: 'Ultimo centro → rifilo DX (mm)',
    width: 'Larghezza profilo (mm)',
    height: 'Spessore profilo (mm)',
    millT: 'Numero utensile T fresa',
    millH: 'Correttore H fresa',
    millD: 'Correttore D fresa',
    diameter: 'Diametro fresa (mm)',
    comp: 'Compensazione raggio',
    millS: 'Giri fresa S (giri/min)',
    millF: 'Avanzamento fresa F (mm/min)',
    step: 'Profondità per passata (mm)',
    millZ: 'Z finale rifili passante (mm)',
    span: 'Corsa fuori pezzo ± Y (mm)',
    clear: 'Z tra passate (mm)',
    safe: 'Z sicurezza e cambio utensile (mm)',
    drillT: 'Numero utensile T punta',
    drillH: 'Correttore H punta',
    drillType: 'Tipo punta',
    drillCoolant: 'Refrigerante',
    drillS: 'Giri punta S (giri/min)',
    drillF: 'Avanzamento punta F (mm/min)',
    drillZ: 'Z finale foratura passante (mm)',
    q: 'Incremento ciclo Q (mm)',
    r: 'Piano di stacco R (mm)',
    initial: 'Z iniziale ciclo G98 (mm)',
    chamfer: 'Aggiungi svasatura dopo foratura',
    chamferT: 'Numero utensile T svasatore',
    chamferH: 'Correttore H svasatore',
    chamferAngle: 'Angolo svasatore',
    chamferZ: 'Profondità Z svasatura (mm)',
    chamferS: 'Giri svasatore S (giri/min)',
    chamferF: 'Avanzamento svasatore F (mm/min)',
    tap: 'Aggiungi maschiatura rigida M29/G84',
    tapT: 'Numero utensile T maschio',
    tapH: 'Correttore H maschio',
    thread: 'Filetto',
    custom: 'Nome filetto personalizzato',
    tapPitch: 'Passo maschio (mm)',
    tapS: 'Giri maschio S (giri/min)',
    tapZ: 'Z finale maschiatura passante (mm)'
  };

  const tips = {
    left: 'Dal piano finito sinistro al centro del primo foro.',
    right: 'Dal centro dell’ultimo foro al piano finito destro.',
    pitch: 'Distanza tra i centri di due fori consecutivi.',
    length: 'Lunghezza finita fra i due piani di rifilatura.',
    comp: 'Attiva G41/G42 con correttore D su ingresso e G40 in uscita.',
    drillCoolant: 'M8 per ugelli esterni, M18 per adduzione interna ad alta pressione attraverso la punta.',
    chamferZ: 'Quota Z negativa di fondo svasatura (es. da -1.0 a -10.0 mm).',
    millZ: 'Profondità passante fresa oltre lo spessore.',
    drillZ: 'Profondità passante punta oltre lo spessore.'
  };

  const select = {
    width: [[16.5, '16,5 mm'], [23, '23 mm']],
    height: [[10, '10 mm'], [13.5, '13,5 mm']],
    diameter: [[8, 'Ø 8 mm'], [10, 'Ø 10 mm'], [12, 'Ø 12 mm']],
    comp: [['off', 'Senza compensazione (centro fresa)'], ['wear', 'Compensazione raggio attiva (G41/G42)'] ],
    drillType: [['tap', 'Preforo maschiatura automatico'], ['step1', 'Punta doppio Ø 5,5 / 9,5'], ['step2', 'Punta doppio Ø 6,5 / 11']],
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
    for (const k of ['tapT', 'tapH', 'thread', 'custom', 'tapPitch', 'tapS', 'tapZ']) $('field-' + k).hidden = !onTap || (k === 'custom' && !custom);
    $('feedbox').hidden = !onTap;
    $('tapPitch').readOnly = !custom;
    if (!custom) $('tapPitch').value = threads[$('thread').value] ?? '';

    const onChamfer = $('chamfer').checked;
    for (const k of ['chamferT', 'chamferH', 'chamferAngle', 'chamferZ', 'chamferS', 'chamferF']) $('field-' + k).hidden = !onChamfer;

    const onComp = $('comp').value === 'wear';
    $('field-millD').hidden = !onComp;

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

  sync();
  clear();
}
