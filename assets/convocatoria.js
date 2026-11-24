/* Aviso de convocatoria: lee estado/convocatoria.json (lo escribe el vigilante del repositorio publico dos veces al dia)
   y pone una sola linea en Inicio y en Hoy cuando hay algo que hacer: convocatoria nueva con plazo abierto o temario
   cambiado (hasta que se abre). En Hoy, si el vigilante lleva mas de 3 dias sin leer el portal, una nota discreta.
   Sin dependencias; sin archivo o desde disco (fetch falla) no muestra nada. En Node se usa solo decide(). */
(function (root) {
  'use strict';
  var DAY = 864e5;
  var PORTAL = 'https://empleo.enaire.es/empleo/PFSrv?accion=inicio&SEDE=0';
  var OCUP = 'https://empleo.enaire.es/empleo/OcupSrv?accion=inicio';
  var KNOWN = ['CONVOCATORIA EXTERNA CONTROLADORES 2025', '20/11/2025'];
  var SEEN = 'atc_conv_seen';
  var doc = root.document;

  function dmy(s) { // "12/12/2025 23:59" -> Date local; sin hora = final del dia
    var m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(String(s || '').trim());
    if (!m) return null;
    return m[4] ? new Date(+m[3], m[2] - 1, +m[1], +m[4], +m[5]) : new Date(+m[3], m[2] - 1, +m[1], 23, 59);
  }
  function isNew(c) { return String(c.name || '').toUpperCase().split(/\s+/).join(' ').trim() !== KNOWN[0] || c.published !== KNOWN[1]; }
  function dm(ms) { var d = new Date(ms); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }

  // data = contenido del JSON; now = ms; seen = valor guardado de SEEN. Devuelve {line, stale}.
  function decide(data, now, seen) {
    var r = { line: null, stale: null };
    if (!data || typeof data !== 'object') return r;
    var calls = (data.new_call && Array.isArray(data.calls) ? data.calls : []).filter(function (c) { return c && isNew(c); });
    calls.sort(function (a, b) { return ((dmy(b.published) || 0) - (dmy(a.published) || 0)); });
    var c = calls[0];
    if (c) {
      var end = dmy(c.apply_to);
      if (!end || now <= end.getTime()) {
        r.line = { kind: 'call', b: 'Convocatoria publicada', t: end ? 'inscripción hasta el ' + c.apply_to.slice(0, 5) : '', href: PORTAL, title: c.name };
      }
    }
    var dc = Array.isArray(data.docs_changed) ? data.docs_changed : [];
    if (!r.line && dc.length && data.since && seen !== data.since) {
      r.line = { kind: 'docs', b: 'Temario actualizado', t: '', href: OCUP, title: dc.join(' · '), since: data.since };
    }
    var ref = Date.parse(data.last_ok || (data.ok ? data.checked : '') || '');
    if (isNaN(ref)) r.stale = 'sin comprobar';
    else if (now - ref > 3 * DAY) r.stale = 'sin comprobar desde ' + dm(ref);
    return r;
  }

  function base() {
    var s = doc.currentScript || [].slice.call(doc.scripts).filter(function (x) { return /assets\/convocatoria\.js/.test(x.src); })[0];
    return s ? s.src.replace(/assets\/convocatoria\.js.*$/, '') : '';
  }
  var BASE = doc ? base() : '';

  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }

  var CSS = '.conv{display:block;margin:0 0 14px;padding:10px 14px;border-left:3px solid var(--warn);background:var(--card);font:15px/1.35 var(--sans);text-decoration:none;color:var(--fg)}' +
    '.conv:hover{color:var(--acc)}.conv b{color:var(--warn)}.conv-st{margin:0 0 10px;color:var(--mut);font:13px var(--sans)}';

  function show(r) {
    var hoy = doc.getElementById('hoy');
    var anchor = hoy || doc.querySelector('.home-next');
    if (!anchor || (!r.line && !(hoy && r.stale))) return;
    var st = doc.createElement('style'); st.textContent = CSS; doc.head.appendChild(st);
    if (r.line) {
      var a = doc.createElement('a');
      a.className = 'conv conv-' + r.line.kind; a.href = r.line.href; a.target = '_blank'; a.rel = 'noopener'; a.title = r.line.title || '';
      var b = doc.createElement('b'); b.textContent = r.line.b; a.appendChild(b);
      if (r.line.t) a.appendChild(doc.createTextNode(' · ' + r.line.t));
      if (r.line.kind === 'docs') a.addEventListener('click', function () { lsSet(SEEN, r.line.since); a.remove(); });
      anchor.parentNode.insertBefore(a, anchor);
    }
    if (hoy && r.stale) {
      var p = doc.createElement('p'); p.className = 'conv-st'; p.textContent = 'Convocatoria: ' + r.stale;
      anchor.parentNode.insertBefore(p, anchor);
    }
  }

  function init() {
    if (!(doc.getElementById('hoy') || doc.querySelector('.home-next')) || typeof fetch !== 'function') return;
    try {
      fetch(BASE + 'estado/convocatoria.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (d) { if (d) show(decide(d, Date.now(), lsGet(SEEN))); })
        .catch(function () { /* sin archivo, sin red o desde disco: nada */ });
    } catch (e) { /* idem */ }
  }

  var API = { decide: decide, dmy: dmy };
  root.ATCConv = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init(); }
})(typeof window !== 'undefined' ? window : globalThis);
