/* Progreso y "Siguiente": mide lo que ya queda guardado en el navegador (entrenador, tests de ingles, entrenadores de
   aptitudes, tiempo de lectura) y ordena que hacer segun el retorno esperado por minuto.
   Modelo (heuristico, no una medicion): prioridad = eliminados en esa prueba x distancia al objetivo x frescura.
   Sin dependencias. En Node (tools/test_progress.js) se usa solo el motor: ATCProgress.compute / plan. */
(function (root) {
  'use strict';
  var DAY = 864e5;
  var IV = [0, 1, 3, 7, 14, 30]; // mismos intervalos que el entrenador (Leitner)

  // stake = lo que se juega en esa parte: fracción eliminada en 2025 + fracción de la dispersión de la nota final entre
  // quienes superaron todo (ahí se gana el puesto). Conductual 0,71 + 0,45; aptitudes y FEAST 0,45 + 0,29; inglés escrito
  // y oral 0,46 + 0,16; conocimientos 0,22 + 0,11. target = dominio que corresponde a una nota de cabeza (48/50 en
  // conocimientos, 17/20 en inglés), no al aprobado.
  var AREAS = {
    kn: { name: 'Conocimientos', icon: 'target', stake: 0.33, target: 0.95 },
    en: { name: 'Inglés', icon: 'speech', stake: 0.62, target: 0.85 },
    ap: { name: 'Aptitudes', icon: 'cross', stake: 0.74, target: 0.90 },
    co: { name: 'Conductual', icon: 'people', stake: 1.16, target: 100 / 120 } // dominio = nota 3B / 120; objetivo de cabeza 100
  };
  var ORDER = ['kn', 'en', 'ap', 'co'];

  var MODS = [
    { id: 'rad', key: 'atc_radar_v2', name: 'Radar', href: 'practica/aptitude/trainer-radar.html', icon: 'radar' },
    { id: 'sp', key: 'atc_spatial_v1', name: 'Espacial', href: 'practica/aptitude/trainer-spatial.html', icon: 'cube' },
    { id: 'mat', key: 'atc_matrices_v1', name: 'Matrices', href: 'practica/aptitude/trainer-matrices.html', icon: 'grid' },
    { id: 'mem', key: 'atc_memattn_v1', name: 'Memoria', href: 'practica/aptitude/game-memory-attention.html', icon: 'grid' },
    { id: 'mm', key: 'atc_mentalmath_v1', name: 'Cálculo', href: 'practica/aptitude/game-mental-math.html', icon: 'calc' },
    { id: 'lis', key: 'atc_listening_v1', name: 'Escucha', href: 'practica/aptitude/game-listening.html', icon: 'headphones' },
    { id: 'ss', key: 'atc_sectorsim_v1', name: 'Sector', href: 'practica/aptitude/game-sector-sim.html', icon: 'plane' },
    { id: 'apt', key: 'atc_aptmock_v1', name: 'Simulacro', href: 'practica/aptitude/mock-aptitude.html', icon: 'clip' }
  ];

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function num(x) { x = +x; return isFinite(x) ? x : null; }
  function shrink(good, n, prior, k) { return (good + prior * k) / (n + k); }
  // los juegos guardan ts como texto ISO (new Date().toISOString()); el entrenador, como número
  function msOf(ts) {
    if (typeof ts === 'string' && isNaN(+ts)) { var t = Date.parse(ts); return isNaN(t) ? null : t; }
    ts = num(ts); if (ts === null) return null; return ts < 1e11 ? ts * 1000 : ts;
  }
  function dayKey(ms) { var d = new Date(ms); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function daysSince(ts, now) { return ts ? Math.max(0, (now - ts) / DAY) : null; }

  /* ---------- conocimientos: dominio por pregunta, por tema ---------- */
  function questionMastery(r, now) {
    if (!r) return 0;
    if (!r.ok) return 0.1;
    var m = Math.min(r.box || 0, 4) / 4;
    var due = now >= (r.last || 0) + IV[Math.min(r.box || 0, 5)] * DAY;
    return due ? m * 0.85 : m;
  }

  function knowledge(snap, now) {
    var meta = snap.meta || { topics: {}, q: {} };
    var res = (snap.trainer && snap.trainer.res) || {};
    var T = {};
    Object.keys(meta.topics).forEach(function (t) { T[t] = { t: +t, w: 0, m: 0, n: 0, seen: 0, right: 0, due: 0, last: 0 }; });
    Object.keys(meta.q).forEach(function (id) {
      var a = meta.q[id], x = T[a[0]]; if (!x) return;
      var w = (a[1] === 0 || a[1] === 2 || a[1] === 3) ? 1 : 0.4; // manual, simulacros y examenes reales pesan mas
      var r = res[id];
      x.w += w; x.n++;
      x.m += w * questionMastery(r, now);
      if (r) {
        x.seen++; if (r.ok) x.right++;
        if (now >= (r.last || 0) + IV[Math.min(r.box || 0, 5)] * DAY) x.due++;
        if (r.last > x.last) x.last = r.last;
      }
    });
    var parts = Object.keys(T).map(function (t) {
      var x = T[t]; x.ready = x.w ? x.m / x.w : 0; return x;
    });
    var ready = parts.length ? parts.reduce(function (s, x) { return s + x.ready; }, 0) / parts.length : 0;
    var due = parts.reduce(function (s, x) { return s + x.due; }, 0);
    var seen = parts.reduce(function (s, x) { return s + x.seen; }, 0);
    var last = parts.reduce(function (s, x) { return Math.max(s, x.last); }, 0) || null;
    var hist = (snap.trainer && snap.trainer.hist) || [];
    if (hist[0] && hist[0].t > (last || 0)) last = hist[0].t;
    return { ready: ready, parts: parts, due: due, seen: seen, last: last, n: seen };
  }

  /* ---------- ingles: tests UoE guardados ---------- */
  function english(snap, now) {
    var meta = snap.meta || {}, pages = meta.en || [];
    var q = snap.quiz || {};
    var n = 0, right = 0, started = 0, parts = [];
    pages.forEach(function (p) {
      var o = q['atcquiz:' + p] || {}, ks = Object.keys(o), r = 0;
      ks.forEach(function (k) { if (o[k] && o[k].ok) r++; });
      n += ks.length; right += r; if (ks.length >= 10) started++;
      parts.push({ href: p, n: ks.length, right: r, name: p.replace(/^.*\/(uoe-)?/, '').replace('.html', '') });
    });
    var acc = shrink(right, n, 0.55, 15);
    var cov = pages.length ? started / pages.length : 0;
    return { ready: acc * (0.55 + 0.45 * cov), acc: acc, parts: parts, n: n, right: right, started: started, total: pages.length, last: snap.quizLast || null };
  }

  /* ---------- aptitudes: puntuacion por sesion como en el panel de aptitudes (nivel 5 = objetivo FEAST) ---------- */
  function parseLevel(l) {
    var v = num(l); if (v !== null) return v;
    var m = /(\d+(\.\d+)?)/.exec(String(l == null ? '' : l));
    return m ? +m[1] : null;
  }
  function sessionRec(s) {
    if (!s || typeof s !== 'object') return null;
    var ts = msOf(s.ts); if (ts === null) return null;
    var c = num(s.correct != null ? s.correct : s.ok), w = num(s.wrong != null ? s.wrong : s.bad), b = num(s.blank) || 0;
    // simulacro de aptitudes: 60 netos de 76 es una nota de cabeza y equivale al nivel objetivo (5)
    if (num(s.net) !== null && s.level == null) return { ts: ts, acc: 96, level: clamp(5 * s.net / 60, 0, 10), skip: false, n: (c || 0) + (w || 0) + b };
    var acc = num(s.accuracy != null ? s.accuracy : s.acc);
    if (acc === null && c !== null && w !== null) { var tot = c + w + b; acc = tot ? 100 * c / tot : null; }
    if (acc === null) return null;
    var lv = parseLevel(s.level != null ? s.level : s.lvl);
    var skip = !!s.hinted || s.count === false || String(s.mode || '').toLowerCase() === 'learn' || /custom/i.test(String(s.level) + String(s.mode));
    return { ts: ts, acc: acc, level: lv === null ? 3 : lv, skip: skip, n: (c || 0) + (w || 0) + b };
  }
  function sessionScore(r) {
    var el = r.level + clamp((r.acc - 96) / 8, -1.5, 0.5);
    var s = el <= 5 ? 14 * el : 70 + 10 * (el - 5);
    return clamp(s, 0, 100);
  }
  function moduleState(list, now) {
    var recs = (list || []).map(sessionRec).filter(Boolean).sort(function (a, b) { return b.ts - a.ts; });
    var last = recs.length ? recs[0].ts : null;
    var use = recs.filter(function (r) { return !r.skip && r.n >= 5; }).slice(0, 6);
    var sw = 0, sv = 0;
    use.forEach(function (r, i) { var w = Math.pow(0.7, i); sw += w; sv += w * clamp(sessionScore(r) / 70, 0, 1.15); });
    var ready = (sv + 1.5 * 0.35) / (sw + 1.5); // pocas sesiones: se acerca al valor de partida
    return { ready: Math.min(1, ready), sessions: recs.length, used: use.length, last: last, level: use[0] ? use[0].level : null, acc: use[0] ? use[0].acc : null, known: use.length > 0 };
  }
  function aptitudes(snap, now) {
    var parts = MODS.map(function (m) {
      var st = moduleState(snap.mods && snap.mods[m.key], now);
      st.id = m.id; st.name = m.name; st.href = m.href; st.icon = m.icon; return st;
    });
    var sim = (snap.simRuns || []);
    if (sim.length) {
      var st = moduleState(sim, now); st.id = 'sim'; st.name = 'Simulador'; st.href = 'descargas/index.html'; st.icon = 'plane'; parts.push(st);
    }
    var mean = parts.reduce(function (s, x) { return s + x.ready; }, 0) / parts.length;
    var min = parts.reduce(function (s, x) { return Math.min(s, x.ready); }, 1);
    var last = parts.reduce(function (s, x) { return Math.max(s, x.last || 0); }, 0) || null;
    var n = parts.reduce(function (s, x) { return s + x.used; }, 0);
    return { ready: 0.5 * mean + 0.5 * min, parts: parts, last: last, n: n };
  }

  /* ---------- conductual: sesiones puntuadas en la escala oficial (registro de 3b-drill, clave atc3b.scores.v1) ----------
     Dominio = mediana del total de las 3 últimas sesiones / 120 (objetivo de cabeza 100/120), con tope mientras la mediana
     de alguna competencia esté bajo su suelo del 50 %. La lectura de las páginas solo cuenta al principio (máx. 10 %). */
  var COMP3B = [['TW', 18, 'Equipo'], ['RO', 18, 'Resultados'], ['DM', 18, 'Decisiones'], ['FL', 18, 'Flexibilidad'], ['OC', 18, 'Compromiso'], ['RS', 15, 'Resiliencia'], ['ST', 15, 'Estrés']];
  var CO_FLOOR_CAP = 0.45; // por debajo del aprobado (60/120 = 0,5) mientras falle un suelo
  var CO_READ_MAX = 0.1;
  var CO_FRESH = 7; // días: una sesión sin registrar más vieja ya no pide registro, pide sesión nueva
  var CO_PAGE = { plan: 'conductual/practice-plan.html', bank: 'conductual/story-bank-template.html', entrevista: 'conductual/interview-practice-kit.html', grupo: 'conductual/group-exercise-kit.html', log: 'conductual/3b-drill.html#registro' };
  function median(a) {
    if (!a.length) return null;
    var b = a.slice().sort(function (x, y) { return x - y; }), m = b.length >> 1;
    return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
  }
  function sesDay(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12).getTime() : null; }
  // sesiones válidas del registro, de la más antigua a la más reciente; SE (null) cuenta 0
  function scoreSessions(raw) {
    var list = raw && Array.isArray(raw.sessions) ? raw.sessions : [];
    return list.map(function (s) {
      if (!s || typeof s !== 'object' || (s.type !== 'entrevista' && s.type !== 'grupo') || ['yo', 'ia', 'persona'].indexOf(s.rater) < 0) return null;
      var day = sesDay(s.date), p = s.pts; if (day === null || !p || typeof p !== 'object') return null;
      var pts = [];
      for (var i = 0; i < COMP3B.length; i++) {
        var v = p[COMP3B[i][0]];
        if (v === null) { pts.push(0); continue; }
        if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > COMP3B[i][1]) return null;
        pts.push(v);
      }
      return { day: day, ts: num(s.ts) || 0, type: s.type, rater: s.rater, pts: pts, total: pts.reduce(function (a, x) { return a + x; }, 0) };
    }).filter(Boolean).sort(function (a, b) { return a.day - b.day || a.ts - b.ts; });
  }
  function conduct(snap, now) {
    var meta = snap.meta || {}, pages = meta.co || [];
    var seen = snap.seen || {}, read = 0, secs = 0, last = null, parts = [];
    pages.forEach(function (p) {
      var x = seen[p[0]] || {}, s = x.s || 0;
      secs += s; if (s >= 45) read++;
      if (x.t && (!last || x.t > last)) last = x.t;
      parts.push({ href: p[0], name: p[1], s: s, read: s >= 45 });
    });
    var cov = pages.length ? read / pages.length : 0;
    var reading = 0.7 * cov + 0.3 * Math.min(1, secs / 7200);
    var ses = scoreSessions(snap.scores3b);
    var sv = function (p) { return seen[p] || {}; };
    var lastLog = ses.reduce(function (m, s) { return Math.max(m, s.ts); }, 0);
    var kitT = 0, kitType = null;
    ['entrevista', 'grupo'].forEach(function (t) { var x = sv(CO_PAGE[t]).t || 0; if (x > kitT) { kitT = x; kitType = t; } });
    var o = {
      parts: parts, read: read, total: pages.length, secs: secs, reading: reading, sessions: ses.length, started: ses.length > 0,
      planRead: (sv(CO_PAGE.plan).s || 0) >= 45, bankOpen: (sv(CO_PAGE.bank).s || 0) >= 45,
      // kit abierto después del último registro y hace menos de CO_FRESH días: hubo sesión, falta anotarla
      pending: kitT > lastLog && (now - kitT) <= CO_FRESH * DAY, pendingType: kitType,
      n: ses.length, comps: [], below: 0, median: null, focus: null, lastType: null, staleDays: null
    };
    o.lastRead = last;
    if (!ses.length) { o.ready = CO_READ_MAX * reading; o.last = null; return o; } // leer no es practicar: sin empezar
    var last3 = ses.slice(-3);
    o.median = median(last3.map(function (s) { return s.total; }));
    o.comps = COMP3B.map(function (c, i) {
      var m = median(last3.map(function (s) { return s.pts[i]; }));
      return { c: c[0], name: c[2], max: c[1], med: m, margin: m - c[1] / 2 };
    });
    o.below = o.comps.filter(function (x) { return x.margin < 0; }).length;
    o.focus = o.comps.slice().sort(function (a, b) { return a.margin - b.margin || a.margin / a.max - b.margin / b.max; })[0];
    var sc = clamp(o.median / 120, 0, 1);
    if (o.below) sc = Math.min(sc, CO_FLOOR_CAP);
    o.ready = Math.max(sc, CO_READ_MAX * reading);
    var lastS = ses[ses.length - 1];
    o.lastType = lastS.type; o.last = lastS.day;
    o.staleDays = daysSince(lastS.day, now);
    return o;
  }

  /* ---------- plan semanal: reparto de horas según la fase (findings S1 §8) ----------
     Ajustes en atc_plan_v1 = { h: horas por semana, f1 / f2 / f3: 'AAAA-MM-DD' }; una fecha vacía se estima con los plazos
     de 2025: convocatoria publicada el 20-11-2025 y Fase 1 79 días después (7-8 feb 2026); el temario 2026 se republicó
     el 20-11-2026, aún sin convocatoria -> Fase 1 estimada 2027-02-07. Fase 2 = Fase 1 + 34 d; Fase 3 = Fase 1 + 65 d.
     Minutos hechos: atc_visits[día][sección] (sección = primer tramo de la ruta) en la semana de lunes a domingo; las
     sesiones 3B registradas cuentan 30 / 40 min ese día si el tiempo en pantalla fue menor (se practican fuera). */
  var PLAN_KEY = 'atc_plan_v1';
  var PLAN_H = 15;
  var F1_EST = '2027-02-07', F2_AFTER = 34, F3_AFTER = 65;
  var SPLIT = {
    // Inglés al 8-10 %: el candidato ya tiene un C1 sólido y dos horas semanales de academia fuera de la web (decisión
    // suya, 24-11-2026). Lo que se libera va a lo que más separa en el orden final: conductual y FEAST.
    f1: { kn: 0.37, en: 0.08, ap: 0.40, co: 0.15 }, // aptitudes 17 + FEAST 23
    f2: { kn: 0, en: 0.08, ap: 0.70, co: 0.22 },    // aptitudes y FEAST 70; inglés oral 8
    f3: { kn: 0, en: 0.10, ap: 0, co: 0.90 }         // inglés oral 10
  };
  var SECTION_AREA = { temario: 'kn', simulacros: 'kn', ingles: 'en', practica: 'ap', atajos: 'ap', conductual: 'co' };
  var CO_CREDIT = { entrevista: 30, grupo: 40 };
  var EN_ORAL = 'ingles/oral-question-bank.html';

  function isDay(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && dayKey(sesDay(s)) === s; }
  function addDays(k, n) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k); return dayKey(new Date(+m[1], +m[2] - 1, +m[3] + n, 12).getTime()); }
  function dayDiff(a, b) { return Math.round((sesDay(b) - sesDay(a)) / DAY); }
  function areaOf(path) { return SECTION_AREA[String(path || '').split('/')[0]] || null; }
  function planCfg(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var h = num(raw.h); if (h === null || h < 0) h = PLAN_H;
    var d = {}; ['f1', 'f2', 'f3'].forEach(function (f) { d[f] = isDay(raw[f]) ? raw[f] : null; });
    var f1 = d.f1 || F1_EST;
    return { h: h, f1: f1, f2: d.f2 || addDays(f1, F2_AFTER), f3: d.f3 || addDays(f1, F3_AFTER), est: { f1: !d.f1, f2: !d.f2, f3: !d.f3 } };
  }
  // el día de la prueba aún cuenta como la fase que se prepara
  function stageOf(cfg, today) { return today <= cfg.f1 ? 'f1' : today <= cfg.f2 ? 'f2' : 'f3'; }
  function weekDays(now) {
    var d = new Date(now), off = (d.getDay() + 6) % 7, out = [];
    for (var i = 0; i < 7; i++) out.push(dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - off + i, 12).getTime()));
    return out;
  }
  function weekMinutes(vis, scores3b, now) {
    var today = dayKey(now), out = { kn: 0, en: 0, ap: 0, co: 0 }, credit = {};
    scoreSessions(scores3b).forEach(function (s) { var k = dayKey(s.day); credit[k] = (credit[k] || 0) + (CO_CREDIT[s.type] || 0); });
    weekDays(now).forEach(function (k) {
      if (k > today) return;
      var o = (vis && vis[k]) || {}, sec = { kn: 0, en: 0, ap: 0, co: 0 };
      Object.keys(o).forEach(function (s) { var a = SECTION_AREA[s], v = num(o[s]); if (a && v > 0) sec[a] += v; });
      ORDER.forEach(function (a) { out[a] += a === 'co' ? Math.max(sec.co / 60, credit[k] || 0) : sec[a] / 60; });
    });
    ORDER.forEach(function (a) { out[a] = Math.round(out[a]); });
    return out;
  }
  function weekPlan(raw, vis, scores3b, now) {
    var cfg = planCfg(raw), today = dayKey(now), st = stageOf(cfg, today), sp = SPLIT[st];
    var done = weekMinutes(vis, scores3b, now), days = weekDays(now), areas = {}, total = 0;
    ORDER.forEach(function (a) {
      var target = Math.round(cfg.h * 60 * sp[a]);
      areas[a] = { share: sp[a], target: target, done: done[a], left: target - done[a], behind: sp[a] > 0 && done[a] < target };
      total += done[a];
    });
    return { cfg: cfg, h: cfg.h, stage: st, date: cfg[st], est: cfg.est[st], to: dayDiff(today, cfg[st]), today: today, days: days, elapsed: days.indexOf(today) + 1, areas: areas, done: total };
  }

  /* ---------- prioridad y acciones ---------- */
  function minutes(n) { return Math.max(5, Math.round(n)); }

  function actionKn(k, meta, now) {
    var parts = k.parts.slice().sort(function (a, b) { return a.ready - b.ready || b.due - a.due; });
    var dueTotal = k.due;
    if (dueTotal >= 8) {
      var topDue = k.parts.slice().sort(function (a, b) { return b.due - a.due; })[0];
      return { kind: 'repaso', href: 'simulacros/entrenador.html#sel=due', label: 'Repaso', why: dueTotal + ' vencidas', min: minutes(Math.min(15, 4 + dueTotal * 0.35)), topic: topDue.t };
    }
    var w = parts[0], tm = meta.topics[w.t] || {};
    if (w.seen < Math.max(10, w.n * 0.08) && tm.s) {
      return { kind: 'guia', href: 'temario/' + tm.s + '/guia.html', label: 'Tema ' + w.t + ' · guía', why: Math.round(100 * w.ready) + '%', min: 20, topic: w.t };
    }
    return { kind: 'preguntas', href: 'simulacros/entrenador.html#sel=new&t=' + w.t, label: 'Tema ' + w.t, why: Math.round(100 * w.ready) + '%', min: 15, topic: w.t };
  }
  function actionEn(e, stage) {
    // tras la Fase 1 el inglés que queda es el oral (Fase 3A)
    if (stage === 'f2' || stage === 'f3') return { kind: 'ingles', step: 'oral', href: EN_ORAL, label: 'Inglés oral', why: '', min: 20 };
    var ps = e.parts.slice().sort(function (a, b) { return a.n - b.n; });
    var open = ps.filter(function (p) { return p.n > 0 && p.n < 20; })[0];
    var p = open || ps[0];
    if (!p) return { kind: 'ingles', href: 'ingles/index.html', label: 'English', why: '', min: 20 };
    return { kind: 'ingles', href: p.href, label: 'UoE ' + p.name, why: e.n ? Math.round(100 * e.acc) + '%' : 'sin empezar', min: 25 };
  }
  function actionAp(a, now) {
    var best = null, bs = -1;
    a.parts.forEach(function (m) {
      var stale = m.last ? daysSince(m.last, now) : 30;
      var s = (1 - m.ready / AREAS.ap.target) * (1 + Math.min(0.5, stale / 21 * 0.5)) * (m.known ? 1 : 1.15);
      if (s > bs) { bs = s; best = m; }
    });
    var why = !best.known ? 'sin datos' : (best.level != null ? 'nivel ' + best.level : Math.round(100 * best.ready) + '%');
    return { kind: 'aptitud', href: best.href, label: best.name, why: why, min: 15, mod: best.id };
  }
  // etapas de practice-plan.md: material (plan, banco de historias) -> entrevista puntuada <-> dinámica puntuada, y tras
  // cada sesión, el registro. Una sesión sin registrar de hace más de CO_FRESH días ya no cuenta: toca sesión nueva.
  function actionCo(c) {
    var A = function (step, href, label, why, min) { return { kind: 'conductual', step: step, href: href, label: label, why: why, min: min }; };
    var ses = function (t, why) { return t === 'grupo' ? A('grupo', CO_PAGE.grupo, 'Dinámica de grupo', why, 40) : A('entrevista', CO_PAGE.entrevista, 'Entrevista', why, 30); };
    if (!c.started) {
      if (!c.planRead) return A('plan', CO_PAGE.plan, 'Plan de práctica', 'sin empezar', 10);
      if (!c.bankOpen) return A('historias', CO_PAGE.bank, 'Banco de historias', '2 por competencia', 20);
      if (c.pending) return A('registro', CO_PAGE.log, 'Registrar sesión', 'puntos', 5);
      return ses('entrevista', 'referencia');
    }
    if (c.pending) return A('registro', CO_PAGE.log, 'Registrar sesión', 'puntos', 5);
    var why = c.staleDays > CO_FRESH ? 'hace ' + Math.floor(c.staleDays) + ' d'
      : Math.round(c.median) + '/120 · ' + (c.focus.margin < 0 ? 'bajo el suelo: ' : 'foco ') + c.focus.name;
    return ses(c.lastType === 'entrevista' ? 'grupo' : 'entrevista', why);
  }

  function compute(snap, now) {
    now = now || Date.now();
    var meta = snap.meta || { topics: {}, q: {}, en: [], co: [] };
    snap.meta = meta;
    var A = { kn: knowledge(snap, now), en: english(snap, now), ap: aptitudes(snap, now), co: conduct(snap, now) };
    // sin snap.plan (tests antiguos, datos viejos) todo sigue como antes; el navegador siempre lo pasa (vacío = valores por defecto)
    var wk = snap.plan ? weekPlan(snap.plan, snap.visits, snap.scores3b, now) : null;
    var out = {}, list = [];
    ORDER.forEach(function (id) {
      var d = A[id], cfg = AREAS[id];
      var gap = clamp(1 - d.ready / cfg.target, 0, 1);
      var stale = d.last ? daysSince(d.last, now) : null;
      var fresh = 1 + (stale === null ? 0.3 : Math.min(0.5, stale / 30 * 0.5));
      var info = (d.n < 10 && id !== 'co') || (id === 'co' && !d.started) ? 1.15 : 1; // sin datos: medir tiene valor
      var bonus = id === 'kn' ? 1 + 0.3 * Math.min(1, d.due / 40) : 1;
      var score = cfg.stake * gap * fresh * info * bonus;
      var act = id === 'kn' ? actionKn(d, meta, now) : id === 'en' ? actionEn(d, wk && wk.stage) : id === 'ap' ? actionAp(d, now) : actionCo(d);
      act.area = id;
      var o = { id: id, name: cfg.name, icon: cfg.icon, stake: cfg.stake, target: cfg.target, ready: d.ready, gap: gap, score: score, last: d.last, stale: stale, n: d.n, data: d, action: act };
      // nivel: 2 = bajo su objetivo semanal, 1 = cumplido (o sin plan), -1 = 0 % en esta fase (nunca se propone)
      o.week = wk ? wk.areas[id] : null;
      o.tier = !wk ? 1 : !o.week.share ? -1 : o.week.behind ? 2 : 1;
      out[id] = o; list.push(o);
    });
    list.sort(function (a, b) { return b.tier - a.tier || b.score - a.score; });
    return { areas: out, ranked: list, now: now, week: wk };
  }

  // reparte los minutos entre las areas con mas retorno; cada area elegida pierde peso para que el plan no sea monotono.
  // Con plan semanal, las áreas que aún no llegan a su objetivo de la semana van antes (lo que se propone hoy descuenta
  // de lo que falta) y las de 0 % en la fase no entran.
  function plan(res, budget) {
    var left = budget, items = [], sc = {}, need = {};
    res.ranked.forEach(function (a) { sc[a.id] = a.score; need[a.id] = a.week ? a.week.left : 0; });
    var tier = function (id) { var w = res.areas[id].week; return !w ? 1 : !w.share ? -1 : need[id] > 0 ? 2 : 1; };
    var guard = 0;
    while (left >= 8 && guard++ < 6) {
      var id = Object.keys(sc).filter(function (x) { return tier(x) >= 0 && sc[x] > 0; })
        .sort(function (x, y) { return tier(y) - tier(x) || sc[y] - sc[x]; })[0];
      if (!id) break;
      var a = res.areas[id], act = Object.assign({}, a.action);
      if (items.some(function (i) { return i.area === id && i.href === act.href; })) { sc[id] *= 0.3; need[id] = 0; continue; }
      act.min = Math.min(act.min, left);
      items.push(act); left -= act.min; sc[id] *= 0.45; need[id] -= act.min;
    }
    if (!items.length) { var f = (res.ranked.filter(function (x) { return tier(x.id) >= 0; })[0] || res.ranked[0]).action; items.push(Object.assign({}, f)); }
    return items;
  }

  /* ---------- navegador: lectura de datos, rastreo de tiempo, interfaz ---------- */
  var doc = root.document;
  function lsGet(k) { try { var r = root.localStorage.getItem(k); return r === null ? null : JSON.parse(r); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  function siteBase() {
    try {
      var s = doc.currentScript || [].slice.call(doc.scripts).filter(function (x) { return /assets\/progress\.js/.test(x.src); })[0];
      return s ? s.src.replace(/assets\/progress\.js.*$/, '') : '';
    } catch (e) { return ''; }
  }
  var BASE = doc ? siteBase() : '';
  function pagePath() { try { return decodeURIComponent(root.location.href.split('#')[0].split('?')[0].slice(BASE.length)) || 'index.html'; } catch (e) { return ''; } }

  function snapshot() {
    var snap = { meta: root.ATC_META || null, trainer: lsGet('atctrainer:v1'), quiz: {}, mods: {}, seen: lsGet('atc_seen') || {}, simRuns: [], scores3b: lsGet('atc3b.scores.v1') };
    var last = 0;
    try {
      for (var i = 0; i < root.localStorage.length; i++) {
        var k = root.localStorage.key(i);
        if (k.indexOf('atcquiz:ingles/') === 0) { snap.quiz[k] = lsGet(k) || {}; }
      }
    } catch (e) {}
    MODS.forEach(function (m) { var d = lsGet(m.key); snap.mods[m.key] = d && Array.isArray(d.sessions) ? d.sessions : []; });
    var dash = lsGet('atc_dashboard_v1');
    if (dash && Array.isArray(dash.imported)) snap.simRuns = dash.imported.filter(function (r) { return r && r.key === 'sim'; });
    var vis = lsGet('atc_visits') || {};
    // ultima actividad de ingles: la del tiempo registrado en esas paginas
    Object.keys(snap.seen).forEach(function (p) { if (p.indexOf('ingles/uoe') === 0 && snap.seen[p].t > last) last = snap.seen[p].t; });
    snap.quizLast = last || null;
    snap.visits = vis;
    var pl = lsGet(PLAN_KEY);
    snap.plan = pl && typeof pl === 'object' && !Array.isArray(pl) ? pl : {};
    return snap;
  }

  function loadMeta(cb) {
    if (root.ATC_META) return cb(root.ATC_META);
    var s = doc.createElement('script'); s.src = BASE + 'assets/atc-meta.js';
    s.onload = function () { cb(root.ATC_META || null); };
    s.onerror = function () { cb(null); };
    doc.head.appendChild(s);
  }

  function minutesPerDay(vis, days, now) {
    var out = [];
    for (var i = days - 1; i >= 0; i--) {
      var k = dayKey(now - i * DAY), o = vis[k] || {}, t = 0;
      Object.keys(o).forEach(function (s) { t += o[s]; });
      out.push({ k: k, m: Math.round(t / 60) });
    }
    return out;
  }
  function streak(vis, now) {
    var n = 0, i = 0;
    var today = vis[dayKey(now)]; if (!today || !Object.keys(today).length) i = 1; // hoy aun no cuenta como fallo
    for (; i < 400; i++) { var o = vis[dayKey(now - i * DAY)]; if (o && Object.keys(o).some(function (s) { return o[s] >= 60; })) n++; else break; }
    return n;
  }

  // tiempo activo por seccion y por pagina (cuenta solo con la pestana visible y actividad reciente)
  function track() {
    var lastInput = Date.now(), SEC = 15;
    ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach(function (ev) { root.addEventListener(ev, function () { lastInput = Date.now(); }, { passive: true, capture: true }); });
    setInterval(function () {
      if (doc.visibilityState !== 'visible' || Date.now() - lastInput > 60000) return;
      var p = pagePath(); if (!p) return;
      var sec = p.split('/').length > 1 ? p.split('/')[0] : 'inicio';
      var vis = lsGet('atc_visits') || {}, k = dayKey(Date.now());
      vis[k] = vis[k] || {}; vis[k][sec] = (vis[k][sec] || 0) + SEC;
      var keys = Object.keys(vis).sort(); while (keys.length > 120) delete vis[keys.shift()];
      lsSet('atc_visits', vis);
      var seen = lsGet('atc_seen') || {};
      var e = seen[p] || { s: 0 }; e.s += SEC; e.t = Date.now(); seen[p] = e;
      var pk = Object.keys(seen);
      if (pk.length > 300) { pk.sort(function (a, b) { return seen[a].t - seen[b].t; }).slice(0, pk.length - 300).forEach(function (x) { delete seen[x]; }); }
      lsSet('atc_seen', seen);
    }, SEC * 1000);
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ic(n) { return '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function ago(ts, now) {
    if (!ts) return '–';
    var d = (now - ts) / DAY;
    if (d < 1) return 'hoy'; if (d < 2) return 'ayer'; return Math.floor(d) + ' d';
  }
  function pct(x) { return Math.round(100 * clamp(x, 0, 1)) + '%'; }

  function bar(ready, target, cls) {
    return '<span class="pbar' + (cls ? ' ' + cls : '') + '"><i style="width:' + (100 * clamp(ready, 0, 1)).toFixed(1) + '%"></i><b style="left:' + (100 * target) + '%"></b></span>';
  }

  function subRows(a) {
    var d = a.data, h = '';
    if (a.id === 'kn') d.parts.forEach(function (p) {
      h += '<tr><td>' + p.t + '</td><td>' + bar(p.ready, a.target) + '</td><td class="n">' + pct(p.ready) + '</td><td class="n">' + p.seen + '/' + p.n + '</td><td class="n">' + (p.due || '') + '</td></tr>';
    });
    else if (a.id === 'ap') d.parts.forEach(function (p) {
      h += '<tr><td><a href="' + BASE + p.href + '">' + esc(p.name) + '</a></td><td>' + bar(p.ready, a.target) + '</td><td class="n">' + (p.known ? pct(p.ready) : '–') + '</td><td class="n">' + (p.level != null ? 'N' + p.level : '') + '</td><td class="n">' + ago(p.last, Date.now()) + '</td></tr>';
    });
    else if (a.id === 'en') d.parts.forEach(function (p) {
      h += '<tr><td><a href="' + BASE + p.href + '">' + esc(p.name) + '</a></td><td>' + bar(p.n ? p.right / p.n : 0, a.target) + '</td><td class="n">' + (p.n ? pct(p.right / p.n) : '–') + '</td><td class="n">' + p.n + '</td><td></td></tr>';
    });
    else {
      // mediana de las 3 últimas sesiones por competencia; la marca es el suelo del 50 %
      d.comps.forEach(function (c) {
        h += '<tr><td><a href="' + BASE + CO_PAGE.log + '">' + esc(c.name) + '</a></td><td>' + bar(c.med / c.max, 0.5) + '</td><td class="n">' + String(Math.round(c.med * 10) / 10).replace('.', ',') + '/' + c.max + '</td><td class="n">' + (c.margin >= 0 ? '+' : '') + String(Math.round(c.margin * 10) / 10).replace('.', ',') + '</td><td></td></tr>';
      });
      d.parts.forEach(function (p) {
        h += '<tr><td colspan="2"><a href="' + BASE + p.href + '">' + esc(p.name) + '</a></td><td class="n">' + (p.read ? '✓' : '') + '</td><td class="n">' + Math.round(p.s / 60) + ' min</td><td></td></tr>';
      });
    }
    return '<table class="psub">' + h + '</table>';
  }

  function recordHist(res, now) {
    var h = lsGet('atc_prog_hist') || {}, k = dayKey(now), o = {};
    ORDER.forEach(function (id) { o[id] = +res.areas[id].ready.toFixed(4); });
    h[k] = o;
    var ks = Object.keys(h).sort(); while (ks.length > 150) delete h[ks.shift()];
    lsSet('atc_prog_hist', h);
    return h;
  }
  function deltaFor(h, id, now) {
    var ks = Object.keys(h).sort(), today = dayKey(now), ref = null;
    for (var i = 0; i < ks.length; i++) { if (ks[i] >= dayKey(now - 14 * DAY) && ks[i] < today) { ref = ks[i]; break; } }
    if (!ref || !h[today]) return null;
    return Math.round(100 * (h[today][id] - h[ref][id]));
  }

  /* ---------- bloque "Semana": objetivo de minutos por área y fase, y ajustes (atc_plan_v1) ---------- */
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var PHASE = { f1: 'Fase 1', f2: 'Fase 2', f3: 'Fase 3' };
  function fdate(k) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k); return +m[3] + ' ' + MES[+m[2] - 1] + ' ' + m[1]; }
  function hrs(min) { return String(Math.round(min / 6) / 10).replace('.', ','); }

  function weekBlock(res) {
    var wk = res.week, pace = wk.elapsed / 7;
    var h = '<h2>' + ic('clip') + 'Semana</h2><p class="pnum pwk"><span>' + PHASE[wk.stage] + (wk.to >= 0 ? ' · <b>' + wk.to + ' d</b>' : '') +
      ' · ' + fdate(wk.date) + (wk.est ? ' <span class="pest">estimada</span>' : '') + '</span><span class="pwh"><b>' + hrs(wk.done) + '</b>/' + hrs(wk.h * 60) + ' h</span></p>';
    h += '<div class="tw"><table class="src ptab pweek"><tr><th>Prueba</th><th></th><th class="n">min</th><th class="n hm">Reparto</th></tr>';
    ORDER.forEach(function (id) {
      var a = res.areas[id], w = a.week; if (!w.share) return;
      h += '<tr><td>' + esc(a.name) + '</td><td>' + bar(w.target ? w.done / w.target : 1, pace, w.behind ? '' : 'ok') + '</td><td class="n">' + w.done + '/' + w.target +
        '</td><td class="n hm">' + Math.round(100 * w.share) + '%</td></tr>';
    });
    return h + '</table></div>';
  }
  // el formulario se crea una vez y no se rehace al guardar: así no pierde el foco ni el campo de fecha a medio escribir
  function settingsForm(cfg) {
    var h = '<details class="pset"><summary>' + ic('settings') + 'Ajustes</summary><div class="pform">' +
      '<label for="pl-h">h/semana</label><input id="pl-h" type="number" min="0" step="0.5" inputmode="decimal" value="' + cfg.h + '"><span></span>';
    ['f1', 'f2', 'f3'].forEach(function (f) {
      h += '<label for="pl-' + f + '">' + PHASE[f] + '</label><input id="pl-' + f + '" type="date" value="' + (cfg.est[f] ? '' : cfg[f]) + '"><span class="pest" id="pl-' + f + '-e"></span>';
    });
    return h + '</div></details>';
  }
  function savePlan(el) {
    var o = lsGet(PLAN_KEY); o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    var hv = String(el.querySelector('#pl-h').value || '').replace(',', '.'), hn = hv === '' ? NaN : +hv;
    if (isFinite(hn) && hn >= 0) o.h = hn; else delete o.h;
    ['f1', 'f2', 'f3'].forEach(function (f) { var v = el.querySelector('#pl-' + f).value; if (isDay(v)) o[f] = v; else delete o[f]; });
    lsSet(PLAN_KEY, o);
  }

  function renderHoy(el) {
    var now = Date.now();
    var budget = +(lsGet('atc_hoy_min') || 30);
    var snap = snapshot();
    var res = compute(snap, now);
    var hist = recordHist(res, now);
    var items = plan(res, budget), first = items[0];
    var segFocus = doc.activeElement && doc.activeElement.closest && doc.activeElement.closest('.seg') ? doc.activeElement.dataset.m : null;
    if (!el.querySelector('.hoy-a')) {
      el.innerHTML = '<div class="hoy-a"></div>' + settingsForm(res.week.cfg) + '<div class="hoy-b"></div>';
      el.querySelectorAll('.pform input').forEach(function (inp) { inp.addEventListener('change', function () { savePlan(el); renderHoy(el); }); });
    }

    var h = '<a class="next" href="' + BASE + first.href + '">' + ic('play') + '<span><b>Siguiente</b><span>' + esc(first.label) + (first.why ? ' · ' + esc(first.why) : '') + ' · ' + first.min + ' min</span></span>' + ic('arrow') + '</a>';
    h += '<div class="seg" role="group">' + [15, 30, 60].map(function (m) { return '<button type="button" data-m="' + m + '"' + (m === budget ? ' aria-pressed="true"' : '') + '>' + m + ' min</button>'; }).join('') + '</div>';
    h += '<div class="rows">' + items.map(function (it) {
      return '<a class="row" href="' + BASE + it.href + '">' + ic(res.areas[it.area].icon) + '<span class="row-body"><span class="row-title">' + esc(it.label) + '</span><span class="row-desc">' + esc(res.areas[it.area].name) + (it.why ? ' · ' + esc(it.why) : '') + '</span></span><span class="row-meta">' + it.min + ' min</span></a>';
    }).join('') + '</div>';
    el.querySelector('.hoy-a').innerHTML = h + weekBlock(res);

    h = '<h2>' + ic('chart') + 'Progreso</h2><div class="tw"><table class="src ptab"><tr><th>Prueba</th><th></th><th class="n">Dominio</th><th class="n">14 d</th><th class="n hm">Elimina</th><th class="n hm">Último</th></tr>';
    ORDER.forEach(function (id) {
      var a = res.areas[id], dl = deltaFor(hist, id, now);
      h += '<tr><td>' + esc(a.name) + '</td><td>' + bar(a.ready, a.target) + '</td><td class="n">' + pct(a.ready) + '</td><td class="n">' + (dl === null ? '' : (dl > 0 ? '+' : '') + dl) + '</td><td class="n hm">' + Math.round(100 * a.stake) + '%</td><td class="n hm">' + ago(a.last, now) + '</td></tr>';
      h += '<tr class="sub"><td colspan="6"><details><summary>Detalle</summary>' + subRows(a) + '</details></td></tr>';
    });
    h += '</table></div>';

    var act = minutesPerDay(snap.visits, 14, now), mx = Math.max(10, act.reduce(function (m, x) { return Math.max(m, x.m); }, 0));
    var week = act.slice(-7).reduce(function (s, x) { return s + x.m; }, 0);
    h += '<h2>' + ic('history') + 'Actividad</h2><div class="pact">' + act.map(function (x) { return '<span title="' + x.k + ' · ' + x.m + ' min"><i style="height:' + Math.round(100 * x.m / mx) + '%"></i></span>'; }).join('') + '</div>';
    h += '<p class="pnum"><b>' + streak(snap.visits, now) + '</b> días seguidos · <b>' + (week / 60).toFixed(1).replace('.', ',') + '</b> h en 7 días</p>';

    h += '<details class="how"><summary>Cálculo</summary><p>Prioridad = eliminados en la prueba × distancia al objetivo × frescura (días sin tocarla; vencidas del entrenador). El minutaje reparte esa prioridad y cada área elegida baja de peso. Es una estimación a partir de lo guardado en este navegador, no una medición.</p>' +
      '<p>Semana (lunes a domingo): horas × reparto de la fase. Antes de la Fase 1: conocimientos 35 %, inglés 20 % (escrito 10, oral 10), aptitudes y FEAST 35 % (15 + 20), conductual 10 %. Entre la Fase 1 y la 2: aptitudes y FEAST 70 %, inglés oral 10 %, conductual 20 %. Tras la Fase 2: inglés oral 35 %, conductual 65 %. Un área bajo su objetivo semanal va antes que una que ya lo cumple; un área al 0 % no se propone. La marca de la barra es lo que tocaría hasta hoy. Minutos = tiempo activo en cada sección; una sesión 3B registrada cuenta 30 o 40 min. Fecha vacía = estimada con los plazos de 2025 (Fase 1 79 días tras la convocatoria; Fase 2 +34 d; Fase 3 +65 d).</p></details>';
    el.querySelector('.hoy-b').innerHTML = h;
    var c = res.week.cfg;
    ['f1', 'f2', 'f3'].forEach(function (f) { var s = el.querySelector('#pl-' + f + '-e'); if (s) s.textContent = c.est[f] ? 'est. ' + fdate(c[f]) : ''; });
    el.querySelectorAll('.seg button').forEach(function (b) {
      b.onclick = function () { lsSet('atc_hoy_min', +b.dataset.m); renderHoy(el); };
      if (segFocus && b.dataset.m === segFocus) b.focus();
    });
  }

  function init() {
    if (!doc) return;
    track();
    var p = pagePath();
    var slot = doc.getElementById('acct-slot');
    if (slot && !doc.getElementById('next-btn') && p !== 'hoy/index.html') {
      var a = doc.createElement('a');
      a.id = 'next-btn'; a.className = 'cmdk-btn nextbtn'; a.href = BASE + 'hoy/index.html';
      a.innerHTML = ic('play') + 'Siguiente';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        loadMeta(function () {
          var r = compute(snapshot(), Date.now()), it = plan(r, 30)[0];
          root.location.href = BASE + (it ? it.href : 'hoy/index.html');
        });
      });
      slot.parentNode.insertBefore(a, slot);
    }
    var host = doc.getElementById('hoy');
    if (host) loadMeta(function (m) { if (!m) { host.textContent = 'Sin datos'; return; } renderHoy(host); });
    var line = doc.getElementById('hoy-line');
    if (line) loadMeta(function (m) {
      if (!m) return;
      var r = compute(snapshot(), Date.now()), it = plan(r, 30)[0];
      line.innerHTML = '<span>' + esc(it.label) + (it.why ? ' · ' + esc(it.why) : '') + ' · ' + it.min + ' min</span>';
      var an = line.closest('a'); if (an) an.setAttribute('href', BASE + it.href);
    });
  }

  var API = { compute: compute, plan: plan, AREAS: AREAS, MODS: MODS, moduleState: moduleState, sessionScore: sessionScore, sessionRec: sessionRec, questionMastery: questionMastery, streak: streak, minutesPerDay: minutesPerDay, dayKey: dayKey, scoreSessions: scoreSessions,
    SPLIT: SPLIT, planCfg: planCfg, stageOf: stageOf, weekDays: weekDays, weekMinutes: weekMinutes, weekPlan: weekPlan, areaOf: areaOf };
  root.ATCProgress = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init(); }
})(typeof window !== 'undefined' ? window : globalThis);
