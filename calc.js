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
    return x <= 0 ? Infinity : Math.ceil(-Math.log(x) / Math.log(1 + r));
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
    var cuotasPagadas = sched.filter(function (s) { return s.n && s.status === 'pagada'; }).length;
    var next = sched.filter(function (s) { return s.status !== 'pagada'; })[0] || null;
    var overpaid = left > 0.005 ? left : 0; // enganche pagado de más (excede el total)

    // Parqueos: se pagan aparte, no forman parte del enganche ni del préstamo.
    var parkTotal = r2((p.parkings || []).filter(function (k) { return k.bought; }).reduce(function (t, k) { return t + (+k.price || 0); }, 0));
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
  var api = { pmt: pmt, monthsToPay: monthsToPay, addMonths: addMonths, compute: compute, r2: r2, curMonth: curMonth };
  root.EngancheCalc = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
