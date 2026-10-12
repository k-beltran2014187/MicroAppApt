/* Cálculos del enganche y del préstamo. Sin dependencias del DOM. */
(function (root) {
  var r2 = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };

  function pmt(principal, annualRatePct, years) {
    var n = Math.round(years * 12), r = annualRatePct / 100 / 12;
    if (principal <= 0 || n <= 0) return 0;
    return r === 0 ? principal / n : principal * r / (1 - Math.pow(1 + r, -n));
  }
  // meses necesarios para pagar `principal` manteniendo la cuota `payment`
  function monthsToPay(principal, annualRatePct, payment) {
    var r = annualRatePct / 100 / 12;
    if (principal <= 0) return 0;
    if (r === 0) return Math.ceil(principal / payment);
    var x = 1 - principal * r / payment;
    return x <= 0 ? Infinity : Math.ceil(-Math.log(x) / Math.log(1 + r) - 1e-6);
  }
  function addMonths(ym, k) { // 'YYYY-MM' + k meses
    var p = ym.split('-'), t = (+p[0]) * 12 + (+p[1] - 1) + k;
    return Math.floor(t / 12) + '-' + String(t % 12 + 1).padStart(2, '0');
  }
  var curMonth = function (now) { now = now || new Date(); return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); };

  function compute(p, now) {
    var pays = (p.payments || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var months = +p.months || 0, cuota = +p.cuotaEnganche || 0, reserva = +p.reserva || 0;
    var engTotal = +p.engancheTotal || r2(reserva + months * cuota);
    var paidEng = r2(pays.reduce(function (s, x) { return s + (+x.enganche || 0); }, 0));
    var abonos = r2(pays.reduce(function (s, x) { return s + (+x.abono || 0); }, 0));

    // La plata del enganche se aplica en orden: reserva, cuota 1, cuota 2...
    var sched = [], left = paidEng, cm = curMonth(now);
    var items = [];
    if (reserva > 0) items.push({ label: 'Reserva', amount: reserva, month: null });
    for (var i = 1; i <= months; i++) items.push({ label: 'Cuota ' + i, amount: cuota, n: i, month: p.startMonth ? addMonths(p.startMonth, i - 1) : null });
    items.forEach(function (it) {
      var paid = Math.min(left, it.amount); left = r2(left - paid);
      var done = paid >= it.amount - 0.005;
      var status = done ? 'pagada' : paid > 0 ? 'parcial' : 'pendiente';
      if (!done && it.month && it.month < cm) status = 'vencida';
      sched.push({ label: it.label, n: it.n || 0, amount: it.amount, month: it.month, paid: r2(paid), status: status });
    });
    if (sched.length && sched.every(function (s) { return s.status === 'pagada'; })) paidEng = Math.max(paidEng, engTotal); // evita centavos sueltos por redondeo de la cotización
    var cuotasPagadas = sched.filter(function (s) { return s.n && s.status === 'pagada'; }).length;
    var next = sched.filter(function (s) { return s.status !== 'pagada'; })[0] || null;
    var overpaid = left > 0.005 ? left : 0; // enganche pagado de más (excede el total)

    // Parqueos: se pagan aparte, no forman parte del enganche ni del préstamo.
    var parkTotal = r2((p.parkings || []).filter(function (k) { return k.bought && !k.financed; }).reduce(function (t, k) { return t + (+k.price || 0); }, 0));
    var parkPaid = r2(pays.reduce(function (t, x) { return t + (+x.parqueo || 0); }, 0));

    var financedOrig = r2((+p.price || 0) - engTotal);
    var financedNow = Math.max(0, r2(financedOrig - abonos));
    var fixed = (+p.iusi || 0) + (+p.seguro || 0);
    var pmtOrig = pmt(financedOrig, +p.rate || 0, +p.years || 0);
    var pmtNow = pmt(financedNow, +p.rate || 0, +p.years || 0);
    var mKeep = monthsToPay(financedNow, +p.rate || 0, pmtOrig);
    return {
      payments: pays, schedule: sched, months: months, cuota: cuota, reserva: reserva,
      engTotal: engTotal, paidEng: paidEng, remEng: Math.max(0, r2(engTotal - paidEng)),
      pctEng: engTotal ? Math.min(100, paidEng / engTotal * 100) : 0,
      abonos: abonos, overpaid: overpaid,
      parkTotal: parkTotal, parkPaid: parkPaid, parkRem: Math.max(0, r2(parkTotal - parkPaid)),
      parkPct: parkTotal ? Math.min(100, parkPaid / parkTotal * 100) : 0,
      cuotasPagadas: cuotasPagadas, cuotasFaltan: Math.max(0, months - cuotasPagadas), next: next,
      financedOrig: financedOrig, financedNow: financedNow,
      pmtOrig: r2(pmtOrig), pmtNow: r2(pmtNow), fixed: r2(fixed),
      totalOrig: r2(pmtOrig + fixed), totalNow: r2(pmtNow + fixed),
      termMonthsOrig: Math.round((+p.years || 0) * 12), termMonthsKeep: mKeep,
      pctOfPrice: p.price ? (paidEng + abonos) / p.price * 100 : 0
    };
  }

  /* ---------- etapa de crédito (cuotas del banco) ---------- */
  // Tabla de amortización. L: {principal, rate, years, startMonth, payment?, abonos:[{date,amount,mode:'plazo'|'cuota'}]}
  // o: {extraAbonos:[...], monthlyExtra:{amount, from:'YYYY-MM'}} para simular.
  function loanSchedule(L, o) {
    o = o || {}; L = L || {};
    var P = +L.principal || 0, rate = +L.rate || 0, n0 = Math.round((+L.years || 0) * 12);
    if (P <= 0 || n0 <= 0 || !L.startMonth) return { rows: [], pay0: 0, totalInterest: 0, months: 0, ok: false, n0: n0 };
    var r = rate / 1200, pay0 = +L.payment > 0 ? +L.payment : pmt(P, rate, n0 / 12), pay = pay0;
    var ab = (L.abonos || []).concat(o.extraAbonos || []).map(function (a) { return { m: String(a.date || '').slice(0, 7), amount: +a.amount || 0, mode: a.mode || 'plazo' }; })
      .filter(function (a) { return a.amount > 0 && a.m; });
    var byM = {}; ab.forEach(function (a) { var m = a.m < L.startMonth ? L.startMonth : a.m; (byM[m] = byM[m] || []).push(a); });
    var rows = [], B = P, k = 0, ti = 0, guard = n0 + 1200, stuck = false;
    while (B > 0.005 && k < guard) {
      k++;
      var month = addMonths(L.startMonth, k - 1), interest = B * r, princ = Math.min(B, pay - interest);
      if (princ <= 0) { stuck = true; break; } // la cuota no alcanza ni para los intereses
      B -= princ;
      var extra = 0, list = byM[month] || [];
      if (o.monthlyExtra && o.monthlyExtra.amount > 0 && month >= (o.monthlyExtra.from || month)) list = list.concat([{ amount: +o.monthlyExtra.amount, mode: 'plazo' }]);
      list.forEach(function (a) {
        var Bb = B, x = Math.min(a.amount, B); B -= x; extra += x;
        // "bajar la cuota": se mantiene la fecha de término que ya tenía el plan (no se vuelve a estirar al plazo original)
        if (a.mode === 'cuota' && B > 0.005) { var rem = monthsToPay(Bb, rate, pay); pay = isFinite(rem) && rem > 0 ? pmt(B, rate, Math.max(1, rem) / 12) : B * (1 + r); }
      });
      rows.push({ n: k, month: month, payment: princ + interest, interest: interest, principal: princ, extra: extra, balance: Math.max(0, B) });
      ti += interest;
    }
    return { rows: rows, pay0: pay0, totalInterest: ti, months: rows.length, ok: !stuck, n0: n0 };
  }

  function loanCompute(p, now) {
    var L = p.loan || {}, fixed = (+p.iusi || 0) + (+p.seguro || 0), cm = curMonth(now);
    var s = loanSchedule(L), base = loanSchedule(Object.assign({}, L, { abonos: [] }));
    var pays = (L.payments || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var abonos = (L.abonos || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var left = r2(pays.reduce(function (t, x) { return t + (+x.amount || 0); }, 0)), paidRows = 0;
    var rows = s.rows.map(function (rw) {
      var need = r2(rw.payment + fixed), paid = Math.min(left, need); left = r2(left - paid);
      var done = paid >= need - 0.5, st = done ? 'pagada' : paid > 0 ? 'parcial' : 'pendiente';
      if (!done && rw.month < cm) st = 'vencida';
      if (done && paidRows === rw.n - 1) paidRows = rw.n;
      return Object.assign({}, rw, { need: need, paid: r2(paid), status: st });
    });
    var P = +L.principal || 0, extraLater = 0;
    for (var i = paidRows; i < rows.length; i++) if (rows[i].month <= cm) extraLater += rows[i].extra;
    var balPaid = paidRows > 0 ? rows[paidRows - 1].balance : P, saldo = Math.max(0, balPaid - extraLater);
    var intPaid = 0, intRem = 0; rows.forEach(function (rw, j) { if (j < paidRows) intPaid += rw.interest; else intRem += rw.interest; });
    var next = rows[paidRows] || null, payNow = next ? next.payment : (rows.length ? rows[rows.length - 1].payment : 0);
    var abonosTotal = r2(abonos.reduce(function (t, a) { return t + (+a.amount || 0); }, 0));
    var price = +p.price || 0;
    return {
      ok: s.ok && rows.length > 0, rows: rows, principal: P, pay0: r2(s.pay0), payNow: r2(payNow), fixed: r2(fixed), totalMonthly: r2(payNow + fixed), maint: +p.mantenimiento || 0,
      paidRows: paidRows, totalRows: rows.length, remRows: rows.length - paidRows, next: next, endMonth: rows.length ? rows[rows.length - 1].month : null,
      saldo: r2(saldo), capitalPaid: r2(Math.max(0, P - saldo)), pctPaid: P ? Math.min(100, Math.max(0, (P - saldo) / P * 100)) : 0,
      interestPaid: r2(intPaid), interestRem: r2(intRem), interestTotal: r2(s.totalInterest), interestBase: r2(base.totalInterest),
      interestSaved: r2(Math.max(0, base.totalInterest - s.totalInterest)), monthsSaved: Math.max(0, base.months - s.months), baseMonths: base.months,
      abonosTotal: abonosTotal, abonos: abonos, payments: pays, paidTotal: r2(pays.reduce(function (t, x) { return t + (+x.amount || 0); }, 0)),
      owned: price ? Math.max(0, r2(price - saldo)) : 0, pctOwned: price ? Math.min(100, Math.max(0, (price - saldo) / price * 100)) : 0, price: price,
      totalToPay: r2(P + s.totalInterest), baseRows: base.rows
    };
  }
  // ¿Y si abono? Compara contra el plan actual. mode: 'plazo' (menos meses) | 'cuota' (cuota menor)
  function loanSimulate(p, o, now) {
    var L = p.loan || {}, cm = curMonth(now), at = cm < L.startMonth ? L.startMonth : cm, cur = loanSchedule(L), ex = [];
    if (o.amount > 0) ex.push({ date: at + '-01', amount: o.amount, mode: o.mode || 'plazo' });
    var s = loanSchedule(L, { extraAbonos: ex, monthlyExtra: o.monthlyExtra });
    var idx = s.rows.findIndex(function (rw) { return rw.month > at; });
    return { months: s.months, monthsSaved: Math.max(0, cur.months - s.months), interestTotal: r2(s.totalInterest), interestSaved: r2(Math.max(0, cur.totalInterest - s.totalInterest)),
      newPayment: r2(idx >= 0 ? s.rows[idx].payment : (s.rows.length ? s.rows[s.rows.length - 1].payment : 0)), endMonth: s.rows.length ? s.rows[s.rows.length - 1].month : null };
  }

  var api = { loanSchedule: loanSchedule, loanCompute: loanCompute, loanSimulate: loanSimulate, pmt: pmt, monthsToPay: monthsToPay, addMonths: addMonths, compute: compute, r2: r2, curMonth: curMonth };
  root.EngancheCalc = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
