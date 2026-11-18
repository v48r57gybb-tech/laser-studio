// Modulo per pezzi curvi ad arco con Card 1 unificata (Il pezzo), Card 2 Rifili, Card 3 Foratura, Card 4 Svasatura, Card 5 Maschiatura, regole corde ripristinate e tasto unico in fondo
(function() {
  const arcDefaults = {
    aRadiusMode: 'center',
    aRadius: 990,
    aOffset: 0,
    aCount: 19,
    aStandardChord: 172.568,
    aLeftMode: 'arc',
    aLeftValue: 64.795,
    aRightMode: 'arc',
    aRightValue: 64.795,
    aWidth: 23,
    aHeight: 13.5,
    aTangent: '90',
    aCurve: 'right',
    aEdgeType: 'radial',
    aEdgeLength: 40,
    aMillTool: 6,
    aMillD: 6,
    aDiameter: 10,
    aComp: 'off',
    aMillS: 2700,
    aMillF: 270,
    aStep: 4,
    aMillZ: -16,
    aClear: 5,
    aSafe: 200,
    aDrillTool: 4,
    aDrillCycle: 'G83',
    aDrillMode: 'custom',
    aDrillCustomDia: 6.8,
    aDrillCoolant: 'M8',
    aDrillS: 1850,
    aDrillF: 180,
    aDrillZ: -18,
    aQ: 2,
    aR: 3,
    aInitial: 50,
    aChamfer: false,
    aChamferTool: 5,
    aChamferAngle: '90',
    aChamferZ: -2,
    aChamferS: 2000,
    aChamferF: 200,
    aTap: false,
    aTapTool: 7,
    aThread: 'M6',
    aCustom: '',
    aTapPitch: 1,
    aTapS: 300,
    aTapZ: -16
  };

  const arcThreads = { M3: 0.5, M4: 0.7, M5: 0.8, M6: 1, M8: 1.25, M10: 1.5, M12: 1.75, M16: 2 };
  const toolsList = Array.from({ length: 28 }, (_, i) => [i + 1, 'T' + (i + 1) + ' / H' + (i + 1)]);

  const fmt = n => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '0.';
    const rounded = Number(num.toFixed(4));
    return String(rounded) + (Number.isInteger(rounded) ? '.' : '');
  };
  const rad = d => Number(d) * Math.PI / 180;

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

  function calcGeometry(d) {
    const R = holeRadius(d);
    if (!(R > 0)) return { error: 'Raggio linea centri deve essere positivo' };

    const t0 = rad(Number(d.aTangent));
    const tx0 = Math.cos(t0);
    const ty0 = Math.sin(t0);

    const isLeft = d.aCurve === 'left';
    const nx0 = isLeft ? -ty0 : ty0;
    const ny0 = isLeft ? tx0 : -tx0;

    const cx = R * nx0;
    const cy = R * ny0;

    const a0 = angleFromDistance(d.aLeftMode, d.aLeftValue, R);
    if (!Number.isFinite(a0) || a0 < 0) return { error: 'Distanza rifilo SX -> foro 1 non valida' };

    const holeAngles = [a0];
    for (let i = 1; i < Number(d.aCount); i++) {
      const rule = (d.aRules || []).find(r => Number(r.from) === i);
      const c = rule ? Number(rule.chord) : Number(d.aStandardChord);
      const da = angleFromDistance('chord', c, R);
      if (!Number.isFinite(da)) return { error: 'Corda non valida per R=' + R + ' tra foro ' + i + ' e ' + (i + 1) };
      holeAngles.push(holeAngles[i - 1] + da);
    }

    const aLast = holeAngles[holeAngles.length - 1];
    const aEndDelta = angleFromDistance(d.aRightMode, d.aRightValue, R);
    if (!Number.isFinite(aEndDelta) || aEndDelta < 0) return { error: 'Distanza ultimo foro -> rifilo DX non valida' };

    const totalAngle = aLast + aEndDelta;

    function ptAtAngle(th) {
      const cosA = Math.cos(th);
      const sinA = Math.sin(th);
      if (isLeft) {
        return [
          cx - R * nx0 * cosA + R * tx0 * sinA,
          cy - R * ny0 * cosA + R * ty0 * sinA
        ];
      } else {
        return [
          cx - R * nx0 * cosA - R * tx0 * sinA,
          cy - R * ny0 * cosA - R * ty0 * sinA
        ];
      }
    }

    function frameAtAngle(th) {
      const dirSign = isLeft ? 1 : -1;
      const curTangent = t0 + dirSign * th;
      const tx = Math.cos(curTangent);
      const ty = Math.sin(curTangent);
      const nx = -dirSign * ty;
      const ny = dirSign * tx;
      return { tx, ty, nx, ny };
    }

    const p0 = [0, 0];
    const pEnd = ptAtAngle(totalAngle);
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

  function validate(d) {
    const e = {};
    const bad = (k, m) => { if (!e[k]) e[k] = m; };

    for (const k of [
      'aRadius', 'aOffset', 'aCount', 'aStandardChord', 'aWidth', 'aHeight',
      'aLeftValue', 'aRightValue', 'aEdgeLength', 'aMillTool', 'aMillD', 'aDiameter',
      'aMillS', 'aMillF', 'aStep', 'aMillZ', 'aClear', 'aSafe',
      'aDrillTool', 'aDrillS', 'aDrillF', 'aDrillZ', 'aR', 'aInitial'
    ]) {
      if (!Number.isFinite(Number(String(d[k]).replace(',', '.')))) bad(k, 'Inserisci un numero valido.');
    }

    for (const k of [
      'aRadius', 'aCount', 'aStandardChord', 'aWidth', 'aHeight',
      'aEdgeLength', 'aDiameter', 'aMillS', 'aMillF', 'aStep',
      'aClear', 'aSafe', 'aDrillS', 'aDrillF', 'aR', 'aInitial'
    ]) {
      if (!(Number(d[k]) > 0)) bad(k, 'Inserisci un valore maggiore di zero.');
    }

    if (['G83', 'G73'].includes(d.aDrillCycle)) {
      if (!Number.isFinite(Number(d.aQ)) || !(Number(d.aQ) > 0)) bad('aQ', 'Incremento Q positivo richiesto per ' + d.aDrillCycle);
    }

    if (d.aDrillMode === 'custom' && !(Number(d.aDrillCustomDia) > 0)) bad('aDrillCustomDia', 'Inserisci un diametro punta valido.');

    if (!Number.isInteger(Number(d.aCount)) || Number(d.aCount) < 2 || Number(d.aCount) > 500) bad('aCount', 'Numero intero da 2 a 500.');
    if (d.aRadiusMode !== 'center' && !(Number(d.aOffset) > 0)) bad('aOffset', 'Inserisci lo scostamento positivo.');

    const R = holeRadius(d);
    if (!(R > 0)) bad('aRadius', 'Il raggio della linea fori deve essere positivo.');
    if (Number(d.aStandardChord) >= 2 * R) bad('aStandardChord', 'La corda deve essere inferiore a 2 × raggio.');

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

    if (Number(d.aSafe) <= Math.max(Number(d.aInitial), Number(d.aClear))) bad('aSafe', 'Il ritiro deve superare Z iniziale e Z tra passate.');
    if (Number(d.aInitial) <= Number(d.aR)) bad('aInitial', 'La quota iniziale deve superare R.');

    for (const k of ['aMillZ', 'aDrillZ']) {
      if (!(Number(d[k]) < -Number(d.aHeight))) bad(k, 'Lavorazione passante (quota Z minore di spessore negativo).');
    }

    if (Number(d.aStep) > 0 && Math.ceil(-Number(d.aMillZ) / Number(d.aStep)) > 1000) bad('aStep', 'Massimo 1000 passate.');
    if (!['off', 'wear'].includes(d.aComp)) bad('aComp', 'Seleziona la compensazione.');

    if (d.aChamfer) {
      if (!Number.isFinite(Number(d.aChamferZ)) || Number(d.aChamferZ) >= 0 || Number(d.aChamferZ) < -10) bad('aChamferZ', 'Profondità svasatura da -1.0 a -10.0 mm.');
      if (!(Number(d.aChamferS) > 0)) bad('aChamferS', 'Giri maggiori di zero.');
      if (!(Number(d.aChamferF) > 0)) bad('aChamferF', 'Avanzamento maggiore di zero.');
    }

    if (d.aTap) {
      if (![-13, -16].includes(Number(d.aTapZ)) || Number(d.aTapZ) >= -Number(d.aHeight)) bad('aTapZ', 'Scegli una quota passante (-13 o -16).');
      if (!(Number(d.aTapS) > 0)) bad('aTapS', 'Giri maggiori di zero.');
      if (!(Number(d.aTapPitch) > 0)) bad('aTapPitch', 'Passo maggiore di zero.');
      if (d.aThread !== 'custom' && arcThreads[d.aThread] !== Number(d.aTapPitch)) bad('aThread', 'Seleziona nuovamente il filetto.');
      if (d.aThread === 'custom' && !/^[A-Za-z0-9 .,_xX/+-]{1,32}$/.test(d.aCustom)) bad('aCustom', 'Nome non valido.');
      if (!(Number(d.aTapS) * Number(d.aTapPitch) > 0)) bad('aTapS', 'Avanzamento non valido.');
    }

    return e;
  }

  function generateArcISO(d) {
    const e = validate(d);
    if (Object.keys(e).length) throw Error(Object.values(e)[0]);
    const g = calcGeometry(d);
    if (g.error) throw Error(g.error);

    const f = fmt;
    let title = 'RIFILI + FORATURE';
    if (d.aChamfer) title += ' + SVASATURA';
    if (d.aTap) title += ' + MASCHIATURA';

    const a = [
      '%',
      'O0101 (' + title + ' ARCO)',
      '(PEZZO CURVO - LARGHEZZA ' + f(d.aWidth) + ' H' + f(d.aHeight) + ')',
      '(RAGGIO LINEA CENTRI FORI ' + f(g.R) + ')',
      '(FORI ' + d.aCount + ' - CORDA STANDARD ' + f(d.aStandardChord) + ')',
      '(ANGOLO TOTALE ' + f(g.totalAngle * 180 / Math.PI) + ' GRADI)',
      '(SVILUPPO LINEA CENTRI ' + f(g.development) + ' MM)',
      '(ZERO G56: X0 CENTRO LARGHEZZA AL RIFILO SX - Y0 VIRTUALE - Z0 FACCIA SUPERIORE)',
      '(SECONDO RIFILO IN COORDINATE ASSOLUTE DA ZERO SX: X' + f(g.pEnd[0]) + ' Y' + f(g.pEnd[1]) + ')',
      '(TANGENTE INIZIALE ' + ['X+', 'Y+', 'X-', 'Y-'][Number(d.aTangent) / 90] + ' - CURVATURA ' + (d.aCurve === 'left' ? 'SINISTRA' : 'DESTRA') + ')',
      '(CENTRO CURVA X' + f(g.center[0]) + ' Y' + f(g.center[1]) + ')',
      'G21 G17 G90 G94',
      'G40 G49 G80',
      'G56',
      '',
      'T' + d.aMillTool + ' M6 (FRESA RIFILI D' + d.aDiameter + ')',
      'G0 G43 H' + d.aMillTool + ' Z' + f(d.aSafe),
      'S' + f(d.aMillS) + ' M3'
    ];

    const depths = [];
    for (let z = Number(d.aStep); z < -Number(d.aMillZ) - 1e-8; z += Number(d.aStep)) depths.push(-z);
    depths.push(Number(d.aMillZ));

    const halfCut = Number(d.aWidth) / 2 + Number(d.aDiameter) / 2 + 3;

    const edges = [
      { name: 'SINISTRO (X0 Y0)', pt: g.p0, frame: g.frame0, compCode: 'G42' },
      { name: 'DESTRO (ASSOLUTO)', pt: g.pEnd, frame: g.frameEnd, compCode: 'G41' }
    ];

    for (const edge of edges) {
      const p = edge.pt;
      const cutDirX = d.aEdgeType === 'radial' ? edge.frame.nx : -Math.sin(rad(Number(d.aTangent)));
      const cutDirY = d.aEdgeType === 'radial' ? edge.frame.ny : Math.cos(rad(Number(d.aTangent)));

      const startX = p[0] - halfCut * cutDirX;
      const startY = p[1] - halfCut * cutDirY;
      const endX = p[0] + halfCut * cutDirX;
      const endY = p[1] + halfCut * cutDirY;

      a.push('', '(RIFILO ' + edge.name + ' - ' + d.aEdgeType.toUpperCase() + ')', 'G0 X' + f(startX) + ' Y' + f(startY));

      for (const z of depths) {
        a.push('G0 Z' + f(d.aClear));
        if (d.aComp === 'wear') {
          a.push('G0 X' + f(startX - 10 * cutDirX) + ' Y' + f(startY - 10 * cutDirY));
          a.push('G1 ' + edge.compCode + ' D' + d.aMillD + ' X' + f(startX) + ' Y' + f(startY) + ' F' + f(d.aMillF));
        }
        a.push('G1 Z' + f(z) + ' F' + f(d.aMillF));
        a.push('G1 X' + f(endX) + ' Y' + f(endY) + ' F' + f(d.aMillF));
        a.push('G0 Z' + f(d.aClear));
        if (d.aComp === 'wear') {
          a.push('G1 G40 X' + f(endX + 10 * cutDirX) + ' Y' + f(endY + 10 * cutDirY) + ' F' + f(d.aMillF));
        }
        a.push('G0 X' + f(startX) + ' Y' + f(startY));
      }
      a.push('G0 Z' + f(d.aSafe));
    }
    a.push('', 'M9', 'M5', 'M1');

    const puntaDesc = d.aDrillMode === 'custom'
      ? 'PUNTA D' + d.aDrillCustomDia
      : (d.aDrillMode === 'step1' ? 'PUNTA DOPPIO D 5.5/9.5' : 'PUNTA DOPPIO D 6.5/11');

    let cycleBlock = 'G98 ' + d.aDrillCycle + ' Z' + f(d.aDrillZ) + ' R' + f(d.aR);
    if (d.aDrillCycle === 'G83' || d.aDrillCycle === 'G73') cycleBlock += ' Q' + f(d.aQ);
    cycleBlock += ' F' + f(d.aDrillF);

    a.push(
      '',
      'T' + d.aDrillTool + ' M6 (' + puntaDesc + ')',
      'G0 G43 H' + d.aDrillTool + ' Z' + f(d.aSafe),
      d.aDrillCoolant + ' (REFRIGERANTE)',
      'S' + f(d.aDrillS) + ' M3',
      'G0 X' + f(g.holePoints[0][0]) + ' Y' + f(g.holePoints[0][1]),
      'G0 Z' + f(d.aInitial),
      cycleBlock,
      ...g.holePoints.slice(1).map(p => 'X' + f(p[0]) + ' Y' + f(p[1])),
      'G80',
      'G0 Z' + f(d.aSafe),
      'M9',
      'M5',
      'M1'
    );

    if (d.aChamfer) {
      a.push(
        '',
        'T' + d.aChamferTool + ' M6 (SVASATORE ' + d.aChamferAngle + ' GRADI)',
        'G0 G43 H' + d.aChamferTool + ' Z' + f(d.aSafe),
        'S' + f(d.aChamferS) + ' M3',
        'G0 X' + f(g.holePoints[0][0]) + ' Y' + f(g.holePoints[0][1]),
        'G0 Z' + f(d.aInitial),
        'G98 G82 Z' + f(d.aChamferZ) + ' R' + f(d.aR) + ' P500 F' + f(d.aChamferF),
        ...g.holePoints.slice(1).map(p => 'X' + f(p[0]) + ' Y' + f(p[1])),
        'G80',
        'G0 Z' + f(d.aSafe),
        'M9',
        'M5',
        'M1'
      );
    }

    if (d.aTap) {
      const name = d.aThread === 'custom' ? d.aCustom.toUpperCase().replace(/,/g, '.') : d.aThread + 'X' + String(d.aTapPitch);
      a.push(
        '',
        'T' + d.aTapTool + ' M6 (MASCHIO ' + name + ')',
        'G0 G43 H' + d.aTapTool + ' Z' + f(d.aSafe),
        'G90 G94',
        'G0 X' + f(g.holePoints[0][0]) + ' Y' + f(g.holePoints[0][1]),
        'G0 Z' + f(d.aInitial),
        'M8',
        'M29 S' + f(d.aTapS),
        'G98 G84 Z' + f(d.aTapZ) + ' R' + f(d.aR) + ' F' + f(Number(d.aTapS) * Number(d.aTapPitch)),
        ...g.holePoints.slice(1).map(p => 'X' + f(p[0]) + ' Y' + f(p[1])),
        'G80',
        'G0 Z' + f(d.aSafe),
        'M9',
        'M5',
        'M1'
      );
    }

    a.push('G49', 'G40', 'G80', 'G90', 'M30', '%');
    return { iso: a.join('\n'), geometry: g };
  }

  function initArcUI() {
    const $ = id => document.getElementById(id);
    const modeSelect = $('partType');
    if (!modeSelect) return;

    const sections = [
      ['1 · Il pezzo curvo', ['aRadiusMode', 'aRadius', 'aOffset', 'aCount', 'aStandardChord', 'aLeftMode', 'aLeftValue', 'aRightMode', 'aRightValue', 'aWidth', 'aHeight', 'aTangent', 'aCurve']],
      ['2 · Rifili (Fresa)', ['aMillTool', 'aMillD', 'aDiameter', 'aComp', 'aEdgeType', 'aEdgeLength', 'aMillS', 'aMillF', 'aStep', 'aMillZ', 'aClear', 'aSafe']],
      ['3 · Foratura (Punta)', ['aDrillTool', 'aDrillCycle', 'aDrillMode', 'aDrillCustomDia', 'aDrillCoolant', 'aDrillS', 'aDrillF', 'aDrillZ', 'aQ', 'aR', 'aInitial']],
      ['4 · Svasatura (Opzionale)', ['aChamfer', 'aChamferTool', 'aChamferAngle', 'aChamferZ', 'aChamferS', 'aChamferF']],
      ['5 · Maschiatura (Opzionale)', ['aTap', 'aTapTool', 'aThread', 'aCustom', 'aTapPitch', 'aTapS', 'aTapZ']]
    ];

    const numericKeys = [
      'aRadius', 'aOffset', 'aCount', 'aStandardChord', 'aWidth', 'aHeight',
      'aLeftValue', 'aRightValue', 'aEdgeLength', 'aMillTool', 'aMillD', 'aDiameter',
      'aMillS', 'aMillF', 'aStep', 'aMillZ', 'aClear', 'aSafe',
      'aDrillTool', 'aDrillCustomDia', 'aDrillS', 'aDrillF', 'aDrillZ', 'aQ', 'aR', 'aInitial',
      'aChamferTool', 'aChamferZ', 'aChamferS', 'aChamferF',
      'aTapTool', 'aTapPitch', 'aTapS'
    ];

    const labels = {
      aRadiusMode: 'Riferimento raggio',
      aRadius: 'Raggio inserito (mm)',
      aOffset: 'Scostamento bordo → fori (mm)',
      aCount: 'Numero fori',
      aStandardChord: 'Corda standard coppie (mm)',
      aLeftMode: 'Modalità rifilo SX → foro 1',
      aLeftValue: 'Quota rifilo SX → foro 1 (mm/°)',
      aRightMode: 'Modalità ultimo foro → rifilo DX',
      aRightValue: 'Quota ultimo foro → rifilo DX (mm/°)',
      aWidth: 'Larghezza profilo (mm)',
      aHeight: 'Spessore profilo (mm)',
      aTangent: 'Tangente iniziale',
      aCurve: 'Verso di curvatura',
      aEdgeType: 'Taglio rifili',
      aEdgeLength: 'Corsa taglio rifilo (mm)',
      aMillTool: 'Utensile fresa (Torretta T / Correttore H)',
      aMillD: 'Correttore raggio D fresa',
      aDiameter: 'Diametro fresa rifili (mm)',
      aComp: 'Compensazione raggio',
      aMillS: 'Giri fresa rifili S (giri/min)',
      aMillF: 'Avanzamento fresa F (mm/min)',
      aStep: 'Profondità per passata (mm)',
      aMillZ: 'Z finale rifili passante (mm)',
      aClear: 'Z tra passate (mm)',
      aSafe: 'Z sicurezza e cambio utensile (mm)',
      aDrillTool: 'Utensile punta (Torretta T / Correttore H)',
      aDrillCycle: 'Strategia foratura',
      aDrillMode: 'Tipo punta',
      aDrillCustomDia: 'Diametro punta personalizzato (mm)',
      aDrillCoolant: 'Refrigerante',
      aDrillS: 'Giri punta foratura S (giri/min)',
      aDrillF: 'Avanzamento punta F (mm/min)',
      aDrillZ: 'Z finale foratura passante (mm)',
      aQ: 'Incremento ciclo Q (mm)',
      aR: 'Piano di stacco R (mm)',
      aInitial: 'Z iniziale ciclo G98 (mm)',
      aChamfer: 'Aggiungi svasatura dopo foratura',
      aChamferTool: 'Utensile svasatore (Torretta T / Correttore H)',
      aChamferAngle: 'Angolo svasatore',
      aChamferZ: 'Profondità Z svasatura (mm)',
      aChamferS: 'Giri svasatore S (giri/min)',
      aChamferF: 'Avanzamento svasatore F (mm/min)',
      aTap: 'Aggiungi maschiatura rigida M29/G84',
      aTapTool: 'Utensile maschio (Torretta T / Correttore H)',
      aThread: 'Filetto',
      aCustom: 'Nome filetto personalizzato',
      aTapPitch: 'Passo maschio (mm)',
      aTapS: 'Giri maschio S (giri/min)',
      aTapZ: 'Z finale maschiatura passante (mm)'
    };

    const tips = {
      aRadiusMode: 'Puoi inserire direttamente il raggio della linea dei centri fori oppure indicare il raggio del bordo interno/esterno e lo scostamento.',
      aRadius: 'Raggio della linea dei centri fori oppure raggio del bordo scelto come riferimento.',
      aOffset: 'Distanza radiale tra il bordo scelto e la linea dei centri fori.',
      aCount: 'Numero totale dei fori da posizionare lungo l’arco.',
      aStandardChord: 'Corda applicata di default tra ogni coppia consecutiva di fori.',
      aLeftMode: 'Definisce se la quota dal rifilo sinistro al primo foro è uno sviluppo d’arco, una corda oppure un angolo.',
      aLeftValue: 'Valore della distanza rifilo SX → primo foro, secondo la modalità scelta.',
      aRightMode: 'Definisce se la quota dall’ultimo foro al rifilo destro è uno sviluppo d’arco, una corda oppure un angolo.',
      aRightValue: 'Valore della distanza ultimo foro → rifilo DX, secondo la modalità scelta.',
      aWidth: 'Larghezza del profilo. La scelta aggiorna automaticamente lo spessore: 16,5 = profilo piccolo, 23 = profilo grande.',
      aHeight: 'Spessore del profilo. Deve corrispondere alla larghezza scelta: 16,5 mm = 10 mm, 23 mm = 13,5 mm.',
      aTangent: 'Direzione della tangente all’arco nel punto del rifilo sinistro.',
      aCurve: 'Verso verso cui si sviluppa la curvatura del pezzo rispetto alla tangente iniziale.',
      aEdgeType: 'I rifili possono essere radiali, cioè ortogonali all’arco, oppure rettilinei con direzione fissa.',
      aEdgeLength: 'Lunghezza della corsa di fresatura oltre il bordo del profilo.',
      aMillTool: 'Numero torretta della fresa. Il correttore D viene sincronizzato automaticamente con questo valore.',
      aMillD: 'Numero correttore raggio della fresa. Si allinea automaticamente alla torretta T, ma può essere modificato manualmente.',
      aDiameter: 'Diametro della fresa impiegata per eseguire i rifili.',
      aComp: 'Con compensazione attiva il programma entra in G41/G42 con correttore D ed esce in G40.',
      aMillS: 'Rivoluzione della fresa per la lavorazione dei rifili.',
      aMillF: 'Avanzamento di lavoro della fresa durante il taglio.',
      aStep: 'Profondità rimossa a ogni passata di fresatura.',
      aMillZ: 'Quota Z finale della fresatura. Deve essere passante, cioè più negativa dello spessore del profilo.',
      aClear: 'Quota Z di stacco tra le passate di fresatura.',
      aSafe: 'Quota Z di sicurezza per i rapidi e il cambio utensile.',
      aDrillTool: 'Numero torretta della punta da foratura.',
      aDrillCycle: 'G83 scarica il truciolo uscendo fino a R; G73 rompe il truciolo con stacco interno; G81 fora in modo continuo.',
      aDrillMode: 'Scegli una punta a diametro libero oppure una punta doppio diametro predefinita.',
      aDrillCustomDia: 'Diametro della punta personalizzata, visibile solo con tipo punta personalizzato.',
      aDrillCoolant: 'M8 attiva il refrigerante esterno; M18 attiva il refrigerante interno attraverso l’utensile.',
      aDrillS: 'Rivoluzione della punta durante la foratura.',
      aDrillF: 'Avanzamento della punta durante la foratura.',
      aDrillZ: 'Quota Z finale della foratura. Deve essere passante rispetto allo spessore del profilo.',
      aQ: 'Profondità di ogni affondo per G83 e G73. Non è utilizzata da G81.',
      aR: 'Piano di stacco R del ciclo di foratura.',
      aInitial: 'Quota Z iniziale del ciclo G98, sopra il piano R.',
      aChamfer: 'Attiva la svasatura dei fori dopo la foratura.',
      aChamferTool: 'Numero torretta dell’utensile svasatore.',
      aChamferAngle: 'Angolo di svasatura dell’utensile.',
      aChamferZ: 'Profondità Z di lavoro della svasatura, espressa come valore negativo.',
      aChamferS: 'Rivoluzione dell’utensile svasatore.',
      aChamferF: 'Avanzamento dell’utensile svasatore.',
      aTap: 'Attiva la maschiatura rigida con M29 e ciclo G84.',
      aTapTool: 'Numero torretta del maschio.',
      aThread: 'Filetto da eseguire. Il passo si aggiorna automaticamente salvo filetto personalizzato.',
      aCustom: 'Nome del filetto personalizzato, visibile solo scegliendo “Personalizzato”.',
      aTapPitch: 'Passo della maschiatura. Con filetto standard è calcolato automaticamente.',
      aTapS: 'Rivoluzione del maschio. L’avanzamento F è calcolato come S × passo.',
      aTapZ: 'Quota Z finale della maschiatura passante.'
    };

    const selects = {
      aRadiusMode: [['center', 'Raggio linea centri fori'], ['inner', 'Raggio interno + scostamento'], ['outer', 'Raggio esterno − scostamento']],
      aTangent: [['0', 'Verso X+ (0°)'], ['90', 'Verso Y+ (90°)'], ['180', 'Verso X− (180°)'], ['270', 'Verso Y− (270°)']],
      aCurve: [['left', 'Verso sinistra rispetto alla tangente'], ['right', 'Verso destra rispetto alla tangente']],
      aLeftMode: [['arc', 'Lungo arco (sviluppo mm)'], ['chord', 'Corda diretta (linea retta mm)'], ['angle', 'Angolo (gradi)']],
      aRightMode: [['arc', 'Lungo arco (sviluppo mm)'], ['chord', 'Corda diretta (linea retta mm)'], ['angle', 'Angolo (gradi)']],
      aEdgeType: [['radial', 'Radiali (ortogonali all’arco)'], ['straight', 'Rettilinei fissi']],
      aMillTool: toolsList,
      aDrillTool: toolsList,
      aChamferTool: toolsList,
      aTapTool: toolsList,
      aDiameter: [[8, 'Ø 8 mm'], [10, 'Ø 10 mm'], [12, 'Ø 12 mm']],
      aComp: [['off', 'Senza compensazione (centro fresa)'], ['wear', 'Compensazione raggio attiva (G41/G42)']],
      aDrillCycle: [
        ['G83', 'G83 · Scarico truciolo profondo (esce a R)'],
        ['G81', 'G81 · Foratura diretta continua (senza Q)'],
        ['G73', 'G73 · Rottura truciolo rapida (stacco 0.5 mm)']
      ],
      aDrillMode: [['custom', 'Punta a diametro personalizzato'], ['step1', 'Punta doppio Ø 5,5 / 9,5'], ['step2', 'Punta doppio Ø 6,5 / 11']],
      aDrillCoolant: [['M8', 'Acqua esterna (M8)'], ['M18', 'Acqua interna attraverso utensile (M18)']],
      aChamferAngle: [['60', '60°'], ['90', '90°'], ['100', '100°']],
      aThread: [...Object.entries(arcThreads).map(([n, p]) => [n, n + ' × ' + String(p).replace('.', ',')]), ['custom', 'Personalizzato']],
      aTapZ: [[-13, 'Z−13 (passante per H10)'], [-16, 'Z−16 (passante consigliato per H13.5)']]
    };

    function makeField(k) {
      return '<div class="field" id="field-' + k + '">' +
        '<label for="' + k + '">' + labels[k] +
        (tips[k] ? '<button class="info" type="button" data-arctip="' + k + '" aria-label="Informazioni ' + labels[k] + '">i</button>' : '') +
        '</label>' +
        (selects[k]
          ? '<select id="' + k + '">' + selects[k].map(([v, t]) => '<option value="' + v + '">' + t + '</option>').join('') + '</select>'
          : '<input id="' + k + '" type="' + (['aTap', 'aChamfer'].includes(k) ? 'checkbox' : 'text') + '" ' + (numericKeys.includes(k) ? 'inputmode="decimal"' : '') + ' autocomplete="off">') +
        (tips[k] ? '<p class="tip" id="arctip-' + k + '" hidden>' + tips[k] + '</p>' : '') +
        '<span class="err" id="err-' + k + '"></span>' +
        '</div>';
    }

    $('arcFields').innerHTML = sections.map(([title, keys]) =>
      '<section class="card"><h2>' + title + '</h2>' +
      (title.startsWith('1') ?
        '<p class="tip"><strong>Zero pezzo G56:</strong> X0 centro larghezza al rifilo sinistro. Y0 riferimento virtuale. Z0 faccia superiore. Il rifilo destro viene calcolato in coordinate assolute dallo stesso zero iniziale.</p>' +
        '<div class="grid">' + keys.map(makeField).join('') + '</div>' +
        '<div style="margin-top:18px;">' +
        '<h3>Eccezioni corde consecutive</h3>' +
        '<p class="muted">Aggiungi regole solo per le coppie di fori con passo diverso dalla corda standard.</p>' +
        '<div id="arcRules"></div>' +
        '<div class="actions"><button type="button" id="addArcRule">Aggiungi eccezione corda</button></div>' +
        '</div>' +
        '<div class="notice" id="arcSummary" style="margin-top:15px;">—</div>'
        :
        '<div class="grid">' + keys.map(makeField).join('') + '</div>'
      ) +
      (title.startsWith('5') ? '<div id="arcFeedbox" class="notice"><label for="arcFeed">Avanzamento maschiatura F automatico (mm/min)</label><output id="arcFeed">—</output></div>' : '') +
      '</section>'
    ).join('');

    let rules = [];

    function renderRules() {
      const container = $('arcRules');
      if (!container) return;
      container.innerHTML = rules.map((r, i) =>
        '<div class="rule"><label>Coppia ' + r.from + ' → ' + (Number(r.from) + 1) + '</label>' +
        '<input data-i="' + i + '" data-k="from" inputmode="numeric" placeholder="Dal foro..." value="' + r.from + '">' +
        '<input data-i="' + i + '" data-k="chord" inputmode="decimal" placeholder="Corda (mm)" value="' + r.chord + '">' +
        '<button type="button" data-del="' + i + '">Rimuovi</button></div>'
      ).join('') || '<p class="muted">Nessuna eccezione: tutte le coppie consecutive usano la corda standard.</p>';
    }

    $('addArcRule').onclick = () => {
      rules.push({ from: 1, chord: '' });
      renderRules();
    };

    $('arcFields').addEventListener('click', e => {
      const tipBtn = e.target.closest('[data-arctip]');
      if (tipBtn) {
        e.preventDefault();
        const tipEl = $('arctip-' + tipBtn.dataset.arctip);
        if (tipEl) tipEl.hidden = !tipEl.hidden;
        return;
      }
      const delBtn = e.target.closest('[data-del]');
      if (delBtn) {
        rules.splice(Number(delBtn.dataset.del), 1);
        renderRules();
      }
    });

    $('arcFields').addEventListener('input', e => {
      const i = Number(e.target.dataset.i), k = e.target.dataset.k;
      if (Number.isInteger(i) && k) rules[i][k] = e.target.value;
    });

    let current = { ...arcDefaults };
    try {
      const saved = JSON.parse(localStorage.getItem('iso-smart-arc') || 'null');
      if (saved) {
        rules = saved.aRules || [];
        for (const k of Object.keys(arcDefaults)) {
          if (Object.hasOwn(saved, k)) current[k] = saved[k];
        }
      }
    } catch (err) {}

    for (const k of Object.keys(arcDefaults)) {
      if (['aTap', 'aChamfer'].includes(k)) $(k).checked = current[k] === true;
      else if ($(k)) $(k).value = current[k];
    }

    function readArc() {
      const a = {};
      for (const k of Object.keys(arcDefaults)) {
        const el = $(k);
        if (!el) continue;
        a[k] = ['aTap', 'aChamfer'].includes(k) ? el.checked : numericKeys.includes(k) ? (el.value.trim() === '' ? NaN : Number(el.value.replace(',', '.'))) : el.value;
      }
      a.aRules = rules.map(r => ({ from: Number(r.from), chord: Number(r.chord) }));
      return a;
    }

    window.readArcData = readArc;
    window.loadArcData = function(data) {
      if (!data) return;
      rules = data.aRules || [];
      for (const k of Object.keys(arcDefaults)) {
        if ($(k)) {
          if (['aTap', 'aChamfer'].includes(k)) $(k).checked = data[k] === true;
          else $(k).value = data[k];
        }
      }
      $('arcForm').dispatchEvent(new Event('submit'));
    };

    function syncArc() {
      const onTap = $('aTap').checked;
      const custom = $('aThread').value === 'custom';
      for (const k of ['aTapTool', 'aThread', 'aCustom', 'aTapPitch', 'aTapS', 'aTapZ']) {
        if ($('field-' + k)) $('field-' + k).hidden = !onTap || (k === 'custom' && !custom);
      }
      if ($('arcFeedbox')) $('arcFeedbox').hidden = !onTap;
      if ($('aTapPitch')) {
        $('aTapPitch').readOnly = !custom;
        if (!custom) {
          const p = arcThreads[$('aThread').value];
          $('aTapPitch').value = p !== undefined ? p : 1;
        }
      }

      const onChamfer = $('aChamfer').checked;
      for (const k of ['aChamferTool', 'aChamferAngle', 'aChamferZ', 'aChamferS', 'aChamferF']) {
        if ($('field-' + k)) $('field-' + k).hidden = !onChamfer;
      }

      const onComp = $('aComp').value === 'wear';
      if ($('field-aMillD')) $('field-aMillD').hidden = !onComp;

      if ($('field-aDrillCustomDia')) $('field-aDrillCustomDia').hidden = $('aDrillMode').value !== 'custom';
      if ($('field-aQ')) $('field-aQ').hidden = $('aDrillCycle').value === 'G81';
      if ($('field-aOffset')) $('field-aOffset').hidden = $('aRadiusMode').value === 'center';

      const v = readArc();
      const feed = Number(v.aTapS) * Number(v.aTapPitch);
      if ($('arcFeed')) $('arcFeed').textContent = Number.isFinite(feed) && v.aTapS > 0 && v.aTapPitch > 0 ? fmt(feed) + ' mm/min' : '—';
      renderRules();
    }

    function clearArc() {
      for (const k of Object.keys(arcDefaults)) {
        const f = $('field-' + k);
        if (f) {
          f.classList.remove('bad', 'good');
          const errEl = $('err-' + k);
          if (errEl) errEl.textContent = '';
        }
      }
    }

    function invalidateArc() {
      clearArc();
      $('arcOutput').value = '';
      $('arcCopy').disabled = $('arcDownload').disabled = true;
      $('arcStatus').className = 'notice';
      $('arcStatus').textContent = 'Dati modificati. Clicca su "Controlla e genera ISO arco".';
      syncArc();
      try {
        localStorage.setItem('iso-smart-arc', JSON.stringify(readArc()));
      } catch (err) {}
    }

    $('arcForm').addEventListener('input', invalidateArc);
    $('arcForm').addEventListener('change', invalidateArc);

    $('aMillTool').addEventListener('change', () => {
      $('aMillD').value = $('aMillTool').value;
    });

    $('aWidth').addEventListener('change', () => {
      $('aHeight').value = Number($('aWidth').value) === 16.5 ? '10' : '13.5';
    });

    $('aHeight').addEventListener('change', () => {
      $('aWidth').value = Number($('aHeight').value) === 10 ? '16.5' : '23';
    });

    const resetArcBtn = $('resetArc');
    if (resetArcBtn) {
      resetArcBtn.onclick = () => {
        for (const k of ['aRadius', 'aCount', 'aStandardChord', 'aLeftValue', 'aRightValue']) {
          if ($(k)) $(k).value = '';
        }
        rules = [];
        renderRules();
        $('arcOutput').value = '';
        $('arcCopy').disabled = $('arcDownload').disabled = true;
        $('arcStatus').className = 'notice';
        $('arcStatus').textContent = 'Quote arco azzerate. Inserisci raggio, numero fori e corde del nuovo pezzo.';
        clearArc();
        if ($('aRadius')) $('aRadius').focus();
      };
    }

    function updateArcSummary(g) {
      const box = $('arcSummary');
      if (!box || !g) return;
      box.innerHTML =
        '<strong>Raggio linea centri:</strong> ' + fmt(g.R) + ' mm<br>' +
        '<strong>Angolo totale:</strong> ' + fmt(g.totalAngle * 180 / Math.PI) + '°<br>' +
        '<strong>Sviluppo:</strong> ' + fmt(g.development) + ' mm<br>' +
        '<strong>Rifilo DX:</strong> X' + fmt(g.pEnd[0]) + ' Y' + fmt(g.pEnd[1]);
    }

    $('arcForm').addEventListener('submit', e => {
      e.preventDefault();
      clearArc();
      syncArc();
      $('arcOutput').value = '';
      $('arcCopy').disabled = $('arcDownload').disabled = true;
      const v = readArc();
      const errs = validate(v);
      const keys = Object.keys(errs);
      if (keys.length) {
        for (const k of keys) {
          const f = $('field-' + k);
          if (f) f.classList.add('bad');
          const errEl = $('err-' + k);
          if (errEl) errEl.textContent = errs[k];
        }
        $('arcStatus').className = 'notice error';
        $('arcStatus').textContent = 'Correggi i campi evidenziati prima di generare.';
        return;
      }
      for (const k of Object.keys(arcDefaults)) {
        const f = $('field-' + k);
        if (f && !f.hidden) f.classList.add('good');
      }
      const result = generateArcISO(v);
      $('arcOutput').value = result.iso;
      updateArcSummary(result.geometry);
      $('arcStatus').className = 'notice success';
      $('arcStatus').textContent = 'Dati coerenti · Programma ISO arco generato.';
      $('arcCopy').disabled = $('arcDownload').disabled = false;
    });

    $('arcCopy').onclick = async () => {
      try {
        await navigator.clipboard.writeText($('arcOutput').value);
        $('arcStatus').textContent = 'Programma copiato negli appunti.';
      } catch (err) {
        $('arcOutput').focus();
        $('arcOutput').select();
      }
    };

    $('arcDownload').onclick = () => {
      const u = URL.createObjectURL(new Blob([$('arcOutput').value], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = u;
      a.download = 'programma-iso-arco.txt';
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    };

    syncArc();
    clearArc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArcUI);
  } else {
    initArcUI();
  }
})();
