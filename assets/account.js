/* Cuentas opcionales y sincronizacion del progreso (localStorage -> backend). Sin dependencias.
 *
 * localStorage del navegador es siempre la fuente de verdad: sin backend (dormido, caido, bloqueado) todo
 * funciona igual y solo se degrada el boton de cuenta. Si window.ATC_API esta vacio, este archivo no hace nada.
 *
 * CLAVES SINCRONIZADAS: toda clave que empiece por "atc" y cumpla la regex del servidor
 *   ^atc[A-Za-z0-9_:/.\-]{0,150}$   (excluidas las que terminan en ".corrupt"). Claves reales del sitio:
 *   atc_radar_v2, atc_spatial_v1, atc_matrices_v1, atc_mentalmath_v1, atc_listening_v1, atc_memattn_v1,
 *   atc_sectorsim_v1, atc_dashboard_v1, atc_entrenador_v1 (aptitude-trainer), atctrainer:v1 (Entrenador),
 *   atc3b.v1, atc3b.g.v1, atc3b.consistency.v1 (herramientas conductuales), atcquiz:<ruta> (tests).
 *   atc_reset = instante (ms) del ultimo «Empezar de cero»: ver el bloque "empezar de cero".
 *   NUNCA se sincroniza nada mas: ni el token (acct.token), ni acct.meta, ni acct.lock, ni acct.reset, ni acct.backup.
 * TRADUCCION (EXTRA): claves del sitio que NO empiezan por "atc" se envian como "atc.<clave original>".
 *   Hoy el sitio no tiene ninguna (el tema claro/oscuro sigue la configuracion del sistema); la lista queda vacia.
 */
(function () {
  'use strict';
  if (window.__acct) return;
  var API = window.ATC_API;
  if (!API || typeof API !== 'string') return;
  API = API.replace(/\/+$/, '');

  var EXTRA = {}; // { 'clave-local': true }  -> servidor: 'atc.clave-local'
  var SRV_RE = /^atc[A-Za-z0-9_:\/.\-]{0,150}$/;
  var K_TOKEN = 'acct.token', K_META = 'acct.meta', K_LOCK = 'acct.lock', K_LAST = 'acct.last';
  var K_RESET = 'acct.reset', K_BACKUP = 'acct.backup', RESET_KEY = 'atc_reset';
  var ID = Math.random().toString(36).slice(2);
  var script = document.currentScript;
  var BASE = '';
  try { BASE = script && script.src ? script.src.replace(/assets\/account\.js[^\/]*$/, '') : ''; } catch (e) {}

  var SP = Storage.prototype;
  var oGet = SP.getItem, oSet = SP.setItem, oRem = SP.removeItem;
  var busy = false; // true mientras escribimos valores del servidor (no cuentan como cambios locales)

  /* ---------- almacenamiento defensivo ---------- */
  function lget(k) { try { return oGet.call(window.localStorage, k); } catch (e) { return null; } }
  function lset(k, v) { try { oSet.call(window.localStorage, k, v); return true; } catch (e) { return false; } }
  function lrem(k) { try { oRem.call(window.localStorage, k); } catch (e) {} }
  function pj(s) { try { return JSON.parse(s); } catch (e) { return null; } }
  function lkeys() {
    var out = [];
    try { var ls = window.localStorage; for (var i = 0; i < ls.length; i++) out.push(ls.key(i)); } catch (e) {}
    return out;
  }

  /* ---------- claves ---------- */
  function toServer(k) { return EXTRA[k] ? 'atc.' + k : k; }
  function fromServer(sk) {
    if (sk.indexOf('atc.') === 0 && EXTRA[sk.slice(4)]) return sk.slice(4);
    return sk;
  }
  function isSynced(k) {
    if (typeof k !== 'string') return false;
    if (/\.corrupt$/.test(k)) return false;
    if (EXTRA[k]) return true;
    return k.indexOf('atc') === 0 && SRV_RE.test(k);
  }

  /* ---------- meta local: { clave: {t: ms ultimo cambio local, p: ms ultimo subido, d: 1 si borrada} } ---------- */
  var meta = pj(lget(K_META)) || {};
  function saveMeta() { lset(K_META, JSON.stringify(meta)); }
  function reloadMeta() { meta = pj(lget(K_META)) || {}; }

  var S = { net: 'connecting', sync: 'idle', user: null, role: null, last: 0, msg: '' };
  var token = null;
  function loadAuth() {
    var a = pj(lget(K_TOKEN));
    if (a && a.t) { token = a.t; S.user = a.u || null; S.role = a.r || null; }
    else { token = null; S.user = null; S.role = null; }
    S.last = parseInt(lget(K_LAST) || '0', 10) || 0;
  }
  loadAuth();

  var syncTimer = null;
  function touch(k, removed) {
    reloadMeta();
    var old = meta[k] || {};
    meta[k] = { t: Math.max(Date.now(), (old.t || 0) + 1), p: old.p || 0, d: removed ? 1 : 0 };
    saveMeta();
    if (token) schedule(4000);
  }
  function schedule(ms) {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { syncTimer = null; sync('debounce'); }, ms);
  }

  /* envoltorio unico de setItem/removeItem, solo para claves sincronizadas y solo si el valor cambia */
  try {
    SP.setItem = function (k, v) {
      var tracked = false, old = null;
      try { tracked = !busy && this === window.localStorage && isSynced(String(k)); if (tracked) old = oGet.call(this, k); } catch (e) {}
      var r = oSet.apply(this, arguments);
      if (tracked) { try { if (old !== String(v)) touch(String(k), false); } catch (e) {} }
      return r;
    };
    SP.removeItem = function (k) {
      var tracked = false, had = false;
      try { tracked = !busy && this === window.localStorage && isSynced(String(k)); if (tracked) had = oGet.call(this, k) !== null; } catch (e) {}
      var r = oRem.apply(this, arguments);
      if (tracked && had) { try { touch(String(k), true); } catch (e) {} }
      return r;
    };
  } catch (e) {}

  /* ---------- red ---------- */
  function api(method, path, body, o) {
    o = o || {};
    return new Promise(function (resolve, reject) {
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); reject({ net: true, timeout: true }); }, o.timeout || 30000);
      var h = {};
      if (body !== undefined && body !== null) h['Content-Type'] = 'application/json';
      if (o.auth !== false && token) h['Authorization'] = 'Bearer ' + (o.token || token);
      var init = { method: method, headers: h, mode: 'cors', credentials: 'omit', cache: 'no-store' };
      if (body !== undefined && body !== null) init.body = JSON.stringify(body);
      if (ctl) init.signal = ctl.signal;
      if (o.keepalive) init.keepalive = true;
      var done = false;
      fetch(API + path, init).then(function (res) {
        clearTimeout(timer); if (done) return; done = true;
        if (res.status === 204) return resolve({ status: 204, data: null, res: res });
        res.text().then(function (t) { resolve({ status: res.status, data: pj(t), res: res }); }, function () { resolve({ status: res.status, data: null, res: res }); });
      }, function () { clearTimeout(timer); if (done) return; done = true; reject({ net: true }); });
    });
  }

  /* ---------- fusion ---------- */
  var UNION = { sessions: 1, sesiones: 1, hist: 1 };
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function ident(x) { try { return x && typeof x === 'object' && typeof x.ts === 'number' ? 'ts:' + x.ts + ':' + JSON.stringify(x) : JSON.stringify(x); } catch (e) { return String(x); } }
  function unionArr(a, b) {
    var seen = {}, out = [];
    a.concat(b).forEach(function (x) {
      var id = ident(x); if (seen[id]) return; seen[id] = 1; out.push(x);
    });
    var allTs = out.length > 1 && out.every(function (x) { return x && typeof x.ts === 'number'; });
    if (allTs) {
      var big = a.length >= b.length ? a : b;
      var desc = big.length > 1 && big[0].ts > big[big.length - 1].ts;
      out.sort(function (x, y) { return desc ? y.ts - x.ts : x.ts - y.ts; });
    }
    return out;
  }
  function hasKnown(o, d) {
    if (!isObj(o) || d > 3) return false;
    for (var k in o) {
      if (UNION[k] && Array.isArray(o[k])) return true;
      if (k === 'res' && isObj(o[k])) return true;
      if (hasKnown(o[k], d + 1)) return true;
    }
    return false;
  }
  // a = local, b = servidor; newerLocal indica que lado gana en escalares
  function deep(a, b, key, newerLocal) {
    if (Array.isArray(a) && Array.isArray(b) && UNION[key]) return unionArr(a, b);
    if (isObj(a) && isObj(b)) {
      var out = {}, ks = {};
      Object.keys(a).forEach(function (k) { ks[k] = 1; }); Object.keys(b).forEach(function (k) { ks[k] = 1; });
      Object.keys(ks).forEach(function (k) {
        if (!(k in a)) out[k] = b[k];
        else if (!(k in b)) out[k] = a[k];
        else if (key === 'res') out[k] = recLast(a[k], b[k], newerLocal);
        else out[k] = deep(a[k], b[k], k, newerLocal);
      });
      return out;
    }
    return newerLocal ? a : b;
  }
  function recLast(x, y, newerLocal) {
    var lx = isObj(x) && typeof x.last === 'number' ? x.last : -1, ly = isObj(y) && typeof y.last === 'number' ? y.last : -1;
    if (lx === ly) return newerLocal ? x : y;
    return lx > ly ? x : y;
  }
  function isEmptyVal(s) { return s === null || s === undefined || s === '' || s === '{}' || s === '[]' || s === 'null'; }
  // devuelve la cadena fusionada (local L, servidor Sv)
  function mergeVal(k, L, Sv, lt, st) {
    if (L === Sv) return L;
    if (isEmptyVal(L) && !isEmptyVal(Sv)) return Sv;
    if (isEmptyVal(Sv) && !isEmptyVal(L)) return L;
    var newerLocal = lt > st;
    if (k.indexOf('atcquiz:') !== 0) {
      var a = pj(L), b = pj(Sv);
      if (isObj(a) && isObj(b) && (hasKnown(a, 0) || hasKnown(b, 0))) {
        try { return JSON.stringify(deep(a, b, '', newerLocal)); } catch (e) {}
      }
    }
    return newerLocal ? L : Sv;
  }

  /* ---------- bloqueo entre pestanas ---------- */
  function lock() {
    var now = Date.now(), l = pj(lget(K_LOCK));
    if (l && l.id !== ID && now - l.t < 90000) return false;
    lset(K_LOCK, JSON.stringify({ id: ID, t: now }));
    var c = pj(lget(K_LOCK));
    return !!(c && c.id === ID);
  }
  function unlock() { var l = pj(lget(K_LOCK)); if (l && l.id === ID) lrem(K_LOCK); }

  /* ---------- sincronizacion ---------- */
  var syncing = false, backoffUntil = 0, backoffN = 0, skipKeys = {};
  function backoff(r) {
    var ra = 0;
    try { ra = parseInt(r.res.headers.get('Retry-After') || '0', 10) * 1000; } catch (e) {}
    backoffN = Math.min(backoffN + 1, 6);
    backoffUntil = Date.now() + Math.max(ra, 30000 * Math.pow(2, backoffN - 1));
    schedule(backoffUntil - Date.now() + 500);
  }
  function unauthorized() {
    lrem(K_TOKEN); loadAuth(); S.sync = 'idle'; S.msg = 'Sesión caducada'; ui(); bc('auth');
  }
  function setLast() { S.last = Date.now(); lset(K_LAST, String(S.last)); }

  function put(items) {
    // devuelve {ok, canon} ; ante 413/422 reintenta clave a clave y omite las rechazadas
    var keys = Object.keys(items), canon = {}, chunks = [];
    for (var i = 0; i < keys.length; i += 50) chunks.push(keys.slice(i, i + 50));
    var p = Promise.resolve(true);
    chunks.forEach(function (ch) {
      p = p.then(function (ok) {
        if (!ok) return false;
        var body = { items: {} }; ch.forEach(function (k) { body.items[k] = items[k]; });
        return api('PUT', '/data', body, { timeout: 60000 }).then(function (r) {
          if (r.status === 200) { var it = (r.data && r.data.items) || {}; for (var k in it) canon[k] = it[k]; return true; }
          if (r.status === 401) { unauthorized(); return false; }
          if (r.status === 429) { backoff(r); return false; }
          if (r.status === 413 || r.status === 422) {
            var q = Promise.resolve(true);
            ch.forEach(function (k) {
              q = q.then(function (ok2) {
                if (!ok2) return false;
                var b1 = { items: {} }; b1.items[k] = items[k];
                return api('PUT', '/data', b1, { timeout: 60000 }).then(function (r1) {
                  if (r1.status === 200) { var it = (r1.data && r1.data.items) || {}; for (var kk in it) canon[kk] = it[kk]; return true; }
                  if (r1.status === 413 || r1.status === 422) { skipKeys[k] = items[k].updated_at; return true; }
                  if (r1.status === 401) { unauthorized(); return false; }
                  if (r1.status === 429) { backoff(r1); return false; }
                  throw { http: r1.status };
                });
              });
            });
            return q;
          }
          throw { http: r.status };
        });
      });
    });
    return p.then(function (ok) { return { ok: ok, canon: canon }; });
  }

  function sync(reason) {
    if (!token || S.net !== 'ok' || syncing || Date.now() < backoffUntil) return Promise.resolve();
    if (!lock()) return Promise.resolve();
    syncing = true; S.sync = 'syncing'; S.msg = ''; ui();
    reloadMeta();
    var push = {}, pushTs = {}, dels = [];
    return api('GET', '/data', null, { timeout: 60000 }).then(function (r) {
      if (r.status === 401) { unauthorized(); return 'stop'; }
      if (r.status === 429) { backoff(r); return 'stop'; }
      if (r.status !== 200) throw { http: r.status };
      var srv = {};
      var items = (r.data && r.data.items) || {};
      Object.keys(items).forEach(function (sk) { var lk = fromServer(sk); if (isSynced(lk)) srv[lk] = items[sk]; });
      reloadMeta();
      // «Empezar de cero» pedido en cualquier dispositivo: lo anterior al reinicio se borra, nunca se fusiona
      var rsv = srv[RESET_KEY];
      var rs = Math.max(rsv && typeof rsv.value === 'string' ? (parseInt(rsv.value, 10) || 0) : 0, parseInt(lget(RESET_KEY) || '0', 10) || 0);
      if (rs > (parseInt(lget(K_RESET) || '0', 10) || 0) && wipeBefore(rs) > 0) { bc('reset'); setTimeout(reload, 0); return 'stop'; }
      if (rs) Object.keys(srv).forEach(function (k) {
        if (k === RESET_KEY || (srv[k].updated_at || 0) >= rs) return;
        if (lget(k) === null) dels.push(k); // si aqui hay una copia posterior al reinicio, esa pisa la del servidor
        delete srv[k];
      });
      var all = {};
      Object.keys(srv).forEach(function (k) { all[k] = 1; });
      lkeys().forEach(function (k) { if (isSynced(k)) all[k] = 1; });
      Object.keys(meta).forEach(function (k) { if (isSynced(k)) all[k] = 1; });
      Object.keys(all).forEach(function (k) {
        var L = lget(k), m = meta[k] || {}, lt = m.t || 0, sv = srv[k];
        var Sv = sv ? sv.value : null, st = sv ? (sv.updated_at || 0) : 0;
        if (typeof Sv !== 'string') Sv = null;
        if (L === null) {
          if (Sv === null) return;
          if (m.d && lt > st) { dels.push(k); return; }
          if (isEmptyVal(Sv)) return;
          writeLocal(k, Sv, st); return;
        }
        if (Sv === null) {
          if (isEmptyVal(L) && !lt) return;
          var ts = lt || Date.now();
          if (!lt) { meta[k] = { t: ts, p: 0, d: 0 }; }
          queue(k, L, ts); return;
        }
        if (L === Sv) { var t0 = Math.max(lt, st); meta[k] = { t: t0, p: t0, d: 0 }; return; }
        var merged = mergeVal(k, L, Sv, lt, st);
        if (merged !== L) writeLocal(k, merged, merged === Sv ? st : Math.max(Date.now(), st + 1));
        if (merged !== Sv) queue(k, merged, merged === L && lt > st ? lt : Math.max(Date.now(), st + 1));
        else { meta[k] = { t: st, p: st, d: 0 }; }
      });
      saveMeta();
      function queue(k, v, ts) {
        if (skipKeys[k] === ts) return;
        if (v.length > 1000000) { skipKeys[k] = ts; return; }
        push[toServer(k)] = { value: v, updated_at: ts }; pushTs[toServer(k)] = ts;
      }
      function writeLocal(k, v, ts) {
        busy = true; try { oSet.call(window.localStorage, k, v); } catch (e) {} busy = false;
        meta[k] = { t: ts, p: ts, d: 0 };
      }
      var chain = Promise.resolve({ ok: true, canon: {} });
      if (Object.keys(push).length) chain = put(push);
      return chain.then(function (res) {
        if (!res.ok) return 'stop';
        reloadMeta();
        Object.keys(pushTs).forEach(function (sk) {
          var k = fromServer(sk), ts = pushTs[sk], m = meta[k] || {};
          if (!m.t || m.t <= ts) meta[k] = { t: ts, p: ts, d: 0 }; else m.p = ts;
        });
        Object.keys(res.canon).forEach(function (sk) {
          var k = fromServer(sk), c = res.canon[sk], m = meta[k] || {};
          if (!c || typeof c.value !== 'string' || !isSynced(k)) return;
          if ((m.t || 0) <= (c.updated_at || 0) && lget(k) !== c.value && !isEmptyVal(c.value)) writeLocal(k, c.value, c.updated_at || 0);
        });
        saveMeta();
        var q = Promise.resolve(true);
        dels.forEach(function (k) {
          q = q.then(function () {
            return api('DELETE', '/data/' + encodeURIComponent(toServer(k)), null, { timeout: 30000 }).then(function (rr) {
              if (rr.status === 204 || rr.status === 404) { reloadMeta(); delete meta[k]; saveMeta(); }
              else if (rr.status === 401) unauthorized();
              else if (rr.status === 429) backoff(rr);
              return true;
            });
          });
        });
        return q;
      });
    }).then(function (x) {
      if (x !== 'stop') { setLast(); backoffN = 0; S.sync = 'idle'; bc('synced'); }
      else if (S.sync === 'syncing') S.sync = 'idle';
    }, function (e) {
      if (e && e.net) { netDown(); S.sync = 'idle'; }
      else { S.sync = 'error'; setTimeout(function () { if (S.sync === 'error') sync('retry'); }, 60000); }
    }).then(function () { syncing = false; unlock(); ui(); });
  }

  /* envio rapido de lo pendiente al ocultar/cerrar la pagina (sin pull) */
  function flush() {
    if (!token || S.net !== 'ok') return;
    try {
      reloadMeta();
      var items = {}, dels = [], size = 0;
      Object.keys(meta).forEach(function (k) {
        var m = meta[k]; if (!isSynced(k) || !(m.t > (m.p || 0))) return;
        if (m.d) { dels.push(k); return; }
        var v = lget(k); if (v === null) return;
        if (v.length > 1000000 || size + v.length > 55000 || Object.keys(items).length >= 50) return;
        size += v.length; items[toServer(k)] = { value: v, updated_at: m.t };
      });
      if (Object.keys(items).length) api('PUT', '/data', { items: items }, { keepalive: true, timeout: 10000 }).then(function (r) {
        if (r.status === 200) { reloadMeta(); Object.keys(items).forEach(function (sk) { var k = fromServer(sk), m = meta[k]; if (m && m.t <= items[sk].updated_at) m.p = items[sk].updated_at; }); saveMeta(); }
      }, function () {});
      dels.forEach(function (k) { api('DELETE', '/data/' + encodeURIComponent(toServer(k)), null, { keepalive: true, timeout: 10000 }).catch(function () {}); });
    } catch (e) {}
  }

  /* ---------- empezar de cero ---------- */
  // atc_reset (clave sincronizada) guarda el instante del ultimo reinicio. Cada navegador borra, en cuanto lo ve,
  // todo lo anterior a ese instante en vez de volver a subirlo: sin esto, un segundo dispositivo con progreso
  // antiguo lo devolveria a la cuenta. acct.reset (local) recuerda el ultimo reinicio ya aplicado en este navegador.
  function wipeBefore(ts) {
    reloadMeta();
    var n = 0;
    busy = true;
    try {
      lkeys().forEach(function (k) {
        if (k === RESET_KEY || !isSynced(k) || ((meta[k] || {}).t || 0) >= ts) return;
        try { oRem.call(window.localStorage, k); n++; } catch (e) {}
      });
    } finally { busy = false; }
    Object.keys(meta).forEach(function (k) { if (k !== RESET_KEY && (meta[k].t || 0) < ts) delete meta[k]; });
    saveMeta(); lset(K_RESET, String(ts));
    return n;
  }
  // las paginas guardan su estado en memoria: tras borrar hay que recargar o lo volverian a escribir
  function reload() { try { window.location.reload(); } catch (e) {} }
  function doReset(noAsk) {
    if (!noAsk && !window.confirm('¿Borrar todo el progreso?')) return;
    var ts = Date.now(), snap = {};
    lkeys().forEach(function (k) { if (isSynced(k) && k !== RESET_KEY) snap[k] = lget(k); });
    lset(K_BACKUP, JSON.stringify({ t: ts, d: snap })); // copia local de lo borrado (no se sincroniza)
    try { window.localStorage.setItem(RESET_KEY, String(ts)); } catch (e) {}
    wipeBefore(ts);
    bc('reset');
    if (token && S.net === 'ok') { backoffUntil = 0; sync('reset').then(reload, reload); } else reload();
  }

  /* ---------- salud ---------- */
  var healthTimer = null, healthTry = 0, lastHealth = 0;
  var RETRY = [15000, 45000, 120000, 180000];
  function health() {
    lastHealth = Date.now();
    return api('GET', '/health', null, { auth: false, timeout: 8000 }).then(function (r) {
      if (r.status === 200 && r.data && r.data.ok) {
        var was = S.net; S.net = 'ok'; healthTry = 0; ui();
        if (token) { refreshMe(); sync('health'); }
        if (was !== 'ok') bc('net');
      } else netDown();
    }, function () { netDown(); });
  }
  function netDown() {
    S.net = 'down'; ui();
    if (healthTimer) clearTimeout(healthTimer);
    var d = RETRY[Math.min(healthTry++, RETRY.length - 1)];
    healthTimer = setTimeout(health, d);
  }
  function refreshMe() {
    api('GET', '/me', null, { timeout: 30000 }).then(function (r) {
      if (r.status === 200 && r.data && r.data.username) {
        var a = pj(lget(K_TOKEN)); if (a) { a.u = r.data.username; a.r = r.data.role; lset(K_TOKEN, JSON.stringify(a)); }
        loadAuth(); ui();
      } else if (r.status === 401) unauthorized();
    }, function () {});
  }

  /* ---------- cuenta ---------- */
  function setAuth(d) {
    lset(K_TOKEN, JSON.stringify({ t: d.token, u: d.user && d.user.username, r: d.user && d.user.role }));
    loadAuth(); S.msg = ''; bc('auth');
  }
  function signOut() {
    lrem(K_TOKEN); loadAuth(); S.sync = 'idle'; S.msg = ''; ui(); bc('auth');
  }
  function auth(kind, u, p) {
    return api('POST', '/auth/' + kind, { username: u, password: p }, { auth: false, timeout: 120000 }).then(function (r) {
      if (r.status === 200 || r.status === 201) { setAuth(r.data); S.net = 'ok'; ui(); sync('login'); return ''; }
      if (r.status === 401) return 'Datos incorrectos';
      if (r.status === 409) return 'Usuario ocupado';
      if (r.status === 429) return 'Demasiados intentos';
      if (r.status === 422 || r.status === 400) return 'Usuario o contraseña no válidos';
      return 'Error';
    }, function () { netDown(); return 'Sin conexión'; });
  }

  /* ---------- BroadcastChannel + storage ---------- */
  var chan = null;
  try { if (typeof BroadcastChannel !== 'undefined') { chan = new BroadcastChannel('atc-acct'); chan.onmessage = function (e) { onMsg(e && e.data); }; } } catch (e) {}
  function bc(t) { try { if (chan) chan.postMessage({ t: t, id: ID }); } catch (e) {} }
  function onMsg(m) {
    if (!m || m.id === ID) return;
    if (m.t === 'auth') { loadAuth(); ui(); if (token) schedule(500); }
    else if (m.t === 'synced') { S.last = parseInt(lget(K_LAST) || '0', 10) || 0; ui(); }
    else if (m.t === 'reset') reload();
    else if (m.t === 'net' && m.id) { /* cada pestana comprueba su propia salud */ }
  }
  window.addEventListener('storage', function (e) {
    try {
      if (e.key === K_TOKEN) { loadAuth(); ui(); if (token) schedule(500); }
      else if (e.key === K_LAST) { S.last = parseInt(lget(K_LAST) || '0', 10) || 0; ui(); }
    } catch (x) {}
  });

  /* ---------- interfaz ---------- */
  var ICON = {
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/>',
    cloud: '<path d="M7.5 18.5H17a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.9 9.3a4.6 4.6 0 0 0 .6 9.2z"/>',
    'cloud-off': '<path d="M7.5 18.5H17a4 4 0 0 0 1.6-7.7M6.9 9.3a4.6 4.6 0 0 0 .6 9.2M9 6.2a5.5 5.5 0 0 1 8.4 4.3M4 4l16 16"/>',
    logout: '<path d="M10 4.5H5v15h5M14 8l4 4-4 4M18 12H9"/>',
    key: '<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5L20 3M16 7l3 3M13.5 9.5l2 2"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3 7.8-7.5 9.5-4.5-1.7-7.5-5-7.5-9.5V6z"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5M12 8v4.5l3 2"/>' // el mismo trazo que theme.py
  };
  function ico(n) {
    if (document.getElementById('i-' + n)) return '<svg class="acct-i" aria-hidden="true"><use href="#i-' + n + '"/></svg>';
    return '<svg class="acct-i" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var CSS = '.acct-root{--a-bg:var(--bg,#f4f2ec);--a-sf:var(--surface,#fff);--a-fg:var(--fg,#1b1b1b);--a-mut:var(--mut,#5f5b53);--a-line:var(--line,#cfcabd);--a-acc:var(--acc,#1a4d8f);--a-on:var(--onacc,#fff);--a-ok:var(--ok,#2d6a3e);--a-bad:var(--bad,#a3241c);font:13px/1.4 system-ui,"Segoe UI",Roboto,sans-serif;color:var(--a-fg)}'
    + '@media(prefers-color-scheme:dark){.acct-root{--a-bg:var(--bg,#161615);--a-sf:var(--surface,#1e1e1c);--a-fg:var(--fg,#e7e4dc);--a-mut:var(--mut,#a19c90);--a-line:var(--line,#3a3935);--a-acc:var(--acc,#7fb0e8);--a-on:var(--onacc,#161615);--a-ok:var(--ok,#7cbf8a);--a-bad:var(--bad,#e5766d)}}'
    + '.acct-wrap{display:inline-block;position:relative;vertical-align:middle}.acct-fixed{position:fixed;top:8px;right:8px;z-index:2147483000}'
    + '.acct-btn{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;position:relative;width:28px;height:28px;cursor:pointer;color:var(--a-mut);border:1px solid transparent;border-radius:2px}'
    + '.acct-fixed .acct-btn{background:var(--a-bg);border-color:var(--a-line)}'
    + '.acct-btn:hover{color:var(--a-acc)}.acct-btn:focus-visible{outline:2px solid var(--a-acc);outline-offset:2px}'
    + '.acct-i{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}'
    + '.acct-dot{position:absolute;right:2px;bottom:2px;width:7px;height:7px;border-radius:50%;background:transparent;border:1px solid var(--a-bg)}'
    + '.acct-btn[data-s=synced] .acct-dot{background:var(--a-ok)}.acct-btn[data-s=syncing] .acct-dot{background:var(--a-acc)}.acct-btn[data-s=error] .acct-dot{background:var(--a-bad)}.acct-btn[data-s=connecting] .acct-dot{background:var(--a-mut);opacity:.6}'
    + '.acct-btn[data-s=offline]{opacity:.5}'
    + '.acct-pop{position:fixed;z-index:2147483001;width:min(272px,calc(100vw - 16px));background:var(--a-sf);border:1px solid var(--a-line);border-radius:2px;padding:12px;box-sizing:border-box}'
    + '.acct-pop[hidden]{display:none}'
    + '.acct-pop *{box-sizing:border-box}'
    + '.acct-row{display:flex;align-items:center;gap:8px;margin:0 0 8px;color:var(--a-fg)}.acct-row .acct-i{color:var(--a-mut)}'
    + '.acct-mut{color:var(--a-mut)}.acct-err{color:var(--a-bad);margin:0 0 8px;min-height:0}'
    + '.acct-pop input{display:block;width:100%;margin:0 0 8px;padding:7px 8px;font:14px system-ui,"Segoe UI",Roboto,sans-serif;color:var(--a-fg);background:var(--a-bg);border:1px solid var(--a-line);border-radius:2px}'
    + '.acct-pop input:focus-visible{outline:2px solid var(--a-acc);outline-offset:1px}'
    + '.acct-acts{display:flex;gap:8px;flex-wrap:wrap}'
    + '.acct-pop button.acct-b{all:unset;box-sizing:border-box;cursor:pointer;padding:6px 12px;border:1px solid var(--a-acc);border-radius:2px;color:var(--a-acc);font:13px system-ui,"Segoe UI",Roboto,sans-serif}'
    + '.acct-pop button.acct-b.pri{background:var(--a-acc);color:var(--a-on)}.acct-pop button.acct-b:hover{opacity:.85}.acct-pop button.acct-b:focus-visible{outline:2px solid var(--a-acc);outline-offset:2px}'
    + '.acct-pop button.acct-b[disabled]{opacity:.5;cursor:default}'
    + '.acct-pop button.acct-l,.acct-pop a.acct-l{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;padding:6px 0;cursor:pointer;color:var(--a-fg);border-top:1px solid var(--a-line);font:13px system-ui,"Segoe UI",Roboto,sans-serif;text-decoration:none}'
    + '.acct-pop button.acct-l:hover,.acct-pop a.acct-l:hover{color:var(--a-acc)}.acct-pop .acct-l .acct-i{color:var(--a-mut)}'
    + '.acct-pop .acct-l:focus-visible{outline:2px solid var(--a-acc);outline-offset:-2px}'
    + '#acct-slot{display:inline-flex;align-items:center}'
    + '.acct-admin{font:14px system-ui,"Segoe UI",Roboto,sans-serif}.acct-admin pre{max-height:50vh;overflow:auto;border:1px solid var(--line,#cfcabd);padding:8px;margin:8px 0;font:12px ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-all}';

  var btn, pop, wrap, mounted = false, open = false, mode = 'out', view = '';
  function stateKey() {
    if (S.net === 'down') return 'offline';
    if (S.net === 'connecting') return token ? 'connecting' : 'connecting';
    if (!token) return 'out';
    if (S.sync === 'syncing') return 'syncing';
    if (S.sync === 'error') return 'error';
    return 'synced';
  }
  var LABEL = { offline: 'Sin conexión', connecting: 'Conectando', out: 'Cuenta', synced: 'Sincronizado', syncing: 'Sincronizando', error: 'Error' };
  function fmtTime(ms) {
    if (!ms) return '';
    try {
      var d = new Date(ms), n = new Date();
      var hm = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      return d.toDateString() === n.toDateString() ? hm : d.toLocaleDateString('es', { day: 'numeric', month: 'short' }) + ' ' + hm;
    } catch (e) { return ''; }
  }

  function mount() {
    if (mounted || !document.body) return;
    mounted = true;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var slot = document.getElementById('acct-slot');
    wrap = document.createElement('span'); wrap.className = 'acct-root acct-wrap';
    if (slot) slot.appendChild(wrap); else { wrap.classList.add('acct-fixed'); document.body.appendChild(wrap); }
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'acct-btn'; btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    wrap.appendChild(btn);
    pop = document.createElement('div'); pop.className = 'acct-root acct-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Cuenta');
    document.body.appendChild(pop);
    document.addEventListener('click', function (e) { if (open && e.target.isConnected && !pop.contains(e.target) && !wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) { close(); btn.focus(); } });
    window.addEventListener('resize', place);
    ui();
  }
  function place() {
    if (!open || !btn) return;
    var r = btn.getBoundingClientRect();
    var w = Math.min(272, window.innerWidth - 16);
    var left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w));
    pop.style.left = left + 'px'; pop.style.top = (r.bottom + 6) + 'px';
  }
  function toggle() { open ? close() : openPop(); }
  function close() { open = false; if (pop) pop.hidden = true; if (btn) btn.setAttribute('aria-expanded', 'false'); }
  function openPop() {
    open = true; view = ''; S.msg = S.msg || '';
    if (S.net === 'down' && Date.now() - lastHealth > 10000) { if (healthTimer) clearTimeout(healthTimer); health(); }
    render(); pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); place();
    var f = pop.querySelector('input'); if (f) f.focus();
  }

  function ui() {
    if (!mounted) { if (document.body) mount(); else return; }
    var k = stateKey();
    var name = token && S.user ? S.user + ' · ' : '';
    btn.setAttribute('data-s', k);
    btn.setAttribute('aria-label', name + LABEL[k]); btn.title = name + LABEL[k];
    btn.innerHTML = ico(k === 'offline' ? 'cloud-off' : (token ? 'cloud' : 'user')) + '<span class="acct-dot"></span>';
    if (open) { var keep = captureInputs(); render(); restoreInputs(keep); place(); }
    renderAdmin();
  }
  function captureInputs() {
    var o = {}; if (!pop) return o;
    [].forEach.call(pop.querySelectorAll('input'), function (i) { o[i.name] = i.value; });
    o._f = document.activeElement && pop.contains(document.activeElement) ? document.activeElement.name : null; return o;
  }
  function restoreInputs(o) {
    [].forEach.call(pop.querySelectorAll('input'), function (i) { if (o[i.name] !== undefined) i.value = o[i.name]; });
    if (o._f) { var f = pop.querySelector('[name="' + o._f + '"]'); if (f) f.focus(); }
  }

  function render() {
    var k = stateKey(), h = '';
    if (k === 'offline') {
      h = (token && S.user ? '<div class="acct-row">' + ico('user') + esc(S.user) + '</div>' : '') + '<div class="acct-row acct-mut">' + ico('cloud-off') + 'Sin conexión</div>'
        + (token ? '<button type="button" class="acct-l" data-a="out">' + ico('logout') + 'Salir</button>' : '');
    } else if (!token) {
      h = '<form data-a="form" autocomplete="on"><input name="u" type="text" placeholder="Usuario" aria-label="Usuario" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="32">'
        + '<input name="p" type="password" placeholder="Contraseña" aria-label="Contraseña" autocomplete="current-password" maxlength="128">'
        + '<div class="acct-err" role="alert">' + esc(S.msg) + '</div>'
        + '<div class="acct-acts"><button type="submit" class="acct-b pri" data-a="login">Entrar</button><button type="button" class="acct-b" data-a="reg">Crear cuenta</button></div></form>'
        + '<button type="button" class="acct-l" data-a="reset" style="margin-top:12px">' + ico('history') + 'Empezar de cero</button>'
        + (k === 'connecting' ? '<div class="acct-row acct-mut" style="margin:8px 0 0">' + ico('cloud') + 'Conectando</div>' : '');
    } else {
      var admin = S.role === 'admin';
      h = '<div class="acct-row">' + ico(admin ? 'shield' : 'user') + '<b>' + esc(S.user || '') + '</b></div>'
        + '<div class="acct-row acct-mut">' + ico('cloud') + (k === 'syncing' ? 'Sincronizando' : k === 'error' ? 'Error' : 'Sincronizado') + (S.last && k !== 'syncing' ? ' · ' + esc(fmtTime(S.last)) : '') + '</div>'
        + (S.msg ? '<div class="acct-err">' + esc(S.msg) + '</div>' : '')
        + '<button type="button" class="acct-l" data-a="sync">' + ico('cloud') + 'Sincronizar</button>'
        + (view === 'pw'
          ? '<form data-a="pw" style="border-top:1px solid var(--a-line);padding-top:8px"><input name="o" type="password" placeholder="Contraseña" aria-label="Contraseña actual" autocomplete="current-password" maxlength="128"><input name="n" type="password" placeholder="Nueva contraseña" aria-label="Nueva contraseña" autocomplete="new-password" maxlength="128"><div class="acct-acts"><button type="submit" class="acct-b pri">Guardar</button></div></form>'
          : '<button type="button" class="acct-l" data-a="pwv">' + ico('key') + 'Cambiar contraseña</button>')
        + (admin ? '<a class="acct-l" href="' + esc(BASE + 'cuenta/index.html') + '">' + ico('shield') + 'Usuarios</a>' : '')
        + '<button type="button" class="acct-l" data-a="reset">' + ico('history') + 'Empezar de cero</button>'
        + '<button type="button" class="acct-l" data-a="out">' + ico('logout') + 'Salir</button>';
    }
    pop.innerHTML = h;
  }

  document.addEventListener('submit', function (e) {
    var f = e.target; if (!pop || !f || !pop.contains(f)) return;
    e.preventDefault();
    var a = f.getAttribute('data-a');
    if (a === 'form') doAuth('login', f);
    else if (a === 'pw') doPw(f);
  });
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-a]') : null;
    if (!t || !pop || !pop.contains(t)) return;
    var a = t.getAttribute('data-a');
    if (a === 'reg') doAuth('register', pop.querySelector('form'));
    else if (a === 'out') { signOut(); }
    else if (a === 'reset') doReset();
    else if (a === 'sync') { backoffUntil = 0; sync('manual'); }
    else if (a === 'pwv') { view = 'pw'; S.msg = ''; render(); place(); var i = pop.querySelector('input'); if (i) i.focus(); }
  });
  function setBusy(f, b) { [].forEach.call(f.querySelectorAll('button'), function (x) { x.disabled = b; }); }
  function doAuth(kind, f) {
    if (!f) return;
    var u = (f.elements.u.value || '').trim().toLowerCase(), p = f.elements.p.value || '';
    if (!/^[a-z0-9_.\-]{3,32}$/.test(u) || p.length < 8 || p.length > 128) { S.msg = 'Usuario o contraseña no válidos'; render(); place(); return; }
    S.msg = ''; setBusy(f, true);
    auth(kind, u, p).then(function (err) { S.msg = err; ui(); if (open) { render(); place(); } });
  }
  function doPw(f) {
    var o = f.elements.o.value || '', n = f.elements.n.value || '';
    if (n.length < 8 || n.length > 128 || !o) { S.msg = 'Usuario o contraseña no válidos'; render(); place(); return; }
    setBusy(f, true);
    api('POST', '/auth/password', { old: o, new: n }, { timeout: 60000 }).then(function (r) {
      if (r.status === 204 || r.status === 200) { S.msg = ''; view = ''; } else if (r.status === 401) { S.msg = 'Datos incorrectos'; } else if (r.status === 429) { S.msg = 'Demasiados intentos'; } else S.msg = 'Error';
      render(); place();
    }, function () { S.msg = 'Sin conexión'; render(); place(); });
  }

  /* ---------- pagina de administracion (cuenta/index.html) ---------- */
  var adminBox = null, adminData = null, adminLoading = false, adminView = null;
  function fmtDate(v) {
    if (!v) return '';
    try { var n = typeof v === 'number' ? (v < 1e12 ? v * 1000 : v) : Date.parse(v); if (!n) return String(v); var d = new Date(n); return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return String(v); }
  }
  function fmtSize(b) { b = +b || 0; return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b >= 1024 ? Math.round(b / 1024) + ' KB' : b + ' B'; }
  function renderAdmin() {
    adminBox = document.querySelector('[data-acct-admin]');
    if (!adminBox) return;
    adminBox.classList.add('acct-root', 'acct-admin');
    if (!mounted) return;
    if (!token || S.role !== 'admin') { adminBox.innerHTML = '<p>Solo administración</p>'; return; }
    if (S.net !== 'ok') { adminBox.innerHTML = '<p>' + (S.net === 'down' ? 'Sin conexión' : 'Conectando') + '</p>'; return; }
    if (!adminData && !adminLoading) loadAdmin();
    if (!adminData) { adminBox.innerHTML = '<p class="acct-mut">Conectando</p>'; return; }
    var rows = adminData.map(function (u) {
      return '<tr><td>' + esc(u.username) + '</td><td>' + esc(u.role) + '</td><td>' + esc(fmtDate(u.last_login_at)) + '</td><td>' + esc(u.keys) + '</td><td>' + esc(fmtSize(u.bytes))
        + '</td><td class="act"><a href="#" data-ad="view" data-u="' + esc(u.username) + '">Ver datos</a> <a href="#" data-ad="del" data-u="' + esc(u.username) + '">Borrar</a></td></tr>';
    }).join('');
    adminBox.innerHTML = '<div class="tw"><table class="src"><tr><th>Usuario</th><th>Rol</th><th>Último acceso</th><th>Claves</th><th>Tamaño</th><th></th></tr>' + rows + '</table></div>'
      + (adminView ? '<h3>' + esc(adminView.u) + '</h3><pre>' + esc(adminView.text) + '</pre>' : '');
  }
  function loadAdmin() {
    adminLoading = true;
    api('GET', '/admin/users', null, { timeout: 60000 }).then(function (r) {
      adminLoading = false;
      if (r.status === 200 && Array.isArray(r.data)) { adminData = r.data; renderAdmin(); }
      else if (r.status === 401) unauthorized();
      else if (r.status === 403) { S.role = 'user'; renderAdmin(); }
      else if (adminBox) adminBox.innerHTML = '<p>Error</p>';
    }, function () { adminLoading = false; netDown(); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-ad]') : null;
    if (!t) return;
    e.preventDefault();
    var u = t.getAttribute('data-u'), a = t.getAttribute('data-ad');
    if (a === 'view') {
      api('GET', '/admin/users/' + encodeURIComponent(u) + '/data', null, { timeout: 60000 }).then(function (r) {
        adminView = { u: u, text: r.status === 200 ? JSON.stringify(r.data, null, 2) : 'Error' }; renderAdmin();
      }, function () { adminView = { u: u, text: 'Sin conexión' }; renderAdmin(); });
    } else if (a === 'del') {
      if (!window.confirm('Borrar ' + u + '?')) return;
      api('DELETE', '/admin/users/' + encodeURIComponent(u), null, { timeout: 60000 }).then(function (r) {
        if (r.status === 204 || r.status === 200) { adminData = null; adminView = null; renderAdmin(); }
      }, function () {});
    }
  });

  /* ---------- arranque ---------- */
  function start() {
    mount();
    health();
    setInterval(function () { if (document.visibilityState === 'visible' && token && S.net === 'ok') { backoffUntil = 0; sync('periodic'); } }, 300000);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
      else if (S.net === 'down' && Date.now() - lastHealth > 30000) { if (healthTimer) clearTimeout(healthTimer); health(); }
    });
    window.addEventListener('pagehide', flush);
    window.addEventListener('online', function () { if (S.net === 'down') { if (healthTimer) clearTimeout(healthTimer); health(); } });
  }
  window.__acct = { sync: sync, health: health, reset: doReset, state: function () { return { net: S.net, sync: S.sync, user: S.user, role: S.role, key: stateKey(), last: S.last }; }, isSynced: isSynced };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
