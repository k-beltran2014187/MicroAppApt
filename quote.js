/* Lee una cotización (PDF) a partir de los textos con posición (x, y) que entrega pdf.js.
   Soporta varios formatos: empareja cada etiqueta con el valor a su derecha (misma fila)
   o debajo (encabezados de tabla), y entiende números como 767,900.07 y 577.000,00. */
(function (root) {
  var norm = function (s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[:\s]+/g, ' ').trim();
  };
  // Etiquetas por campo (texto normalizado: minúsculas, sin acentos ni ":")
  var L = {
    aptRow: /^apartamento$/, unit: /^no\.? ?apartamento$/, size: /^metraje$|^tamano \(m2\)$/,
    priceApt: /^precio de apartamento$/, priceFinal: /^precio final$/, priceTotal: /^precio total$/,
    bank: /^banco$/, eng: /^enganche( \(\d+(\.\d+)?%\))?$/, engPct: /^enganche en %$/, reserva: /^reserva$/,
    months: /^meses a fraccionar enganche$/, cuota: /^(cuota de enganche fraccionado|cuotas? de enganche)$/,
    financed: /^(monto a financiar|saldo contra entrega)$/, rate: /^tasa interes anual$/, years: /^(duracion credito|plazo)$/,
    nivelada: /^cuota nivelada$/, iusi: /^iusi$/, seguro: /^seguro de incendios$/, cuotaCredito: /^(cuota mensual de credito|cuota banco)$/,
    mant: /^cuota de mantenimiento( aproximada)?$/, park: /^parqueo$/, parkPrice: /^precio de parqueo$/
  };
  // Otras etiquetas que existen en las cotizaciones y nunca son un valor
  var OTHER = /^(parqueo de (moto|carro) adicional|aplica lip|ingresos del nucleo familiar aprox\.?|nomenclartura|nomenclatura|precio|asesor|correo|telefono|nombre|nombre del cliente|fecha|torre|habitaciones|banos|sala|comedor|cocina|modelo|ingreso requerido|saldo enganche|forma de pago|cuota estimada con banco)$/;
  var isLabel = function (s) {
    var n = norm(s); if (OTHER.test(n)) return true;
    for (var k in L) if (L[k].test(n)) return true;
    return false;
  };

  // 767,900.07 · 577.000,00 · 600,00 · 3.411,11 · 7.26% · 25 años · "47 mts2"
  function num(s) {
    if (s == null) return null;
    var m = String(s).match(/\d[\d.,]*/); if (!m) return null;
    var t = m[0].replace(/[.,]+$/, ''), d = t.lastIndexOf('.'), c = t.lastIndexOf(',');
    if (d >= 0 && c >= 0) { var dec = Math.max(d, c) === d ? '.' : ','; t = dec === '.' ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(',', '.'); }
    else if (c >= 0) t = /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
    else if (d >= 0 && /^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    var v = parseFloat(t); return isNaN(v) ? null : v;
  }
  var hasDigit = function (s) { return /\d/.test(s); };
  var titleCase = function (s) { return s.toLowerCase().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); }); };

  function parseQuote(items, opts) {
    opts = opts || {};
    items = items.filter(function (i) { return i.s && i.s.trim(); });
    var Y = 7;
    function labels(re) { return items.filter(function (i) { return re.test(norm(i.s)); }); }
    // valores a la derecha en la misma fila, de izquierda a derecha
    function right(re, numeric) {
      var ls = labels(re);
      for (var k = 0; k < ls.length; k++) {
        var a = ls[k];
        var vals = items.filter(function (i) {
          return i !== a && Math.abs(i.y - a.y) < Y && i.x > a.x + 1 && !isLabel(i.s) && (!numeric || hasDigit(i.s));
        }).sort(function (p, q) { return p.x - q.x; }).filter(function (v) {
          return !items.some(function (o) { return o !== a && isLabel(o.s) && Math.abs(o.y - a.y) < Y && o.x > a.x && o.x < v.x; });
        });
        if (vals.length) return vals.map(function (v) { return v.s.trim(); });
      }
      return [];
    }
    // valor justo debajo (encabezado de tabla arriba, valor abajo)
    function below(re) {
      var ls = labels(re);
      for (var k = 0; k < ls.length; k++) {
        var a = ls[k];
        var c = items.filter(function (i) { return i.y < a.y - 3 && i.y > a.y - 28 && Math.abs(i.x - a.x) < 50 && !isLabel(i.s) && hasDigit(i.s); })
          .sort(function (p, q) { return (a.y - p.y) - (a.y - q.y); })[0];
        if (c) return c.s.trim();
      }
      return undefined;
    }
    var any = function (re, numeric) { var v = right(re, numeric)[0]; return v !== undefined ? v : below(re); };
    var N = function (re) { return num(any(re, true)); };

    var apt = right(L.aptRow);
    var out = {};
    var proj = items.map(function (i) { return i.s.match(/^\s*apartamentos?\s+(.+)$/i); }).filter(Boolean)[0];
    if (proj) out.name = titleCase(proj[1].trim());
    else if (opts.filename) {
      var f = opts.filename.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').split(/\bapto\b|\bapartamento\b|cotiz/i)[0].replace(/[-\s]+$/, '').trim();
      out.name = titleCase(f);
    } else out.name = '';
    out.unit = right(L.unit)[0] || apt[0] || '';
    out.size = N(L.size) || num(apt[1]);
    out.priceApt = N(L.priceApt) || num(apt[2]);
    out.price = N(L.priceFinal) || N(L.priceTotal) || out.priceApt || num(apt[2]);
    out.bank = (right(L.bank)[0]) || '';
    out.engancheTotal = N(L.eng);
    var pctLabel = items.map(function (i) { return norm(i.s).match(/^enganche \((\d+(\.\d+)?)%\)$/); }).filter(Boolean)[0];
    out.enganchePct = N(L.engPct) || (pctLabel ? parseFloat(pctLabel[1]) : null);
    out.financed = N(L.financed);
    out.rate = N(L.rate);
    out.years = N(L.years);
    out.reserva = N(L.reserva);
    out.months = N(L.months);
    out.cuotaEnganche = N(L.cuota);
    out.cuotaNivelada = N(L.nivelada);
    out.iusi = N(L.iusi);
    out.seguro = N(L.seguro);
    out.cuotaCredito = N(L.cuotaCredito);
    out.mantenimiento = N(L.mant);
    var pt = right(L.park)[0], pp = N(L.parkPrice);
    out.parking = pt && pp ? { name: 'Parqueo de ' + pt.toLowerCase(), price: pp } : null;
    var d = items.map(function (i) { return i.s.match(/^\s*(\d{2})\/(\d{2})\/(\d{4})\s*$/); }).filter(Boolean)[0];
    out.quoteDate = d ? d[3] + '-' + d[2] + '-' + d[1] : '';
    return out;
  }
  parseQuote.num = num;
  root.parseQuote = parseQuote;
  if (typeof module !== 'undefined') module.exports = { parseQuote: parseQuote };
})(typeof window !== 'undefined' ? window : globalThis);
