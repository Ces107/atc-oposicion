/* Tarjetas: repaso espaciado tipo SM-2, funciones puras y deterministas (sin Math.random ni reloj interno).
   Las usa assets/cards.js en el navegador y tools/test_cards.js en Node.

   Estado de una tarjeta: { d: día en que vence, i: intervalo en días (0 = en aprendizaje, vuelve hoy), e: facilidad x100,
   r: aciertos seguidos, l: fallos tras haberla sabido, last: ms del último repaso (lo pone quien guarda; account.js
   fusiona las tarjetas una a una por `last`). Días = días desde 1970 con el cambio de día a las 04:00 hora local.
   Notas: 1 = otra vez, 2 = bien, 3 = fácil. */
(function (root) {
  'use strict';
  var DAY = 864e5;
  var CUT_H = 4;        // el día empieza a las 04:00
  var EASE0 = 250, EASE_MIN = 130, EASE_LAPSE = 20, EASE_EASY = 15;
  var NEW_GOOD = 1, NEW_EASY = 4, EASY_BONUS = 1.3, MAX_IVL = 365;
  var REQUEUE = 5;      // «otra vez» vuelve tras 5 tarjetas (o al final si quedan menos)
  var MASTER = 21;      // intervalo que cuenta como dominada en la barra
  var NEW_PER_DAY = 20;

  function dayNum(ms) {
    var d = new Date(ms);
    return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() - (d.getHours() < CUT_H ? 1 : 0)) / DAY);
  }

  /* ---------- identidad: FNV-1a de 32 bits del anverso normalizado (igual que tools/cards.py) ---------- */
  function norm(s) { return String(s == null ? '' : s).normalize('NFC').replace(/[ \t\n\r\f\v ]+/g, ' ').trim(); }
  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    var b = unescape(encodeURIComponent(s)), out = [];
    for (var i = 0; i < b.length; i++) out.push(b.charCodeAt(i));
    return out;
  }
  function fnv(s) {
    var b = utf8(s), h = 0x811c9dc5;
    for (var i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function cardId(front) { return fnv(norm(front)).toString(36); }

  /* ---------- planificador ---------- */
  function grade(st, g, today) {
    if (!st) {
      if (g === 1) return { d: today, i: 0, e: EASE0, r: 0, l: 0 };
      if (g === 2) return { d: today + NEW_GOOD, i: NEW_GOOD, e: EASE0, r: 1, l: 0 };
      return { d: today + NEW_EASY, i: NEW_EASY, e: EASE0 + EASE_EASY, r: 1, l: 0 };
    }
    var i = st.i | 0, e = st.e || EASE0, r = st.r | 0, l = st.l | 0;
    var late = Math.max(0, today - (st.d | 0));
    if (g === 1) {
      if (i > 0) { l++; e = Math.max(EASE_MIN, e - EASE_LAPSE); } // solo el primer fallo de una tarjeta sabida cuenta
      return { d: today, i: 0, e: e, r: 0, l: l };
    }
    var good = r === 0 ? NEW_GOOD : Math.max(i + 1, Math.round((i + late / 2) * e / 100));
    var ni = good;
    if (g === 3) {
      e += EASE_EASY;
      ni = r === 0 ? NEW_EASY : Math.max(good + 1, Math.round((i + late) * e / 100 * EASY_BONUS));
    }
    ni = Math.min(MAX_IVL, ni);
    return { d: today + ni, i: ni, e: e, r: r + 1, l: l };
  }
  function preview(st, today) { return [grade(st, 1, today).i, grade(st, 2, today).i, grade(st, 3, today).i]; }
  function isDue(st, today) { return !!st && (st.d | 0) <= today; }

  /* ---------- un mazo: { v, t: [día, nuevas ese día], res: { id: estado } } ---------- */
  function deckState(raw) {
    var o = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    var res = o.res && typeof o.res === 'object' && !Array.isArray(o.res) ? o.res : {};
    var t = Array.isArray(o.t) && o.t.length === 2 ? [o.t[0] | 0, o.t[1] | 0] : [0, 0];
    return { v: 1, t: t, res: res };
  }
  function newToday(ds, today) { return ds.t[0] === today ? ds.t[1] : 0; }
  function deckStats(ds, n, today) {
    var seen = 0, due = 0, m = 0;
    for (var k in ds.res) {
      var s = ds.res[k]; if (!s || typeof s !== 'object') continue;
      seen++; if ((s.d | 0) <= today) due++;
      m += Math.min(1, (s.i | 0) / MASTER);
    }
    return { seen: seen, due: due, fresh: Math.max(0, n - seen), mastery: n ? Math.min(1, m / n) : 0, newToday: newToday(ds, today) };
  }
  // tras guardar una nota: la tarjeta nueva suma una al contador de nuevas del día
  function applyGrade(ds, id, after, wasNew, today) {
    ds.res[id] = after;
    if (wasNew) ds.t = [today, newToday(ds, today) + 1];
    return ds;
  }
  function undoGrade(ds, id, before, tBefore) {
    if (before) ds.res[id] = before; else delete ds.res[id];
    ds.t = tBefore.slice();
    return ds;
  }
  // quita tarjetas que ya no existen en el mazo (anverso cambiado o borrada); devuelve cuántas
  function reconcile(ds, ids) {
    var keep = {}, n = 0;
    ids.forEach(function (x) { keep[x] = 1; });
    Object.keys(ds.res).forEach(function (k) { if (!keep[k]) { delete ds.res[k]; n++; } });
    return n;
  }

  /* ---------- cola de una sesión ----------
     decks: [{ id, ids: [ids en orden del archivo] | null (aún sin cargar), ds, fresh: true si da nuevas }]
     1. vencidas de todos los mazos: primero las más atrasadas; mismo día, orden mezclado fijo para ese día;
     2. nuevas: por turnos entre los mazos que dan nuevas, en el orden del archivo, hasta newLeft;
     3. las nuevas se reparten uniformemente entre las vencidas. */
  function mix(s, seed) { return fnv(s + '|' + seed); }
  function buildQueue(decks, today, newLeft) {
    var due = [], src = [], nw = [];
    decks.forEach(function (dk) {
      var set = null;
      if (dk.ids) { set = {}; dk.ids.forEach(function (x) { set[x] = 1; }); }
      Object.keys(dk.ds.res).forEach(function (id) {
        var s = dk.ds.res[id];
        if (s && typeof s === 'object' && isDue(s, today) && (!set || set[id])) due.push({ d: dk.id, i: id, due: s.d | 0, h: mix(dk.id + ':' + id, today) });
      });
      if (dk.fresh && dk.ids) src.push({ id: dk.id, ids: dk.ids.filter(function (x) { return !dk.ds.res[x]; }), p: 0 });
    });
    due.sort(function (a, b) { return a.due - b.due || a.h - b.h || (a.d < b.d ? -1 : a.d > b.d ? 1 : 0) || (a.i < b.i ? -1 : 1); });
    var left = Math.max(0, newLeft | 0), more = true;
    while (left > 0 && more) {
      more = false;
      for (var j = 0; j < src.length && left > 0; j++) {
        var s = src[j]; if (s.p >= s.ids.length) continue;
        nw.push({ d: s.id, i: s.ids[s.p++], fresh: true }); left--; more = true;
      }
    }
    var out = [], q = due.map(function (x) { return { d: x.d, i: x.i }; });
    if (!nw.length) return q;
    if (!q.length) return nw;
    var put = 0;
    for (var k = 0; k < q.length; k++) {
      out.push(q[k]);
      while (put < nw.length && (put + 1) * q.length <= (k + 1) * nw.length) out.push(nw[put++]);
    }
    while (put < nw.length) out.push(nw[put++]);
    return out;
  }

  /* ---------- sesión: «otra vez» vuelve a la cola; deshacer la última nota ---------- */
  function Session(queue) { this.q = queue.slice(); this.h = []; this.n = 0; this.ok = 0; this.total = queue.length; }
  Session.prototype.cur = function () { return this.q[0] || null; };
  Session.prototype.left = function () { return this.q.length; };
  Session.prototype.answer = function (g, extra) {
    var it = this.q.shift(); if (!it) return null;
    var at = -1;
    if (g === 1) { at = Math.min(REQUEUE, this.q.length); this.q.splice(at, 0, it); this.total++; }
    this.h.push({ it: it, g: g, at: at, extra: extra });
    this.n++; if (g > 1) this.ok++;
    return it;
  };
  Session.prototype.undo = function () {
    var x = this.h.pop(); if (!x) return null;
    if (x.at >= 0) { this.q.splice(x.at, 1); this.total--; }
    this.q.unshift(x.it);
    this.n--; if (x.g > 1) this.ok--;
    return x;
  };
  Session.prototype.drop = function () { var it = this.q.shift(); if (it) this.total--; return it; }; // tarjeta que ya no existe
  Session.prototype.canUndo = function () { return this.h.length > 0; };

  /* ---------- texto seguro: todo se escapa; solo *cursiva* pasa a <i> y 10^6 / V^2 a <sup> ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var ITAL = /(^|[^\p{L}\p{N}_*])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![\p{L}\p{N}_*])/gu;
  var SUP = /([\p{L}\p{N})])\^(-?\d{1,3})(?!\d)/gu;
  function fmt(s) { return esc(s).replace(ITAL, '$1<i>$2</i>').replace(SUP, '$1<sup>$2</sup>'); }

  function days(n) { return n <= 0 ? 'hoy' : n < 60 ? n + ' d' : n < 365 ? Math.round(n / 30) + ' meses' : Math.round(n / 365) + ' año'; }

  var API = {
    DAY: DAY, CUT_H: CUT_H, EASE0: EASE0, EASE_MIN: EASE_MIN, MAX_IVL: MAX_IVL, REQUEUE: REQUEUE, MASTER: MASTER, NEW_PER_DAY: NEW_PER_DAY,
    dayNum: dayNum, norm: norm, cardId: cardId, fnv: fnv, grade: grade, preview: preview, isDue: isDue,
    deckState: deckState, deckStats: deckStats, newToday: newToday, applyGrade: applyGrade, undoGrade: undoGrade, reconcile: reconcile,
    buildQueue: buildQueue, Session: Session, esc: esc, fmt: fmt, days: days
  };
  root.ATCCards = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
