/* Tarjetas (tarjetas/index.html): lista de mazos y repaso. Planificador y texto seguro en assets/cards-sched.js.
   Rutas por hash: (vacío) lista · #<mazo> un mazo · #hoy todo lo vencido mezclado · #kn sin inglés · #en solo inglés.
   Cada nota se guarda al momento en atc_cards_v1:<mazo>; el registro de sesiones (atc_cards_log_v1) se escribe en
   trozos cerrados al salir, al ocultar la pestaña y al terminar, para que la fusión de account.js no los duplique. */
(function () {
  'use strict';
  var C = window.ATCCards, M = window.ATC_CARDS, app = document.getElementById('cards');
  if (!C || !M || !app) return;
  var PRE = 'atc_cards_v1:', LOG = 'atc_cards_log_v1', CFG = 'atc_cards_cfg_v1', LOG_MAX = 300, MS_CAP = 60000;
  var DECK = {}, GROUP = {};
  M.decks.forEach(function (d, i) { d.o = i; DECK[d.id] = d; });
  M.groups.forEach(function (g) { GROUP[g.g] = g; });
  var SCOPE = {
    hoy: function () { return M.decks; },
    kn: function () { return M.decks.filter(function (d) { return d.g !== 'en'; }); },
    en: function () { return M.decks.filter(function (d) { return d.g === 'en'; }); }
  };

  function lsGet(k) { try { var r = localStorage.getItem(k); return r === null ? null : JSON.parse(r); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function ic(n) { return '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  var UNDO = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
  var BACK = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4M10 6l-6 6 6 6"/></svg>';
  function today() { return C.dayNum(Date.now()); }
  function dsOf(id) { return C.deckState(lsGet(PRE + id)); }
  function saveDs(id, ds) { return lsSet(PRE + id, ds); }
  function cfg() {
    var c = lsGet(CFG), n = c && isFinite(+c.new) && c.new !== null && c.new !== '' ? Math.round(+c.new) : C.NEW_PER_DAY;
    return { new: Math.max(0, Math.min(500, n)) };
  }
  function label(d) { return (d.g === 'en' ? 'English' : 'Tema ' + (+d.g)) + ' · ' + d.nm; }

  /* ---------- datos de los mazos: tarjetas/d/<id>.js llama a ATCCardsData ---------- */
  var data = {}, wait = {};
  window.ATCCardsData = function (id, rows) {
    var map = {};
    rows.forEach(function (r) { map[r[0]] = r; });
    data[id] = { ids: rows.map(function (r) { return r[0]; }), map: map };
    if (wait[id]) wait[id].ok();
  };
  function load(id) {
    if (data[id]) return Promise.resolve();
    if (wait[id]) return wait[id].p;
    var w = {};
    w.p = new Promise(function (ok, ko) { w.ok = ok; w.ko = ko; });
    wait[id] = w;
    var s = document.createElement('script');
    s.src = 'd/' + encodeURIComponent(id) + '.js?v=' + (DECK[id] ? DECK[id].v : '');
    s.async = true;
    s.onerror = function () { delete wait[id]; s.remove(); w.ko(new Error(id)); };
    document.head.appendChild(s);
    return w.p;
  }

  /* ---------- cuentas de hoy ---------- */
  function snapshot(decks, td) {
    var st = {}, used = 0;
    M.decks.forEach(function (d) {
      var ds = dsOf(d.id); used += C.newToday(ds, td);
      if (decks.indexOf(d) >= 0) st[d.id] = { ds: ds, s: C.deckStats(ds, d.n, td) };
    });
    return { st: st, newLeft: Math.max(0, cfg().new - used) };
  }
  // de dónde salen las nuevas: el mazo abierto; en las mezclas, los mazos ya empezados (o el primero, si no hay ninguno)
  function sources(decks, st) {
    var open = decks.filter(function (d) { return st[d.id].s.fresh > 0; });
    if (decks.length === 1) return open;
    var started = open.filter(function (d) { return st[d.id].s.seen > 0; });
    return started.length ? started : open.slice(0, 1);
  }

  /* ---------- lista ---------- */
  var listY = 0, fromList = false;
  function bar(x) { return '<span class="pbar"><i style="width:' + (100 * Math.max(0, Math.min(1, x))).toFixed(1) + '%"></i></span>'; }
  function listView() {
    stopRun();
    document.body.classList.remove('crunning');
    if (!app.querySelector('.ctop')) {
      app.innerHTML = '<div class="ctop"></div><div class="clist"></div>' +
        '<details class="pset"><summary>' + ic('settings') + 'Ajustes</summary><div class="pform"><label for="cn-new">Nuevas por día</label>' +
        '<input id="cn-new" type="number" min="0" max="500" step="5" inputmode="numeric"></div></details>';
      var inp = app.querySelector('#cn-new');
      inp.value = cfg().new;
      inp.addEventListener('change', function () {
        var v = String(inp.value).trim();
        var c = lsGet(CFG); c = c && typeof c === 'object' && !Array.isArray(c) ? c : {};
        if (v === '' || !isFinite(+v)) delete c.new; else c.new = Math.max(0, Math.min(500, Math.round(+v)));
        lsSet(CFG, c); inp.value = cfg().new; fillList();
      });
    }
    fillList();
    window.scrollTo(0, listY);
  }
  function fillList() {
    var td = today(), sn = snapshot(M.decks, td), due = 0;
    M.decks.forEach(function (d) { due += sn.st[d.id].s.due; });
    var fresh = sources(M.decks, sn.st).reduce(function (a, d) { return a + sn.st[d.id].s.fresh; }, 0);
    var nw = Math.min(sn.newLeft, fresh), min = Math.max(1, Math.round((due * 8 + nw * 15) / 60));
    var top = due + nw
      ? '<a class="next cnext" href="#hoy">' + ic('play') + '<span><b>Repasar</b><span>' +
        [due ? due + ' vencidas' : '', nw ? nw + ' nuevas' : '', min + ' min'].filter(Boolean).join(' · ') + '</span></span>' + ic('arrow') + '</a>'
      : '<div class="next cnext off">' + ic('check') + '<span><b>Al día</b></span></div>';
    var h = '<div class="crow chd"><span></span><span class="n">Hoy</span><span class="n">Nuevas</span><span></span></div>';
    M.groups.forEach(function (g) {
      h += '<div class="cgh">' + (g.g === 'en' ? '' : '<b>' + (+g.g) + '</b>') + '<span>' + C.esc(g.nm) + '</span></div>';
      M.decks.forEach(function (d) {
        if (d.g !== g.g) return;
        var s = sn.st[d.id].s;
        h += '<a class="crow" href="#' + d.id + '" aria-label="' + C.esc(label(d)) + ': ' + s.due + ' hoy, ' + s.fresh + ' nuevas">' +
          '<span class="cn">' + C.esc(d.nm) + '</span><span class="n due">' + (s.due || '') + '</span><span class="n nw">' + (s.fresh || '') + '</span>' + bar(s.mastery) + '</a>';
      });
    });
    app.querySelector('.ctop').innerHTML = top;
    app.querySelector('.clist').innerHTML = h;
  }
  app.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a && !R) { fromList = true; listY = window.scrollY; }
  });

  /* ---------- repaso ---------- */
  var R = null, tok = 0;
  function stopRun() { if (R) { flush(); R = null; } }
  function runView(scope) {
    stopRun();
    var my = ++tok, decks = DECK[scope] ? [DECK[scope]] : SCOPE[scope]();
    document.body.classList.add('crunning');
    app.innerHTML = '<div class="crun"><div class="cbar"><button class="ib" id="cx" aria-label="Volver">' + BACK + '</button>' +
      '<span class="cdk" id="cdk"></span><span class="cleft" id="cleft"></span><button class="ib" id="cu" aria-label="Deshacer" disabled>' + UNDO + '</button></div>' +
      '<div class="cprog"><i id="cpb" style="width:0"></i></div>' +
      '<section class="ccard" id="cc" aria-live="polite"><div class="cf" id="cf"></div><div class="cb" id="cb" hidden></div></section>' +
      '<div class="cact" id="ca"></div></div>';
    window.scrollTo(0, 0);
    var el = {}; ['cx', 'cdk', 'cleft', 'cu', 'cpb', 'cc', 'cf', 'cb', 'ca'].forEach(function (k) { el[k] = document.getElementById(k); });
    el.cx.onclick = back; el.cu.onclick = undo;
    el.cc.onclick = function () { if (R && !R.revealed && !R.busy && !R.done) reveal(); };
    var td = today(), sn = snapshot(decks, td), src = sources(decks, sn.st);
    var need = (sn.newLeft > 0 ? src : []).concat(decks.length === 1 ? decks : []);
    Promise.all(need.map(function (d) { return load(d.id).catch(function () {}); })).then(function () {
      if (my !== tok) return;
      var entries = decks.map(function (d) {
        var x = data[d.id];
        if (x) { var n = C.reconcile(sn.st[d.id].ds, x.ids); if (n) saveDs(d.id, sn.st[d.id].ds); }
        return { id: d.id, ids: x ? x.ids : null, ds: sn.st[d.id].ds, fresh: src.indexOf(d) >= 0 };
      });
      var q = C.buildQueue(entries, td, sn.newLeft);
      R = { scope: scope, one: decks.length === 1 ? decks[0] : null, ses: new C.Session(q), el: el, revealed: false, busy: false, done: false,
        shownAt: 0, fromList: fromList, log: { id: 1, t0: Date.now(), by: {} } };
      fromList = false;
      next();
    });
  }
  function counters() {
    var n = R.ses.n, left = R.ses.left();
    R.el.cleft.textContent = left ? left : '';
    R.el.cpb.style.width = (n + left ? 100 * n / (n + left) : 100) + '%';
    R.el.cu.disabled = !R.ses.canUndo();
  }
  function prefetch() {
    var seen = {};
    R.ses.q.slice(0, 12).forEach(function (it) { if (!data[it.d] && !seen[it.d]) { seen[it.d] = 1; load(it.d).catch(function () {}); } });
  }
  function next() {
    if (!R) return;
    var it = R.ses.cur(), my = tok;
    if (!it) { endView(); return; }
    if (!data[it.d]) {
      R.busy = true;
      load(it.d).then(function () { if (my === tok && R) { R.busy = false; next(); } }, function () { if (my === tok && R) { R.busy = false; R.ses.drop(); next(); } });
      return;
    }
    var row = data[it.d].map[it.i];
    if (!row) { // ya no está en el mazo
      var ds = dsOf(it.d); if (ds.res[it.i]) { delete ds.res[it.i]; saveDs(it.d, ds); }
      R.ses.drop(); next(); return;
    }
    R.done = false; R.revealed = false; R.shownAt = Date.now();
    var e = R.el;
    e.cdk.textContent = label(DECK[it.d]);
    e.cf.innerHTML = C.fmt(row[1]);
    e.cb.hidden = true; e.cb.classList.remove('in'); e.cb.innerHTML = C.fmt(row[2]);
    e.cc.classList.remove('in'); void e.cc.offsetWidth; e.cc.classList.add('in');
    e.ca.innerHTML = '<button type="button" class="show" id="cs">Mostrar</button>';
    e.ca.querySelector('#cs').onclick = reveal;
    counters();
    if (window.scrollY > 0) window.scrollTo(0, 0);
    prefetch();
  }
  function reveal() {
    if (!R || R.revealed || R.busy || R.done || !R.ses.cur()) return;
    var it = R.ses.cur(), st = dsOf(it.d).res[it.i] || null, pv = C.preview(st, today());
    R.revealed = true;
    R.el.cb.hidden = false; R.el.cb.classList.add('in');
    var L = ['Otra vez', 'Bien', 'Fácil'];
    R.el.ca.innerHTML = [1, 2, 3].map(function (g) {
      return '<button type="button" class="g' + g + '" data-g="' + g + '" aria-keyshortcuts="' + g + '">' + L[g - 1] + '<small>' + C.days(pv[g - 1]) + '</small></button>';
    }).join('');
    R.el.ca.onclick = function (ev) { var b = ev.target.closest('button[data-g]'); if (b) grade(+b.dataset.g); };
  }
  function logAdd(d, n, ok, ms) {
    var b = R.log.by[d] || (R.log.by[d] = { n: 0, ok: 0, ms: 0 });
    b.n += n; b.ok += ok; b.ms += ms;
    if (b.n <= 0) delete R.log.by[d];
  }
  function grade(g) {
    if (!R || !R.revealed || R.busy || R.done) return;
    var it = R.ses.cur(), td = today(), now = Date.now();
    var ds = dsOf(it.d), before = ds.res[it.i] ? Object.assign({}, ds.res[it.i]) : null, tBefore = ds.t.slice();
    var after = C.grade(before, g, td); after.last = now;
    C.applyGrade(ds, it.i, after, !before, td); saveDs(it.d, ds);
    var ms = Math.min(MS_CAP, Math.max(0, now - R.shownAt));
    logAdd(it.d, 1, g > 1 ? 1 : 0, ms);
    R.ses.answer(g, { before: before, tBefore: tBefore, ms: ms, chunk: R.log.id });
    R.el.ca.onclick = null;
    next();
  }
  function undo() {
    if (!R || R.busy || !R.ses.canUndo()) return;
    var x = R.ses.undo(), ex = x.extra, ds = dsOf(x.it.d);
    // la versión restaurada lleva `last` nuevo: si la nota ya se había sincronizado, gana la restaurada
    C.undoGrade(ds, x.it.i, ex.before ? Object.assign({}, ex.before, { last: Date.now() }) : null, ex.tBefore); saveDs(x.it.d, ds);
    if (ex.chunk === R.log.id) logAdd(x.it.d, -1, x.g > 1 ? -1 : 0, -ex.ms);
    R.done = false;
    next();
  }
  function flush() {
    if (!R) return;
    var by = R.log.by, ks = Object.keys(by);
    if (ks.length) {
      var o = lsGet(LOG); o = o && typeof o === 'object' && Array.isArray(o.sessions) ? o : { v: 1, sessions: [] };
      ks.forEach(function (d) { o.sessions.push({ ts: R.log.t0, d: d, n: by[d].n, ok: by[d].ok, ms: Math.round(by[d].ms) }); });
      o.v = 1;
      o.sessions = o.sessions.filter(function (s) { return s && typeof s.ts === 'number'; }).sort(function (a, b) { return a.ts - b.ts; }).slice(-LOG_MAX);
      lsSet(LOG, o);
    }
    R.log = { id: R.log.id + 1, t0: Date.now(), by: {} };
  }
  function endView() {
    flush();
    R.done = true; R.revealed = false;
    var first = {}, n = 0, ok = 0, ms = 0;
    R.ses.h.forEach(function (x) { var k = x.it.d + ':' + x.it.i; ms += x.extra.ms; if (k in first) return; first[k] = 1; n++; if (x.g > 1) ok++; });
    var e = R.el;
    e.cdk.textContent = R.one ? label(R.one) : '';
    e.cf.innerHTML = n ? '<p class="cend"><b>' + n + '</b> tarjetas · <b>' + Math.round(100 * ok / n) + ' %</b> · ' + Math.max(1, Math.round(ms / 60000)) + ' min</p>'
      : '<p class="cend"><b>Al día</b></p>';
    e.cb.hidden = true; e.cb.innerHTML = '';
    e.ca.innerHTML = '<button type="button" class="show" id="cback">Volver</button>';
    e.ca.querySelector('#cback').onclick = back;
    counters();
    e.ca.querySelector('#cback').focus({ preventScroll: true });
  }
  function back() {
    var from = R && R.fromList;
    stopRun();
    var ref = '';
    try { ref = document.referrer && new URL(document.referrer).origin === location.origin && new URL(document.referrer).pathname !== location.pathname ? document.referrer : ''; } catch (e) {}
    if (from || (ref && history.length > 1)) { history.back(); return; }
    history.replaceState(null, '', location.pathname + location.search);
    route();
  }

  /* ---------- teclado: espacio muestra; 1 2 3 puntúan; U o Z deshace; Esc vuelve ---------- */
  document.addEventListener('keydown', function (e) {
    if (!R || e.altKey || e.metaKey) return;
    var t = e.target && e.target.tagName, k = e.key;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    var ov = document.getElementById('cmdk-overlay'); if (ov && ov.classList.contains('open')) return;
    if (e.ctrlKey && !(k === 'z' || k === 'Z')) return;
    if ((k === ' ' || k === 'Enter') && (t === 'BUTTON' || t === 'A')) return; // lo hace el propio botón
    if (k === ' ' || k === 'Enter') { if (R.done) return; if (!R.revealed) reveal(); else if (k === ' ') grade(2); else return; }
    else if (k === '1' || k === '2' || k === '3') grade(+k);
    else if (k === 'u' || k === 'U' || k === 'z' || k === 'Z') undo();
    else if (k === 'Escape') back();
    else return;
    e.preventDefault();
  });

  /* ---------- rutas y ciclo de vida ---------- */
  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (DECK[h] || SCOPE[h]) runView(h); else listView();
  }
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { if (R) flush(); }
    else if (!R && app.querySelector('.clist')) fillList(); // pasó el día o llegó la sincronización
  });
  window.addEventListener('pagehide', function () { if (R) flush(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted && !R) route(); });
  window.addEventListener('storage', function (e) { if (!R && e.key && e.key.indexOf('atc_cards') === 0 && app.querySelector('.clist')) fillList(); });
  route();
})();
