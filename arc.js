// Modulo di calcolo geometrico e generazione ISO per pezzi curvi ad arco
// Zero pezzo: X0 centro larghezza al rifilo sinistro, Y0 virtuale utente, Z0 faccia superiore.
// Nessun nuovo zero: secondo rifilo calcolato in coordinate assolute dal medesimo zero iniziale.

const defaults = {
  aRadiusMode: 'center',
  aRadius: 990,
  aOffset: 0,
  aTangent: '90',
  aCurve: 'right',
  aCount: 19,
  aStandardChord: 172.568,
  aWidth: 23,
  aHeight: 13.5,
  aLeftMode: 'arc',
  aLeftValue: 64.795,
  aRightMode: 'arc',
  aRightValue: 64.795,
  aEdgeType: 'radial',
  aEdgeLength: 40,
  aDiameter: 10,
  aMillS: 2700,
  aMillF: 270,
  aStep: 4,
  aMillZ: -16,
  aClear: 5,
  aSafe: 200,
  aDrillS: 1850,
  aDrillF: 180,
  aDrillZ: -18,
  aQ: 2,
  aR: 3,
  aInitial: 50,
  aTap: false,
  aThread: 'M6',
  aCustom: '',
  aTapPitch: 1,
  aTapS: 300,
  aTapZ: -16
};

const threads = { M3: 0.5, M4: 0.7, M5: 0.8, M6: 1, M8: 1.25, M10: 1.5, M12: 1.75, M16: 2 };

const fmt = n => {
  const rounded = Number(n.toFixed(4));
  return String(rounded) + (Number.isInteger(rounded) ? '.' : '');
};
const rad = d => d * Math.PI / 180;

function holeRadius(d) {
  if (d.aRadiusMode === 'center') return Number(d.aRadius);
  if (d.aRadiusMode === 'inner') return Number(d.aRadius) + Number(d.aOffset);
  return Number(d.aRadius) - Number(d.aOffset);
}

function angleFromDistance(mode, value, R) {
  const v = Number(value);
  if (mode === 'angle') return rad(v);
  if (mode === 'arc') return v / R;
  const s = v / (2 * R);
  if (s <= -1 || s >= 1) return NaN;
  return 2 * Math.asin(s);
}

function geometry(d) {
  const R = holeRadius(d);
  if (!(R > 0)) return { error: 'Raggio linea centri deve essere positivo' };

  // Tangente iniziale al rifilo sinistro (t0)
  // X0 e Y0 coincidono con il centro profilo al rifilo sinistro: P(0) = (0, 0)
  const t0 = rad(Number(d.aTangent));
  const tx0 = Math.cos(t0);
  const ty0 = Math.sin(t0);

  // Verso di curvatura:
  // curvatura verso sinistra (antioraria rispetto alla tangente): centro a +90° dalla tangente
  // curvatura verso destra (oraria rispetto alla tangente): centro a -90° dalla tangente
  const isLeft = d.aCurve === 'left';
  const nx0 = isLeft ? -ty0 : ty0;
  const ny0 = isLeft ? tx0 : -tx0;

  // Centro di curvatura calcolato rigorosamente rispetto a X0=0, Y0=0
  const cx = R * nx0;
  const cy = R * ny0;

  // Angolo rifilo sinistro -> primo foro
  const a0 = angleFromDistance(d.aLeftMode, d.aLeftValue, R);
  if (!Number.isFinite(a0) || a0 < 0) return { error: 'Distanza rifilo SX -> foro 1 non valida' };

  const holeAngles = [a0];
  for (let i = 1; i < d.aCount; i++) {
    const rule = (d.aRules || []).find(r => Number(r.from) === i);
    const c = rule ? Number(rule.chord) : Number(d.aStandardChord);
    const da = angleFromDistance('chord', c, R);
    if (!Number.isFinite(da)) return { error: 'Corda non valida per R=' + R + ' tra foro ' + i + ' e ' + (i + 1) };
    holeAngles.push(holeAngles[i - 1] + da);
  }

  const aLast = holeAngles[d.aCount - 1];
  const aEndDelta = angleFromDistance(d.aRightMode, d.aRightValue, R);
  if (!Number.isFinite(aEndDelta) || aEndDelta < 0) return { error: 'Distanza ultimo foro -> rifilo DX non valida' };

  const totalAngle = aLast + aEndDelta; // theta totale dell'arco profilo

  // Funzione parametrica punto sull'arco linea centri a un generico angolo theta (da 0 al rifilo SX a totalAngle al rifilo DX)
  // Per theta=0: P(0) = (cx - R*nx0, cy - R*ny0) = (0, 0)
  function ptAtAngle(th) {
    const cosA = Math.cos(th);
    const sinA = Math.sin(th);
    if (isLeft) {
      // curvatura sinistra (ccw)
      return [
        cx - R * nx0 * cosA + R * tx0 * sinA,
        cy - R * ny0 * cosA + R * ty0 * sinA
      ];
    } else {
      // curvatura destra (cw)
      return [
        cx - R * nx0 * cosA - R * tx0 * sinA,
        cy - R * ny0 * cosA - R * ty0 * sinA
      ];
    }
  }

  // Direzione tangente locale t(theta) e normale esterna n(theta)
  function frameAtAngle(th) {
    const dirSign = isLeft ? 1 : -1;
    const curTangent = t0 + dirSign * th;
    const tx = Math.cos(curTangent);
    const ty = Math.sin(curTangent);
    // Normale trasversale al profilo (verso l'esterno della curva)
    const nx = -dirSign * ty;
    const ny = dirSign * tx;
    return { tx, ty, nx, ny };
  }

  const p0 = [0, 0]; // Centro profilo al rifilo sinistro
  const pEnd = ptAtAngle(totalAngle); // Centro profilo al rifilo destro (coordinate assolute da X0, Y0)

  const holePoints = holeAngles.map(th => ptAtAngle(th));

  return {
    R,
    holeAngles,
    holePoints,
    totalAngle,
    p0,
    pEnd,
    center: [cx, cy],
    development: R * totalAngle,
    frame0: frameAtAngle(0),
    frameEnd: frameAtAngle(totalAngle)
  };
}

function errors(d) {
  const e = {};
  const bad = (k, m) => { if (!e[k]) e[k] = m; };

  for (const k of [
    'aRadius', 'aOffset', 'aCount', 'aStandardChord', 'aWidth', 'aHeight',
    'aLeftValue', 'aRightValue', 'aEdgeLength', 'aDiameter',
    'aMillS', 'aMillF', 'aStep', 'aMillZ', 'aClear', 'aSafe',
    'aDrillS', 'aDrillF', 'aDrillZ', 'aQ', 'aR', 'aInitial'
  ]) {
    if (!Number.isFinite(Number(String(d[k]).replace(',', '.')))) bad(k, 'Inserisci un numero valido.');
  }

  for (const k of [
    'aRadius', 'aCount', 'aStandardChord', 'aWidth', 'aHeight',
    'aEdgeLength', 'aDiameter', 'aMillS', 'aMillF', 'aStep',
    'aClear', 'aSafe', 'aDrillS', 'aDrillF', 'aQ', 'aR', 'aInitial'
  ]) {
    if (!(Number(d[k]) > 0)) bad(k, 'Inserisci un valore maggiore di zero.');
  }

  if (!Number.isInteger(Number(d.aCount)) || Number(d.aCount) < 2 || Number(d.aCount) > 500) {
    bad('aCount', 'Numero intero da 2 a 500.');
  }

  if (d.aRadiusMode !== 'center' && !(Number(d.aOffset) > 0)) {
    bad('aOffset', 'Inserisci lo scostamento positivo.');
  }

  const R = holeRadius(d);
  if (!(R > 0)) bad('aRadius', 'Il raggio della linea fori deve essere positivo.');
  if (d.aStandardChord >= 2 * R) bad('aStandardChord', 'La corda deve essere inferiore a 2 × raggio.');

  for (const r of d.aRules || []) {
    if (!(Number(r.chord) > 0 && Number(r.chord) < 2 * R)) bad('aStandardChord', 'Corda eccezione non valida.');
    if (!(Number(r.from) >= 1 && Number(r.from) < Number(d.aCount))) bad('aStandardChord', 'Coppia fori non valida.');
  }

  for (const [m, v, k] of [
    [d.aLeftMode, d.aLeftValue, 'aLeftValue'],
    [d.aRightMode, d.aRightValue, 'aRightValue']
  ]) {
    if (m === 'chord' && !(Number(v) > 0 && Number(v) < 2 * R)) bad(k, 'Corda non valida.');
    if (m === 'angle' && !(Number(v) > 0)) bad(k, 'Inserisci un angolo positivo.');
    if (m === 'arc' && !(Number(v) > 0)) bad(k, 'Inserisci uno sviluppo positivo.');
  }

  if (Number(d.aSafe) <= Math.max(Number(d.aInitial), Number(d.aClear))) {
    bad('aSafe', 'Il ritiro deve superare Z iniziale e Z tra passate.');
  }
  if (Number(d.aInitial) <= Number(d.aR)) bad('aInitial', 'La quota iniziale deve superare R.');

  for (const k of ['aMillZ', 'aDrillZ']) {
    if (!(Number(d[k]) < -Number(d.aHeight))) bad(k, 'Lavorazione passante (quota Z minore di spessore negativo).');
  }

  if (Number(d.aStep) > 0 && Math.ceil(-Number(d.aMillZ) / Number(d.aStep)) > 1000) {
    bad('aStep', 'Massimo 1000 passate.');
  }

  if (d.aTap) {
    if (![-13, -16].includes(Number(d.aTapZ)) || Number(d.aTapZ) >= -Number(d.aHeight)) {
      bad('aTapZ', 'Scegli una quota passante (-13 o -16).');
    }
    if (!(Number(d.aTapS) > 0)) bad('aTapS', 'Giri maggiori di zero.');
    if (!(Number(d.aTapPitch) > 0)) bad('aTapPitch', 'Passo maggiore di zero.');
    if (d.aThread !== 'custom' && threads[d.aThread] !== Number(d.aTapPitch)) bad('aThread', 'Seleziona nuovamente il filetto.');
    if (d.aThread === 'custom' && !/^[A-Za-z0-9 .,_xX/+-]{1,32}$/.test(d.aCustom)) bad('aCustom', 'Nome non valido.');
    if (!(Number(d.aTapS) * Number(d.aTapPitch) > 0)) bad('aTapS', 'Avanzamento non valido.');
  }

  return e;
}

function generate(d) {
  const e = errors(d);
  if (Object.keys(e).length) throw Error(Object.values(e)[0]);
  const g = geometry(d);
  if (g.error) throw Error(g.error);

  const f = fmt;
  const a = [
    '%',
    'O0101 (RIFILI + FORATURE' + (d.aTap ? ' + MASCHIATURA' : '') + ' ARCO)',
    '(PEZZO CURVO - LARGHEZZA ' + f(d.aWidth) + ' H' + f(d.aHeight) + ')',
    '(RAGGIO LINEA CENTRI FORI ' + f(g.R) + ')',
    '(FORI ' + d.aCount + ' - CORDA STANDARD ' + f(d.aStandardChord) + ')',
    '(ANGOLO TOTALE ' + f(g.totalAngle * 180 / Math.PI) + ' GRADI)',
    '(SVILUPPO LINEA CENTRI ' + f(g.development) + ' MM)',
    '(ZERO G56: X0 CENTRO LARGHEZZA AL RIFILO SX - Y0 VIRTUALE - Z0 FACCIA SUPERIORE)',
    '(SECONDO RIFILO IN COORDINATE ASSOLUTE DA ZERO SX: X' + f(g.pEnd[0]) + ' Y' + f(g.pEnd[1]) + ')',
    '(TANGENTE INIZIALE ' + ['X+', 'Y+', 'X-', 'Y-'][Number(d.aTangent) / 90] + ' - CURVATURA ' + (d.aCurve === 'left' ? 'SINISTRA' : 'DESTRA') + ')',
    '(CENTRO CURVA X' + f(g.center[0]) + ' Y' + f(g.center[1]) + ')',
    '(VERIFICARE ORIENTAMENTO REALE, STAFFAGGI E INGOMBRI)',
    '',
    'G21 G17 G90 G94',
    'G40 G49 G80',
    'G56',
    '',
    'T6 M6 (FRESA RIFILI)',
    'G0 G43 H6 Z' + f(d.aSafe),
    'S' + f(d.aMillS) + ' M3'
  ];

  // Profondità passate fresatura
  const depths = [];
  for (let z = Number(d.aStep); z < -Number(d.aMillZ) - 1e-8; z += Number(d.aStep)) {
    depths.push(-z);
  }
  depths.push(Number(d.aMillZ));

  // Rifili: taglio trasversale da un lato all'altro del profilo
  // Il taglio deve attraversare completamente la larghezza W (con raggio fresa compreso)
  const halfCut = Number(d.aWidth) / 2 + Number(d.aDiameter) / 2 + 3; // 3 mm di margine ingresso/uscita

  const edges = [
    { name: 'SINISTRO (X0 Y0)', pt: g.p0, frame: g.frame0 },
    { name: 'DESTRO (ASSOLUTO)', pt: g.pEnd, frame: g.frameEnd }
  ];

  for (const edge of edges) {
    const p = edge.pt;
    // Direzione del taglio del rifilo:
    // Se 'radial': il taglio è lungo la direzione normale alla curva nel punto di taglio
    // Se 'straight': il taglio è ortogonale alla tangente iniziale X/Y scelta
    const cutDirX = d.aEdgeType === 'radial' ? edge.frame.nx : -Math.sin(rad(Number(d.aTangent)));
    const cutDirY = d.aEdgeType === 'radial' ? edge.frame.ny : Math.cos(rad(Number(d.aTangent)));

    const startX = p[0] - halfCut * cutDirX;
    const startY = p[1] - halfCut * cutDirY;
    const endX = p[0] + halfCut * cutDirX;
    const endY = p[1] + halfCut * cutDirY;

    a.push(
      '',
      '(RIFILO ' + edge.name + ' - ' + d.aEdgeType.toUpperCase() + ')',
      'G0 X' + f(startX) + ' Y' + f(startY)
    );

    for (const z of depths) {
      a.push(
        'G0 Z' + f(d.aClear),
        'G1 Z' + f(z) + ' F' + f(d.aMillF),
        'G1 X' + f(endX) + ' Y' + f(endY) + ' F' + f(d.aMillF),
        'G0 Z' + f(d.aClear),
        'G0 X' + f(startX) + ' Y' + f(startY)
      );
    }
    a.push('G0 Z' + f(d.aSafe));
  }

  a.push(
    '',
    'M9',
    'M5',
    '',
    'T4 M6 (PUNTA FORATURA)',
    'G0 G43 H4 Z' + f(d.aSafe),
    'S' + f(d.aDrillS) + ' M3',
    'G0 X' + f(g.holePoints[0][0]) + ' Y' + f(g.holePoints[0][1]),
    'G0 Z' + f(d.aInitial),
    'G98 G83 Z' + f(d.aDrillZ) + ' R' + f(d.aR) + ' Q' + f(d.aQ) + ' F' + f(d.aDrillF),
    ...g.holePoints.slice(1).map(p => 'X' + f(p[0]) + ' Y' + f(p[1])),
    'G80',
    'G0 Z' + f(d.aSafe),
    'M9',
    'M5'
  );

  if (d.aTap) {
    const name = d.aThread === 'custom' ? d.aCustom.toUpperCase().replace(/,/g, '.') : d.aThread + 'X' + String(d.aTapPitch);
    a.push(
      '',
      'T7 M6 (MASCHIO ' + name + ')',
      'G0 G43 H7 Z' + f(d.aSafe),
      'G90 G94',
      'G0 X' + f(g.holePoints[0][0]) + ' Y' + f(g.holePoints[0][1]),
      'G0 Z' + f(d.aInitial),
      'M8',
      'M29 S' + f(d.aTapS),
      'G98 G84 Z' + f(d.aTapZ) + ' R' + f(d.aR) + ' F' + f(d.aTapS * d.aTapPitch),
      ...g.holePoints.slice(1).map(p => 'X' + f(p[0]) + ' Y' + f(p[1])),
      'G80',
      'G0 Z' + f(d.aSafe),
      'M9',
      'M5'
    );
  }

  a.push('G49', 'G40', 'G80', 'G90', 'M30', '%');
  return { iso: a.join('\n'), geometry: g };
}

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const numeric = [
    'aRadius', 'aOffset', 'aCount', 'aStandardChord', 'aWidth', 'aHeight',
    'aLeftValue', 'aRightValue', 'aEdgeLength', 'aDiameter',
    'aMillS', 'aMillF', 'aStep', 'aMillZ', 'aClear', 'aSafe',
    'aDrillS', 'aDrillF', 'aDrillZ', 'aQ', 'aR', 'aInitial',
    'aTapPitch', 'aTapS'
  ];

  const labels = {
    aRadiusMode: 'Raggio inserito',
    aRadius: 'Raggio inserito (mm)',
    aOffset: 'Scostamento alla linea fori (mm)',
    aTangent: 'Tangente iniziale',
    aCurve: 'Verso di curvatura',
    aCount: 'Numero fori',
    aStandardChord: 'Corda standard per tutte le coppie (mm)',
    aWidth: 'Larghezza profilo (mm)',
    aHeight: 'Spessore profilo (mm)',
    aLeftMode: 'Distanza rifilo SX → foro 1',
    aLeftValue: 'Valore rifilo SX → foro 1',
    aRightMode: 'Distanza ultimo foro → rifilo DX',
    aRightValue: 'Valore ultimo foro → rifilo DX',
    aEdgeType: 'Tipo rifili',
    aEdgeLength: 'Lunghezza taglio rifilo (mm)',
    aDiameter: 'Diametro fresa rifili (mm)',
    aMillS: 'Giri fresa rifili S',
    aMillF: 'Avanzamento fresa rifili F',
    aStep: 'Profondità per passata rifili (mm)',
    aMillZ: 'Z finale rifili passante (mm)',
    aClear: 'Z tra passate rifili (mm)',
    aSafe: 'Z sicurezza e cambio utensile (mm)',
    aDrillS: 'Giri punta foratura S',
    aDrillF: 'Avanzamento punta F',
    aDrillZ: 'Z finale foratura passante (mm)',
    aQ: 'Incremento Q foratura (mm)',
    aR: 'Piano R foratura (mm)',
    aInitial: 'Z iniziale ciclo foratura (mm)',
    aTap: 'Aggiungi maschiatura rigida G84',
    aThread: 'Filetto',
    aCustom: 'Nome filetto personalizzato',
    aTapPitch: 'Passo maschio (mm)',
    aTapS: 'Giri maschio S',
    aTapZ: 'Z finale maschiatura (mm)'
  };

  const select = {
    aRadiusMode: [
      ['center', 'Raggio linea centri fori'],
      ['inner', 'Raggio interno + scostamento'],
      ['outer', 'Raggio esterno − scostamento']
    ],
    aTangent: [
      ['0', 'Verso X+'],
      ['90', 'Verso Y+'],
      ['180', 'Verso X−'],
      ['270', 'Verso Y−']
    ],
    aCurve: [
      ['left', 'Verso sinistra rispetto alla tangente'],
      ['right', 'Verso destra rispetto alla tangente']
    ],
    aLeftMode: [
      ['arc', 'Lungo arco (mm)'],
      ['chord', 'Corda diretta (mm)'],
      ['angle', 'Angolo (gradi)']
    ],
    aRightMode: [
      ['arc', 'Lungo arco (mm)'],
      ['chord', 'Corda diretta (mm)'],
      ['angle', 'Angolo (gradi)']
    ],
    aEdgeType: [
      ['radial', 'Radiali (ortogonali all’arco)'],
      ['straight', 'Rettilinei fissi']
    ],
    aThread: Object.entries(threads).map(([n, p]) => [n, n + ' × ' + String(p).replace('.', ',')]).concat([['custom', 'Personalizzato']]),
    aTapZ: [
      [-13, 'Z−13 (passante H13.5)'],
      [-16, 'Z−16 (passante consigliato)']
    ]
  };

  function field(k) {
    return '<div class="field" id="field-' + k + '"><label for="' + k + '">' + labels[k] + '</label>' +
      (select[k]
        ? '<select id="' + k + '">' + select[k].map(([v, t]) => '<option value="' + v + '">' + t + '</option>').join('') + '</select>'
        : '<input id="' + k + '" type="' + (k === 'aTap' ? 'checkbox' : 'text') + '" ' + (numeric.includes(k) ? 'inputmode="decimal"' : '') + ' autocomplete="off">') +
      '<span class="err" id="err-' + k + '"></span></div>';
  }

  $('arcFields').innerHTML =
    '<section class="card"><h2>1 · Riferimenti e geometria arco</h2><div class="grid">' +
    ['aRadiusMode', 'aRadius', 'aOffset', 'aTangent', 'aCurve'].map(field).join('') +
    '</div><p class="tip"><strong>Zero G56:</strong> X0 centro larghezza al rifilo sinistro. Y0 riferimento virtuale. Z0 faccia superiore. Il rifilo destro viene calcolato in coordinate assolute dallo stesso zero iniziale (senza ripartire da zero).</p></section>' +
    '<section class="card"><h2>2 · Fori e corde</h2><div class="grid">' +
    ['aCount', 'aStandardChord'].map(field).join('') +
    '</div><h3>Eccezioni corde consecutive</h3><div id="arcRules"></div><div class=\"actions\"><button type=\"button\" id=\"addArcRule\">Aggiungi regola corda</button></div></section>' +
    '<section class=\"card\"><h2>3 · Estremità e rifili</h2><div class=\"grid\">' +
    ['aWidth', 'aHeight', 'aLeftMode', 'aLeftValue', 'aRightMode', 'aRightValue', 'aEdgeType', 'aEdgeLength'].map(field).join('') +
    '</div><div class=\"notice\" id=\"arcSummary\">—</div></section>' +
    '<section class=\"card\"><h2>4 · Lavorazioni e sicurezza</h2><div class=\"grid\">' +
    ['aDiameter', 'aMillS', 'aMillF', 'aStep', 'aMillZ', 'aClear', 'aSafe', 'aDrillS', 'aDrillF', 'aDrillZ', 'aQ', 'aR', 'aInitial', 'aTap', 'aThread', 'aCustom', 'aTapPitch', 'aTapS', 'aTapZ'].map(field).join('') +
    '</div></section>';

  let rules = [];

  function renderRules() {
    $('arcRules').innerHTML = rules.map((r, i) =>
      '<div class=\"rule\"><label>Coppia ' + r.from + ' → ' + (Number(r.from) + 1) + '</label>' +
      '<input data-i=\"' + i + '\" data-k=\"from\" inputmode=\"numeric\" placeholder=\"Dal foro...\" value=\"' + r.from + '\">' +
      '<input data-i=\"' + i + '\" data-k=\"chord\" inputmode=\"decimal\" placeholder=\"Corda (mm)\" value=\"' + r.chord + '\">' +
      '<button type=\"button\" data-del=\"' + i + '\">Rimuovi</button></div>'
    ).join('') || '<p class=\"muted\">Nessuna eccezione: tutte le coppie usano la corda standard.</p>';
  }

  $('addArcRule').onclick = () => {
    rules.push({ from: 1, chord: '' });
    renderRules();
  };

  $('arcFields').addEventListener('input', e => {
    const i = Number(e.target.dataset.i), k = e.target.dataset.k;
    if (Number.isInteger(i) && k) rules[i][k] = e.target.value;
  });

  $('arcFields').addEventListener('click', e => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    rules.splice(Number(b.dataset.del), 1);
    renderRules();
  });

  let d = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem('iso-smart-arc') || 'null');
    if (saved) {
      rules = saved.aRules || [];
      for (const k of Object.keys(defaults)) if (Object.hasOwn(saved, k)) d[k] = saved[k];
    }
  } catch (e) {}

  for (const k of Object.keys(defaults)) {
    if (k === 'aTap') $(k).checked = d[k] === true;
    else $(k).value = d[k];
  }

  function read() {
    const a = {};
    for (const k of Object.keys(defaults)) {
      const el = $(k);
      a[k] = k === 'aTap' ? el.checked : numeric.includes(k) ? (el.value.trim() === '' ? NaN : Number(el.value.replace(',', '.'))) : el.value;
    }
    a.aRules = rules.map(r => ({ from: Number(r.from), chord: Number(r.chord) }));
    return a;
  }

  function sync() {
    const on = $('aTap').checked;
    const custom = $('aThread').value === 'custom';
    for (const k of ['aThread', 'aCustom', 'aTapPitch', 'aTapS', 'aTapZ']) {
      $('field-' + k).hidden = !on || (k === 'aCustom' && !custom);
    }
    $('aTapPitch').readOnly = !custom;
    if (!custom) $('aTapPitch').value = threads[$('aThread').value] ?? '';
    $('field-aOffset').hidden = $('aRadiusMode').value === 'center';
    renderRules();
  }

  function clear() {
    for (const k of Object.keys(defaults)) {
      const f = $('field-' + k);
      f.classList.remove('bad', 'good');
      $('err-' + k).textContent = '';
    }
  }

  function invalidate() {
    clear();
    $('arcOutput').value = '';
    $('arcCopy').disabled = $('arcDownload').disabled = true;
    $('arcStatus').className = 'notice';
    $('arcStatus').textContent = 'Dati modificati. Clicca su "Controlla e genera ISO arco".';
    sync();
    try {
      localStorage.setItem('iso-smart-arc', JSON.stringify(read()));
    } catch (e) {}
  }

  $('arcForm').addEventListener('input', invalidate);
  $('arcForm').addEventListener('change', invalidate);

  $('arcForm').addEventListener('submit', e => {
    e.preventDefault();
    clear();
    sync();
    $('arcOutput').value = '';
    $('arcCopy').disabled = $('arcDownload').disabled = true;

    const v = read();
    const errs = errors(v);
    const keys = Object.keys(errs);

    if (keys.length) {
      for (const k of keys) {
        $('field-' + k).classList.add('bad');
        $('err-' + k).textContent = errs[k];
      }
      $('arcStatus').className = 'notice error';
      $('arcStatus').textContent = 'Correggi i campi evidenziati prima di generare.';
      return;
    }

    try {
      const r = generate(v);
      for (const k of Object.keys(defaults)) {
        if (!$('field-' + k).hidden) $('field-' + k).classList.add('good');
      }
      $('arcStatus').className = 'notice success';
      $('arcStatus').textContent = 'Dati coerenti · Programma ISO arco generato correttamente.';
      $('arcSummary').innerHTML =
        'Raggio linea centri: ' + fmt(r.geometry.R) + ' mm<br>' +
        'Angolo totale arco: ' + fmt(r.geometry.totalAngle * 180 / Math.PI) + '°<br>' +
        'Sviluppo linea centri: ' + fmt(r.geometry.development) + ' mm<br>' +
        'Primo foro: X' + fmt(r.geometry.holePoints[0][0]) + ' Y' + fmt(r.geometry.holePoints[0][1]) + '<br>' +
        'Ultimo foro: X' + fmt(r.geometry.holePoints[r.geometry.holePoints.length - 1][0]) + ' Y' + fmt(r.geometry.holePoints[r.geometry.holePoints.length - 1][1]) + '<br>' +
        'Rifilo destro (assoluto da X0 Y0): X' + fmt(r.geometry.pEnd[0]) + ' Y' + fmt(r.geometry.pEnd[1]);

      $('arcOutput').value = r.iso;
      $('arcCopy').disabled = $('arcDownload').disabled = false;
    } catch (err) {
      $('arcStatus').className = 'notice error';
      $('arcStatus').textContent = err.message;
    }
  });

  $('arcCopy').onclick = async () => {
    try {
      await navigator.clipboard.writeText($('arcOutput').value);
      $('arcStatus').textContent = 'Programma ISO arco copiato negli appunti.';
    } catch (e) {
      $('arcOutput').focus();
      $('arcOutput').select();
    }
  };

  $('arcDownload').onclick = () => {
    const u = URL.createObjectURL(new Blob([$('arcOutput').value], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = u;
    a.download = 'programma-arco-iso.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  };

  const mode = $('partType');
  function toggle() {
    const arc = mode.value === 'arc';
    $('form').hidden = arc;
    $('arcForm').hidden = !arc;
    $('straightOutput').hidden = arc;
    $('arcOutputCard').hidden = !arc;
  }
  mode.addEventListener('change', toggle);
  toggle();
  sync();
  clear();
}

if (typeof module !== 'undefined') {
  module.exports = { defaults, threads, errors, generate, geometry, holeRadius, angleFromDistance };
}
