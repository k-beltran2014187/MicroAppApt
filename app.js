/* Mi Enganche — control de pagos de enganche y abonos. Sin build: JS clásico. */
(function () {
  'use strict';
  var C = window.EngancheCalc, CFG = window.ENGANCHE_CONFIG || {};
  var $app = document.getElementById('app');
  var LS = 'enganche.v1';
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /* ---------- utilidades ---------- */
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var Q = function (n) { return 'Q ' + (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var uid = function () { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var fmtMonth = function (ym) { if (!ym) return '—'; var p = ym.split('-'); return MES[+p[1] - 1] + ' ' + p[0]; };
  var fmtDate = function (d) { if (!d) return ''; var p = d.split('-'); return +p[2] + ' ' + MES[+p[1] - 1] + ' ' + p[0]; };
  var yrs = function (m) { return !isFinite(m) ? 'nunca' : Math.floor(m / 12) + ' a ' + (m % 12) + ' m'; };
  var toast = function (m) { var t = document.getElementById('toast'); t.textContent = m; t.className = 'on'; clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = ''; }, 2400); };
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var e = $(id); return e ? e.value : ''; };
  var numv = function (id) { return parseFloat(String(val(id)).replace(/,/g, '')) || 0; };

  /* ---------- almacenamiento ---------- */
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
    load: function () {
      return sb.from('projects').select('data').order('updated_at').then(function (r) { if (r.error) throw r.error; return r.data.map(function (x) { return x.data; }); });
    },
    save: function (p) {
      return sb.from('projects').upsert({ id: p.id, data: p, updated_at: new Date().toISOString() }).then(function (r) { if (r.error) throw r.error; });
    },
    remove: function (id) { return sb.from('projects').delete().eq('id', id).then(function (r) { if (r.error) throw r.error; }); }
  };
  function loadScript(src) {
    return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error('No se pudo cargar ' + src)); }; document.head.appendChild(s); });
  }

  /* ---------- estado ---------- */
  var S = { projects: [], id: null, tab: 'resumen', user: null, editing: null, importDraft: null, sim: 0 };
  var cur = function () { return S.projects.filter(function (p) { return p.id === S.id; })[0] || null; };
  function persist(p) { return store.save(p).catch(function (e) { toast('No se pudo guardar: ' + (e.message || e)); }); }

  function newProject(d) {
    d = d || {};
    return Object.assign({
      id: uid(), name: '', unit: '', size: null, price: 0, bank: '', engancheTotal: 0, enganchePct: 0, reserva: 0, months: 12, cuotaEnganche: 0,
      startMonth: C.curMonth(), rate: 7, years: 25, iusi: 0, seguro: 0, notes: '', payments: [], createdAt: new Date().toISOString()
    }, d);
  }

  /* ---------- pantallas ---------- */
  function render() {
    if (S.needAuth) return renderAuth();
    var p = cur();
    $app.innerHTML = headerHtml() + (p ? tabsHtml() + '<main><div class="wrap">' + tabHtml(p) + '</div></main>' : '<main><div class="wrap">' + welcomeHtml() + '</div></main>');
    var h = document.querySelector('header.top'); if (h) document.documentElement.style.setProperty('--hh', h.offsetHeight + 'px');
    bind();
  }

  function headerHtml() {
    var opts = S.projects.map(function (p) { return '<option value="' + p.id + '"' + (p.id === S.id ? ' selected' : '') + '>' + esc(label(p)) + '</option>'; }).join('');
    return '<header class="top"><div class="wrap"><span class="brand">🏠 Mi Enganche</span>' +
      (S.projects.length ? '<select id="sel" aria-label="Proyecto">' + opts + '</select>' : '') +
      '<button class="btn sec sm" data-a="new">+ Proyecto</button>' +
      (store.mode === 'cloud' ? '<button class="btn sec sm" data-a="logout">Salir</button>' : '') +
      '</div>' + (store.mode === 'cloud' && S.user ? '<div class="wrap who">' + esc(S.user.email) + '</div>' : '') + '</header>';
  }
  var label = function (p) { return (p.name || 'Proyecto') + (p.unit ? ' · Apto ' + p.unit : ''); };

  function tabsHtml() {
    var T = [['resumen', 'Resumen'], ['pagos', 'Pagos'], ['calendario', 'Calendario'], ['prestamo', 'Préstamo'], ['proyecto', 'Proyecto']];
    return '<nav class="tabs"><div class="wrap">' + T.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div></nav>';
  }

  function welcomeHtml() {
    return '<div class="card empty"><h2>Empieza con tu cotización</h2><p class="muted">Sube el PDF de la cotización y la app toma el proyecto, el precio, los meses de enganche, la cuota y los datos del préstamo.</p>' +
      '<div class="actions" style="justify-content:center"><button class="btn" data-a="new">Subir cotización (PDF)</button></div></div>' +
      (store.mode === 'local' ? '<p class="muted" style="text-align:center">Modo local: tus datos se guardan solo en este dispositivo. Mira <code>config.js</code> para activar cuentas y sincronización.</p>' : '');
  }

  function tabHtml(p) {
    var r = C.compute(p);
    return { resumen: tResumen, pagos: tPagos, calendario: tCalendario, prestamo: tPrestamo, proyecto: tProyecto }[S.tab](p, r);
  }

  function stat(l, v, sub, cls) { return '<div class="stat ' + (cls || '') + '"><small>' + l + '</small><b>' + v + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>'; }

  function tResumen(p, r) {
    var h = '';
    if (!p.price || !p.cuotaEnganche) h += '<div class="note">Faltan datos del proyecto (precio o cuota de enganche). Complétalos en la pestaña <b>Proyecto</b>.</div>';
    if (r.overpaid) h += '<div class="note">Has registrado ' + Q(r.overpaid) + ' más de lo que pide el enganche. Si fue un abono, muévelo a la columna “Abono”.</div>';
    h += '<div class="card"><h2>' + esc(label(p)) + '</h2><div class="muted">' + esc(p.bank) + (p.size ? ' · ' + p.size + ' m²' : '') + ' · Precio ' + Q(p.price) + '</div>' +
      '<div class="bar" aria-label="Avance del enganche"><i style="width:' + r.pctEng.toFixed(1) + '%"></i></div>' +
      '<div class="kv"><span>Enganche pagado</span><b>' + Q(r.paidEng) + ' de ' + Q(r.engTotal) + ' (' + r.pctEng.toFixed(1) + '%)</b></div></div>';
    h += '<div class="grid">' +
      stat('Falta de enganche', Q(r.remEng), r.cuotasFaltan + ' cuota' + (r.cuotasFaltan === 1 ? '' : 's') + ' por pagar') +
      stat('Cuotas pagadas', r.cuotasPagadas + ' / ' + r.months, 'meses llevas pagando', 'ok') +
      stat('Meses que faltan', r.cuotasFaltan, r.next ? 'Próxima: ' + esc(r.next.label) + (r.next.month ? ' (' + fmtMonth(r.next.month) + ')' : '') : '¡Enganche completo!') +
      stat('Abonado', Q(r.abonos), 'a capital, aparte del enganche', 'abono') +
      stat('Cuota del préstamo', Q(r.totalNow), r.abonos ? 'antes ' + Q(r.totalOrig) + ' (con IUSI)' : 'incluye IUSI y seguro') +
      stat('A financiar', Q(r.financedNow), r.abonos ? 'antes ' + Q(r.financedOrig) : 'precio − enganche') + '</div>';
    return h;
  }

  function tPagos(p, r) {
    var e = S.editing ? p.payments.filter(function (x) { return x.id === S.editing; })[0] : null;
    var h = '<div class="card"><h2>' + (e ? 'Editar pago' : 'Registrar pago') + '</h2><div class="row">' +
      '<div><label>Fecha<input type="date" id="f_date" value="' + (e ? e.date : today()) + '"></label></div>' +
      '<div><label>Para el enganche (Q)<input type="number" inputmode="decimal" step="0.01" id="f_eng" value="' + (e ? e.enganche : '') + '" placeholder="0.00"></label></div>' +
      '<div><label>Abono extra (Q)<input type="number" inputmode="decimal" step="0.01" id="f_ab" value="' + (e ? e.abono : '') + '" placeholder="0.00"></label></div></div>' +
      '<label style="margin-top:10px">Nota (opcional)<input id="f_note" value="' + esc(e ? e.note : '') + '" placeholder="Ej. depósito BI, boleta 1234"></label>' +
      '<div class="chips"><span class="muted">Atajos:</span>' +
      (p.cuotaEnganche ? '<button class="chip" data-a="fill-cuota">Cuota ' + Q(p.cuotaEnganche) + '</button>' : '') +
      (p.reserva ? '<button class="chip" data-a="fill-reserva">Reserva ' + Q(p.reserva) + '</button>' : '') + '</div>' +
      '<p class="muted" style="margin:8px 0 0">Si depositaste de más (ej. cuota + Q500), pon la cuota en “enganche” y el excedente en “abono”.</p>' +
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
    if (!r.payments.length) h += '<p class="muted">Aún no hay pagos registrados.</p>';
    else h += '<div class="tbl-wrap"><table class="table"><thead><tr><th>Fecha</th><th class="n">Enganche</th><th class="n">Abono</th><th class="hide-s">Nota</th><th></th></tr></thead><tbody>' +
      r.payments.slice().reverse().map(function (x) {
        return '<tr><td>' + fmtDate(x.date) + '</td><td class="n">' + (x.enganche ? Q(x.enganche) : '—') + '</td><td class="n ab">' + (x.abono ? Q(x.abono) : '—') + '</td><td class="hide-s muted">' + esc(x.note) + '</td>' +
          '<td class="n"><button class="btn ghost sm" data-a="edit" data-id="' + x.id + '">Editar</button> <button class="btn danger sm" data-a="del-pay" data-id="' + x.id + '">✕</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="kv" style="margin-top:8px"><span>Total enganche</span><b>' + Q(r.paidEng) + '</b></div><div class="kv"><span>Total abonos</span><b class="ab">' + Q(r.abonos) + '</b></div>';
    return h + '</div>';
  }

  function tCalendario(p, r) {
    if (!r.schedule.length) return '<div class="card"><p class="muted">Define los meses de enganche y la cuota en la pestaña Proyecto.</p></div>';
    return '<div class="card"><h2>Plan de enganche</h2><p class="muted">Cada depósito de enganche se aplica en orden: reserva y luego cada cuota. Los abonos no cuentan aquí.</p><div class="tbl-wrap"><table class="table"><thead><tr><th>Concepto</th><th class="hide-s">Mes</th><th class="n">Monto</th><th class="n">Pagado</th><th>Estado</th></tr></thead><tbody>' +
      r.schedule.map(function (s) {
        return '<tr><td>' + esc(s.label) + '</td><td class="hide-s">' + fmtMonth(s.month) + '</td><td class="n">' + Q(s.amount) + '</td><td class="n">' + Q(s.paid) + '</td><td><span class="badge b-' + s.status + '">' + s.status + '</span></td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function tPrestamo(p, r) {
    var extra = S.sim, fn = C.pmt(Math.max(0, r.financedNow - extra), p.rate, p.years) + r.fixed;
    var h = '<div class="card"><h2>Cuota proyectada del préstamo</h2>' +
      '<div class="kv"><span>Precio de la propiedad</span><b>' + Q(p.price) + '</b></div>' +
      '<div class="kv"><span>Enganche total</span><b>' + Q(r.engTotal) + '</b></div>' +
      '<div class="kv"><span>Monto a financiar (cotización)</span><b>' + Q(r.financedOrig) + '</b></div>' +
      '<div class="kv"><span>Abonos a capital</span><b class="ab">− ' + Q(r.abonos) + '</b></div>' +
      '<div class="kv"><span>Monto a financiar hoy</span><b>' + Q(r.financedNow) + '</b></div>' +
      '<div class="kv"><span>Tasa / plazo</span><b>' + (+p.rate || 0) + '% · ' + (+p.years || 0) + ' años</b></div></div>';
    h += '<div class="grid">' + stat('Cuota nivelada', Q(r.pmtNow), r.abonos ? 'antes ' + Q(r.pmtOrig) : 'capital + interés') +
      stat('IUSI + seguro', Q(r.fixed), 'mensual') +
      stat('Cuota mensual total', Q(r.totalNow), r.abonos ? 'ahorras ' + Q(r.totalOrig - r.totalNow) + ' al mes' : '', 'ok') +
      stat('Si mantienes la cuota original', yrs(r.termMonthsKeep), r.abonos ? 'en vez de ' + yrs(r.termMonthsOrig) : 'plazo total', 'abono') + '</div>';
    h += '<div class="card" style="margin-top:14px"><h2>¿Y si abono más?</h2><label>Abono adicional simulado (Q)<input type="number" inputmode="decimal" id="sim" value="' + (extra || '') + '" placeholder="0.00"></label>' +
      '<div class="kv"><span>Cuota total con ese abono</span><b>' + Q(fn) + '</b></div><div class="kv"><span>Diferencia contra hoy</span><b>' + Q(fn - r.totalNow) + '</b></div></div>';
    if (p.cuotaCredito) h += '<p class="muted">Cotización original: cuota nivelada ' + Q(p.cuotaNivelada) + ' · cuota mensual de crédito ' + Q(p.cuotaCredito) + '.</p>';
    return h;
  }

  function field(id, l, v, type, extra) { return '<div><label>' + l + '<input id="' + id + '" type="' + (type || 'text') + '"' + (type === 'number' ? ' inputmode="decimal" step="any"' : '') + ' value="' + esc(v == null ? '' : v) + '" ' + (extra || '') + '></label></div>'; }

  function formFields(p, pre) {
    return '<div class="row">' + field(pre + 'name', 'Proyecto', p.name) + field(pre + 'unit', 'Apartamento', p.unit) + field(pre + 'bank', 'Banco', p.bank) + '</div>' +
      '<div class="row" style="margin-top:10px">' + field(pre + 'price', 'Precio total (Q)', p.price, 'number') + field(pre + 'eng', 'Enganche total (Q)', p.engancheTotal, 'number') + field(pre + 'reserva', 'Reserva (Q)', p.reserva, 'number') + '</div>' +
      '<div class="row" style="margin-top:10px">' + field(pre + 'months', 'Meses a fraccionar', p.months, 'number') + field(pre + 'cuota', 'Cuota de enganche (Q)', p.cuotaEnganche, 'number') + field(pre + 'start', 'Mes de la 1.ª cuota', p.startMonth, 'month') + '</div>' +
      '<div class="row" style="margin-top:10px">' + field(pre + 'rate', 'Tasa anual (%)', p.rate, 'number') + field(pre + 'years', 'Plazo (años)', p.years, 'number') + field(pre + 'iusi', 'IUSI mensual (Q)', p.iusi, 'number') + field(pre + 'seguro', 'Seguro mensual (Q)', p.seguro, 'number') + '</div>';
  }
  function readForm(pre, base) {
    var o = Object.assign({}, base, {
      name: val(pre + 'name').trim(), unit: val(pre + 'unit').trim(), bank: val(pre + 'bank').trim(), price: numv(pre + 'price'), engancheTotal: numv(pre + 'eng'),
      reserva: numv(pre + 'reserva'), months: Math.round(numv(pre + 'months')), cuotaEnganche: numv(pre + 'cuota'), startMonth: val(pre + 'start') || C.curMonth(),
      rate: numv(pre + 'rate'), years: numv(pre + 'years'), iusi: numv(pre + 'iusi'), seguro: numv(pre + 'seguro')
    });
    if (!o.engancheTotal) o.engancheTotal = C.r2(o.reserva + o.months * o.cuotaEnganche);
    o.enganchePct = o.price ? C.r2(o.engancheTotal / o.price * 100) : 0;
    return o;
  }

  function tProyecto(p) {
    return '<div class="card"><h2>Datos del proyecto</h2>' + formFields(p, 'p_') +
      '<div class="actions"><button class="btn" data-a="save-proj">Guardar</button></div></div>' +
      '<div class="card"><h2>Cotización</h2><p class="muted">Sube otra cotización para reemplazar los datos de este proyecto. Tus pagos no se borran.</p><div class="actions"><button class="btn sec" data-a="import-update">Subir cotización (PDF)</button></div></div>' +
      '<div class="card"><h2>Respaldo y zona peligrosa</h2><div class="actions"><button class="btn ghost" data-a="export">Descargar respaldo (JSON)</button><button class="btn ghost" data-a="restore">Restaurar respaldo</button><button class="btn danger" data-a="del-proj">Eliminar este proyecto</button></div></div>';
  }

  /* ---------- importación de cotización ---------- */
  function pickPdf(cb) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf'; inp.onchange = function () { if (inp.files[0]) cb(inp.files[0]); }; inp.click();
  }
  function readPdf(file) {
    toast('Leyendo cotización…');
    var base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
    return (window.pdfjsLib ? Promise.resolve() : loadScript(base + 'pdf.min.js')).then(function () {
      pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js';
      return file.arrayBuffer();
    }).then(function (buf) { return pdfjsLib.getDocument({ data: buf }).promise; })
      .then(function (pdf) { return pdf.getPage(1); })
      .then(function (pg) { return pg.getTextContent(); })
      .then(function (tc) { return window.parseQuote(tc.items.map(function (i) { return { s: i.str, x: i.transform[4], y: i.transform[5] }; })); });
  }
  function startImport(updating) {
    pickPdf(function (file) {
      readPdf(file).then(function (q) {
        if (!q.price && !q.cuotaEnganche) { toast('No pude leer datos de esa cotización. Llena el proyecto a mano.'); if (!updating) openDraft(newProject(), false); return; }
        var sm = C.addMonths((q.quoteDate || today()).slice(0, 7), 1);
        var patch = { name: q.name, unit: q.unit, size: q.size, price: q.price, bank: q.bank, engancheTotal: q.engancheTotal || 0, enganchePct: q.enganchePct || 0, reserva: q.reserva || 0, months: q.months || 0, cuotaEnganche: q.cuotaEnganche || 0, rate: q.rate || 0, years: q.years || 0, iusi: q.iusi || 0, seguro: q.seguro || 0, cuotaNivelada: q.cuotaNivelada, cuotaCredito: q.cuotaCredito };
        if (updating) { var base = cur(); S.importDraft = { project: Object.assign({}, base, patch), isNew: false }; }
        else S.importDraft = { project: newProject(Object.assign(patch, { startMonth: sm })), isNew: true };
        showDraft(true);
      }).catch(function (e) { toast('Error al leer el PDF: ' + (e.message || e)); });
    });
  }
  function openDraft(p, fromPdf) { S.importDraft = { project: p, isNew: true }; showDraft(fromPdf); }
  function showDraft(fromPdf) {
    var d = S.importDraft;
    $app.innerHTML = headerHtml() + '<main><div class="wrap"><div class="card"><h2>' + (fromPdf ? 'Revisa los datos de la cotización' : 'Nuevo proyecto') + '</h2>' +
      (fromPdf ? '<p class="muted">Estos datos se leyeron del PDF. Corrige lo que haga falta y guarda. “Mes de la 1.ª cuota” es el mes en que empiezas a pagar las cuotas fraccionadas.</p>' : '') +
      formFields(d.project, 'd_') + '<div class="actions"><button class="btn" data-a="draft-save">Guardar</button><button class="btn ghost" data-a="draft-cancel">Cancelar</button>' +
      (!fromPdf ? '<button class="btn sec" data-a="draft-pdf">Mejor subir cotización PDF</button>' : '') + '</div></div></div></main>';
    bind();
  }

  /* ---------- autenticación (modo nube) ---------- */
  function renderAuth(msg) {
    $app.innerHTML = '<div class="wrap"><div class="card auth"><h2>🏠 Mi Enganche</h2><p class="muted">Entra para ver tus proyectos desde cualquier dispositivo.</p>' +
      '<label>Correo<input id="a_mail" type="email" autocomplete="email"></label><label style="margin-top:10px">Contraseña (mín. 6)<input id="a_pass" type="password" autocomplete="current-password"></label>' +
      (msg ? '<p class="note" style="margin-top:12px">' + esc(msg) + '</p>' : '') +
      '<div class="actions"><button class="btn" data-a="login">Entrar</button><button class="btn sec" data-a="signup">Crear cuenta</button></div></div></div>';
    bind();
  }
  function authDo(kind) {
    var email = val('a_mail').trim(), password = val('a_pass');
    var call = kind === 'login' ? sb.auth.signInWithPassword({ email: email, password: password }) : sb.auth.signUp({ email: email, password: password });
    call.then(function (r) {
      if (r.error) return renderAuth(r.error.message);
      if (!r.data.session) return renderAuth('Revisa tu correo para confirmar la cuenta y luego entra.');
      S.user = r.data.session.user; S.needAuth = false; boot();
    });
  }

  /* ---------- eventos ---------- */
  function bind() {
    var sel = $('sel'); if (sel) sel.onchange = function () { S.id = sel.value; S.editing = null; S.sim = 0; render(); };
    var sim = $('sim'); if (sim) sim.oninput = function () { S.sim = numv('sim'); var pos = sim.selectionStart; render(); var n = $('sim'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } };
    Array.prototype.forEach.call($app.querySelectorAll('[data-tab]'), function (b) { b.onclick = function () { S.tab = b.dataset.tab; S.editing = null; render(); window.scrollTo(0, 0); }; });
    Array.prototype.forEach.call($app.querySelectorAll('[data-a]'), function (b) { b.onclick = function (ev) { ev.preventDefault(); act(b.dataset.a, b.dataset.id); }; });
  }

  function act(a, id) {
    var p = cur();
    switch (a) {
      case 'new': startImport(false); break;
      case 'logout': sb.auth.signOut().then(function () { S.user = null; S.projects = []; S.id = null; S.needAuth = true; render(); }); break;
      case 'login': case 'signup': authDo(a); break;
      case 'fill-cuota': $('f_eng').value = p.cuotaEnganche; break;
      case 'fill-reserva': $('f_eng').value = p.reserva; break;
      case 'save-pay':
        var eng = numv('f_eng'), ab = numv('f_ab');
        if (!eng && !ab) return toast('Escribe un monto de enganche o de abono');
        var rec = { id: S.editing || uid(), date: val('f_date') || today(), enganche: eng, abono: ab, note: val('f_note').trim() };
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
      case 'save-proj': S.projects = S.projects.map(function (x) { return x.id === p.id ? readForm('p_', p) : x; }); persist(cur()).then(function () { toast('Proyecto guardado'); render(); }); break;
      case 'import-update': startImport(true); break;
      case 'del-proj': if (confirm('¿Eliminar "' + label(p) + '" y todos sus pagos? No se puede deshacer.')) { store.remove(p.id).then(function () { S.projects = S.projects.filter(function (x) { return x.id !== p.id; }); S.id = S.projects[0] ? S.projects[0].id : null; render(); }); } break;
      case 'draft-pdf': startImport(false); break;
      case 'draft-cancel': S.importDraft = null; render(); break;
      case 'draft-save':
        var d = S.importDraft, np = readForm('d_', d.project);
        if (!np.name && !np.unit) return toast('Ponle nombre al proyecto');
        S.importDraft = null;
        if (d.isNew) { S.projects.push(np); } else { S.projects = S.projects.map(function (x) { return x.id === np.id ? np : x; }); }
        S.id = np.id; S.tab = d.isNew ? 'pagos' : S.tab;
        persist(np).then(function () { toast('Proyecto guardado'); render(); }); break;
      case 'export':
        var blob = new Blob([JSON.stringify(S.projects, null, 2)], { type: 'application/json' }), a2 = document.createElement('a');
        a2.href = URL.createObjectURL(blob); a2.download = 'mi-enganche-respaldo-' + today() + '.json'; a2.click(); break;
      case 'restore':
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
        inp.onchange = function () {
          inp.files[0].text().then(function (t) {
            var arr = JSON.parse(t); if (!Array.isArray(arr)) throw new Error('Formato inválido');
            arr = arr.filter(function (x) { return x && x.id && Array.isArray(x.payments); });
            return Promise.all(arr.map(function (x) { return store.save(x); })).then(function () {
              arr.forEach(function (x) { var i = S.projects.findIndex(function (y) { return y.id === x.id; }); if (i < 0) S.projects.push(x); else S.projects[i] = x; });
              if (!S.id && S.projects[0]) S.id = S.projects[0].id; toast(arr.length + ' proyecto(s) restaurados'); render();
            });
          }).catch(function (e) { toast('Respaldo inválido: ' + e.message); });
        }; inp.click(); break;
    }
  }

  /* ---------- arranque ---------- */
  function boot() {
    store.load().then(function (list) {
      S.projects = list; S.id = (list.filter(function (p) { return p.id === S.id; })[0] || list[0] || {}).id || null; render();
    }).catch(function (e) { toast('No se pudieron cargar los datos: ' + (e.message || e)); render(); });
  }
  function init() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(function () { });
    if (CFG.supabaseUrl && CFG.supabaseAnonKey) {
      loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js').then(function () {
        sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey); store = Remote;
        return sb.auth.getSession();
      }).then(function (r) {
        if (r.data.session) { S.user = r.data.session.user; boot(); } else { S.needAuth = true; render(); }
      }).catch(function (e) { $app.innerHTML = '<div class="wrap"><p class="note">No se pudo conectar con la nube: ' + esc(e.message) + '</p></div>'; });
    } else { store = Local; boot(); }
  }
  init();
})();
