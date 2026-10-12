# Mi Enganche

Mini app (PWA, sin build) para controlar los pagos de enganche y abonos de tus apartamentos.
Funciona en teléfono y computadora; se puede "instalar" desde el navegador.

## Qué hace
- **Subir la cotización (PDF)**: lee proyecto, apto, precio, enganche, reserva, meses, cuota, tasa, plazo, IUSI. Tú revisas y guardas.
- **Varios proyectos** (un selector arriba).
- **Pagos**: uno a uno o **varios meses de una vez**. Cada pago tiene "enganche" y "abono" separados.
- **Pestañas**: Resumen · Pagos · Calendario · Préstamo · Proyecto.
- Los abonos reducen el monto a financiar y recalculan la cuota proyectada.
- **Parqueos**: se registran aparte (cotizados o comprados) y se pagan por separado; no entran al enganche ni al préstamo.
- **Planos**: sube PDF o imágenes por proyecto, míralos en un visor con zoom y descárgalos. Local: se guardan en el dispositivo (IndexedDB); nube: Supabase Storage.
- **Tema claro/oscuro/automático** (botón del encabezado) y **color por proyecto**.
- Animaciones premium con [Thinking Orbs](https://github.com/yogesharc/thinking-orbs) (respetan "reducir movimiento").
- Respaldo/restauración en JSON (sin planos).

## Probar en local
    python3 -m http.server 8000   # http://localhost:8000

Por defecto está en **modo local** (datos solo en ese navegador).

## Cuentas de usuario y sincronización (Supabase, gratis)
1. Crea un proyecto en https://supabase.com y ejecuta `supabase.sql` en *SQL Editor* (también crea el bucket privado `planos`).
2. Pega `Project URL` y la clave `anon` en `config.js`.
3. En *Authentication > URL Configuration* agrega tu subdominio como Site URL.
Cada usuario solo ve sus propios proyectos (RLS).

## Subdominio (ej. enganche.estudiopixel502.com)
Es un sitio estático: sirve cualquier hosting. Con GitHub Pages: publica este repositorio
y en el DNS de estudiopixel502.com crea un registro `CNAME enganche → <usuario>.github.io`.
