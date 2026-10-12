/* Lee una cotización (PDF) a partir de los textos con posición (x, y) que entrega pdf.js.
   Empareja cada etiqueta con el valor que está a su derecha en la misma fila. */
(function (root) {
  var norm = function (s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[:\s]+/g, ' ').trim();
  };
  var LABELS = ['apartamento', 'parqueo', 'parqueo de moto adicional', 'parqueo de carro adicional', 'banco',
    'precio total', 'aplica lip', 'tasa interes anual', 'duracion credito', 'enganche', 'enganche en %',
    'monto a financiar', 'reserva', 'meses a fraccionar enganche', 'seguro de incendios', 'cuota nivelada',
    'iusi', 'cuota de enganche fraccionado', 'ingresos del nucleo familiar aprox.', 'cuota mensual de credito',
    'nomenclartura', 'nomenclatura', 'tamano (m2)', 'precio', 'asesor', 'correo', 'telefono', 'nombre',
    'habitaciones', 'banos', 'sala', 'comedor', 'cocina'];
  var isLabel = function (s) { return LABELS.indexOf(norm(s)) !== -1; };
  var num = function (s) {
    if (s == null) return null;
    var m = String(s).replace(/[Qq\s]/g, '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };

  function parseQuote(items) {
    items = items.filter(function (i) { return i.s && i.s.trim(); });
    function rowValues(label) {
      var lab = items.filter(function (i) { return norm(i.s) === label; });
      for (var k = 0; k < lab.length; k++) {
        var L = lab[k];
        var vals = items.filter(function (i) {
          return Math.abs(i.y - L.y) < 7 && i.x > L.x + 1 && !isLabel(i.s);
        }).sort(function (a, b) { return a.x - b.x; });
        // descarta valores que pertenecen a otra etiqueta más cercana a su izquierda
        vals = vals.filter(function (v) {
          return !items.some(function (o) { return o !== L && isLabel(o.s) && Math.abs(o.y - L.y) < 7 && o.x > L.x && o.x < v.x; });
        });
        if (vals.length) return vals.map(function (v) { return v.s.trim(); });
      }
      return [];
    }
    var one = function (label) { return rowValues(label)[0]; };

    var apt = rowValues('apartamento');
    var out = {};
    var proj = items.map(function (i) { return i.s.match(/^\s*apartamentos?\s+(.+)$/i); }).filter(Boolean)[0];
    out.name = proj ? proj[1].trim().toLowerCase().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); }) : '';
    out.unit = apt[0] || '';
    out.size = num(apt[1]);
    out.price = num(apt[2]) || num(one('precio total'));
    out.bank = one('banco') || '';
    out.engancheTotal = num(one('enganche'));
    out.enganchePct = num(one('enganche en %'));
    out.financed = num(one('monto a financiar'));
    out.rate = num(one('tasa interes anual'));
    out.years = num(one('duracion credito'));
    out.reserva = num(one('reserva'));
    out.months = num(one('meses a fraccionar enganche'));
    out.cuotaEnganche = num(one('cuota de enganche fraccionado'));
    out.cuotaNivelada = num(one('cuota nivelada'));
    out.iusi = num(one('iusi'));
    out.seguro = num(one('seguro de incendios'));
    out.cuotaCredito = num(one('cuota mensual de credito'));
    var d = items.map(function (i) { return i.s.match(/^\s*(\d{2})\/(\d{2})\/(\d{4})\s*$/); }).filter(Boolean)[0];
    out.quoteDate = d ? d[3] + '-' + d[2] + '-' + d[1] : '';
    return out;
  }
  root.parseQuote = parseQuote;
  if (typeof module !== 'undefined') module.exports = { parseQuote: parseQuote };
})(typeof window !== 'undefined' ? window : globalThis);
