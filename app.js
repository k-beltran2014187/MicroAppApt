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
    { k: 'gold', n: 'Oro', c1: '#b8903a', c2: '#f0d99a' }, { k: 'emerald', n: 'Esmeralda', c1: '#17936c', c2: '#8be8c6' },
    { k: 'sapphire', n: 'Zafiro', c1: '#3563d4', c2: '#b0c8ff' }, { k: 'ruby', n: 'Rubí', c1: '#b72f50', c2: '#f7a3b7' },
    { k: 'amethyst', n: 'Amatista', c1: '#7352d6', c2: '#cfbfff' }, { k: 'copper', n: 'Cobre', c1: '#b8602f', c2: '#f6bf9a' },
    { k: 'teal', n: 'Turquesa', c1: '#138f9b', c2: '#85e4ec' }, { k: 'platinum', n: 'Platino', c1: '#6f7b91', c2: '#dfe5ef' }
  ];
  var LEGACY = { indigo: 'sapphire', rose: 'ruby', amber: 'gold', sky: 'sapphire', violet: 'amethyst', crimson: 'ruby' };
  var accentOf = function (k) { return ACCENTS.some(function (a) { return a.k === k; }) ? k : (LEGACY[k] || 'gold'); };

  /* ---------- iconos (trazo fino) ---------- */
  var ICON = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>', download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>', check: '<path d="M5 12l5 5 9-10"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>', scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12h8"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', plan: '<path d="M3 3h18v18H3zM3 13h9M12 3v10M16 21v-8h5"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'
  };
  var ic = function (n) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>'; };

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
  function applyTheme(accent) {
    var h = document.documentElement;
    h.dataset.theme = effTheme();
    if (accent) { h.dataset.accent = accentOf(accent); try { localStorage.setItem('enganche.accent', h.dataset.accent); } catch (e) { } }
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = effTheme() === 'dark' ? '#090b10' : '#f6f4ef';
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (themePref === 'auto') applyTheme(); });
  function setTheme(p) { themePref = p; try { localStorage.setItem(LS_THEME, p); } catch (e) { } applyTheme(); }
  var THEME_ICON = { auto: ic('auto'), light: ic('sun'), dark: ic('moon') }, THEME_NAME = { auto: 'Automático', light: 'Claro', dark: 'Oscuro' };

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
      var r = indexedDB.open('enganche-files', 2);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs'); if (!d.objectStoreNames.contains('thumbs')) d.createObjectStore('thumbs'); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { bad(r.error); };
    });
    return idb;
  }
  function idbDo(mode, fn, storeName) {
    return idbOpen().then(function (db) {
      return new Promise(function (ok, bad) { var tx = db.transaction(storeName || 'blobs', mode), req = fn(tx.objectStore(storeName || 'blobs')); tx.oncomplete = function () { ok(req && req.result); }; tx.onerror = function () { bad(tx.error); }; });
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
      idbDo('readwrite', function (s) { return s.delete(id); }, 'thumbs').catch(function () { });
      return idbDo('readwrite', function (s) { return s.delete(id); });
    }
  };

  /* ---------- estado ---------- */
  var S = { projects: [], id: null, view: 'home', tab: 'resumen', user: null, editing: null, importDraft: null, sim: 0, anim: true, thumbs: {} };
  var cur = function () { return S.projects.filter(function (p) { return p.id === S.id; })[0] || null; };
  function persist(p) { return store.save(p).catch(function (e) { toast('No se pudo guardar: ' + (e.message || e)); }); }

  function newProject(d) {
    var used = S.projects.map(function (p) { return accentOf(p.color); });
    var free = ACCENTS.filter(function (a) { return used.indexOf(a.k) < 0; })[0] || ACCENTS[S.projects.length % ACCENTS.length];
    return Object.assign({
      id: uid(), name: '', unit: '', size: null, price: 0, bank: '', engancheTotal: 0, enganchePct: 0, reserva: 0, months: 12, cuotaEnganche: 0,
      startMonth: C.curMonth(), rate: 7, years: 25, iusi: 0, seguro: 0, color: free.k, parkings: [], files: [], payments: [], createdAt: new Date().toISOString()
    }, d);
  }

  /* ---------- pantallas ---------- */
  var TABS = [['resumen', 'Resumen'], ['pagos', 'Pagos'], ['calendario', 'Calendario'], ['prestamo', 'Préstamo'], ['parqueos', 'Parqueos'], ['planos', 'Planos'], ['proyecto', 'Proyecto']];
  // Navegación: 'home' (todos los proyectos) o 'project' (un proyecto). Soporta el botón atrás del teléfono.
  function go(view, id, tab) {
    S.view = view; if (id) S.id = id; if (tab) S.tab = tab; S.anim = true; S.editing = null; S.sim = 0;
    if (history.pushState && !S._pop) { try { history.pushState({ v: view, id: S.id }, ''); } catch (e) { } }
    render(); window.scrollTo(0, 0);
  }
  window.addEventListener('popstate', function (e) { var st = e.state || {}; S._pop = true; S.importDraft = null; S.view = st.v || 'home'; if (st.id) S.id = st.id; S.anim = true; render(); S._pop = false; });
  try { history.replaceState({ v: 'home' }, ''); } catch (e) { }

  function render() {
    var proj = S.view === 'project' && !S.needAuth ? cur() : null, p = proj;
    applyTheme(p ? p.color : (S.importDraft ? S.importDraft.project.color : 'gold'));
    if (S.needAuth) return renderAuth();
    var body = p ? tabsHtml() + '<main><div class="wrap' + (S.anim ? ' enter' : '') + '" id="wrap">' + tabHtml(p) + '</div></main>' : '<main><div class="wrap' + (S.anim ? ' enter' : '') + '" id="wrap">' + (S.projects.length ? homeHtml() : welcomeHtml()) + '</div></main>';
    $app.innerHTML = headerHtml() + body;
    var h = document.querySelector('header.top'); if (h) document.documentElement.style.setProperty('--hh', h.offsetHeight + 'px');
    bind(); post();
  }
  // animaciones posteriores al render: escalonado, anillo, segmentos, contadores e indicador de pestaña
  function post() {
    var w = $('wrap'), go = S.anim && !reduced;
    if (w && S.anim) {
      Array.prototype.forEach.call(w.children, function (c, i) { c.style.setProperty('--i', i); });
      Array.prototype.forEach.call(w.querySelectorAll('.grid'), function (g, gi) { Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', 3 + i + gi); }); });
    }
    Array.prototype.forEach.call($app.querySelectorAll('[data-w]'), function (b) { var v = b.dataset.w; if (go) { b.style.width = '0'; requestAnimationFrame(function () { requestAnimationFrame(function () { b.style.width = v + '%'; }); }); } else b.style.width = v + '%'; });
    Array.prototype.forEach.call($app.querySelectorAll('.ring .pg'), function (c) { if (go) requestAnimationFrame(function () { requestAnimationFrame(function () { c.style.strokeDashoffset = c.dataset.off; }); }); else { c.style.transition = 'none'; c.style.strokeDashoffset = c.dataset.off; } });
    Array.prototype.forEach.call($app.querySelectorAll('.path'), function (p) { if (go) requestAnimationFrame(function () { requestAnimationFrame(function () { p.classList.add('go'); }); }); else p.classList.add('go', 'noanim'); });
    if (go) Array.prototype.forEach.call($app.querySelectorAll('[data-cu]'), countUp);
    var orb = $('heroOrb'); if (orb) mountOrbIn(orb, { state: 'reasoning', size: 96, label: 'Mi Enganche' });
    placeInd(); S.anim = false;
  }
  function placeInd() {
    var nav = document.querySelector('nav.tabs'), n = nav && nav.querySelector('.on'), i = nav && nav.querySelector('.ind'); if (!n || !i) return;
    var l = n.offsetLeft, w = n.offsetWidth;
    if (S.ind && !reduced) { i.style.transition = 'none'; i.style.transform = 'translateX(' + S.ind.l + 'px)'; i.style.width = S.ind.w + 'px'; void i.offsetWidth; i.style.transition = ''; }
    i.style.transform = 'translateX(' + l + 'px)'; i.style.width = w + 'px'; S.ind = { l: l, w: w };
    nav.scrollLeft = Math.max(0, l - 24);
  }
  function countUp(el) {
    var to = parseFloat(el.dataset.cu), kind = el.dataset.k, t0 = performance.now(), dur = 1100;
    var fmt = function (v) { return kind === 'q' ? mh(v) : kind === 'p' ? v.toFixed(1) + '%' : String(Math.round(v)); };
    (function tick(t) { var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.innerHTML = fmt(to * e); if (k < 1) requestAnimationFrame(tick); else el.innerHTML = fmt(to); })(t0);
  }
  // dinero con tipografía cuidada: Q pequeña, centavos atenuados
  function mh(n) { var s = (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), i = s.lastIndexOf('.'); return '<span class="m"><span class="cur">Q</span>' + s.slice(0, i) + '<span class="cts">' + s.slice(i) + '</span></span>'; }
  var cq = function (v) { return '<span data-cu="' + (+v || 0) + '" data-k="q">' + mh(v) + '</span>'; };
  var cn = function (v) { return '<span data-cu="' + (+v || 0) + '" data-k="n">' + v + '</span>'; };

  var label = function (p) { return (p.name || 'Proyecto') + (p.unit ? ' · Apto ' + p.unit : ''); };
  // Insignia del proyecto: su logo si lo tiene; si no, una inicial elegante.
  function lg(p, size) {
    var ini = esc(((p.name || p.unit || '?').trim()[0] || '?').toUpperCase());
    var ar = +p.logoAr || 1, base = size === 'l' ? 68 : size === 'm' ? 50 : 40, w = p.logo && ar > 1.4 ? Math.min(Math.round(base * ar), base * 3) : 0;
    return '<span class="lg ' + (size || '') + (p.logo ? '' : ' mono') + (w ? ' wide' : '') + '"' + (w ? ' style="width:' + w + 'px"' : '') + '>' + (p.logo ? '<img alt="" src="' + p.logo + '">' : ini) + '</span>';
  }
  function headerHtml() {
    var p = S.view === 'project' && !S.needAuth && !S.importDraft ? cur() : null;
    var left = p
      ? '<button class="ibtn" data-a="home" title="Mis proyectos" aria-label="Mis proyectos">' + ic('grid') + '</button><span class="brand pbrand">' + lg(p) + '<span class="wm"><b>' + esc(p.name || 'Proyecto') + '</b>' + (p.unit ? '<small>Apto ' + esc(p.unit) + '</small>' : '') + '</span></span>'
      : '<span class="brand" data-a="home" style="cursor:pointer"><span class="mark">' + ic('home') + '</span><span class="wm">Mi Enganche</span></span>';
    return '<div class="ambient" aria-hidden="true"></div><header class="top"><div class="wrap">' + left +
      '<button class="ibtn" data-a="theme" title="Tema: ' + THEME_NAME[themePref] + '" aria-label="Cambiar tema">' + THEME_ICON[themePref] + '</button>' +
      '<button class="ibtn" data-a="new" title="Nuevo proyecto" aria-label="Nuevo proyecto">' + ic('plus') + '</button>' +
      (store.mode === 'cloud' ? '<button class="ibtn txt" data-a="logout">Salir</button>' : '') +
      '</div>' + (store.mode === 'cloud' && S.user ? '<div class="wrap who">' + esc(S.user.email) + '</div>' : '') + '</header>';
  }
  function tabsHtml() { return '<nav class="tabs"><div class="tabs-in">' + TABS.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '<i class="ind"></i></div></nav>'; }
  function welcomeHtml() {
    return '<div class="welcome"><div class="heroorb" id="heroOrb"></div><div class="eyebrow">Control de enganche</div><h1>Tu apartamento, siempre bajo control.</h1>' +
      '<p class="lead">Sube tu cotización y sigue cada cuota, abono y parqueo, con tus planos siempre a la mano.</p>' +
      '<button class="btn" data-a="new">' + ic('upload') + 'Subir cotización (PDF)</button>' +
      '<div class="feats"><div class="feat"><div class="fi">' + ic('scan') + '</div><b>Lee tu cotización</b><span>Toma precio, enganche, cuotas y plazo del PDF en segundos.</span></div>' +
      '<div class="feat"><div class="fi">' + ic('layers') + '</div><b>Enganche, abonos y parqueos</b><span>Cada pago en su lugar, con la cuota del préstamo siempre al día.</span></div>' +
      '<div class="feat"><div class="fi">' + ic('plan') + '</div><b>Planos a la mano</b><span>Guarda los planos de cada proyecto y ábrelos con zoom.</span></div></div>' +
      (store.mode === 'local' ? '<p class="muted" style="margin-top:22px">Modo local: tus datos se guardan solo en este dispositivo.</p>' : '') + '</div>';
  }
  function tabHtml(p) { var r = C.compute(p); return { resumen: tResumen, pagos: tPagos, calendario: tCalendario, prestamo: tPrestamo, parqueos: tParqueos, planos: tPlanos, proyecto: tProyecto }[S.tab](p, r); }
  function homeHtml() {
    var rs = S.projects.map(function (p) { return { p: p, r: C.compute(p) }; });
    var paid = rs.reduce(function (t, x) { return t + x.r.paidEng; }, 0), rem = rs.reduce(function (t, x) { return t + x.r.remEng; }, 0), ab = rs.reduce(function (t, x) { return t + x.r.abonos; }, 0);
    var h = '<div class="home-head"><div class="eyebrow">Mi portafolio</div><h1 class="hero-title">Mis proyectos</h1><p class="muted">' + rs.length + (rs.length === 1 ? ' apartamento en proceso' : ' apartamentos en proceso') + '</p></div>';
    if (rs.length > 1) h += '<div class="grid">' + stat('Pagado', cq(paid), 'en enganches, en total', 'hero') + stat('Falta', cq(rem), 'de enganche, en total') + stat('Abonado', cq(ab), 'a capital', 'abono') + '</div>';
    h += '<div class="pgrid">' + rs.map(function (x) {
      var p = x.p, r = x.r, nx = r.next;
      return '<button class="pcard" data-accent="' + accentOf(p.color) + '" data-a="open" data-id="' + p.id + '"><div class="pc-top">' + lg(p, 'm') + '<div class="pc-t"><b>' + esc(p.name || 'Proyecto') + '</b><span>' + esc([p.unit ? 'Apto ' + p.unit : '', p.bank].filter(Boolean).join(' · ')) + '</span></div><span class="pc-pct">' + Math.round(r.pctEng) + '<small>%</small></span></div>' +
        '<div class="bar"><i data-w="' + r.pctEng.toFixed(1) + '"></i></div>' +
        '<div class="pc-nums"><div><small>Pagado</small><b>' + mh(r.paidEng) + '</b></div><div><small>Falta</small><b>' + mh(r.remEng) + '</b></div></div>' +
        '<div class="pc-foot"><span>' + (nx ? ic('calendar') + ' ' + esc(nx.label) + (nx.month ? ' · ' + fmtMonth(nx.month) : '') : ic('check') + ' Enganche completo') + '</span><span>' + r.cuotasPagadas + '/' + r.months + ' cuotas</span></div></button>';
    }).join('') + '<button class="pcard add" data-a="new"><span class="pa-i">' + ic('plus') + '</span><b>Nuevo proyecto</b><span class="muted">Sube una cotización en PDF</span></button></div>';
    return h;
  }
  function stat(l, v, sub, cls) { return '<div class="stat ' + (cls || '') + '"><small>' + l + '</small><b>' + v + '</b>' + (sub ? '<span class="sub">' + sub + '</span>' : '') + '</div>'; }
  var RING = 439.82;
  function ringHtml(pct) {
    var off = RING * (1 - Math.min(100, pct) / 100);
    return '<div class="ring"><svg viewBox="0 0 160 160" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--a1b)"/><stop offset="1" style="stop-color:var(--a2)"/></linearGradient></defs>' +
      '<circle class="tr" cx="80" cy="80" r="70"/><circle class="pg" cx="80" cy="80" r="70" data-off="' + off.toFixed(2) + '" style="--off:' + off.toFixed(2) + '"/></svg>' +
      '<div class="ct"><b><span data-cu="' + pct.toFixed(1) + '" data-k="n">' + Math.round(pct) + '</span><sup>%</sup></b><span class="cap">del enganche</span></div></div>';
  }
  function pathHtml(r) {
    var segs = r.schedule.map(function (s, i) {
      var cls = s.status === 'pagada' ? 'on' : (s.paid > 0 ? 'part' : '');
      return '<i class="seg ' + (s.n ? '' : 'res ') + cls + '" style="--i:' + i + ';--p:' + (s.amount ? Math.min(1, s.paid / s.amount).toFixed(2) : 0) + '" title="' + esc(s.label) + '"></i>';
    }).join('');
    return '<div class="path" aria-label="Avance por cuota">' + segs + '</div><div class="path-cap"><span>' + (r.reserva ? 'Reserva + ' : '') + r.months + ' cuotas</span><span>' + r.cuotasPagadas + ' pagadas · ' + r.cuotasFaltan + ' por pagar</span></div>';
  }

  function tResumen(p, r) {
    var h = '';
    if (!p.price || !p.cuotaEnganche) h += '<div class="note">Faltan datos del proyecto (precio o cuota de enganche). Complétalos en la pestaña <b>Proyecto</b>.</div>';
    if (r.overpaid) h += '<div class="note">Has registrado ' + Q(r.overpaid) + ' más de lo que pide el enganche. Si fue un abono, muévelo a la columna “Abono”.</div>';
    var eyebrow = [p.unit ? 'Apto ' + p.unit : '', p.bank].filter(Boolean).join(' · ');
    h += '<section class="card hero"><div class="hero-grid"><div class="hero-text">' + (p.logo ? '<div class="hero-logo">' + lg(p, 'l') + '</div>' : '') + (eyebrow ? '<div class="eyebrow">' + esc(eyebrow) + '</div>' : '') +
      '<h1 class="hero-title">' + esc(p.name || 'Mi proyecto') + '</h1><div class="hero-meta">' + (p.size ? '<span>' + p.size + ' m²</span>' : '') + '<span>Precio ' + Q(p.price) + '</span></div>' +
      '<div class="kpis"><div class="kpi"><small>Pagado</small><b>' + cq(r.paidEng) + '</b></div><div class="kpi"><small>Falta</small><b>' + cq(r.remEng) + '</b></div><div class="kpi"><small>Enganche total</small><b>' + mh(r.engTotal) + '</b></div></div></div>' +
      ringHtml(r.pctEng) + '</div>' + (r.schedule.length ? pathHtml(r) : '') + '</section>';
    if (r.next) {
      var due = Math.max(0, r.next.amount - r.next.paid);
      h += '<div class="card next"><div class="ic">' + ic('calendar') + '</div><div class="tx"><b>Próximo pago · ' + esc(r.next.label) + '</b><span>' + (r.next.month ? fmtMonth(r.next.month) : 'Sin fecha definida') +
        (r.next.status === 'vencida' ? ' <span class="tag" style="background:rgba(240,112,127,.15);color:var(--bad)">Atrasada</span>' : '') + '</span></div><div class="am">' + Q(due) + '</div></div>';
    } else if (r.schedule.length) {
      h += '<div class="card next"><div class="ic">' + ic('check') + '</div><div class="tx"><b>Enganche completo</b><span>Ya pagaste todas las cuotas. ¡Felicidades!</span></div></div>';
    }
    h += '<div class="grid">' +
      stat('Cuotas pagadas', cn(r.cuotasPagadas) + '<small style="display:inline;font-size:.5em;letter-spacing:0;color:var(--mut);margin-left:6px;font-family:var(--sans)">de ' + r.months + '</small>', 'meses llevas pagando', 'ok') +
      stat('Meses que faltan', cn(r.cuotasFaltan), 'de enganche') +
      stat('Abonado', cq(r.abonos), 'a capital, aparte del enganche', 'abono') +
      stat('Cuota préstamo', cq(r.totalNow), r.abonos ? 'antes ' + Q(r.totalOrig) : 'incluye IUSI y seguro', 'hero') +
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
          '<td class="n"><button class="btn ghost sm" data-a="edit" data-id="' + x.id + '">Editar</button> <button class="btn danger sm" data-a="del-pay" data-id="' + x.id + '" aria-label="Eliminar">' + ic('x') + '</button></td></tr>';
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
        '<button class="btn danger sm" data-a="del-park" data-id="' + k.id + '" aria-label="Quitar">' + ic('x') + '</button></div>';
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
    var h = '<div class="card"><h2>Planos y documentos</h2><div class="drop" id="drop" data-a="upload"><div class="di">' + ic('upload') + '</div><b>Sube tus planos</b><small>PDF o imagen · también puedes arrastrarlos aquí · máx. 20 MB</small></div>' +
      (store.mode === 'local' ? '<p class="muted" style="margin:10px 0 0">Se guardan en este dispositivo. Con cuenta en la nube estarán en todos tus dispositivos.</p>' : '') + '</div>';
    if (!f.length) return h + '<div class="card empty"><p class="muted">Aún no hay planos guardados.</p></div>';
    h += '<div class="plans">' + f.map(function (x) {
      var t = S.thumbs[x.id]; if (t === 'pending') t = null;
      return '<div class="plan" data-a="view" data-id="' + x.id + '"><div class="th" data-th="' + x.id + '">' + (t ? '<img alt="" src="' + t + '">' : (x.type === 'application/pdf' ? 'PDF' : '🖼')) + '</div>' +
        '<div class="meta"><b>' + esc(x.name) + '</b><span class="muted">' + kb(x.size) + ' · ' + fmtDate(x.date) + '</span></div>' +
        '<button class="btn danger sm x" data-a="del-file" data-id="' + x.id + '" aria-label="Eliminar">' + ic('x') + '</button></div>';
    }).join('') + '</div>';
    setTimeout(fillThumbs, 0);
    return h;
  }
  function fillThumbs() {
    var p = cur(); if (!p || S.tab !== 'planos') return;
    (p.files || []).forEach(function (x) {
      if (S.thumbs[x.id]) return;
      S.thumbs[x.id] = 'pending';
      idbDo('readonly', function (s) { return s.get(x.id); }, 'thumbs').catch(function () { return null; }).then(function (cached) {
        if (cached) return cached;
        return Files.get(x.id).then(function (blob) { return x.type === 'application/pdf' ? renderPdfThumb(blob) : makeImgThumb(blob); })
          .then(function (url) { idbDo('readwrite', function (s) { return s.put(url, x.id); }, 'thumbs').catch(function () { }); return url; });
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
      d.innerHTML = '<div class="vh"><b>' + esc(f.name) + '</b><button class="ibtn" data-v="out" aria-label="Alejar">' + ic('minus') + '</button><button class="ibtn" data-v="in" aria-label="Acercar">' + ic('plus') + '</button>' +
        '<button class="ibtn" data-v="dl" aria-label="Descargar">' + ic('download') + '</button><button class="ibtn" data-v="x" aria-label="Cerrar">' + ic('x') + '</button></div><div class="vb" id="vb"></div>';
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
      '<label style="margin-top:14px">Color del proyecto</label><div class="swatches" id="' + pre + 'sw">' + ACCENTS.map(function (a) { return '<button type="button" class="sw' + (a.k === accentOf(p.color) ? ' on' : '') + '" style="--c1:' + a.c1 + ';--c2:' + a.c2 + '" data-a="color" data-v="' + a.k + '" data-pre="' + pre + '" title="' + a.n + '" aria-label="' + a.n + '"></button>'; }).join('') + '</div>';
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
    return '<div class="card"><h2>Logo del proyecto</h2><div class="logo-row">' + lg(p, 'l') + '<div><p class="muted" style="margin-bottom:10px">Aparece en el encabezado y en tu página de inicio.</p><div class="actions" style="margin-top:0"><button class="btn sec sm" data-a="logo-up">' + ic('upload') + ' Subir imagen</button>' + (p.logo ? '<button class="btn ghost sm" data-a="logo-del">Quitar</button>' : '') + '</div></div></div></div>' +
      '<div class="card"><h2>Apariencia</h2><label>Tema</label><div class="seg2" id="themeSeg">' +
      ['auto', 'light', 'dark'].map(function (k) { return '<button data-a="theme-set" data-v="' + k + '" class="' + (themePref === k ? 'on' : '') + '">' + THEME_ICON[k] + THEME_NAME[k] + '</button>'; }).join('') + '</div>' +
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
  // Imágenes de la primera página (con su posición) -> candidatos a logo, recortados de la página ya dibujada.
  function extractLogos(pg, nameBox) {
    var SC = 2.5, vp = pg.getViewport({ scale: 1 }), vpS = pg.getViewport({ scale: SC }), U = pdfjsLib.Util, OPS = pdfjsLib.OPS;
    return pg.getOperatorList().then(function (ol) {
      var m = [1, 0, 0, 1, 0, 0], st = [], boxes = [];
      for (var i = 0; i < ol.fnArray.length; i++) {
        var f = ol.fnArray[i], ar = ol.argsArray[i];
        if (f === OPS.save) st.push(m.slice()); else if (f === OPS.restore) m = st.pop() || m;
        else if (f === OPS.transform) m = U.transform(m, ar);
        else if (f === OPS.paintFormXObjectBegin) { st.push(m.slice()); if (ar && ar[0]) m = U.transform(m, ar[0]); }
        else if (f === OPS.paintFormXObjectEnd) m = st.pop() || m;
        else if (f === OPS.paintImageXObject || f === OPS.paintInlineImageXObject || f === OPS.paintJpegXObject) {
          var t = U.transform(vp.transform, m), xs = [], ys = [];
          [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (c) { xs.push(t[0] * c[0] + t[2] * c[1] + t[4]); ys.push(t[1] * c[0] + t[3] * c[1] + t[5]); });
          boxes.push({ x: Math.min.apply(0, xs), y: Math.min.apply(0, ys), w: Math.max.apply(0, xs) - Math.min.apply(0, xs), h: Math.max.apply(0, ys) - Math.min.apply(0, ys) });
        }
      }
      var pa = vp.width * vp.height;
      boxes = boxes.filter(function (b) { return b.w >= 30 && b.h >= 30 && b.w * b.h < pa * 0.5 && b.y < vp.height * 0.45; }).sort(function (p, q) { return p.y - q.y || p.x - q.x; }).slice(0, 4);
      if (!boxes.length) return [];
      var cv = document.createElement('canvas'); cv.width = vpS.width; cv.height = vpS.height;
      var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      return pg.render({ canvasContext: ctx, viewport: vpS }).promise.then(function () {
        return boxes.map(function (b) {
          var sx = Math.max(0, b.x * SC) + 2, sy = Math.max(0, b.y * SC) + 2, sw = Math.min(cv.width - sx, b.w * SC) - 4, sh = Math.min(cv.height - sy, b.h * SC) - 4;
          var k = Math.min(1, 380 / Math.max(sw, sh)), o = document.createElement('canvas'); o.width = Math.round(sw * k); o.height = Math.round(sh * k);
          var oc = o.getContext('2d'); oc.fillStyle = '#fff'; oc.fillRect(0, 0, o.width, o.height); oc.drawImage(cv, sx, sy, sw, sh, 0, 0, o.width, o.height);
          // ¿foto o logo? Las fotos tienen muchísimos colores distintos; los logos pocos.
          var s = oc.getImageData(0, 0, o.width, o.height).data, bins = {}, n = 0;
          for (var q = 0; q < s.length; q += 16) { var key = (s[q] >> 5) * 64 + (s[q + 1] >> 5) * 8 + (s[q + 2] >> 5); bins[key] = (bins[key] || 0) + 1; n++; }
          var distinct = Object.keys(bins).filter(function (z) { return bins[z] / n > 0.005; }).length;
          return { url: o.toDataURL(distinct > 28 ? 'image/jpeg' : 'image/png', .9), ar: o.width / o.height, cx: b.x + b.w / 2, cy: b.y + b.h / 2, area: b.w * b.h, photo: distinct > 28 };
        });
      });
    }).then(function (logos) {
      // mejor candidato: el logo más cercano a "APARTAMENTOS <NOMBRE>" si existe; si no, el logo más grande
      var good = logos.filter(function (l) { return !l.photo; }), best = null;
      if (good.length) best = nameBox ? good.slice().sort(function (p, q) { return Math.hypot(p.cx - nameBox.x, p.cy - nameBox.y) - Math.hypot(q.cx - nameBox.x, q.cy - nameBox.y); })[0] : good.slice().sort(function (p, q) { return q.area - p.area; })[0];
      return { list: logos, best: best ? logos.indexOf(best) : -1 };
    }).catch(function () { return { list: [], best: -1 }; });
  }
  function readPdf(file) {
    return ensurePdfjs().then(function () { return file.arrayBuffer(); }).then(function (buf) { return pdfjsLib.getDocument({ data: buf }).promise; })
      .then(function (pdf) { return pdf.getPage(1); }).then(function (pg) {
        return pg.getTextContent().then(function (tc) {
          var vp = pg.getViewport({ scale: 1 }), nb = null;
          tc.items.forEach(function (it) { if (/^\s*apartamentos?\s+\S/i.test(it.str)) { var t = pdfjsLib.Util.transform(vp.transform, it.transform); nb = { x: t[4] + it.width / 2, y: t[5] }; } });
          var q = window.parseQuote(tc.items.map(function (i) { return { s: i.str, x: i.transform[4], y: i.transform[5] }; }), { filename: file.name.replace(/^[0-9a-f]{8}-/, '') });
          return extractLogos(pg, nb).then(function (lg) { q._logos = lg; return q; });
        });
      });
  }
  // Imagen subida a mano -> logo pequeño (máx. 360 px) en data URL
  function fileToLogo(file) {
    return new Promise(function (ok, bad) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { var k = Math.min(1, 360 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok({ url: c.toDataURL(/jpe?g/i.test(file.type) ? 'image/jpeg' : 'image/png', .9), ar: c.width / c.height}); };
      im.onerror = function () { URL.revokeObjectURL(u); bad(new Error('imagen no válida')); }; im.src = u;
    });
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
        var lgs = q._logos || { list: [], best: -1 }; if (lgs.best >= 0) { patch.logo = lgs.list[lgs.best].url; patch.logoAr = lgs.list[lgs.best].ar; }
        var parkAdd = q.parking ? { id: uid(), name: q.parking.name, price: q.parking.price, bought: true, financed: true } : null;
        if (updating) { var base = cur(); if (!lgs.list.length || lgs.best < 0) { delete patch.logo; delete patch.logoAr; } S.importDraft = { project: Object.assign({}, base, patch), isNew: false, notes: notes, logos: lgs.list };
          if (parkAdd && !(base.parkings || []).some(function (k) { return k.name === parkAdd.name; })) S.importDraft.project.parkings = (base.parkings || []).concat([parkAdd]); }
        else { S.importDraft = { project: newProject(Object.assign(patch, { startMonth: C.addMonths((q.quoteDate || today()).slice(0, 7), 1), parkings: parkAdd ? [parkAdd] : [] })), isNew: true, notes: notes, logos: lgs.list }; }
        showDraft(true);
      }).catch(function (e) { unbusy(); toast('Error al leer el PDF: ' + (e.message || e)); });
    });
  }
  function openDraft(p, fromPdf) { S.importDraft = { project: p, isNew: true }; showDraft(fromPdf); }
  function showDraft(fromPdf) {
    var d = S.importDraft; applyTheme(d.project.color);
    $app.innerHTML = headerHtml() + '<main><div class="wrap enter" id="wrap"><div class="card"><h2>' + (fromPdf ? 'Revisa los datos de la cotización' : 'Nuevo proyecto') + '</h2>' +
      (d.notes || []).map(function (n) { return '<div class="note">' + esc(n) + '</div>'; }).join('') +
      (fromPdf ? '<p class="muted">Estos datos se leyeron del PDF. Corrige lo que haga falta y guarda. “Mes de la 1.ª cuota” es el mes en que empiezas a pagar las cuotas fraccionadas.</p>' : '') +
      '<label>Logo del proyecto</label><div class="logos" id="logos"></div>' +
      formFields(d.project, 'd_') + '<div class="actions"><button class="btn" data-a="draft-save">Guardar</button><button class="btn ghost" data-a="draft-cancel">Cancelar</button>' +
      (!fromPdf ? '<button class="btn sec" data-a="draft-pdf">Mejor subir cotización PDF</button>' : '') + '</div></div></div></main>';
    S.anim = true; bind(); post(); renderLogos();
  }
  function renderLogos() {
    var box = $('logos'), d = S.importDraft; if (!box || !d) return; var cur0 = d.project.logo || '';
    box.innerHTML = (d.logos || []).map(function (l, i) { return '<button type="button" class="lgo' + (l.url === cur0 ? ' on' : '') + '" data-a="pick-logo" data-i="' + i + '"><img alt="Logo ' + (i + 1) + '" src="' + l.url + '"></button>'; }).join('') +
      '<button type="button" class="lgo txt' + (!cur0 ? ' on' : '') + '" data-a="pick-logo" data-i="-1">Sin logo</button><button type="button" class="lgo txt" data-a="upload-logo">' + ic('upload') + ' Subir</button>';
    Array.prototype.forEach.call(box.querySelectorAll('[data-a]'), function (b) { b.onclick = function (ev) { ev.preventDefault(); act(b.dataset.a, b.dataset.id, b); }; });
  }

  /* ---------- autenticación (modo nube) ---------- */
  function renderAuth(msg) {
    applyTheme('gold');
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
      case 'home': S.importDraft = null; go('home'); break;
      case 'open': go('project', id, 'resumen'); break;
      case 'pick-logo': { var dr = S.importDraft, lo = el.dataset.i === '-1' ? null : dr.logos[+el.dataset.i]; dr.project.logo = lo ? lo.url : ''; dr.project.logoAr = lo && lo.ar ? lo.ar : 0; renderLogos(); break; }
      case 'upload-logo': pickFile('image/*', false, function (fl) { fileToLogo(fl[0]).then(function (lo) { var dr = S.importDraft; dr.logos = (dr.logos || []).concat([lo]); dr.project.logo = lo.url; dr.project.logoAr = lo.ar; renderLogos(); }).catch(function (e) { toast('No se pudo usar la imagen: ' + (e.message || e)); }); }); break;
      case 'logo-up': pickFile('image/*', false, function (fl) { fileToLogo(fl[0]).then(function (lo) { p.logo = lo.url; p.logoAr = lo.ar; persist(p).then(function () { toast('Logo actualizado'); render(); }); }).catch(function (e) { toast('No se pudo usar la imagen: ' + (e.message || e)); }); }); break;
      case 'logo-del': p.logo = ''; persist(p).then(function () { toast('Logo quitado'); render(); }); break;
      case 'theme': setTheme({ auto: 'light', light: 'dark', dark: 'auto' }[themePref]); toast('Tema: ' + THEME_NAME[themePref]); render(); break;
      case 'theme-set': setTheme(el.dataset.v); render(); break;
      case 'color':
        var pre = el.dataset.pre; Array.prototype.forEach.call($(pre + 'sw').children, function (b) { b.classList.toggle('on', b === el); });
        if (pre === 'd_') { S.importDraft.project.color = el.dataset.v; } else { p.color = el.dataset.v; persist(p); }
        applyTheme(el.dataset.v); break;
      case 'logout': sb.auth.signOut().then(function () { S.user = null; S.projects = []; S.id = null; S.view = 'home'; S.needAuth = true; render(); }); break;
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
          Promise.all((p.files || []).map(function (f) { return Files.del(f.id).catch(function () { }); })).then(function () { return store.remove(p.id); }).then(function () { S.projects = S.projects.filter(function (x) { return x.id !== p.id; }); S.id = S.projects[0] ? S.projects[0].id : null; go('home'); });
        } break;
      case 'draft-pdf': startImport(false); break;
      case 'draft-cancel': S.importDraft = null; S.anim = true; render(); break;
      case 'draft-save':
        var d = S.importDraft, np = readForm('d_', d.project);
        if (!np.name && !np.unit) return toast('Ponle nombre al proyecto');
        S.importDraft = null;
        if (d.isNew) S.projects.push(np); else S.projects = S.projects.map(function (x) { return x.id === np.id ? np : x; });
        S.id = np.id; S.view = 'project'; S.tab = d.isNew ? 'pagos' : S.tab; S.anim = true;
        persist(np).then(function () { toast('Proyecto guardado'); go('project', np.id); }); break;
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
    var slow = store.mode === 'cloud'; if (slow) busy('Cargando tus proyectos…');
    store.load().then(function (list) {
      if (slow) unbusy(); S.projects = list; S.id = (list.filter(function (p) { return p.id === S.id; })[0] || list[0] || {}).id || null; S.view = 'home'; S.anim = true; render();
    }).catch(function (e) { if (slow) unbusy(); toast('No se pudieron cargar los datos: ' + (e.message || e)); render(); });
  }
  function init() {
    applyTheme();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(function () { });
    var hadCtl = !!(navigator.serviceWorker && navigator.serviceWorker.controller), reloaded = false;
    if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadCtl && !reloaded) { reloaded = true; location.reload(); } }); // nueva versión lista
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
