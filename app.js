/* Mi Enganche — control de pagos de enganche, abonos, parqueos y planos. Sin build: JS clásico. */
(function () {
  'use strict';
  var C = window.EngancheCalc, CFG = window.ENGANCHE_CONFIG || {};
  var $app = document.getElementById('app');
  var LS = 'enganche.v1', LS_THEME = 'enganche.theme';
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var ORB_URL = 'https://cdn.jsdelivr.net/npm/@yogesharc/thinking-orbs@0.1.1/dist/orb-core.js';
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var MAX_FILE = 20 * 1024 * 1024;
  var ACCENTS = [
    { k: 'teal', n: 'Turquesa', h: 174 }, { k: 'indigo', n: 'Índigo', h: 236 }, { k: 'rose', n: 'Rosa', h: 340 }, { k: 'amber', n: 'Ámbar', h: 32 },
    { k: 'emerald', n: 'Esmeralda', h: 146 }, { k: 'sky', n: 'Cielo', h: 204 }, { k: 'violet', n: 'Violeta', h: 268 }, { k: 'crimson', n: 'Rojo', h: 4 }
  ];
  var hueOf = function (k) { var a = ACCENTS.filter(function (x) { return x.k === k; })[0]; return a ? a.h : 174; };

  /* ---------- utilidades ---------- */
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var Q = function (n) { return 'Q ' + (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var uid = function () { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var fmtMonth = function (ym) { if (!ym) return '—'; var p = ym.split('-'); return MES[+p[1] - 1] + ' ' + p[0]; };
  var fmtDate = function (d) { if (!d) return ''; var p = d.split('-'); return +p[2] + ' ' + MES[+p[1] - 1] + ' ' + p[0]; };
  var yrs = function (m) { return !isFinite(m) ? 'nunca' : Math.floor(m / 12) + ' a ' + (m % 12) + ' m'; };
  var kb = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
  var toast = function (m) { var t = $('toast'); t.textContent = m; t.className = 'on'; clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = ''; }, 2600); };
  function $(id) { return document.getElementById(id); }
  var val = function (id) { var e = $(id); return e ? e.value : ''; };
  var numv = function (id) { return parseFloat(String(val(id)).replace(/,/g, '')) || 0; };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loadScript(src) {
    return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error('No se pudo cargar ' + src)); }; document.head.appendChild(s); });
  }
  // Selector de archivos: el <input> debe estar en el DOM, si no algunos teléfonos (iPhone) no avisan al elegir.
  function pickFile(accept, multiple, cb) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; inp.multiple = !!multiple;
    inp.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'; document.body.appendChild(inp);
    var done = function () { setTimeout(function () { inp.remove(); }, 60000); };
    inp.addEventListener('change', function () { if (inp.files && inp.files.length) cb(inp.files); inp.remove(); });
    inp.addEventListener('cancel', function () { inp.remove(); }); done(); inp.click();
  }
  var isPdf = function (f) { return f.type === 'application/pdf' || /\.pdf$/i.test(f.name); };
  var isImg = function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name); };
  window.addEventListener('error', function (e) { if (e && e.message && !/ResizeObserver/.test(e.message)) toast('Error: ' + e.message); });
  window.addEventListener('unhandledrejection', function (e) { var m = e.reason && (e.reason.message || e.reason); if (m) toast('Error: ' + m); });
  function ensurePdfjs() {
    return (window.pdfjsLib ? Promise.resolve() : loadScript(PDFJS + 'pdf.min.js')).then(function () { pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; });
  }

  /* ---------- tema claro / oscuro ---------- */
  var themePref = (function () { try { return localStorage.getItem(LS_THEME) || 'auto'; } catch (e) { return 'auto'; } })();
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var effTheme = function () { return themePref === 'auto' ? (mq && mq.matches ? 'dark' : 'light') : themePref; };
  function applyTheme(hue) {
    var h = document.documentElement;
    h.dataset.theme = effTheme();
    if (hue != null) h.style.setProperty('--h', hue);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = effTheme() === 'dark' ? '#0b1412' : '#0f766e';
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (themePref === 'auto') applyTheme(); });
  function setTheme(p) { themePref = p; try { localStorage.setItem(LS_THEME, p); } catch (e) { } applyTheme(); }
  var THEME_ICON = { auto: '🌓', light: '☀️', dark: '🌙' }, THEME_NAME = { auto: 'Automático', light: 'Claro', dark: 'Oscuro' };

  /* ---------- Thinking Orbs (con respaldo si no carga) ---------- */
  var orbLib = null;
  function mountOrbIn(el, opts) {
    if (!el) return function () { };
    var stopped = false, stop = function () { };
    el.innerHTML = '<div class="spin"></div>';
    (orbLib ? Promise.resolve(orbLib) : import(ORB_URL).then(function (m) { orbLib = m; return m; })).then(function (lib) {
      if (stopped || !document.body.contains(el)) return;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', opts.size); svg.setAttribute('height', opts.size); svg.style.color = 'currentColor';
      el.replaceChildren(svg);
      var o = lib.mountOrb(svg, opts); stop = function () { try { o.destroy(); } catch (e) { } };
    }).catch(function () { /* se queda el spinner CSS */ });
    return function () { stopped = true; stop(); };
  }
  var stopBusyOrb = function () { };
  function busy(msg) {
    var b = $('busy'); b.querySelector('p').textContent = msg || 'Un momento…'; b.classList.add('on');
    stopBusyOrb(); stopBusyOrb = mountOrbIn(b.querySelector('.bo'), { state: 'reasoning', size: 88, label: msg || 'Cargando' });
  }
  function unbusy() { $('busy').classList.remove('on'); stopBusyOrb(); stopBusyOrb = function () { }; }

  /* ---------- almacenamiento de proyectos ---------- */
  var store;
  var Local = {
    mode: 'local',
    load: function () { try { return Promise.resolve(JSON.parse(localStorage.getItem(LS) || '[]')); } catch (e) { return Promise.resolve([]); } },
    save: function (p) {
      var all = JSON.parse(localStorage.getItem(LS) || '[]'), i = all.findIndex(function (x) { return x.id === p.id; });
      if (i < 0) all.push(p); else all[i] = p;
      localStorage.setItem(LS, JSON.stringify(all)); return Promise.resolve();
    },
    remove: function (id) { var all = JSON.parse(localStorage.getItem(LS) || '[]').filter(function (x) { return x.id !== id; }); localStorage.setItem(LS, JSON.stringify(all)); return Promise.resolve(); }
  };
  var sb = null;
  var Remote = {
    mode: 'cloud',
    load: function () { return sb.from('projects').select('data').order('updated_at').then(function (r) { if (r.error) throw r.error; return r.data.map(function (x) { return x.data; }); }); },
    save: function (p) { return sb.from('projects').upsert({ id: p.id, data: p, updated_at: new Date().toISOString() }).then(function (r) { if (r.error) throw r.error; }); },
    remove: function (id) { return sb.from('projects').delete().eq('id', id).then(function (r) { if (r.error) throw r.error; }); }
  };

  /* ---------- almacenamiento de archivos (planos) ---------- */
  // Local: IndexedDB. Nube: Supabase Storage, bucket privado "planos", carpeta por usuario.
  var idb = null;
  function idbOpen() {
    if (idb) return idb;
    idb = new Promise(function (ok, bad) {
      var r = indexedDB.open('enganche-files', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('blobs'); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { bad(r.error); };
    });
    return idb;
  }
  function idbDo(mode, fn) {
    return idbOpen().then(function (db) {
      return new Promise(function (ok, bad) { var tx = db.transaction('blobs', mode), req = fn(tx.objectStore('blobs')); tx.oncomplete = function () { ok(req && req.result); }; tx.onerror = function () { bad(tx.error); }; });
    });
  }
  var Files = {
    put: function (id, blob) {
      if (store.mode === 'cloud') return sb.storage.from('planos').upload(S.user.id + '/' + id, blob, { contentType: blob.type || 'application/octet-stream', upsert: true }).then(function (r) { if (r.error) throw r.error; });
      return idbDo('readwrite', function (s) { return s.put(blob, id); });
    },
    get: function (id) {
      if (store.mode === 'cloud') return sb.storage.from('planos').download(S.user.id + '/' + id).then(function (r) { if (r.error) throw r.error; return r.data; });
      return idbDo('readonly', function (s) { return s.get(id); }).then(function (b) { if (!b) throw new Error('Archivo no encontrado en este dispositivo'); return b; });
    },
    del: function (id) {
      if (store.mode === 'cloud') return sb.storage.from('planos').remove([S.user.id + '/' + id]).then(function (r) { if (r.error) throw r.error; });
      return idbDo('readwrite', function (s) { return s.delete(id); });
    }
  };

  /* ---------- estado ---------- */
  var S = { projects: [], id: null, tab: 'resumen', user: null, editing: null, importDraft: null, sim: 0, anim: true, thumbs: {} };
  var cur = function () { return S.projects.filter(function (p) { return p.id === S.id; })[0] || null; };
  function persist(p) { return store.save(p).catch(function (e) { toast('No se pudo guardar: ' + (e.message || e)); }); }

  function newProject(d) {
    var used = S.projects.map(function (p) { return p.color; });
    var free = ACCENTS.filter(function (a) { return used.indexOf(a.k) < 0; })[0] || ACCENTS[S.projects.length % ACCENTS.length];
    return Object.assign({
      id: uid(), name: '', unit: '', size: null, price: 0, bank: '', engancheTotal: 0, enganchePct: 0, reserva: 0, months: 12, cuotaEnganche: 0,
      startMonth: C.curMonth(), rate: 7, years: 25, iusi: 0, seguro: 0, color: free.k, parkings: [], files: [], payments: [], createdAt: new Date().toISOString()
    }, d);
  }

  /* ---------- pantallas ---------- */
  var TABS = [['resumen', 'Resumen'], ['pagos', 'Pagos'], ['calendario', 'Calendario'], ['prestamo', 'Préstamo'], ['parqueos', 'Parqueos'], ['planos', 'Planos'], ['proyecto', 'Proyecto']];
  function render() {
    var p = S.needAuth ? null : cur();
    applyTheme(p ? hueOf(p.color) : (S.importDraft ? hueOf(S.importDraft.project.color) : 174));
    if (S.needAuth) return renderAuth();
    var body = p ? tabsHtml() + '<main><div class="wrap' + (S.anim ? ' enter' : '') + '" id="wrap">' + tabHtml(p) + '</div></main>' : '<main><div class="wrap enter" id="wrap">' + welcomeHtml() + '</div></main>';
    $app.innerHTML = headerHtml() + body;
    var h = document.querySelector('header.top'); if (h) document.documentElement.style.setProperty('--hh', h.offsetHeight + 'px');
    bind(); post();
  }
  // animaciones posteriores al render: escalonado, barras y contadores
  function post() {
    var w = $('wrap'); if (w && S.anim) {
      Array.prototype.forEach.call(w.children, function (c, i) { c.style.setProperty('--i', i); });
      Array.prototype.forEach.call(w.querySelectorAll('.grid'), function (g, gi) { Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', 3 + i + gi); }); });
    }
    Array.prototype.forEach.call($app.querySelectorAll('[data-w]'), function (b) { var v = b.dataset.w; if (S.anim && !reduced) { b.style.width = '0'; requestAnimationFrame(function () { requestAnimationFrame(function () { b.style.width = v + '%'; }); }); } else b.style.width = v + '%'; });
    if (S.anim && !reduced) Array.prototype.forEach.call($app.querySelectorAll('[data-cu]'), countUp);
    var orb = $('heroOrb'); if (orb) mountOrbIn(orb, { state: 'reasoning', size: 72, label: 'Mi Enganche' });
    var bo = $('brandOrb'); if (bo) mountOrbIn(bo, { state: 'base', size: 28, label: 'Mi Enganche' });
    S.anim = false;
  }
  function countUp(el) {
    var to = parseFloat(el.dataset.cu), kind = el.dataset.k, t0 = performance.now(), dur = 900;
    var fmt = function (v) { return kind === 'q' ? Q(v) : kind === 'p' ? v.toFixed(1) + '%' : String(Math.round(v)); };
    (function tick(t) { var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(tick); else el.textContent = fmt(to); })(t0);
  }
  var cq = function (v) { return '<span data-cu="' + (+v || 0) + '" data-k="q">' + Q(v) + '</span>'; };
  var cn = function (v) { return '<span data-cu="' + (+v || 0) + '" data-k="n">' + v + '</span>'; };

  var label = function (p) { return (p.name || 'Proyecto') + (p.unit ? ' · Apto ' + p.unit : ''); };
  function headerHtml() {
    var opts = S.projects.map(function (p) { return '<option value="' + p.id + '"' + (p.id === S.id ? ' selected' : '') + '>' + esc(label(p)) + '</option>'; }).join('');
    return '<div class="ambient" aria-hidden="true"><i></i><i></i><i></i></div><header class="top"><div class="wrap"><span class="brand"><span id="brandOrb"></span>Mi Enganche</span>' +
      (S.projects.length && !S.needAuth ? '<select id="sel" aria-label="Proyecto">' + opts + '</select>' : '') +
      '<button class="ibtn" data-a="theme" title="Tema: ' + THEME_NAME[themePref] + '" aria-label="Cambiar tema">' + THEME_ICON[themePref] + '</button>' +
      '<button class="ibtn" data-a="new" aria-label="Nuevo proyecto">＋</button>' +
      (store.mode === 'cloud' ? '<button class="ibtn" data-a="logout">Salir</button>' : '') +
      '</div>' + (store.mode === 'cloud' && S.user ? '<div class="wrap who">' + esc(S.user.email) + '</div>' : '') + '</header>';
  }
  function tabsHtml() { return '<nav class="tabs"><div class="wrap">' + TABS.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div></nav>'; }
  function welcomeHtml() {
    return '<div class="card empty"><div class="heroorb" id="heroOrb"></div><h2>Empieza con tu cotización</h2><p class="muted">Sube el PDF de la cotización y la app toma el proyecto, el precio, los meses de enganche, la cuota y los datos del préstamo.</p>' +
      '<div class="actions" style="justify-content:center"><button class="btn" data-a="new">Subir cotización (PDF)</button></div></div>' +
      (store.mode === 'local' ? '<p class="muted" style="text-align:center">Modo local: tus datos se guardan solo en este dispositivo.</p>' : '');
  }
  function tabHtml(p) { var r = C.compute(p); return { resumen: tResumen, pagos: tPagos, calendario: tCalendario, prestamo: tPrestamo, parqueos: tParqueos, planos: tPlanos, proyecto: tProyecto }[S.tab](p, r); }
  function stat(l, v, sub, cls) { return '<div class="stat ' + (cls || '') + '"><small>' + l + '</small><b>' + v + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>'; }

  function tResumen(p, r) {
    var h = '';
    if (!p.price || !p.cuotaEnganche) h += '<div class="note">Faltan datos del proyecto (precio o cuota de enganche). Complétalos en la pestaña <b>Proyecto</b>.</div>';
    if (r.overpaid) h += '<div class="note">Has registrado ' + Q(r.overpaid) + ' más de lo que pide el enganche. Si fue un abono, muévelo a la columna “Abono”.</div>';
    h += '<div class="card"><h2>' + esc(label(p)) + '</h2><div class="muted">' + esc(p.bank) + (p.size ? ' · ' + p.size + ' m²' : '') + ' · Precio ' + Q(p.price) + '</div>' +
      '<div class="bar" aria-label="Avance del enganche"><i data-w="' + r.pctEng.toFixed(1) + '"></i></div>' +
      '<div class="kv"><span>Enganche pagado</span><b>' + cq(r.paidEng) + ' de ' + Q(r.engTotal) + ' (<span data-cu="' + r.pctEng.toFixed(1) + '" data-k="p">' + r.pctEng.toFixed(1) + '%</span>)</b></div></div>';
    h += '<div class="grid">' +
      stat('Falta de enganche', cq(r.remEng), r.cuotasFaltan + ' cuota' + (r.cuotasFaltan === 1 ? '' : 's') + ' por pagar', 'hero') +
      stat('Cuotas pagadas', cn(r.cuotasPagadas) + ' / ' + r.months, 'meses llevas pagando', 'ok') +
      stat('Meses que faltan', cn(r.cuotasFaltan), r.next ? 'Próxima: ' + esc(r.next.label) + (r.next.month ? ' (' + fmtMonth(r.next.month) + ')' : '') : '¡Enganche completo!') +
      stat('Abonado', cq(r.abonos), 'a capital, aparte del enganche', 'abono') +
      stat('Cuota del préstamo', cq(r.totalNow), r.abonos ? 'antes ' + Q(r.totalOrig) + ' (con IUSI)' : 'incluye IUSI y seguro') +
      stat('A financiar', cq(r.financedNow), r.abonos ? 'antes ' + Q(r.financedOrig) : 'precio − enganche') +
      (r.parkTotal ? stat('Parqueos pagados', cq(r.parkPaid), 'de ' + Q(r.parkTotal) + (r.parkRem ? ' · falta ' + Q(r.parkRem) : ' · ¡completo!')) : '') + '</div>';
    return h;
  }

  function hasPark(p) { return (p.parkings || []).some(function (k) { return k.bought; }); }
  function tPagos(p, r) {
    var e = S.editing ? p.payments.filter(function (x) { return x.id === S.editing; })[0] : null, park = hasPark(p);
    var h = '<div class="card"><h2>' + (e ? 'Editar pago' : 'Registrar pago') + '</h2><div class="row">' +
      '<div><label>Fecha<input type="date" id="f_date" value="' + (e ? e.date : today()) + '"></label></div>' +
      '<div><label>Para el enganche (Q)<input type="number" inputmode="decimal" step="0.01" id="f_eng" value="' + (e && e.enganche ? e.enganche : '') + '" placeholder="0.00"></label></div>' +
      '<div><label>Abono extra (Q)<input type="number" inputmode="decimal" step="0.01" id="f_ab" value="' + (e && e.abono ? e.abono : '') + '" placeholder="0.00"></label></div>' +
      (park || (e && e.parqueo) ? '<div><label>Parqueo (Q)<input type="number" inputmode="decimal" step="0.01" id="f_park" value="' + (e && e.parqueo ? e.parqueo : '') + '" placeholder="0.00"></label></div>' : '') + '</div>' +
      '<label style="margin-top:10px">Nota (opcional)<input id="f_note" value="' + esc(e ? e.note : '') + '" placeholder="Ej. depósito BI, boleta 1234"></label>' +
      '<div class="chips"><span class="muted">Atajos:</span>' +
      (p.cuotaEnganche ? '<button class="chip" data-a="fill-cuota">Cuota ' + Q(p.cuotaEnganche) + '</button>' : '') +
      (p.reserva ? '<button class="chip" data-a="fill-reserva">Reserva ' + Q(p.reserva) + '</button>' : '') + '</div>' +
      '<p class="muted" style="margin:8px 0 0">Si depositaste de más (ej. cuota + Q500), pon la cuota en “enganche” y el excedente en “abono”.' + (park ? ' Lo de parqueos va aparte, en “Parqueo”.' : '') + '</p>' +
      '<div class="actions"><button class="btn" data-a="save-pay">' + (e ? 'Guardar cambios' : 'Agregar pago') + '</button>' + (e ? '<button class="btn ghost" data-a="cancel-edit">Cancelar</button>' : '') + '</div></div>';

    if (!e) h += '<div class="card"><details><summary>Registrar varios meses de una vez</summary>' +
      '<p class="muted">Útil si ya llevas meses pagando. Crea un pago por mes con el mismo monto.</p><div class="row">' +
      '<div><label>Primer mes<input type="month" id="b_start" value="' + (p.startMonth || C.curMonth()) + '"></label></div>' +
      '<div><label>Cantidad de meses<input type="number" inputmode="numeric" min="1" max="120" id="b_n" value="' + Math.max(1, r.cuotasPagadas || 3) + '"></label></div>' +
      '<div><label>Enganche por mes (Q)<input type="number" inputmode="decimal" step="0.01" id="b_eng" value="' + (p.cuotaEnganche || '') + '"></label></div>' +
      '<div><label>Abono por mes (Q)<input type="number" inputmode="decimal" step="0.01" id="b_ab" value=""></label></div></div>' +
      (p.reserva ? '<label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="b_res" style="width:auto;min-height:0;margin:0" ' + (r.paidEng < p.reserva ? 'checked' : '') + '> Incluir la reserva (' + Q(p.reserva) + ') como primer pago</label>' : '') +
      '<div class="actions"><button class="btn sec" data-a="save-batch">Agregar todos</button></div></details></div>';

    h += '<div class="card"><h2>Historial (' + r.payments.length + ')</h2>';
    var anyPark = r.payments.some(function (x) { return x.parqueo; });
    if (!r.payments.length) h += '<p class="muted">Aún no hay pagos registrados.</p>';
    else h += '<div class="tbl-wrap"><table class="table"><thead><tr><th>Fecha</th><th class="n">Enganche</th><th class="n">Abono</th>' + (anyPark ? '<th class="n">Parqueo</th>' : '') + '<th class="hide-s">Nota</th><th></th></tr></thead><tbody>' +
      r.payments.slice().reverse().map(function (x) {
        return '<tr><td>' + fmtDate(x.date) + '</td><td class="n">' + (x.enganche ? Q(x.enganche) : '—') + '</td><td class="n ab">' + (x.abono ? Q(x.abono) : '—') + '</td>' + (anyPark ? '<td class="n">' + (x.parqueo ? Q(x.parqueo) : '—') + '</td>' : '') + '<td class="hide-s muted">' + esc(x.note) + '</td>' +
          '<td class="n"><button class="btn ghost sm" data-a="edit" data-id="' + x.id + '">Editar</button> <button class="btn danger sm" data-a="del-pay" data-id="' + x.id + '">✕</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="kv" style="margin-top:8px"><span>Total enganche</span><b>' + Q(r.paidEng) + '</b></div><div class="kv"><span>Total abonos</span><b class="ab">' + Q(r.abonos) + '</b></div>' +
      (anyPark ? '<div class="kv"><span>Total parqueos</span><b>' + Q(r.parkPaid) + '</b></div>' : '');
    return h + '</div>';
  }

  function tCalendario(p, r) {
    if (!r.schedule.length) return '<div class="card"><p class="muted">Define los meses de enganche y la cuota en la pestaña Proyecto.</p></div>';
    return '<div class="card"><h2>Plan de enganche</h2><p class="muted">Cada depósito de enganche se aplica en orden: reserva y luego cada cuota. Los abonos y parqueos no cuentan aquí.</p><div class="tbl-wrap"><table class="table"><thead><tr><th>Concepto</th><th class="hide-s">Mes</th><th class="n">Monto</th><th class="n">Pagado</th><th>Estado</th></tr></thead><tbody>' +
      r.schedule.map(function (s) { return '<tr><td>' + esc(s.label) + '</td><td class="hide-s">' + fmtMonth(s.month) + '</td><td class="n">' + Q(s.amount) + '</td><td class="n">' + Q(s.paid) + '</td><td><span class="badge b-' + s.status + '">' + s.status + '</span></td></tr>'; }).join('') + '</tbody></table></div></div>';
  }

  function tPrestamo(p, r) {
    var extra = S.sim, fn = C.pmt(Math.max(0, r.financedNow - extra), p.rate, p.years) + r.fixed;
    var h = '<div class="card"><h2>Cuota proyectada del préstamo</h2>' +
      '<div class="kv"><span>Precio de la propiedad</span><b>' + Q(p.price) + '</b></div><div class="kv"><span>Enganche total</span><b>' + Q(r.engTotal) + '</b></div>' +
      '<div class="kv"><span>Monto a financiar (cotización)</span><b>' + Q(r.financedOrig) + '</b></div><div class="kv"><span>Abonos a capital</span><b class="ab">− ' + Q(r.abonos) + '</b></div>' +
      '<div class="kv"><span>Monto a financiar hoy</span><b>' + Q(r.financedNow) + '</b></div><div class="kv"><span>Tasa / plazo</span><b>' + (+p.rate || 0) + '% · ' + (+p.years || 0) + ' años</b></div>' +
      (r.parkTotal ? '<p class="muted" style="margin:8px 0 0">Los parqueos (' + Q(r.parkTotal) + ') se pagan aparte y no entran al préstamo.</p>' : '') + '</div>';
    h += '<div class="grid">' + stat('Cuota nivelada', cq(r.pmtNow), r.abonos ? 'antes ' + Q(r.pmtOrig) : 'capital + interés') + stat('IUSI + seguro', Q(r.fixed), 'mensual') +
      stat('Cuota mensual total', cq(r.totalNow), r.abonos ? 'ahorras ' + Q(r.totalOrig - r.totalNow) + ' al mes' : '', 'hero') +
      stat('Si mantienes la cuota original', yrs(r.termMonthsKeep), r.abonos ? 'en vez de ' + yrs(r.termMonthsOrig) : 'plazo total', 'abono') + '</div>';
    h += '<div class="card"><h2>¿Y si abono más?</h2><label>Abono adicional simulado (Q)<input type="number" inputmode="decimal" id="sim" value="' + (extra || '') + '" placeholder="0.00"></label>' +
      '<div class="kv"><span>Cuota total con ese abono</span><b>' + Q(fn) + '</b></div><div class="kv"><span>Diferencia contra hoy</span><b>' + Q(fn - r.totalNow) + '</b></div></div>';
    if (p.mantenimiento) h += '<p class="muted">Aparte del banco pagarás mantenimiento aproximado de ' + Q(p.mantenimiento) + ' al mes.</p>';
    if (p.cuotaCredito) h += '<p class="muted">Cotización original: ' + (p.cuotaNivelada ? 'cuota nivelada ' + Q(p.cuotaNivelada) + ' · ' : '') + 'cuota mensual de crédito ' + Q(p.cuotaCredito) + '.</p>';
    return h;
  }

  /* ---------- parqueos ---------- */
  function tParqueos(p, r) {
    var list = p.parkings || [];
    var h = '<div class="card"><h2>Parqueos</h2><p class="muted">Los parqueos que se compran aparte se pagan por separado y no cuentan para el enganche ni para el préstamo. Si la cotización ya los incluye en el precio, aparecen como “incluidos”.</p>';
    if (!list.length) h += '<p class="muted">Aún no has agregado parqueos. Puedes registrar uno que estés cotizando y marcarlo como comprado cuando lo decidas.</p>';
    h += list.map(function (k) {
      return '<div class="park"><div class="nm">' + esc(k.name) + '<small>' + Q(k.price) + (k.financed ? ' · incluido en el precio (se financia)' : k.bought ? ' · comprado, se paga aparte' : ' · solo cotizado') + '</small></div>' +
        (k.financed ? '' : '<button class="btn ' + (k.bought ? 'sec' : 'ghost') + ' sm" data-a="toggle-park" data-id="' + k.id + '">' + (k.bought ? '✓ Comprado' : 'Marcar comprado') + '</button>') +
        '<button class="btn danger sm" data-a="del-park" data-id="' + k.id + '" aria-label="Quitar">✕</button></div>';
    }).join('') + '</div>';
    h += '<div class="card"><h2>Agregar parqueo</h2><div class="row"><div><label>Nombre<input id="k_name" placeholder="Ej. Parqueo de carro"></label></div>' +
      '<div><label>Precio (Q)<input id="k_price" type="number" inputmode="decimal" step="0.01" placeholder="0.00"></label></div></div>' +
      '<div class="chips"><button class="chip" data-a="k-chip" data-v="Parqueo de carro">Carro</button><button class="chip" data-a="k-chip" data-v="Parqueo de moto">Moto</button></div>' +
      '<label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="k_bought" style="width:auto;min-height:0;margin:0" checked> Ya lo compré (se paga aparte)</label>' +
      '<label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="k_fin" style="width:auto;min-height:0;margin:0"> Va incluido en el precio y el préstamo (no se paga aparte)</label>' +
      '<div class="actions"><button class="btn" data-a="add-park">Agregar</button></div></div>';
    if (r.parkTotal) h += '<div class="grid">' + stat('Total comprado', cq(r.parkTotal), 'precio de los parqueos') + stat('Pagado', cq(r.parkPaid), '', 'ok') + stat('Falta', cq(r.parkRem), 'por pagar', 'hero') + '</div>' +
      '<div class="card"><div class="bar"><i data-w="' + r.parkPct.toFixed(1) + '"></i></div><p class="muted" style="margin:0">Registra estos pagos en la pestaña Pagos, en el campo “Parqueo”.</p></div>';
    return h;
  }

  /* ---------- planos ---------- */
  function tPlanos(p) {
    var f = p.files || [];
    var h = '<div class="card"><h2>Planos y documentos</h2><div class="drop" id="drop" data-a="upload">📐 Toca para subir planos (PDF o imagen)<br><small class="muted">También puedes arrastrarlos aquí · máx. 20 MB c/u</small></div>' +
      (store.mode === 'local' ? '<p class="muted" style="margin:10px 0 0">Se guardan en este dispositivo. Con cuenta en la nube estarán en todos tus dispositivos.</p>' : '') + '</div>';
    if (!f.length) return h + '<div class="card empty"><p class="muted">Aún no hay planos guardados.</p></div>';
    h += '<div class="plans">' + f.map(function (x) {
      var t = S.thumbs[x.id]; if (t === 'pending') t = null;
      return '<div class="plan" data-a="view" data-id="' + x.id + '"><div class="th" data-th="' + x.id + '">' + (t ? '<img alt="" src="' + t + '">' : (x.type === 'application/pdf' ? 'PDF' : '🖼')) + '</div>' +
        '<div class="meta"><b>' + esc(x.name) + '</b><span class="muted">' + kb(x.size) + ' · ' + fmtDate(x.date) + '</span></div>' +
        '<button class="btn danger sm x" data-a="del-file" data-id="' + x.id + '" aria-label="Eliminar">✕</button></div>';
    }).join('') + '</div>';
    setTimeout(fillThumbs, 0);
    return h;
  }
  function fillThumbs() {
    var p = cur(); if (!p || S.tab !== 'planos') return;
    (p.files || []).forEach(function (x) {
      if (S.thumbs[x.id]) return;
      S.thumbs[x.id] = 'pending';
      Files.get(x.id).then(function (blob) {
        if (x.type === 'application/pdf') return renderPdfThumb(blob);
        return makeImgThumb(blob);
      }).then(function (url) { S.thumbs[x.id] = url; var el = document.querySelector('[data-th="' + x.id + '"]'); if (el) el.innerHTML = '<img alt="" src="' + url + '">'; })
        .catch(function () { delete S.thumbs[x.id]; });
    });
  }
  function renderPdfThumb(blob) {
    return ensurePdfjs().then(function () { return blob.arrayBuffer(); }).then(function (b) { return pdfjsLib.getDocument({ data: b }).promise; })
      .then(function (pdf) { return pdf.getPage(1); }).then(function (pg) {
        var v0 = pg.getViewport({ scale: 1 }), sc = 360 / v0.width, v = pg.getViewport({ scale: sc }), cv = document.createElement('canvas');
        cv.width = v.width; cv.height = v.height; var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        return pg.render({ canvasContext: ctx, viewport: v }).promise.then(function () { return cv.toDataURL('image/jpeg', .8); });
      });
  }
  function makeImgThumb(blob) {
    return new Promise(function (ok, bad) {
      var u = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { var sc = Math.min(1, 360 / im.width), cv = document.createElement('canvas'); cv.width = im.width * sc; cv.height = im.height * sc; cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); ok(cv.toDataURL('image/jpeg', .8)); };
      im.onerror = function () { URL.revokeObjectURL(u); bad(new Error('img')); }; im.src = u;
    });
  }
  function uploadFiles(list) {
    var p = cur(); if (!p || !list.length) return;
    var arr = Array.prototype.slice.call(list).filter(function (f) {
      var ok = isPdf(f) || isImg(f);
      if (!ok) toast('“' + f.name + '” no es PDF ni imagen'); else if (f.size > MAX_FILE) { toast('“' + f.name + '” pesa más de 20 MB'); ok = false; }
      return ok;
    });
    if (!arr.length) return;
    busy('Guardando planos…');
    p.files = p.files || [];
    arr.reduce(function (pr, f) {
      return pr.then(function () { var id = uid(); return Files.put(id, f).then(function () { p.files.push({ id: id, name: f.name, type: isPdf(f) ? 'application/pdf' : (f.type || 'image/jpeg'), size: f.size, date: today() }); }); });
    }, Promise.resolve()).then(function () { return store.save(p); })
      .then(function () { unbusy(); toast(arr.length + ' archivo(s) guardado(s)'); render(); })
      .catch(function (e) { unbusy(); toast('No se pudo guardar: ' + (e.message || e)); render(); });
  }
  function pickFiles() { pickFile('application/pdf,image/*,.pdf', true, uploadFiles); }

  var V = null; // visor
  function openViewer(fid) {
    var p = cur(), f = (p.files || []).filter(function (x) { return x.id === fid; })[0]; if (!f) return;
    busy('Abriendo plano…');
    Files.get(fid).then(function (blob) {
      unbusy(); V = { f: f, blob: blob, z: 1, tok: 0 };
      var d = document.createElement('div'); d.className = 'viewer'; d.id = 'viewer';
      d.innerHTML = '<div class="vh"><b>' + esc(f.name) + '</b><button class="ibtn" data-v="out" aria-label="Alejar">−</button><button class="ibtn" data-v="in" aria-label="Acercar">＋</button>' +
        '<button class="ibtn" data-v="dl" aria-label="Descargar">⬇</button><button class="ibtn" data-v="x" aria-label="Cerrar">✕</button></div><div class="vb" id="vb"></div>';
      document.body.appendChild(d); document.body.style.overflow = 'hidden';
      d.onclick = function (e) { var a = e.target.closest && e.target.closest('[data-v]'); if (!a) return; var k = a.dataset.v;
        if (k === 'x') closeViewer(); else if (k === 'in') { V.z = Math.min(5, V.z * 1.35); drawViewer(); } else if (k === 'out') { V.z = Math.max(.5, V.z / 1.35); drawViewer(); }
        else if (k === 'dl') { var l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = f.name; l.click(); } };
      drawViewer();
    }).catch(function (e) { unbusy(); toast('No se pudo abrir: ' + (e.message || e)); });
  }
  function closeViewer() { var d = $('viewer'); if (d) d.remove(); document.body.style.overflow = ''; V = null; }
  function drawViewer() {
    var vb = $('vb'); if (!vb || !V) return; var tok = ++V.tok, w = Math.max(280, (vb.clientWidth - 16)) * V.z;
    if (V.f.type !== 'application/pdf') {
      if (!V.url) V.url = URL.createObjectURL(V.blob);
      vb.innerHTML = '<img alt="" style="width:' + w + 'px;height:auto" src="' + V.url + '">'; return;
    }
    vb.innerHTML = '<div class="spin" style="margin:30px auto"></div>';
    ensurePdfjs().then(function () { return V.pdf || V.blob.arrayBuffer().then(function (b) { return (V.pdf = pdfjsLib.getDocument({ data: b }).promise); }); }).then(function (pdf) {
      var dpr = Math.min(2, window.devicePixelRatio || 1), n = pdf.numPages, i = 1, first = true;
      (function next() {
        if (!V || tok !== V.tok || i > n) return;
        pdf.getPage(i).then(function (pg) {
          if (!V || tok !== V.tok) return;
          var v0 = pg.getViewport({ scale: 1 }), sc = Math.min(w * dpr, 4200) / v0.width, v = pg.getViewport({ scale: sc }), cv = document.createElement('canvas');
          cv.width = v.width; cv.height = v.height; cv.style.width = (v.width / dpr) + 'px'; cv.style.height = (v.height / dpr) + 'px';
          return pg.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise.then(function () {
            if (!V || tok !== V.tok) return;
            if (first) { vb.replaceChildren(); first = false; }
            vb.appendChild(cv); i++; next();
          });
        });
      })();
    }).catch(function (e) { vb.textContent = 'No se pudo mostrar el PDF: ' + (e.message || e); });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && V) closeViewer(); });

  /* ---------- formularios del proyecto ---------- */
  function field(id, l, v, type) { return '<div><label>' + l + '<input id="' + id + '" type="' + (type || 'text') + '"' + (type === 'number' ? ' inputmode="decimal" step="any"' : '') + ' value="' + esc(v == null ? '' : v) + '"></label></div>'; }
  function formFields(p, pre) {
    return '<div class="row">' + field(pre + 'name', 'Proyecto', p.name) + field(pre + 'unit', 'Apartamento', p.unit) + field(pre + 'bank', 'Banco', p.bank) + '</div>' +
      '<div class="row" style="margin-top:10px">' + field(pre + 'price', 'Precio total (Q)', p.price, 'number') + field(pre + 'eng', 'Enganche total (Q)', p.engancheTotal, 'number') + field(pre + 'reserva', 'Reserva (Q)', p.reserva, 'number') + '</div>' +
      '<div class="row" style="margin-top:10px">' + field(pre + 'months', 'Meses a fraccionar', p.months, 'number') + field(pre + 'cuota', 'Cuota de enganche (Q)', p.cuotaEnganche, 'number') + field(pre + 'start', 'Mes de la 1.ª cuota', p.startMonth, 'month') + '</div>' +
      '<div class="row" style="margin-top:10px">' + field(pre + 'rate', 'Tasa anual (%)', p.rate, 'number') + field(pre + 'years', 'Plazo (años)', p.years, 'number') + field(pre + 'iusi', 'IUSI mensual (Q)', p.iusi, 'number') + field(pre + 'seguro', 'Seguro mensual (Q)', p.seguro, 'number') + field(pre + 'mant', 'Mantenimiento mensual (Q)', p.mantenimiento, 'number') + '</div>' +
      '<label style="margin-top:12px">Color del proyecto</label><div class="swatches" id="' + pre + 'sw">' + ACCENTS.map(function (a) { return '<button type="button" class="sw' + (a.k === p.color ? ' on' : '') + '" style="--sh:' + a.h + '" data-a="color" data-v="' + a.k + '" data-pre="' + pre + '" title="' + a.n + '" aria-label="' + a.n + '"></button>'; }).join('') + '</div>';
  }
  function readForm(pre, base) {
    var o = Object.assign({}, base, {
      name: val(pre + 'name').trim(), unit: val(pre + 'unit').trim(), bank: val(pre + 'bank').trim(), price: numv(pre + 'price'), engancheTotal: numv(pre + 'eng'),
      reserva: numv(pre + 'reserva'), months: Math.round(numv(pre + 'months')), cuotaEnganche: numv(pre + 'cuota'), startMonth: val(pre + 'start') || C.curMonth(),
      rate: numv(pre + 'rate'), years: numv(pre + 'years'), iusi: numv(pre + 'iusi'), seguro: numv(pre + 'seguro'), mantenimiento: numv(pre + 'mant')
    });
    if (!o.engancheTotal) o.engancheTotal = C.r2(o.reserva + o.months * o.cuotaEnganche);
    o.enganchePct = o.price ? C.r2(o.engancheTotal / o.price * 100) : 0;
    return o;
  }
  function tProyecto(p) {
    return '<div class="card"><h2>Apariencia</h2><label>Tema</label><div class="seg" id="themeSeg">' +
      ['auto', 'light', 'dark'].map(function (k) { return '<button data-a="theme-set" data-v="' + k + '" class="' + (themePref === k ? 'on' : '') + '">' + THEME_ICON[k] + ' ' + THEME_NAME[k] + '</button>'; }).join('') + '</div>' +
      '<p class="muted" style="margin:8px 0 0">El color se elige por proyecto, abajo en “Datos del proyecto”.</p></div>' +
      '<div class="card"><h2>Datos del proyecto</h2>' + formFields(p, 'p_') + '<div class="actions"><button class="btn" data-a="save-proj">Guardar</button></div></div>' +
      '<div class="card"><h2>Cotización</h2><p class="muted">Sube otra cotización para reemplazar los datos de este proyecto. Tus pagos no se borran.</p><div class="actions"><button class="btn sec" data-a="import-update">Subir cotización (PDF)</button></div></div>' +
      '<div class="card"><h2>Respaldo y zona peligrosa</h2><p class="muted">El respaldo incluye proyectos y pagos; los planos no (quedan guardados aparte).</p><div class="actions"><button class="btn ghost" data-a="export">Descargar respaldo (JSON)</button><button class="btn ghost" data-a="restore">Restaurar respaldo</button><button class="btn danger" data-a="del-proj">Eliminar este proyecto</button></div></div>';
  }

  /* ---------- importación de cotización ---------- */
  // Tasa anual (%) que hace que la cuota nivelada de `principal` a `years` sea `payment` (búsqueda binaria).
  function estimateRate(principal, payment, years) {
    var lo = 0, hi = 30; if (C.pmt(principal, 0.0001, years) > payment) return 0;
    for (var i = 0; i < 40; i++) { var mid = (lo + hi) / 2; if (C.pmt(principal, mid, years) > payment) hi = mid; else lo = mid; }
    return Math.round(((lo + hi) / 2) * 100) / 100;
  }
  function pickPdf(cb) { pickFile('application/pdf,.pdf', false, function (fl) { cb(fl[0]); }); }
  function readPdf(file) {
    return ensurePdfjs().then(function () { return file.arrayBuffer(); }).then(function (buf) { return pdfjsLib.getDocument({ data: buf }).promise; })
      .then(function (pdf) { return pdf.getPage(1); }).then(function (pg) { return pg.getTextContent(); })
      .then(function (tc) { return window.parseQuote(tc.items.map(function (i) { return { s: i.str, x: i.transform[4], y: i.transform[5] }; }), { filename: file.name.replace(/^[0-9a-f]{8}-/, '') }); });
  }
  function startImport(updating) {
    pickPdf(function (file) {
      busy('Leyendo tu cotización…');
      readPdf(file).then(function (q) {
        unbusy();
        if (!q.price && !q.cuotaEnganche && !q.months) { toast('No pude leer datos de esa cotización. Llena el proyecto a mano.'); if (!updating) openDraft(newProject(), false); return; }
        var notes = [], rate = q.rate || 0;
        if (!rate && q.cuotaCredito && q.financed && q.years) { rate = estimateRate(q.financed, q.cuotaCredito, q.years); if (rate) notes.push('La cotización no trae la tasa de interés: la estimé en ' + rate + '% a partir de la cuota del banco (' + Q(q.cuotaCredito) + '). Corrígela si conoces la tasa real.'); }
        if (q.parking) notes.push('Esta cotización incluye ' + q.parking.name.toLowerCase() + ' (' + Q(q.parking.price) + ') dentro del precio final y del préstamo; lo dejé en Parqueos como “incluido”.');
        var patch = { name: q.name, unit: q.unit, size: q.size, price: q.price, bank: q.bank, engancheTotal: q.engancheTotal || 0, enganchePct: q.enganchePct || 0, reserva: q.reserva || 0, months: q.months || 0, cuotaEnganche: q.cuotaEnganche || 0, rate: rate, years: q.years || 0, iusi: q.iusi || 0, seguro: q.seguro || 0, mantenimiento: q.mantenimiento || 0, cuotaNivelada: q.cuotaNivelada || null, cuotaCredito: q.cuotaCredito || null };
        var parkAdd = q.parking ? { id: uid(), name: q.parking.name, price: q.parking.price, bought: true, financed: true } : null;
        if (updating) { var base = cur(); S.importDraft = { project: Object.assign({}, base, patch), isNew: false, notes: notes };
          if (parkAdd && !(base.parkings || []).some(function (k) { return k.name === parkAdd.name; })) S.importDraft.project.parkings = (base.parkings || []).concat([parkAdd]); }
        else { S.importDraft = { project: newProject(Object.assign(patch, { startMonth: C.addMonths((q.quoteDate || today()).slice(0, 7), 1), parkings: parkAdd ? [parkAdd] : [] })), isNew: true, notes: notes }; }
        showDraft(true);
      }).catch(function (e) { unbusy(); toast('Error al leer el PDF: ' + (e.message || e)); });
    });
  }
  function openDraft(p, fromPdf) { S.importDraft = { project: p, isNew: true }; showDraft(fromPdf); }
  function showDraft(fromPdf) {
    var d = S.importDraft; applyTheme(hueOf(d.project.color));
    $app.innerHTML = headerHtml() + '<main><div class="wrap enter" id="wrap"><div class="card"><h2>' + (fromPdf ? 'Revisa los datos de la cotización' : 'Nuevo proyecto') + '</h2>' +
      (d.notes || []).map(function (n) { return '<div class="note">' + esc(n) + '</div>'; }).join('') +
      (fromPdf ? '<p class="muted">Estos datos se leyeron del PDF. Corrige lo que haga falta y guarda. “Mes de la 1.ª cuota” es el mes en que empiezas a pagar las cuotas fraccionadas.</p>' : '') +
      formFields(d.project, 'd_') + '<div class="actions"><button class="btn" data-a="draft-save">Guardar</button><button class="btn ghost" data-a="draft-cancel">Cancelar</button>' +
      (!fromPdf ? '<button class="btn sec" data-a="draft-pdf">Mejor subir cotización PDF</button>' : '') + '</div></div></div></main>';
    S.anim = true; bind(); post();
  }

  /* ---------- autenticación (modo nube) ---------- */
  function renderAuth(msg) {
    applyTheme(174);
    $app.innerHTML = '<div class="ambient" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap"><div class="card auth"><div class="heroorb" id="heroOrb"></div><h2 style="text-align:center">Mi Enganche</h2><p class="muted" style="text-align:center">Entra para ver tus proyectos desde cualquier dispositivo.</p>' +
      '<label>Correo<input id="a_mail" type="email" autocomplete="email"></label><label style="margin-top:10px">Contraseña (mín. 6)<input id="a_pass" type="password" autocomplete="current-password"></label>' +
      (msg ? '<p class="note" style="margin-top:12px">' + esc(msg) + '</p>' : '') +
      '<div class="actions"><button class="btn" data-a="login">Entrar</button><button class="btn sec" data-a="signup">Crear cuenta</button></div></div></div>';
    bind(); post();
  }
  function authDo(kind) {
    var email = val('a_mail').trim(), password = val('a_pass');
    (kind === 'login' ? sb.auth.signInWithPassword({ email: email, password: password }) : sb.auth.signUp({ email: email, password: password })).then(function (r) {
      if (r.error) return renderAuth(r.error.message);
      if (!r.data.session) return renderAuth('Revisa tu correo para confirmar la cuenta y luego entra.');
      S.user = r.data.session.user; S.needAuth = false; boot();
    });
  }

  /* ---------- eventos ---------- */
  function bind() {
    var sel = $('sel'); if (sel) sel.onchange = function () { S.id = sel.value; S.editing = null; S.sim = 0; S.anim = true; render(); };
    var sim = $('sim'); if (sim) sim.oninput = function () { S.sim = numv('sim'); var pos = sim.selectionStart; render(); var n = $('sim'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } };
    Array.prototype.forEach.call($app.querySelectorAll('[data-tab]'), function (b) { b.onclick = function () { S.tab = b.dataset.tab; S.editing = null; S.anim = true; render(); window.scrollTo(0, 0); }; });
    Array.prototype.forEach.call($app.querySelectorAll('[data-a]'), function (b) { b.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); act(b.dataset.a, b.dataset.id, b); }; });
    var drop = $('drop');
    if (drop) {
      ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e) { uploadFiles(e.dataTransfer.files); });
    }
  }

  function act(a, id, el) {
    var p = cur();
    switch (a) {
      case 'new': startImport(false); break;
      case 'theme': setTheme({ auto: 'light', light: 'dark', dark: 'auto' }[themePref]); toast('Tema: ' + THEME_NAME[themePref]); render(); break;
      case 'theme-set': setTheme(el.dataset.v); render(); break;
      case 'color':
        var pre = el.dataset.pre; Array.prototype.forEach.call($(pre + 'sw').children, function (b) { b.classList.toggle('on', b === el); });
        if (pre === 'd_') { S.importDraft.project.color = el.dataset.v; } else { p.color = el.dataset.v; persist(p); }
        applyTheme(hueOf(el.dataset.v)); break;
      case 'logout': sb.auth.signOut().then(function () { S.user = null; S.projects = []; S.id = null; S.needAuth = true; render(); }); break;
      case 'login': case 'signup': authDo(a); break;
      case 'fill-cuota': $('f_eng').value = p.cuotaEnganche; break;
      case 'fill-reserva': $('f_eng').value = p.reserva; break;
      case 'save-pay':
        var eng = numv('f_eng'), ab = numv('f_ab'), pk = $('f_park') ? numv('f_park') : 0;
        if (!eng && !ab && !pk) return toast('Escribe un monto');
        var rec = { id: S.editing || uid(), date: val('f_date') || today(), enganche: eng, abono: ab, parqueo: pk, note: val('f_note').trim() };
        if (S.editing) p.payments = p.payments.map(function (x) { return x.id === S.editing ? rec : x; }); else p.payments.push(rec);
        S.editing = null; persist(p).then(function () { toast('Pago guardado'); render(); }); break;
      case 'edit': S.editing = id; render(); window.scrollTo(0, 0); break;
      case 'cancel-edit': S.editing = null; render(); break;
      case 'del-pay': if (confirm('¿Eliminar este pago?')) { p.payments = p.payments.filter(function (x) { return x.id !== id; }); persist(p).then(render); } break;
      case 'save-batch':
        var n = Math.round(numv('b_n')), be = numv('b_eng'), ba = numv('b_ab'), st = val('b_start');
        if (!st || n < 1 || (!be && !ba)) return toast('Revisa mes, cantidad y montos');
        if (n > 120) return toast('Máximo 120 meses');
        var res = $('b_res') && $('b_res').checked;
        if (res) p.payments.push({ id: uid(), date: st + '-01', enganche: p.reserva, abono: 0, note: 'Reserva' });
        for (var i = 0; i < n; i++) p.payments.push({ id: uid(), date: C.addMonths(st, i) + '-28', enganche: be, abono: ba, note: '' });
        persist(p).then(function () { toast((n + (res ? 1 : 0)) + ' pagos agregados'); render(); }); break;
      case 'k-chip': $('k_name').value = el.dataset.v; break;
      case 'add-park':
        var kn = val('k_name').trim(), kp = numv('k_price'); if (!kn) return toast('Ponle nombre al parqueo');
        p.parkings = p.parkings || []; p.parkings.push({ id: uid(), name: kn, price: kp, bought: $('k_bought').checked || $('k_fin').checked, financed: $('k_fin').checked });
        persist(p).then(function () { toast('Parqueo agregado'); render(); }); break;
      case 'toggle-park': p.parkings.forEach(function (k) { if (k.id === id) k.bought = !k.bought; }); persist(p).then(render); break;
      case 'del-park': if (confirm('¿Quitar este parqueo?')) { p.parkings = p.parkings.filter(function (k) { return k.id !== id; }); persist(p).then(render); } break;
      case 'upload': pickFiles(); break;
      case 'view': openViewer(id); break;
      case 'del-file':
        if (confirm('¿Eliminar este archivo?')) { Files.del(id).catch(function () { }).then(function () { p.files = p.files.filter(function (x) { return x.id !== id; }); delete S.thumbs[id]; return persist(p); }).then(render); } break;
      case 'save-proj': S.projects = S.projects.map(function (x) { return x.id === p.id ? readForm('p_', p) : x; }); persist(cur()).then(function () { toast('Proyecto guardado'); render(); }); break;
      case 'import-update': startImport(true); break;
      case 'del-proj':
        if (confirm('¿Eliminar "' + label(p) + '" y todos sus pagos y planos? No se puede deshacer.')) {
          Promise.all((p.files || []).map(function (f) { return Files.del(f.id).catch(function () { }); })).then(function () { return store.remove(p.id); }).then(function () { S.projects = S.projects.filter(function (x) { return x.id !== p.id; }); S.id = S.projects[0] ? S.projects[0].id : null; S.anim = true; render(); });
        } break;
      case 'draft-pdf': startImport(false); break;
      case 'draft-cancel': S.importDraft = null; S.anim = true; render(); break;
      case 'draft-save':
        var d = S.importDraft, np = readForm('d_', d.project);
        if (!np.name && !np.unit) return toast('Ponle nombre al proyecto');
        S.importDraft = null;
        if (d.isNew) S.projects.push(np); else S.projects = S.projects.map(function (x) { return x.id === np.id ? np : x; });
        S.id = np.id; S.tab = d.isNew ? 'pagos' : S.tab; S.anim = true;
        persist(np).then(function () { toast('Proyecto guardado'); render(); }); break;
      case 'export':
        var blob = new Blob([JSON.stringify(S.projects, null, 2)], { type: 'application/json' }), a2 = document.createElement('a');
        a2.href = URL.createObjectURL(blob); a2.download = 'mi-enganche-respaldo-' + today() + '.json'; a2.click(); break;
      case 'restore':
        pickFile('application/json,.json', false, function (fl) {
          fl[0].text().then(function (t) {
            var arr = JSON.parse(t); if (!Array.isArray(arr)) throw new Error('Formato inválido');
            arr = arr.filter(function (x) { return x && x.id && Array.isArray(x.payments); });
            return Promise.all(arr.map(function (x) { return store.save(x); })).then(function () {
              arr.forEach(function (x) { var i = S.projects.findIndex(function (y) { return y.id === x.id; }); if (i < 0) S.projects.push(x); else S.projects[i] = x; });
              if (!S.id && S.projects[0]) S.id = S.projects[0].id; toast(arr.length + ' proyecto(s) restaurados'); S.anim = true; render();
            });
          }).catch(function (e) { toast('Respaldo inválido: ' + e.message); });
        }); break;
    }
  }

  /* ---------- arranque ---------- */
  function boot() {
    busy('Cargando tus proyectos…');
    store.load().then(function (list) {
      unbusy(); S.projects = list; S.id = (list.filter(function (p) { return p.id === S.id; })[0] || list[0] || {}).id || null; S.anim = true; render();
    }).catch(function (e) { unbusy(); toast('No se pudieron cargar los datos: ' + (e.message || e)); render(); });
  }
  function init() {
    applyTheme();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(function () { });
    if (CFG.supabaseUrl && CFG.supabaseAnonKey) {
      busy('Conectando…');
      loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js').then(function () {
        sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey); store = Remote; return sb.auth.getSession();
      }).then(function (r) {
        unbusy(); if (r.data.session) { S.user = r.data.session.user; boot(); } else { S.needAuth = true; render(); }
      }).catch(function (e) { unbusy(); store = store || Local; $app.innerHTML = '<div class="wrap"><p class="note">No se pudo conectar con la nube: ' + esc(e.message) + '</p></div>'; });
    } else { store = Local; boot(); }
  }
  init();
})();
