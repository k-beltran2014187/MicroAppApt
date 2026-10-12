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
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>', out: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
    car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18M7 19v-3M17 19v-3"/><circle cx="8" cy="13" r=".8"/><circle cx="16" cy="13" r=".8"/>', lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2"/>', sync: '<path d="M20 8a8 8 0 0 0-14-2M4 4v4h4M4 16a8 8 0 0 0 14 2M20 20v-4h-4"/>',
    credit: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h4"/>',
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
  var S = { projects: [], id: null, view: 'home', menu: false, tab: 'resumen', user: null, editing: null, importDraft: null, sim: 0, anim: true, thumbs: {} };
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
  window.addEventListener('popstate', function (e) { var st = e.state || {}; if (S.needAuth) { S.gate = st.gate || 'landing'; render(); return; } S._pop = true; S.importDraft = null; S.view = st.v || 'home'; if (st.id) S.id = st.id; S.anim = true; render(); S._pop = false; });
  try { history.replaceState({ v: 'home' }, ''); } catch (e) { }

  function render() {
    var proj = S.view === 'project' && !S.needAuth ? cur() : null, p = proj;
    if (p && tabsFor(p).map(function (t) { return t[0]; }).indexOf(S.tab) < 0) S.tab = 'resumen';
    applyTheme(p ? p.color : (S.importDraft ? S.importDraft.project.color : 'gold'));
    if (S.needAuth) return S.gate === 'auth' ? renderAuth() : renderLanding();
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
    bindCharts(); placeInd(); S.anim = false;
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
    var showPlus = !p, em = S.user && S.user.email ? S.user.email : '', ini = esc((em[0] || '?').toUpperCase());
    return '<div class="ambient" aria-hidden="true"></div><header class="top"><div class="wrap">' + left +
      '<button class="ibtn" data-a="theme" title="Tema: ' + THEME_NAME[themePref] + '" aria-label="Cambiar tema">' + THEME_ICON[themePref] + '</button>' +
      (showPlus ? '<button class="ibtn" data-a="new" title="Nuevo proyecto" aria-label="Nuevo proyecto">' + ic('plus') + '</button>' : '') +
      (store.mode === 'cloud' ? '<button class="ibtn av" data-a="menu" aria-label="Mi cuenta" aria-expanded="' + !!S.menu + '">' + ini + '</button>' : '') +
      '</div>' + (S.menu && store.mode === 'cloud' ? '<div class="menu" id="menu" role="menu"><div class="em">Sesión iniciada como<br><b>' + esc(em) + '</b></div><a href="privacidad.html" target="_blank" rel="noopener">' + ic('file') + ' Aviso de privacidad</a><button data-a="logout">' + ic('out') + ' Cerrar sesión</button></div>' : '') + '</header>';
  }
  function tabsHtml() { var pp = cur(); return '<nav class="tabs"><div class="tabs-in">' + tabsFor(pp).map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '<i class="ind"></i></div></nav>'; }
  function welcomeHtml() {
    return migBanner() + '<div class="welcome"><div class="heroorb" id="heroOrb"></div><div class="eyebrow">Control de enganche</div><h1>Tu apartamento, siempre bajo control.</h1>' +
      '<p class="lead">Sube tu cotización y sigue cada cuota, abono y parqueo, con tus planos siempre a la mano.</p>' +
      '<button class="btn" data-a="new-pdf">' + ic('upload') + 'Subir cotización (PDF)</button><p style="margin:16px 0 0"><button class="chip" data-a="new-loan">Ya pago el crédito del banco →</button></p>' +
      '<div class="feats"><div class="feat"><div class="fi">' + ic('scan') + '</div><b>Lee tu cotización</b><span>Toma precio, enganche, cuotas y plazo del PDF en segundos.</span></div>' +
      '<div class="feat"><div class="fi">' + ic('layers') + '</div><b>Enganche, abonos y parqueos</b><span>Cada pago en su lugar, con la cuota del préstamo siempre al día.</span></div>' +
      '<div class="feat"><div class="fi">' + ic('plan') + '</div><b>Planos a la mano</b><span>Guarda los planos de cada proyecto y ábrelos con zoom.</span></div></div>' +
      (store.mode === 'local' ? '<p class="muted" style="margin-top:22px">Modo local: tus datos se guardan solo en este dispositivo.</p>' : '') + '</div>';
  }
  function tabHtml(p) {
    if (isLoan(p)) { var rl = C.loanCompute(p); var fl = { resumen: tResumenL, pagos: tPagosL, amort: tAmort, simulador: tSim, planos: tPlanos, proyecto: tProyecto }[S.tab] || tResumenL; return fl(p, rl); }
    var r = C.compute(p); return { resumen: tResumen, pagos: tPagos, calendario: tCalendario, prestamo: tPrestamo, parqueos: tParqueos, planos: tPlanos, proyecto: tProyecto }[S.tab](p, r); }
  function homeHtml() {
    var rs = S.projects.map(function (p) { return { p: p, loan: isLoan(p), r: isLoan(p) ? C.loanCompute(p) : C.compute(p) }; });
    var eng = rs.filter(function (x) { return !x.loan; }), lns = rs.filter(function (x) { return x.loan && x.r.ok; });
    var paid = eng.reduce(function (t, x) { return t + x.r.paidEng; }, 0), rem = eng.reduce(function (t, x) { return t + x.r.remEng; }, 0), ab = eng.reduce(function (t, x) { return t + x.r.abonos; }, 0), debt = lns.reduce(function (t, x) { return t + x.r.saldo; }, 0);
    var h = migBanner() + '<div class="home-head"><div class="eyebrow">Mi portafolio</div><h1 class="hero-title">Mis proyectos</h1><p class="muted">' + rs.length + (rs.length === 1 ? ' apartamento' : ' apartamentos') + (lns.length ? ' · ' + lns.length + (lns.length === 1 ? ' con crédito' : ' con crédito') : '') + '</p></div>';
    var tiles = [];
    if (eng.length > 1) tiles = [stat('Pagado', cq(paid), 'en enganches, en total', 'hero'), stat('Falta', cq(rem), 'de enganche, en total'), stat('Abonado', cq(ab), 'a capital', 'abono')];
    if (lns.length) tiles.push(stat('Debes al banco', cq(debt), lns.length > 1 ? 'entre tus ' + lns.length + ' créditos' : 'saldo de tu crédito', eng.length > 1 ? '' : 'hero'));
    if (tiles.length > 1 || (tiles.length && lns.length && eng.length)) h += '<div class="grid">' + tiles.join('') + '</div>';
    h += '<div class="pgrid">' + rs.map(function (x) {
      var p = x.p, r = x.r, head = '<button class="pcard" data-accent="' + accentOf(p.color) + '" data-a="open" data-id="' + p.id + '"><div class="pc-top">' + lg(p, 'm') + '<div class="pc-t"><b>' + esc(p.name || 'Proyecto') + '</b><span>' + esc([p.unit ? 'Apto ' + p.unit : '', p.bank].filter(Boolean).join(' · ')) + '</span></div>';
      if (x.loan) {
        if (!r.ok) return head + '</div><p class="muted" style="margin:16px 0 0">Crédito sin completar. Toca para agregar los datos del préstamo.</p></button>';
        return head + '<span class="pc-pct">' + Math.round(r.pctPaid) + '<small>%</small></span></div><div class="bar"><i data-w="' + r.pctPaid.toFixed(1) + '"></i></div>' +
          '<div class="pc-nums"><div><small>Debes</small><b>' + mh(r.saldo) + '</b></div><div><small>Pagado al capital</small><b>' + mh(r.capitalPaid) + '</b></div></div>' +
          '<div class="pc-foot"><span>' + ic('calendar') + ' ' + (r.next ? 'Cuota ' + r.next.n + ' · ' + fmtMonth(r.next.month) : 'Crédito pagado') + '</span><span><span class="tag" style="background:rgba(var(--a-rgb),.15);color:var(--acc)">Crédito</span></span></div></button>';
      }
      var nx = r.next;
      return head + '<span class="pc-pct">' + Math.round(r.pctEng) + '<small>%</small></span></div>' +
        '<div class="bar"><i data-w="' + r.pctEng.toFixed(1) + '"></i></div>' +
        '<div class="pc-nums"><div><small>Pagado</small><b>' + mh(r.paidEng) + '</b></div><div><small>Falta</small><b>' + mh(r.remEng) + '</b></div></div>' +
        '<div class="pc-foot"><span>' + (nx ? ic('calendar') + ' ' + esc(nx.label) + (nx.month ? ' · ' + fmtMonth(nx.month) : '') : ic('check') + ' Enganche completo') + '</span><span>' + r.cuotasPagadas + '/' + r.months + ' cuotas</span></div></button>';
    }).join('') + '<button class="pcard add" data-a="new"><span class="pa-i">' + ic('plus') + '</span><b>Nuevo proyecto</b><span class="muted">Enganche o crédito del banco</span></button></div>';
    return h;
  }
  function stat(l, v, sub, cls) { return '<div class="stat ' + (cls || '') + '"><small>' + l + '</small><b>' + v + '</b>' + (sub ? '<span class="sub">' + sub + '</span>' : '') + '</div>'; }
  var RING = 439.82;
  function ringHtml(pct, cap) {
    var off = RING * (1 - Math.min(100, pct) / 100);
    return '<div class="ring"><svg viewBox="0 0 160 160" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--a1b)"/><stop offset="1" style="stop-color:var(--a2)"/></linearGradient></defs>' +
      '<circle class="tr" cx="80" cy="80" r="70"/><circle class="pg" cx="80" cy="80" r="70" data-off="' + off.toFixed(2) + '" style="--off:' + off.toFixed(2) + '"/></svg>' +
      '<div class="ct"><b><span data-cu="' + pct.toFixed(1) + '" data-k="n">' + Math.round(pct) + '</span><sup>%</sup></b><span class="cap">' + (cap || 'del enganche') + '</span></div></div>';
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
    if (r.schedule.length && r.cuotasFaltan === 0 && r.remEng <= 0) h += '<div class="card next"><div class="ic">' + ic('check') + '</div><div class="tx"><b>¡Enganche completo!</b><span>Ya puedes empezar a seguir tu crédito del banco.</span></div><button class="btn sm" data-a="to-loan">Pasar a crédito</button></div>';
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

  function simEngHtml(p, r) {
    var x = +S.sim || 0, rate = +p.rate || 0, yrs_ = +p.years || 0;
    if (!(x > 0)) return '<p class="muted" style="margin:14px 0 0">Escribe un monto para ver cuánto bajaría tu cuota o cuánto tiempo te ahorrarías.</p>';
    if (!(r.financedNow > 0) || !(yrs_ > 0)) return '<p class="muted" style="margin:14px 0 0">Completa el precio, la tasa y el plazo en la pestaña Proyecto para simular.</p>';
    var P2 = Math.max(0, r.financedNow - x), S0 = '2000-01', fx = r.fixed;
    var base = C.loanSchedule({ principal: r.financedNow, rate: rate, years: yrs_, startMonth: S0 });
    var optC = C.loanSchedule({ principal: P2, rate: rate, years: yrs_, startMonth: S0 });                          // mismo plazo, cuota menor
    var optP = C.loanSchedule({ principal: P2, rate: rate, years: yrs_, startMonth: S0, payment: base.pay0 });      // misma cuota, menos meses
    var dq = r.totalNow - (optC.pay0 + fx), saveC = Math.max(0, base.totalInterest - optC.totalInterest), saveP = Math.max(0, base.totalInterest - optP.totalInterest), mP = Math.max(0, base.months - optP.months);
    return '<div class="grid" style="margin:16px 0 0">' +
      stat('Si mantienes el plazo', mh(optC.pay0 + fx), 'tu cuota total bajaría ' + Q(Math.max(0, dq)) + ' al mes (hoy ' + Q(r.totalNow) + ')', 'hero') +
      stat('Ahorro en intereses', mh(saveC), 'con ese plazo de ' + spanYM(base.months)) +
      stat('Si sigues pagando la misma cuota', mP > 0 ? spanYM(mP) + ' menos' : 'sin cambio', 'terminarías en ' + spanYM(optP.months) + ' en vez de ' + spanYM(base.months), 'ok') +
      stat('Ahorro en intereses', mh(saveP), 'pagando la misma cuota de hoy') + '</div>' +
      '<p class="muted" style="margin:12px 0 0">Pregunta a tu banco si el abono reduce el plazo o la cuota; así sabes cuál de las dos opciones te aplica.</p>';
  }
  function tPrestamo(p, r) {
    var h = '<div class="card"><h2>Cuota proyectada del préstamo</h2>' +
      '<div class="kv"><span>Precio de la propiedad</span><b>' + Q(p.price) + '</b></div><div class="kv"><span>Enganche total</span><b>' + Q(r.engTotal) + '</b></div>' +
      '<div class="kv"><span>Monto a financiar (cotización)</span><b>' + Q(r.financedOrig) + '</b></div><div class="kv"><span>Abonos a capital</span><b class="ab">− ' + Q(r.abonos) + '</b></div>' +
      '<div class="kv"><span>Monto a financiar hoy</span><b>' + Q(r.financedNow) + '</b></div><div class="kv"><span>Tasa / plazo</span><b>' + (+p.rate || 0) + '% · ' + (+p.years || 0) + ' años</b></div>' +
      (r.parkTotal ? '<p class="muted" style="margin:8px 0 0">Los parqueos (' + Q(r.parkTotal) + ') se pagan aparte y no entran al préstamo.</p>' : '') + '</div>';
    h += '<div class="grid">' + stat('Cuota nivelada', cq(r.pmtNow), r.abonos ? 'antes ' + Q(r.pmtOrig) : 'capital + interés') + stat('IUSI + seguro', Q(r.fixed), 'mensual') +
      stat('Cuota mensual total', cq(r.totalNow), r.abonos ? 'ahorras ' + Q(r.totalOrig - r.totalNow) + ' al mes' : '', 'hero') +
      stat('Si mantienes la cuota original', yrs(r.termMonthsKeep), r.abonos ? 'en vez de ' + yrs(r.termMonthsOrig) : 'plazo total', 'abono') + '</div>';
    h += '<div class="card"><h2>¿Y si abono más?</h2><p class="muted">Un abono a capital antes de que empiece tu crédito baja lo que le debes al banco. Mira qué pasaría con tu cuota y con los intereses.</p>' +
      '<label style="margin-top:12px">Abono simulado (Q)<input type="number" inputmode="decimal" id="sim" value="' + (S.sim || '') + '" placeholder="0.00"></label>' +
      '<div class="chips"><span class="muted">Atajos:</span>' + [10000, 25000, 50000, 100000].map(function (v) { return '<button class="chip" data-a="sim-e-fill" data-id="' + v + '">' + Q(v).replace('.00', '') + '</button>'; }).join('') + '</div>' +
      '<div id="sim_e">' + simEngHtml(p, r) + '</div></div>';
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
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && V) closeViewer(); if (e.key === 'Escape') closeSheet(); });
  var rzT, rzW = document.documentElement.clientWidth;
  window.addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(function () { var w = document.documentElement.clientWidth; if (w !== rzW && document.querySelector('.chart')) { rzW = w; S.anim = false; render(); } rzW = w; }, 250); });

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
  function stageCard(p) {
    return isLoan(p)
      ? '<div class="card"><h2>Etapa del proyecto</h2><p class="muted">Este proyecto está en la <b>etapa de crédito</b> (cuotas del banco).</p><div class="actions"><button class="btn ghost sm" data-a="to-enganche">Volver a la etapa de enganche</button></div></div>'
      : '<div class="card"><h2>Etapa del proyecto</h2><p class="muted">Este proyecto está en la <b>etapa de enganche</b>. Cuando termines de pagarlo, pásalo a la etapa de crédito para seguir tus cuotas del banco.</p><div class="actions"><button class="btn sec" data-a="to-loan">Pasar a la etapa de crédito</button></div></div>';
  }
  function tProyecto(p) {
    return '<div class="card"><h2>Logo del proyecto</h2><div class="logo-row">' + lg(p, 'l') + '<div><p class="muted" style="margin-bottom:10px">Aparece en el encabezado y en tu página de inicio.</p><div class="actions" style="margin-top:0"><button class="btn sec sm" data-a="logo-up">' + ic('upload') + ' Subir imagen</button>' + (p.logo ? '<button class="btn ghost sm" data-a="logo-del">Quitar</button>' : '') + '</div></div></div></div>' +
      '<div class="card"><h2>Apariencia</h2><label>Tema</label><div class="seg2" id="themeSeg">' +
      ['auto', 'light', 'dark'].map(function (k) { return '<button data-a="theme-set" data-v="' + k + '" class="' + (themePref === k ? 'on' : '') + '">' + THEME_ICON[k] + THEME_NAME[k] + '</button>'; }).join('') + '</div>' +
      '<p class="muted" style="margin:8px 0 0">El color se elige por proyecto, abajo en “Datos del proyecto”.</p></div>' +
      stageCard(p) +
      '<div class="card"><h2>' + (isLoan(p) ? 'Datos del crédito' : 'Datos del proyecto') + '</h2>' + (isLoan(p) ? loanFields(p, 'p_') : formFields(p, 'p_')) + '<div class="actions"><button class="btn" data-a="save-proj">Guardar</button></div></div>' +
      (isLoan(p) ? '' : '<div class="card"><h2>Cotización</h2><p class="muted">Sube otra cotización para reemplazar los datos de este proyecto. Tus pagos no se borran.</p><div class="actions"><button class="btn sec" data-a="import-update">Subir cotización (PDF)</button></div></div>') +
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
    var d = S.importDraft, loan = d.kind === 'loan'; applyTheme(d.project.color);
    $app.innerHTML = headerHtml() + '<main><div class="wrap enter" id="wrap"><div class="card"><h2>' + (loan ? (d.converting ? 'Pasa a la etapa de crédito' : 'Tu crédito del banco') : fromPdf ? 'Revisa los datos de la cotización' : 'Nuevo proyecto') + '</h2>' +
      (d.notes || []).map(function (n) { return '<div class="note">' + esc(n) + '</div>'; }).join('') +
      (fromPdf ? '<p class="muted">Estos datos se leyeron del PDF. Corrige lo que haga falta y guarda. “Mes de la 1.ª cuota” es el mes en que empiezas a pagar las cuotas fraccionadas.</p>' : '') +
      '<label>Logo del proyecto</label><div class="logos" id="logos"></div>' +
      (loan ? loanFields(d.project, 'd_', { paid: d.converting ? 0 : monthsBetween((d.project.loan || {}).startMonth, C.curMonth()) }) : formFields(d.project, 'd_')) + '<div class="actions"><button class="btn" data-a="draft-save">Guardar</button><button class="btn ghost" data-a="draft-cancel">Cancelar</button>' +
      (!fromPdf && !loan ? '<button class="btn sec" data-a="draft-pdf">Mejor subir cotización PDF</button>' : '') + '</div></div></div></main>';
    S.anim = true; bind(); post(); renderLogos(); if (loan) bindLoanDraft();
  }
  function renderLogos() {
    var box = $('logos'), d = S.importDraft; if (!box || !d) return; var cur0 = d.project.logo || '';
    box.innerHTML = (d.logos || []).map(function (l, i) { return '<button type="button" class="lgo' + (l.url === cur0 ? ' on' : '') + '" data-a="pick-logo" data-i="' + i + '"><img alt="Logo ' + (i + 1) + '" src="' + l.url + '"></button>'; }).join('') +
      '<button type="button" class="lgo txt' + (!cur0 ? ' on' : '') + '" data-a="pick-logo" data-i="-1">Sin logo</button><button type="button" class="lgo txt" data-a="upload-logo">' + ic('upload') + ' Subir</button>';
    Array.prototype.forEach.call(box.querySelectorAll('[data-a]'), function (b) { b.onclick = function (ev) { ev.preventDefault(); act(b.dataset.a, b.dataset.id, b); }; });
  }

  /* ---------- autenticación (modo nube) ---------- */
  /* ---------- página de presentación (antes de iniciar sesión) ---------- */
  function sampleProject() {
    var sm = C.addMonths(C.curMonth(), -5), d = function (k) { return C.addMonths(sm, k) + '-15'; };
    return { name: 'Residencial Alameda', unit: '1204', bank: 'Banco de ejemplo', size: 58, price: 850000, reserva: 3000, months: 15, cuotaEnganche: 5300, engancheTotal: 82500, startMonth: sm, rate: 7.5, years: 25, iusi: 0, seguro: 0, color: 'gold', parkings: [], files: [],
      payments: [{ id: 'a', date: d(0), enganche: 3000 }, { id: 'b', date: d(0), enganche: 5300 }, { id: 'c', date: d(1), enganche: 5300 }, { id: 'd', date: d(2), enganche: 5300 }, { id: 'e', date: d(3), enganche: 5300 }, { id: 'f', date: d(4), enganche: 5300 }] };
  }
  function previewHtml() {
    var p = sampleProject(), r = C.compute(p), nx = r.next, due = nx ? Math.max(0, nx.amount - nx.paid) : 0;
    return '<div class="mock rv"><span class="mock-tag">Vista de ejemplo</span><section class="card hero" style="margin:0"><div class="hero-grid"><div class="hero-text"><div class="eyebrow">Apto ' + p.unit + ' · ' + p.bank + '</div><h3 class="hero-title" style="font-size:2.3rem">' + p.name + '</h3>' +
      '<div class="kpis" style="margin-top:14px"><div class="kpi"><small>Pagado</small><b>' + cq(r.paidEng) + '</b></div><div class="kpi"><small>Falta</small><b>' + cq(r.remEng) + '</b></div></div></div>' + ringHtml(r.pctEng) + '</div>' + pathHtml(r) + '</section>' +
      '<div class="card next" style="margin:12px 0 0"><div class="ic">' + ic('calendar') + '</div><div class="tx"><b>Próximo pago · ' + esc(nx ? nx.label : '') + '</b><span>' + (nx && nx.month ? fmtMonth(nx.month) : '') + '</span></div><div class="am">' + Q(due) + '</div></div></div>';
  }
  function landingHtml() {
    var steps = [['1', 'Sube tu cotización', 'Arrastra el PDF que te dio la desarrolladora. La app lee el precio, el enganche, las cuotas, el plazo y hasta el logo del proyecto.'],
      ['2', 'Registra tus pagos', 'Uno por uno o varios meses de golpe. El enganche, los abonos y los parqueos van cada uno en su lugar.'],
      ['3', 'Sigue tu avance, hasta la última cuota', 'Cuánto llevas, cuánto falta y, cuando empiezas a pagar al banco, cuánto debes y cuánto te ahorrarías con un abono.']];
    var feats = [['scan', 'Lee tu cotización', 'Sube el PDF y se llena solo. Si el formato es distinto, lo completas a mano en un minuto.'], ['layers', 'Enganche y abonos separados', 'Los abonos extra no se mezclan con el enganche: reducen el capital y recalculan tu cuota.'],
      ['car', 'Parqueos aparte', 'Registra los que compras por separado o los que ya van incluidos en el precio.'], ['plan', 'Tus planos, siempre contigo', 'Guarda los planos de cada proyecto y ábrelos con zoom desde el teléfono.'],
      ['credit', 'Y después, tu crédito del banco', 'Al terminar el enganche, sigue tu préstamo: cuánto debes, intereses, tabla de amortización y cuánto ahorras si abonas.'], ['sync', 'Todos tus proyectos, en cualquier dispositivo', 'Cada apartamento con su logo y color, y tu cuenta igual en el teléfono y en la computadora.']];
    var faq = [['¿Cuánto cuesta?', 'Es gratis. Creas tu cuenta con tu correo y empiezas a usarla.'], ['¿Necesito la cotización en PDF?', 'No es obligatoria. Si la subes, la app llena los datos por ti; si no, los escribes tú.'],
      ['¿Quién puede ver mis datos?', 'Solo tú. Cada cuenta ve únicamente su propia información, y la conexión es cifrada. Puedes borrar tus proyectos cuando quieras.'], ['¿Sirve cuando ya estoy pagando el crédito del banco?', 'Sí. Al terminar el enganche pasas el proyecto a la etapa de crédito: ves tu saldo, los intereses pagados y por pagar, la tabla de amortización y puedes simular abonos. También puedes empezar directo en esa etapa.'], ['¿Sirve para cualquier apartamento?', 'Sí. Funciona con cualquier proyecto que fraccione el enganche en cuotas, con o sin reserva, y con o sin parqueo.'],
      ['¿Reemplaza a mi desarrolladora o a mi banco?', 'No. Es una herramienta para que tú lleves tu propio control. Los saldos oficiales siempre son los de la desarrolladora y el banco.']];
    return '<header class="top lp-nav"><div class="wrap"><span class="brand"><span class="mark">' + ic('home') + '</span><span class="wm">Mi Enganche</span></span>' +
      '<button class="ibtn" data-a="theme" aria-label="Cambiar tema">' + THEME_ICON[themePref] + '</button><button class="btn ghost sm" data-a="go-auth" data-id="login">Entrar</button><button class="btn sm" data-a="go-auth" data-id="signup">Crear cuenta</button></div></header>' +
      '<div class="ambient" aria-hidden="true"></div><main class="wrap lp">' +
      '<section class="lp-hero"><div class="lp-copy"><div class="eyebrow">Control de enganche</div><h1>Tu apartamento, <em>siempre bajo control.</em></h1>' +
      '<p class="lp-lead">Comprar un apartamento en preventa son muchos pagos durante meses. Mi Enganche te dice cuánto llevas, cuánto falta y cuánto sería tu cuota del préstamo, sin hojas de cálculo.</p>' +
      '<div class="lp-cta"><button class="btn" data-a="go-auth" data-id="signup">Crear cuenta gratis</button><a class="btn ghost" href="#como">Ver cómo funciona</a></div>' +
      '<div class="lp-note"><span>Gratis</span><span>Sin tarjeta</span><span>Tus datos son tuyos</span></div></div>' + previewHtml() + '</section>' +
      '<section class="lp-sec" id="como"><div class="rv"><div class="eyebrow">Cómo funciona</div><h2>Tres pasos y listo</h2></div><div class="steps">' +
      steps.map(function (s) { return '<div class="step rv"><span class="sn">' + s[0] + '</span><b>' + s[1] + '</b><p>' + s[2] + '</p></div>'; }).join('') + '</div></section>' +
      '<section class="lp-sec"><div class="rv"><div class="eyebrow">Lo que incluye</div><h2>Todo lo que necesitas para llevar tu enganche</h2></div><div class="feats lp-feats">' +
      feats.map(function (f) { return '<div class="feat rv"><div class="fi">' + ic(f[0]) + '</div><b>' + f[1] + '</b><span>' + f[2] + '</span></div>'; }).join('') + '</div></section>' +
      '<section class="lp-sec"><div class="calc card rv"><div class="calc-in"><div><div class="eyebrow">Calculadora gratis</div><h2 style="font-size:2rem">¿Cuánto pagarías por tu apartamento?</h2><p class="muted">Un cálculo de referencia: enganche, cuota mensual de enganche y cuota estimada del banco.</p>' +
      '<div class="row" style="margin-top:12px">' + field('c_price', 'Precio (Q)', 750000, 'number') + field('c_pct', 'Enganche (%)', 10, 'number') + '</div><div class="row" style="margin-top:10px">' + field('c_n', 'Meses del enganche', 15, 'number') + field('c_rate', 'Tasa anual (%)', 7.5, 'number') + field('c_y', 'Plazo (años)', 25, 'number') + '</div></div>' +
      '<div class="calc-out" id="c_out"></div></div><p class="muted" style="margin:14px 0 0;font-size:.78rem">Referencial: no incluye IUSI, seguros ni gastos. Los valores oficiales son los de tu desarrolladora y tu banco.</p></div></section>' +
      '<section class="lp-sec"><div class="lp-trust card rv"><div class="fi" style="margin:0">' + ic('lock') + '</div><div><h2 style="font-size:1.8rem;margin:0 0 6px">Tus datos son tuyos</h2><p class="muted" style="margin:0">Cada cuenta ve solo su información. La conexión es cifrada y puedes eliminar tus proyectos cuando quieras. Lee el <a href="privacidad.html" target="_blank" rel="noopener" style="color:var(--acc)">aviso de privacidad</a>.</p></div></div></section>' +
      '<section class="lp-sec"><div class="rv"><div class="eyebrow">Preguntas frecuentes</div><h2>Antes de empezar</h2></div><div class="faq rv">' +
      faq.map(function (q) { return '<details><summary>' + q[0] + '</summary><p>' + q[1] + '</p></details>'; }).join('') + '</div></section>' +
      '<section class="lp-sec"><div class="lp-final card rv"><h2>Empieza hoy, toma el control de tu enganche</h2><p class="muted">Crea tu cuenta gratis y sube tu primera cotización en menos de un minuto.</p><div class="lp-cta" style="justify-content:center"><button class="btn" data-a="go-auth" data-id="signup">Crear cuenta gratis</button><button class="btn ghost" data-a="go-auth" data-id="login">Ya tengo cuenta</button></div></div></section></main>' +
      '<footer class="lp-foot"><div class="wrap"><span>© ' + new Date().getFullYear() + ' Mi Enganche</span><span><a href="privacidad.html" target="_blank" rel="noopener">Aviso de privacidad</a> · Hecho por <a href="https://estudiopixel502.com" target="_blank" rel="noopener">Estudio Pixel 502</a></span></div></footer>';
  }
  function updateCalc() {
    var price = numv('c_price'), pct = numv('c_pct'), n = Math.max(1, Math.round(numv('c_n'))), rate = numv('c_rate'), y = numv('c_y');
    var eng = price * pct / 100, fin = Math.max(0, price - eng), pm = C.pmt(fin, rate, y), o = $('c_out'); if (!o) return;
    o.innerHTML = '<div class="co"><small>Enganche total</small><b>' + mh(eng) + '</b></div><div class="co"><small>Cuota de enganche</small><b>' + mh(eng / n) + '</b><span>por ' + n + ' meses</span></div>' +
      '<div class="co"><small>A financiar</small><b>' + mh(fin) + '</b></div><div class="co hl"><small>Cuota estimada del banco</small><b>' + mh(pm) + '</b><span>capital + interés, ' + (y || 0) + ' años</span></div>';
  }
  function renderLanding() {
    applyTheme('gold'); S.anim = true; $app.innerHTML = landingHtml(); bind(); post(); updateCalc();
    ['c_price', 'c_pct', 'c_n', 'c_rate', 'c_y'].forEach(function (id) { var e = $(id); if (e) e.oninput = updateCalc; });
    var els = $app.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window) || reduced) { Array.prototype.forEach.call(els, function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: .12 });
    Array.prototype.forEach.call(els, function (e) { io.observe(e); });
  }

  var AUTH_ERR = [[/invalid login credentials/i, 'Correo o contraseña incorrectos.'], [/already registered|already been registered/i, 'Ya existe una cuenta con ese correo. Prueba entrar.'],
    [/at least 6|weak password|password should/i, 'La contraseña debe tener mínimo 6 caracteres.'], [/email not confirmed/i, 'Primero confirma tu correo: revisa tu bandeja de entrada (y spam).'],
    [/rate limit|too many/i, 'Demasiados intentos. Espera unos minutos y vuelve a probar.'], [/invalid email|unable to validate email/i, 'Ese correo no parece válido.'], [/same password/i, 'Elige una contraseña distinta a la anterior.']];
  var trErr = function (m) { for (var i = 0; i < AUTH_ERR.length; i++) if (AUTH_ERR[i][0].test(m || '')) return AUTH_ERR[i][1]; return m || 'Ocurrió un error. Intenta de nuevo.'; };
  // modos: login | signup | forgot | recover
  function renderAuth(msg, ok) {
    applyTheme('gold'); var mode = S.authMode || 'login', tab = mode === 'login' || mode === 'signup';
    var title = { login: 'Bienvenido de vuelta', signup: 'Crea tu cuenta', forgot: 'Recupera tu contraseña', recover: 'Nueva contraseña' }[mode];
    var sub = { login: 'Entra para ver tus proyectos desde cualquier dispositivo.', signup: 'Guarda tus proyectos, pagos y planos de forma segura y accede desde tu teléfono o computadora.', forgot: 'Te enviaremos un enlace a tu correo para elegir una nueva contraseña.', recover: 'Escribe tu nueva contraseña.' }[mode];
    $app.innerHTML = '<div class="ambient" aria-hidden="true"></div><div class="wrap"><div style="padding-top:18px"><button type="button" class="chip" data-a="go-landing">← Volver al inicio</button></div><form class="card auth" id="authForm" novalidate style="margin-top:14px"><div class="heroorb" id="heroOrb"></div><div class="eyebrow" style="text-align:center">Mi Enganche</div>' +
      '<h2 style="text-align:center;margin:6px 0 6px">' + title + '</h2><p class="muted" style="text-align:center;margin-bottom:18px">' + sub + '</p>' +
      (tab ? '<div class="seg2" style="display:flex;margin:0 0 16px"><button type="button" style="flex:1;justify-content:center" class="' + (mode === 'login' ? 'on' : '') + '" data-a="auth-mode" data-id="login">Entrar</button><button type="button" style="flex:1;justify-content:center" class="' + (mode === 'signup' ? 'on' : '') + '" data-a="auth-mode" data-id="signup">Crear cuenta</button></div>' : '') +
      (mode !== 'recover' ? '<label>Correo<input id="a_mail" type="email" autocomplete="email" inputmode="email" value="' + esc(S.authMail || '') + '"></label>' : '') +
      (mode !== 'forgot' ? '<label style="margin-top:12px">' + (mode === 'recover' ? 'Nueva contraseña' : 'Contraseña') + ' <span style="text-transform:none;letter-spacing:0;font-weight:450">(mínimo 6 caracteres)</span><input id="a_pass" type="password" autocomplete="' + (mode === 'login' ? 'current-password' : 'new-password') + '"></label>' : '') +
      (msg ? '<p class="note" style="margin:14px 0 0;' + (ok ? 'background:rgba(76,197,143,.12);border-color:rgba(76,197,143,.4)' : '') + '">' + esc(msg) + '</p>' : '') +
      '<div class="actions"><button class="btn" type="submit" style="flex:1">' + { login: 'Entrar', signup: 'Crear mi cuenta', forgot: 'Enviar enlace', recover: 'Guardar contraseña' }[mode] + '</button></div>' +
      (mode === 'login' ? '<p style="text-align:center;margin:14px 0 0"><button type="button" class="chip" data-a="auth-mode" data-id="forgot">¿Olvidaste tu contraseña?</button></p>' : '') +
      (mode === 'forgot' ? '<p style="text-align:center;margin:14px 0 0"><button type="button" class="chip" data-a="auth-mode" data-id="login">Volver a entrar</button></p>' : '') +
      '<p class="muted" style="text-align:center;margin:18px 0 0;font-size:.78rem">Tus datos son tuyos. Lee nuestro <a href="privacidad.html" target="_blank" rel="noopener" style="color:var(--acc)">aviso de privacidad</a>.</p></form></div>';
    bind(); post();
    var f = $('authForm'); if (f) f.onsubmit = function (e) { e.preventDefault(); authSubmit(); };
  }
  function authSubmit() {
    var mode = S.authMode || 'login', email = val('a_mail').trim(), password = val('a_pass'); S.authMail = email;
    if (mode !== 'recover' && !/^\S+@\S+\.\S+$/.test(email)) return renderAuth('Escribe un correo válido.');
    if (mode !== 'forgot' && password.length < 6) return renderAuth('La contraseña debe tener mínimo 6 caracteres.');
    busy(mode === 'login' ? 'Entrando…' : 'Un momento…');
    var back = location.origin + location.pathname;
    var call = mode === 'login' ? sb.auth.signInWithPassword({ email: email, password: password })
      : mode === 'signup' ? sb.auth.signUp({ email: email, password: password, options: { emailRedirectTo: back } })
      : mode === 'forgot' ? sb.auth.resetPasswordForEmail(email, { redirectTo: back })
      : sb.auth.updateUser({ password: password });
    call.then(function (r) {
      unbusy();
      if (r.error) return renderAuth(trErr(r.error.message));
      if (mode === 'forgot') return renderAuth('Listo. Si ese correo tiene cuenta, te llegará un enlace para elegir una nueva contraseña.', true);
      if (mode === 'recover') { S.recovery = false; S.authMode = 'login'; S.user = r.data.user; S.needAuth = false; toast('Contraseña actualizada'); return boot(); }
      if (!r.data.session) { S.authMode = 'login'; return renderAuth('Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego entra aquí.', true); }
      S.user = r.data.session.user; S.needAuth = false; boot();
    }).catch(function (e) { unbusy(); renderAuth(trErr(e && e.message)); });
  }

  /* ---------- etapa de crédito (cuotas del banco) ---------- */
  var isLoan = function (p) { return !!p && p.phase === 'credito'; };
  var TABS_L = [['resumen', 'Resumen'], ['pagos', 'Pagos'], ['amort', 'Amortización'], ['simulador', 'Simulador'], ['planos', 'Planos'], ['proyecto', 'Proyecto']];
  var tabsFor = function (p) { return isLoan(p) ? TABS_L : TABS; };
  var monthsBetween = function (a, b) { if (!a || !b) return 0; var x = a.split('-'), y = b.split('-'); return Math.max(0, (+y[0] - +x[0]) * 12 + (+y[1] - +x[1])); };
  var cp = function (v) { v = +v || 0; return '<span data-cu="' + v.toFixed(1) + '" data-k="p">' + v.toFixed(1) + '%</span>'; };
  var plural = function (n, a, b) { return n + ' ' + (n === 1 ? a : b); };
  var spanYM = function (m) { var y = Math.floor(m / 12), mm = m % 12; return [y ? plural(y, 'año', 'años') : '', mm ? plural(mm, 'mes', 'meses') : ''].filter(Boolean).join(' y ') || '0 meses'; };

  function pathYearsHtml(r) {
    var n = Math.ceil(r.totalRows / 12), segs = '';
    for (var i = 0; i < n; i++) { var f = Math.max(0, Math.min(1, (r.paidRows - i * 12) / 12)); segs += '<i class="seg ' + (f >= 1 ? 'on' : f > 0 ? 'part' : '') + '" style="--i:' + i + ';--p:' + f.toFixed(2) + '" data-tip="Año ' + (i + 1) + '"></i>'; }
    return '<div class="path" aria-label="Avance por año">' + segs + '</div><div class="path-cap"><span>' + spanYM(r.totalRows) + ' de plazo</span><span>' + r.paidRows + ' pagadas · ' + r.remRows + ' por pagar</span></div>';
  }

  function tResumenL(p, r) {
    if (!r.ok) return '<div class="card"><h2>Completa los datos de tu crédito</h2><p class="muted">Faltan el monto del préstamo, la tasa, el plazo o el mes de la primera cuota.</p><div class="actions"><button class="btn" data-a="edit-loan">Completar datos</button></div></div>';
    var h = '', late = r.rows.filter(function (x) { return x.status === 'vencida'; }).length;
    if (late) h += '<div class="note">Hay ' + plural(late, 'cuota', 'cuotas') + ' sin registrar. Anótalas en <b>Pagos</b> (puedes agregar varios meses de una vez).</div>';
    var eyebrow = [p.unit ? 'Apto ' + p.unit : '', p.bank, 'Crédito'].filter(Boolean).join(' · ');
    h += '<section class="card hero"><div class="hero-grid"><div class="hero-text">' + (p.logo ? '<div class="hero-logo">' + lg(p, 'l') + '</div>' : '') + '<div class="eyebrow">' + esc(eyebrow) + '</div>' +
      '<h1 class="hero-title">' + esc(p.name || 'Mi proyecto') + '</h1><div class="hero-meta">' + (p.size ? '<span>' + p.size + ' m²</span>' : '') + '<span>Préstamo original ' + Q(r.principal) + '</span></div>' +
      '<div class="kpis"><div class="kpi"><small>Debes</small><b>' + cq(r.saldo) + '</b></div><div class="kpi"><small>Ya pagaste al capital</small><b>' + cq(r.capitalPaid) + '</b></div>' +
      (r.price ? '<div class="kpi"><small>Tu parte del apto</small><b>' + cp(r.pctOwned) + '</b></div>' : '') + '</div></div>' + ringHtml(r.pctPaid, 'del préstamo') + '</div>' + pathYearsHtml(r) + '</section>';
    var nx = r.next;
    if (nx) h += '<div class="card next"><div class="ic">' + ic('calendar') + '</div><div class="tx"><b>Próxima cuota · ' + fmtMonth(nx.month) + '</b><span>Capital ' + Q(nx.principal) + ' · Interés ' + Q(nx.interest) + (r.fixed ? ' · IUSI/seguro ' + Q(r.fixed) : '') +
      (nx.status === 'vencida' ? ' <span class="tag" style="background:rgba(240,112,127,.15);color:var(--bad)">Atrasada</span>' : '') + '</span></div><div class="am">' + Q(Math.max(0, nx.need - nx.paid)) + '</div></div>';
    else h += '<div class="card next"><div class="ic">' + ic('check') + '</div><div class="tx"><b>¡Crédito pagado!</b><span>Terminaste de pagar tu apartamento. Felicidades.</span></div></div>';
    h += '<div class="grid">' +
      stat('Cuotas pagadas', cn(r.paidRows) + '<small style="display:inline;font-size:.5em;letter-spacing:0;color:var(--mut);margin-left:6px;font-family:var(--sans)">de ' + r.totalRows + '</small>', 'meses al día con el banco', 'ok') +
      stat('Te faltan', cn(r.remRows) + '<small style="display:inline;font-size:.5em;letter-spacing:0;color:var(--mut);margin-left:6px;font-family:var(--sans)">cuotas</small>', r.endMonth ? 'terminas en ' + fmtMonth(r.endMonth) : '') +
      stat('Cuota mensual', cq(r.totalMonthly), 'al banco' + (r.maint ? ' · + ' + Q(r.maint) + ' de mantenimiento' : ''), 'hero') +
      stat('Intereses pagados', cq(r.interestPaid), 'de ' + Q(r.interestTotal) + ' en total') +
      stat('Intereses por pagar', cq(r.interestRem), 'si sigues este plan') +
      (r.abonosTotal ? stat('Abonado a capital', cq(r.abonosTotal), (r.interestSaved ? 'te ahorra ' + Q(r.interestSaved) + ' de interés' : '') + (r.monthsSaved ? ' · ' + spanYM(r.monthsSaved) + ' menos' : ''), 'abono') : '') +
      (r.price ? stat('Tu parte del apto', cq(r.owned), 'de ' + Q(r.price) + ' de valor') : '') + '</div>';
    h += '<div class="card"><h2>Saldo de tu préstamo</h2><p class="muted" style="margin:-4px 0 10px">Cuánto capital te falta pagar con el tiempo. <a href="#" data-a="goto-tab" data-id="amort" class="lnk">Ver tabla</a></p>' + balanceChart(r) + '</div>';
    h += '<div class="card"><h2>¿Cuánto es capital y cuánto intereses?</h2>' + splitBar(r) + '</div>';
    return h;
  }

  /* gráfica de saldo: área de una serie (+ comparación sin abonos), cruz de lectura y tooltip */
  var chartSeq = 0;
  function niceStep(max, ticks) { var raw = max / ticks, pow = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / pow; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow; }
  var compact = function (v) { return v >= 1e6 ? 'Q ' + (Math.round(v / 1e5) / 10) + ' M' : v >= 1e3 ? 'Q ' + Math.round(v / 1e3) + ' K' : 'Q ' + Math.round(v); };
  function balanceChart(r) {
    var cw = document.documentElement.clientWidth || 390, W = Math.max(280, Math.min(940, cw - 70)), H = W < 520 ? 230 : 290, m = { l: W < 520 ? 52 : 62, r: 14, t: 24, b: 30 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var rows = r.rows, base = r.abonosTotal > 0 && r.baseRows && r.baseRows.length ? r.baseRows : null, N = Math.max(rows.length, base ? base.length : 0), max = r.principal || 1, start = rows[0].month;
    var X = function (i) { return m.l + (N ? i / N * pw : 0); }, Y = function (v) { return m.t + ph - Math.min(1, Math.max(0, v / max)) * ph; };
    var vals = [r.principal].concat(rows.map(function (x) { return x.balance; })), bvals = base ? [r.principal].concat(base.map(function (x) { return x.balance; })) : null;
    var line = function (a) { return a.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(''); };
    var step = niceStep(max, 4), grid = '', g;
    for (g = 0; g <= max * 1.001; g += step) grid += '<line class="gl" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(g).toFixed(1) + '" y2="' + Y(g).toFixed(1) + '"/><text class="ax" x="' + (m.l - 8) + '" y="' + (Y(g) + 4).toFixed(1) + '" text-anchor="end">' + compact(g) + '</text>';
    var ystep = 12 * Math.max(1, Math.ceil(N / 12 / (W < 520 ? 4 : 7))), xt = '', i;
    for (i = 0; i <= N; i += ystep) xt += '<text class="ax" x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + (i === 0 ? 'start' : 'middle') + '">' + C.addMonths(start, i).slice(0, 4) + '</text>';
    var td = Math.min(r.paidRows, vals.length - 1), tx = X(td), ty = Y(r.saldo), onRight = tx > W * 0.6;
    var area = line(vals) + 'L' + X(vals.length - 1).toFixed(1) + ' ' + Y(0).toFixed(1) + 'L' + X(0).toFixed(1) + ' ' + Y(0).toFixed(1) + 'Z';
    var id = 'ch' + (++chartSeq); S.charts = S.charts || {}; S.charts[id] = { W: W, m: m, N: N, pw: pw, X: X, Y: Y, vals: vals, bvals: bvals, start: start, today: td };
    return '<div class="chart" id="' + id + '" tabindex="0" role="group" aria-label="Saldo del préstamo: de ' + Q(r.principal) + ' hoy ' + Q(r.saldo) + ' hasta cero en ' + fmtMonth(r.endMonth) + '. Con las flechas puedes recorrer mes a mes.">' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-hidden="true">' + grid + xt + '<path class="ar" d="' + area + '"/>' + (bvals ? '<path class="ln lb" d="' + line(bvals) + '"/>' : '') + '<path class="ln lm" d="' + line(vals) + '"/>' +
      '<circle class="dot" cx="' + tx.toFixed(1) + '" cy="' + ty.toFixed(1) + '" r="5"/><text class="tl" x="' + (onRight ? tx - 9 : tx + 9).toFixed(1) + '" y="' + (ty - 10).toFixed(1) + '" text-anchor="' + (onRight ? 'end' : 'start') + '">Hoy · ' + compact(r.saldo) + '</text>' +
      '<line class="xh" y1="' + m.t + '" y2="' + (m.t + ph) + '" style="display:none"/><circle class="d1" r="5" style="display:none"/><circle class="d2" r="4" style="display:none"/><rect class="hit" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '"/></svg><div class="ctip" role="status"></div></div>' +
      (bvals ? '<div class="legend"><span><i class="lk" style="background:var(--cap)"></i>Saldo con tus abonos</span><span><i class="lk" style="background:var(--mut)"></i>Sin abonos</span></div>' : '');
  }
  function bindCharts() {
    Array.prototype.forEach.call($app.querySelectorAll('.chart'), function (el) {
      var s = S.charts && S.charts[el.id]; if (!s) return;
      var svg = el.querySelector('svg'), xh = el.querySelector('.xh'), d1 = el.querySelector('.d1'), d2 = el.querySelector('.d2'), tip = el.querySelector('.ctip'), idx = null;
      function row(color, label, value) { var d = document.createElement('div'); d.className = 'tr'; var k = document.createElement('i'); k.className = 'lk'; k.style.background = color; var l = document.createElement('span'); l.textContent = label; var v = document.createElement('b'); v.textContent = value; d.appendChild(k); d.appendChild(l); d.appendChild(v); return d; }
      function show(i) {
        i = Math.max(0, Math.min(s.vals.length - 1, i)); idx = i; var x = s.X(i);
        xh.setAttribute('x1', x); xh.setAttribute('x2', x); xh.style.display = ''; d1.setAttribute('cx', x); d1.setAttribute('cy', s.Y(s.vals[i])); d1.style.display = '';
        if (s.bvals) { var bi = Math.min(i, s.bvals.length - 1); d2.setAttribute('cx', x); d2.setAttribute('cy', s.Y(s.bvals[bi])); d2.style.display = ''; }
        tip.textContent = ''; var t = document.createElement('div'); t.className = 'tm'; t.textContent = i === 0 ? 'Inicio del crédito' : fmtMonth(C.addMonths(s.start, i - 1)) + ' · cuota ' + i; tip.appendChild(t);
        tip.appendChild(row('var(--cap)', s.bvals ? 'Con tus abonos' : 'Saldo', Q(s.vals[i])));
        if (s.bvals) tip.appendChild(row('var(--mut)', 'Sin abonos', Q(s.bvals[Math.min(i, s.bvals.length - 1)])));
        var frac = x / s.W; tip.style.left = (frac * 100) + '%'; tip.style.transform = 'translateX(' + (frac > .6 ? '-104%' : '4%') + ')'; tip.classList.add('on');
      }
      function hide() { idx = null; xh.style.display = 'none'; d1.style.display = 'none'; d2.style.display = 'none'; tip.classList.remove('on'); }
      svg.addEventListener('pointermove', function (e) { var rc = svg.getBoundingClientRect(); show(Math.round(((e.clientX - rc.left) / rc.width * s.W - s.m.l) / s.pw * s.N)); });
      svg.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') hide(); });
      el.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); show((idx == null ? s.today : idx) + (e.key === 'ArrowLeft' ? -1 : 1)); } else if (e.key === 'Escape') hide(); });
      el.addEventListener('blur', hide);
    });
  }
  function splitBar(r) {
    var tot = r.principal + r.interestTotal, pc = tot ? r.principal / tot * 100 : 0, pi = 100 - pc;
    return '<div class="stackbar" role="img" aria-label="Capital ' + pc.toFixed(0) + '% e intereses ' + pi.toFixed(0) + '% del total a pagar"><i class="sb cap" data-tip="Capital: ' + Q(r.principal) + ' (' + pc.toFixed(1) + '%)" style="flex:' + pc.toFixed(2) + '"></i><i class="sb int" data-tip="Intereses: ' + Q(r.interestTotal) + ' (' + pi.toFixed(1) + '%)" style="flex:' + pi.toFixed(2) + '"></i></div>' +
      '<div class="legend big"><span><i class="lk" style="background:var(--cap)"></i><b>Capital</b> ' + Q(r.principal) + ' · ' + pc.toFixed(0) + '%</span><span><i class="lk" style="background:var(--int)"></i><b>Intereses</b> ' + Q(r.interestTotal) + ' · ' + pi.toFixed(0) + '%</span></div>' +
      '<p class="muted" style="margin:12px 0 0">En total pagarías ' + Q(tot) + ' al banco por un préstamo de ' + Q(r.principal) + '. De cada Q100 que pagas, Q' + pi.toFixed(0) + ' son intereses.</p>';
  }
  // tooltip genérico para marcas con data-tip (barras, segmentos)
  var gtip = null;
  document.addEventListener('pointerover', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (!t) return; if (!gtip) { gtip = document.createElement('div'); gtip.id = 'gtip'; document.body.appendChild(gtip); } gtip.textContent = t.dataset.tip; var rc = t.getBoundingClientRect(); gtip.style.left = Math.min(window.innerWidth - 12, Math.max(12, rc.left + rc.width / 2)) + 'px'; gtip.style.top = (rc.top - 8) + 'px'; gtip.classList.add('on'); });
  document.addEventListener('pointerout', function (e) { if (gtip && e.target.closest && e.target.closest('[data-tip]')) gtip.classList.remove('on'); });

  function tPagosL(p, r) {
    var L = p.loan || {}, e = S.editing ? (L.payments || []).filter(function (x) { return x.id === S.editing; })[0] : null, due = r.ok ? (r.next ? Math.max(0, r.next.need - r.next.paid) : r.totalMonthly) : 0;
    var h = '<div class="card"><h2>' + (e ? 'Editar pago' : 'Registrar pago de la cuota') + '</h2><div class="row"><div><label>Fecha<input type="date" id="lp_date" value="' + (e ? e.date : today()) + '"></label></div>' +
      '<div><label>Monto pagado al banco (Q)<input type="number" inputmode="decimal" step="0.01" id="lp_amt" value="' + (e ? e.amount : '') + '" placeholder="' + (due ? due.toFixed(2) : '0.00') + '"></label></div></div>' +
      '<label style="margin-top:10px">Nota (opcional)<input id="lp_note" value="' + esc(e ? e.note : '') + '" placeholder="Ej. débito automático, boleta 1234"></label>' +
      (due ? '<div class="chips"><span class="muted">Atajo:</span><button class="chip" data-a="fill-lp" data-id="' + due.toFixed(2) + '">Cuota ' + Q(due) + '</button></div>' : '') +
      '<p class="muted" style="margin:8px 0 0">Es lo que pagas al banco cada mes (cuota' + (r.fixed ? ' + IUSI y seguro' : '') + ').</p>' +
      '<div class="actions"><button class="btn" data-a="lp-save">' + (e ? 'Guardar cambios' : 'Agregar pago') + '</button>' + (e ? '<button class="btn ghost" data-a="cancel-edit">Cancelar</button>' : '') + '</div></div>';
    if (!e) {
      var first = r.next ? r.next.month : C.curMonth();
      h += '<div class="card"><details><summary>Registrar varios meses de una vez</summary><p class="muted">Útil si no has anotado tus pagos anteriores. Crea un pago por mes con el mismo monto.</p><div class="row">' +
        '<div><label>Primer mes<input type="month" id="lb_start" value="' + first + '"></label></div><div><label>Cantidad de meses<input type="number" inputmode="numeric" min="1" max="360" id="lb_n" value="' + Math.max(1, Math.min(24, r.rows.filter(function (x) { return x.status === 'vencida'; }).length || 3)) + '"></label></div>' +
        '<div><label>Monto por mes (Q)<input type="number" inputmode="decimal" step="0.01" id="lb_amt" value="' + (r.ok ? r.totalMonthly : '') + '"></label></div></div><div class="actions"><button class="btn sec" data-a="lb-save">Agregar todos</button></div></details></div>';
      h += '<div class="card"><h2>Abono extra a capital</h2><p class="muted">Un pago adicional para bajar tu deuda. Pregunta a tu banco si el abono reduce el <b>plazo</b> o la <b>cuota</b>; algunos te dejan elegir.</p><div class="row">' +
        '<div><label>Fecha<input type="date" id="la_date" value="' + today() + '"></label></div><div><label>Monto del abono (Q)<input type="number" inputmode="decimal" step="0.01" id="la_amt" placeholder="0.00"></label></div></div>' +
        '<div class="row" style="margin-top:10px"><div><label>El banco lo aplica para<select id="la_mode"><option value="plazo">Pagar menos meses (reduce el plazo)</option><option value="cuota">Bajar la cuota mensual</option></select></label></div><div><label>Nota (opcional)<input id="la_note" placeholder="Ej. bono de fin de año"></label></div></div>' +
        '<div class="actions"><button class="btn" data-a="la-save">Registrar abono</button></div></div>';
    }
    var pays = r.payments.slice().reverse();
    h += '<div class="card"><h2>Pagos de la cuota (' + pays.length + ')</h2>' + (pays.length ? '<div class="tbl-wrap"><table class="table"><thead><tr><th>Fecha</th><th class="n">Monto</th><th class="hide-s">Nota</th><th></th></tr></thead><tbody>' +
      pays.map(function (x) { return '<tr><td>' + fmtDate(x.date) + '</td><td class="n">' + Q(x.amount) + '</td><td class="hide-s muted">' + esc(x.note) + '</td><td class="n"><button class="btn ghost sm" data-a="lp-edit" data-id="' + x.id + '">Editar</button> <button class="btn danger sm" data-a="lp-del" data-id="' + x.id + '" aria-label="Eliminar">' + ic('x') + '</button></td></tr>'; }).join('') +
      '</tbody></table></div><div class="kv" style="margin-top:8px"><span>Total pagado al banco</span><b>' + Q(r.paidTotal) + '</b></div>' : '<p class="muted">Aún no hay pagos registrados.</p>') + '</div>';
    if (r.abonos.length) h += '<div class="card"><h2>Abonos a capital (' + r.abonos.length + ')</h2><div class="tbl-wrap"><table class="table"><thead><tr><th>Fecha</th><th class="n">Monto</th><th>Aplicado a</th><th></th></tr></thead><tbody>' +
      r.abonos.slice().reverse().map(function (x) { return '<tr><td>' + fmtDate(x.date) + '</td><td class="n ab">' + Q(x.amount) + '</td><td>' + (x.mode === 'cuota' ? 'Bajar cuota' : 'Reducir plazo') + '</td><td class="n"><button class="btn danger sm" data-a="la-del" data-id="' + x.id + '" aria-label="Eliminar">' + ic('x') + '</button></td></tr>'; }).join('') +
      '</tbody></table></div><div class="kv" style="margin-top:8px"><span>Total abonado</span><b class="ab">' + Q(r.abonosTotal) + '</b></div></div>';
    return h;
  }

  function tAmort(p, r) {
    if (!r.ok) return '<div class="card"><p class="muted">Completa los datos del crédito en la pestaña Proyecto.</p></div>';
    var v = S.amView || 'prox', chips = [['prox', 'Próximas'], ['anio', 'Por año'], ['todas', 'Todas']].map(function (c) { return '<button class="chip' + (v === c[0] ? ' on' : '') + '" data-a="am-view" data-id="' + c[0] + '">' + c[1] + '</button>'; }).join('');
    var h = '<div class="card"><h2>Tabla de amortización</h2><p class="muted">Cómo se reparte cada cuota entre capital e intereses, y cuánto vas debiendo. Al principio pagas más intereses; con el tiempo, más capital.</p><div class="chips" style="margin:6px 0 12px">' + chips + '</div>';
    if (v === 'anio') {
      var ys = {}, order = []; r.rows.forEach(function (x, j) { var y = x.month.slice(0, 4); if (!ys[y]) { ys[y] = { y: y, n: 0, pay: 0, cap: 0, int: 0, bal: 0, done: 0 }; order.push(y); } var o = ys[y]; o.n++; o.pay += x.payment + x.extra; o.cap += x.principal + x.extra; o.int += x.interest; o.bal = x.balance; if (j < r.paidRows) o.done++; });
      h += '<div class="tbl-wrap"><table class="table"><thead><tr><th>Año</th><th class="n hide-s">Pagos</th><th class="n">Capital</th><th class="n">Intereses</th><th class="n">Saldo final</th></tr></thead><tbody>' +
        order.map(function (y) { var o = ys[y]; return '<tr><td>' + o.y + (o.done === o.n ? ' <span class="badge b-pagada">listo</span>' : '') + '</td><td class="n hide-s">' + Q(o.pay) + '</td><td class="n">' + Q(o.cap) + '</td><td class="n" style="color:var(--int)">' + Q(o.int) + '</td><td class="n">' + Q(o.bal) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    } else {
      var list = v === 'todas' ? r.rows : r.rows.slice(Math.max(0, r.paidRows - 2), r.paidRows + 12);
      h += '<div class="tbl-wrap"><table class="table"><thead><tr><th>#</th><th>Mes</th><th class="n hide-s">Cuota</th><th class="n hide-s">Capital</th><th class="n hide-s">Interés</th><th class="n">Saldo</th><th>Estado</th></tr></thead><tbody>' +
        list.map(function (x) { return '<tr><td>' + x.n + '</td><td>' + fmtMonth(x.month) + (x.extra ? ' <span class="tag" style="background:rgba(139,108,240,.16);color:var(--violet)">+ abono</span>' : '') + '</td><td class="n hide-s">' + Q(x.payment) + '</td><td class="n hide-s">' + Q(x.principal) + '</td><td class="n hide-s">' + Q(x.interest) + '</td><td class="n">' + Q(x.balance) + '</td><td><span class="badge b-' + x.status + '">' + x.status + '</span></td></tr>'; }).join('') + '</tbody></table></div>';
      if (v === 'prox') h += '<p class="muted" style="margin:10px 0 0">Mostrando las próximas cuotas. Usa “Todas” para ver las ' + r.totalRows + '.</p>';
    }
    return h + '</div><p class="muted">La tabla es una proyección con tasa fija. Si tu banco ajusta la tasa o cobra cargos, tus cuotas reales pueden variar un poco.</p>';
  }

  function simOutHtml(p, r) {
    var s2 = S.sim2 || {}, a = +s2.amt || 0, mo = +s2.mon || 0;
    if (!a && !mo) return '<p class="muted" style="margin:14px 0 0">Escribe un monto para ver el resultado.</p>';
    var s = C.loanSimulate(p, { amount: a, mode: s2.mode || 'plazo', monthlyExtra: mo > 0 ? { amount: mo, from: r.next ? r.next.month : C.curMonth() } : null });
    return '<div class="grid" style="margin:16px 0 0">' +
      stat('Terminarías en', s.endMonth ? fmtMonth(s.endMonth) : '—', s.monthsSaved > 0 ? spanYM(s.monthsSaved) + ' antes que hoy' : 'sin cambio de plazo', s.monthsSaved > 0 ? 'ok' : '') +
      stat('Ahorrarías en intereses', mh(s.interestSaved), 'frente a seguir como vas', 'hero') +
      (a > 0 && (s2.mode === 'cuota') ? stat('Tu cuota bajaría a', mh(s.newPayment + r.fixed), 'antes ' + Q(r.payNow + r.fixed) + ' al mes') : '') +
      stat('Intereses totales', mh(s.interestTotal), 'antes ' + Q(r.interestTotal)) + '</div>';
  }
  function tSim(p, r) {
    if (!r.ok) return '<div class="card"><p class="muted">Completa los datos del crédito en la pestaña Proyecto.</p></div>';
    S.sim2 = S.sim2 || { amt: '', mode: 'plazo', mon: '' }; var s2 = S.sim2;
    return '<div class="card"><h2>¿Y si abono más?</h2><p class="muted">Simula un abono a capital y mira cuánto te ahorras en intereses. Pregunta a tu banco si el abono reduce el plazo o la cuota.</p>' +
      '<div class="row" style="margin-top:12px"><div><label>Abono único (Q)<input type="number" inputmode="decimal" id="s_amt" value="' + esc(s2.amt) + '" placeholder="0.00"></label></div><div><label>Abono mensual (Q)<input type="number" inputmode="decimal" id="s_mon" value="' + esc(s2.mon) + '" placeholder="0.00"></label></div></div>' +
      '<div class="chips"><span class="muted">Abono único:</span>' + [10000, 25000, 50000, 100000].map(function (v) { return '<button class="chip" data-a="sim-fill" data-id="' + v + '">' + Q(v).replace('.00', '') + '</button>'; }).join('') + '</div>' +
      '<label style="margin-top:14px">Tu banco lo aplica para</label><div class="seg2" id="simMode"><button type="button" data-a="sim-mode" data-id="plazo" class="' + (s2.mode !== 'cuota' ? 'on' : '') + '">Pagar menos meses</button><button type="button" data-a="sim-mode" data-id="cuota" class="' + (s2.mode === 'cuota' ? 'on' : '') + '">Bajar la cuota</button></div>' +
      '<div id="sim_out">' + simOutHtml(p, r) + '</div></div>' +
      '<div class="card"><h2>El costo real de tu crédito</h2><div class="kv"><span>Préstamo</span><b>' + Q(r.principal) + '</b></div><div class="kv"><span>Intereses totales (plan actual)</span><b style="color:var(--int)">' + Q(r.interestTotal) + '</b></div><div class="kv"><span>Total a pagar al banco</span><b>' + Q(r.totalToPay) + '</b></div><div class="kv"><span>Los intereses son</span><b>' + (r.principal ? (r.interestTotal / r.principal * 100).toFixed(0) : 0) + '% del préstamo</b></div></div>';
  }
  function refreshSim() { var p = cur(), o = $('sim_out'); if (p && o && isLoan(p)) o.innerHTML = simOutHtml(p, C.loanCompute(p)); }

  function colorPicker(p, pre) { return '<label style="margin-top:14px">Color del proyecto</label><div class="swatches" id="' + pre + 'sw">' + ACCENTS.map(function (a) { return '<button type="button" class="sw' + (a.k === accentOf(p.color) ? ' on' : '') + '" style="--c1:' + a.c1 + ';--c2:' + a.c2 + '" data-a="color" data-v="' + a.k + '" data-pre="' + pre + '" title="' + a.n + '" aria-label="' + a.n + '"></button>'; }).join('') + '</div>'; }
  function loanFields(p, pre, setup) {
    var L = p.loan || {};
    return '<div class="row">' + field(pre + 'name', 'Proyecto', p.name) + field(pre + 'unit', 'Apartamento', p.unit) + field(pre + 'bank', 'Banco', p.bank) + '</div>' +
      '<div class="row" style="margin-top:10px">' + field(pre + 'price', 'Valor del apartamento (Q)', p.price || '', 'number') + field(pre + 'principal', 'Monto del préstamo (Q)', L.principal || '', 'number') + '</div>' +
      '<div class="row" style="margin-top:10px">' + field(pre + 'rate', 'Tasa anual (%)', L.rate, 'number') + field(pre + 'years', 'Plazo (años)', L.years, 'number') + field(pre + 'start', 'Mes de la 1.ª cuota', L.startMonth, 'month') + '</div>' +
      '<div class="row" style="margin-top:10px">' + field(pre + 'payment', 'Cuota del banco (Q, opcional)', L.payment || '', 'number') + field(pre + 'iusi', 'IUSI mensual (Q)', p.iusi, 'number') + field(pre + 'seguro', 'Seguro mensual (Q)', p.seguro, 'number') + field(pre + 'mant', 'Mantenimiento (Q)', p.mantenimiento, 'number') + '</div>' +
      '<p class="muted" style="margin:8px 0 0">Si dejas la cuota vacía, la app la calcula con el monto, la tasa y el plazo. Si tu banco te dio una cuota exacta, escríbela. El IUSI y el seguro se suman solo si el banco te los cobra junto con la cuota.</p>' +
      (setup ? '<div class="row" style="margin-top:14px">' + field(pre + 'paid', 'Cuotas que ya pagaste', setup.paid, 'number') + '</div><p class="muted" style="margin:8px 0 0">La app las registra por ti, con el monto de cada cuota. Podrás editarlas o borrarlas después.</p>' : '') + colorPicker(p, pre);
  }
  function readLoanForm(pre, base) {
    var L = Object.assign({}, base.loan || {}, { principal: numv(pre + 'principal'), rate: numv(pre + 'rate'), years: numv(pre + 'years'), startMonth: val(pre + 'start') || C.curMonth(), payment: numv(pre + 'payment') });
    return Object.assign({}, base, { name: val(pre + 'name').trim(), unit: val(pre + 'unit').trim(), bank: val(pre + 'bank').trim(), price: numv(pre + 'price'), iusi: numv(pre + 'iusi'), seguro: numv(pre + 'seguro'), mantenimiento: numv(pre + 'mant'), loan: L, rate: L.rate, years: L.years });
  }
  function paidPayments(p, n) {
    var s = C.loanSchedule(p.loan), fx = (+p.iusi || 0) + (+p.seguro || 0), out = [];
    for (var k = 0; k < Math.min(n, s.rows.length); k++) out.push({ id: uid(), date: s.rows[k].month + '-15', amount: C.r2(s.rows[k].payment + fx), note: '' });
    return out;
  }
  function openChooser() {
    closeSheet(); var d = document.createElement('div'); d.className = 'sheet-back'; d.id = 'sheet';
    d.innerHTML = '<div class="sheet" role="dialog" aria-label="Nuevo proyecto"><h2>Nuevo proyecto</h2><p class="muted" style="margin:-4px 0 14px">¿En qué etapa estás?</p>' +
      '<button class="opt" data-a="new-pdf"><span class="oi">' + ic('upload') + '</span><span><b>Estoy pagando el enganche</b><small>Sube la cotización en PDF y la app arma tu plan.</small></span></button>' +
      '<button class="opt" data-a="new-loan"><span class="oi">' + ic('home') + '</span><span><b>Ya pago el crédito del banco</b><small>Registra tu préstamo y sigue tu saldo, intereses y abonos.</small></span></button>' +
      '<button class="opt" data-a="new-manual"><span class="oi">' + ic('file') + '</span><span><b>Llenar el enganche a mano</b><small>Sin PDF: escribes los datos tú.</small></span></button>' +
      '<div class="actions" style="justify-content:flex-end"><button class="btn ghost sm" data-a="sheet-x">Cancelar</button></div></div>';
    d.addEventListener('click', function (e) { if (e.target === d) closeSheet(); });
    Array.prototype.forEach.call(d.querySelectorAll('[data-a]'), function (b) { b.onclick = function (ev) { ev.preventDefault(); act(b.dataset.a, b.dataset.id, b); }; });
    document.body.appendChild(d);
  }
  function closeSheet() { var d = $('sheet'); if (d) d.remove(); }
  function bindLoanDraft() {
    var st = $('d_start'), pc = $('d_paid'); if (!st || !pc) return; pc.dataset.auto = (S.importDraft && S.importDraft.converting) ? '0' : '1';
    pc.oninput = function () { pc.dataset.auto = '0'; };
    st.oninput = st.onchange = function () { if (pc.dataset.auto === '1') pc.value = monthsBetween(st.value, C.curMonth()); };
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', function (e) { if (S.menu && !(e.target.closest && (e.target.closest('#menu') || e.target.closest('[data-a="menu"]')))) { S.menu = false; var m = $('menu'); if (m) m.remove(); } });
  function bind() {
    var sim = $('sim'); if (sim) sim.oninput = function () { S.sim = numv('sim'); var pp = cur(), o = $('sim_e'); if (pp && o) o.innerHTML = simEngHtml(pp, C.compute(pp)); };
    Array.prototype.forEach.call($app.querySelectorAll('[data-tab]'), function (b) { b.onclick = function () { S.tab = b.dataset.tab; S.editing = null; S.anim = true; render(); window.scrollTo(0, 0); }; });
    Array.prototype.forEach.call($app.querySelectorAll('[data-a]'), function (b) { b.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); act(b.dataset.a, b.dataset.id, b); }; });
    var sA = $('s_amt'), sM = $('s_mon');
    if (sA) sA.oninput = function () { S.sim2 = S.sim2 || {}; S.sim2.amt = sA.value; refreshSim(); };
    if (sM) sM.oninput = function () { S.sim2 = S.sim2 || {}; S.sim2.mon = sM.value; refreshSim(); };
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
      case 'new': openChooser(); break;
      case 'sheet-x': closeSheet(); break;
      case 'new-pdf': closeSheet(); startImport(false); break;
      case 'new-manual': closeSheet(); openDraft(newProject(), false); break;
      case 'new-loan': closeSheet(); S.importDraft = { kind: 'loan', isNew: true, logos: [], notes: [], project: newProject({ phase: 'credito', loan: { principal: 0, rate: 7.5, years: 25, startMonth: C.curMonth(), payment: '', abonos: [], payments: [] } }) }; showDraft(false); window.scrollTo(0, 0); break;
      case 'to-loan': {
        var rr = C.compute(p);
        S.importDraft = { kind: 'loan', converting: true, isNew: false, logos: [], notes: ['Tomamos los datos de tu etapa de enganche. Revísalos y ajusta lo que tu banco te haya confirmado.'],
          project: Object.assign({}, p, { phase: 'credito', loan: { principal: rr.financedNow, rate: p.rate || 7.5, years: p.years || 25, startMonth: C.addMonths(C.curMonth(), 1), payment: '', abonos: [], payments: [] } }) };
        showDraft(false); window.scrollTo(0, 0); break; }
      case 'to-enganche': if (confirm('¿Volver este proyecto a la etapa de enganche? Tus datos del crédito se conservan.')) { p.phase = 'enganche'; S.tab = 'resumen'; persist(p).then(function () { S.anim = true; render(); }); } break;
      case 'edit-loan': S.tab = 'proyecto'; S.anim = true; render(); break;
      case 'goto-tab': S.tab = id; S.anim = true; render(); window.scrollTo(0, 0); break;
      case 'am-view': S.amView = id; render(); break;
      case 'fill-lp': $('lp_amt').value = id; break;
      case 'lp-save': {
        var la = numv('lp_amt'); if (!la) return toast('Escribe el monto que pagaste');
        p.loan = p.loan || {}; p.loan.payments = p.loan.payments || []; var lrec = { id: S.editing || uid(), date: val('lp_date') || today(), amount: la, note: val('lp_note').trim() };
        if (S.editing) p.loan.payments = p.loan.payments.map(function (x) { return x.id === S.editing ? lrec : x; }); else p.loan.payments.push(lrec);
        S.editing = null; persist(p).then(function () { toast('Pago guardado'); render(); }); break; }
      case 'lp-edit': S.editing = id; render(); window.scrollTo(0, 0); break;
      case 'lp-del': if (confirm('¿Eliminar este pago?')) { p.loan.payments = p.loan.payments.filter(function (x) { return x.id !== id; }); persist(p).then(render); } break;
      case 'lb-save': {
        var bn = Math.round(numv('lb_n')), ba2 = numv('lb_amt'), bs = val('lb_start'); if (!bs || bn < 1 || !ba2) return toast('Revisa mes, cantidad y monto'); if (bn > 360) return toast('Máximo 360 meses');
        p.loan.payments = p.loan.payments || []; for (var q = 0; q < bn; q++) p.loan.payments.push({ id: uid(), date: C.addMonths(bs, q) + '-15', amount: ba2, note: '' });
        persist(p).then(function () { toast(bn + ' pagos agregados'); render(); }); break; }
      case 'la-save': {
        var aa = numv('la_amt'); if (!aa) return toast('Escribe el monto del abono');
        p.loan.abonos = p.loan.abonos || []; p.loan.abonos.push({ id: uid(), date: val('la_date') || today(), amount: aa, mode: val('la_mode') === 'cuota' ? 'cuota' : 'plazo', note: val('la_note').trim() });
        persist(p).then(function () { toast('Abono registrado'); render(); }); break; }
      case 'la-del': if (confirm('¿Eliminar este abono?')) { p.loan.abonos = p.loan.abonos.filter(function (x) { return x.id !== id; }); persist(p).then(render); } break;
      case 'sim-e-fill': S.sim = +id; if ($('sim')) $('sim').value = id; { var pe = cur(), oe = $('sim_e'); if (pe && oe) oe.innerHTML = simEngHtml(pe, C.compute(pe)); } break;
      case 'sim-fill': S.sim2 = S.sim2 || {}; S.sim2.amt = id; if ($('s_amt')) $('s_amt').value = id; refreshSim(); break;
      case 'sim-mode': S.sim2 = S.sim2 || {}; S.sim2.mode = id; Array.prototype.forEach.call($('simMode').children, function (b) { b.classList.toggle('on', b.dataset.id === id); }); refreshSim(); break;
      case 'home': S.importDraft = null; S.menu = false; go('home'); break;
      case 'menu': S.menu = !S.menu; render(); break;
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
      case 'logout': sb.auth.signOut().then(function () { S.user = null; S.projects = []; S.id = null; S.view = 'home'; S.needAuth = true; S.gate = 'landing'; S.menu = false; render(); }); break;
      case 'go-auth': S.gate = 'auth'; S.authMode = id === 'login' ? 'login' : 'signup'; try { history.pushState({ gate: 'auth' }, ''); } catch (e) { } renderAuth(); window.scrollTo(0, 0); break;
      case 'go-landing': S.gate = 'landing'; render(); window.scrollTo(0, 0); break;
      case 'auth-mode': S.authMode = id; S.authMail = val('a_mail') || S.authMail; renderAuth(); break;
      case 'migrate': migrateLocal(); break;
      case 'migrate-skip': try { localStorage.setItem('enganche.migrated.' + S.user.id, '1'); } catch (e) { } S.localList = []; render(); break;
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
      case 'save-proj': S.projects = S.projects.map(function (x) { return x.id === p.id ? (isLoan(p) ? readLoanForm('p_', p) : readForm('p_', p)) : x; }); persist(cur()).then(function () { toast('Proyecto guardado'); render(); }); break;
      case 'import-update': startImport(true); break;
      case 'del-proj':
        if (confirm('¿Eliminar "' + label(p) + '" y todos sus pagos y planos? No se puede deshacer.')) {
          Promise.all((p.files || []).map(function (f) { return Files.del(f.id).catch(function () { }); })).then(function () { return store.remove(p.id); }).then(function () { S.projects = S.projects.filter(function (x) { return x.id !== p.id; }); S.id = S.projects[0] ? S.projects[0].id : null; go('home'); });
        } break;
      case 'draft-pdf': startImport(false); break;
      case 'draft-cancel': S.importDraft = null; S.anim = true; render(); break;
      case 'draft-save':
        var d = S.importDraft, np = d.kind === 'loan' ? readLoanForm('d_', d.project) : readForm('d_', d.project);
        if (!np.name && !np.unit) return toast('Ponle nombre al proyecto');
        if (d.kind === 'loan') {
          if (!(np.loan.principal > 0) || !(np.loan.years > 0)) return toast('Escribe el monto del préstamo y el plazo en años');
          np.phase = 'credito'; np.loan.payments = np.loan.payments || [];
          var npaid = Math.round(numv('d_paid')); if (npaid > 0) np.loan.payments = np.loan.payments.concat(paidPayments(np, npaid));
        }
        S.importDraft = null;
        if (d.isNew) S.projects.push(np); else S.projects = S.projects.map(function (x) { return x.id === np.id ? np : x; });
        S.id = np.id; S.view = 'project'; S.tab = d.kind === 'loan' ? 'resumen' : (d.isNew ? 'pagos' : S.tab); S.anim = true;
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
  // Proyectos guardados en este navegador (modo local) que aún no están en la cuenta
  function localPending() {
    if (store.mode !== 'cloud' || !S.user) return [];
    try { if (localStorage.getItem('enganche.migrated.' + S.user.id)) return []; var l = JSON.parse(localStorage.getItem(LS) || '[]'), have = S.projects.map(function (p) { return p.id; }); return l.filter(function (p) { return p && p.id && have.indexOf(p.id) < 0; }); } catch (e) { return []; }
  }
  function migBanner() {
    var n = (S.localList || []).length; if (!n) return '';
    return '<div class="card next"><div class="ic">' + ic('upload') + '</div><div class="tx"><b>Encontramos ' + n + (n === 1 ? ' proyecto' : ' proyectos') + ' en este dispositivo</b><span>¿Quieres subirlos a tu cuenta, con sus planos?</span></div><div class="actions" style="margin:0"><button class="btn sm" data-a="migrate">Subir a mi cuenta</button><button class="btn ghost sm" data-a="migrate-skip">Ahora no</button></div></div>';
  }
  function migrateLocal() {
    var todo = S.localList || []; if (!todo.length) return; busy('Subiendo tus proyectos…');
    todo.reduce(function (pr, p) {
      return pr.then(function () {
        return (p.files || []).reduce(function (q, f) { return q.then(function () { return idbDo('readonly', function (s) { return s.get(f.id); }).then(function (b) { if (b) return Files.put(f.id, b); }).catch(function () { }); }); }, Promise.resolve())
          .then(function () { return store.save(p); }).then(function () { S.projects.push(p); });
      });
    }, Promise.resolve()).then(function () {
      try { localStorage.setItem('enganche.migrated.' + S.user.id, '1'); } catch (e) { } S.localList = []; unbusy(); toast(todo.length + ' proyecto(s) subidos a tu cuenta'); go('home');
    }).catch(function (e) { unbusy(); toast('No se pudo subir: ' + (e.message || e)); });
  }
  function boot() {
    var slow = store.mode === 'cloud'; if (slow) busy('Cargando tus proyectos…');
    store.load().then(function (list) {
      if (slow) unbusy(); S.projects = list; S.id = (list.filter(function (p) { return p.id === S.id; })[0] || list[0] || {}).id || null; S.view = 'home'; S.anim = true; S.localList = localPending(); render();
    }).catch(function (e) { if (slow) unbusy(); toast('No se pudieron cargar los datos: ' + (e.message || e)); render(); });
  }
  function init() {
    applyTheme();
    // Se retiró el guardado sin conexión (service worker): provocaba versiones viejas mezcladas. Limpia restos de versiones anteriores.
    try { if (navigator.serviceWorker) navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }); if (window.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); }); } catch (e) { }
    if (CFG.supabaseUrl && CFG.supabaseAnonKey) {
      busy('Conectando…');
      loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js').then(function () {
        sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey); store = Remote;
        sb.auth.onAuthStateChange(function (evt) { if (evt === 'PASSWORD_RECOVERY') { S.recovery = true; if (S.ready) { S.needAuth = true; S.gate = 'auth'; S.authMode = 'recover'; render(); } } });
        return sb.auth.getSession();
      }).then(function (r) {
        unbusy(); S.ready = true;
        if (S.recovery && r.data.session) { S.needAuth = true; S.gate = 'auth'; S.authMode = 'recover'; render(); }
        else if (r.data.session) { S.user = r.data.session.user; boot(); } else { S.needAuth = true; S.gate = 'landing'; render(); }
      }).catch(function (e) { unbusy(); store = store || Local; $app.innerHTML = '<div class="wrap"><p class="note">No se pudo conectar con la nube: ' + esc(e.message) + '</p></div>'; });
    } else { store = Local; boot(); }
  }
  init();
})();
