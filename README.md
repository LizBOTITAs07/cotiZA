# Cotizador de reservas Vibe Pachuca

Aplicación Astro ligera para preparar, guardar y administrar reservas de eventos.

## Requisitos

- Node.js `>=22.23.4`
- Un navegador con almacenamiento local habilitado

## Preparación

```sh
npm install --no-audit --no-fund
npm test
npm run build
npm run astro -- dev --background
```

El build y las pruebas limitan el heap de Node a 512 MB. La app no necesita PostgreSQL ni `DATABASE_URL`.

## Persistencia y alcance del almacenamiento local

- Las reservas se guardan como un arreglo bajo la clave `miev-evento-reservas-v1`; el borrador del formulario tiene otra clave.
- Los datos viven solo en el perfil y origen del navegador donde se capturan. No se comparten entre equipos, navegadores ni perfiles y se pueden perder si el usuario borra los datos del sitio.
- No existe migración automática desde PostgreSQL. Los registros antiguos permanecen en la base de datos anterior y no aparecen en este navegador; expórtalos o consérvalos antes de retirar esa base si necesitas mantenerlos.
- `localStorage` es adecuado para el volumen pequeño de esta aplicación, pero no es una base multiusuario ni ofrece transacciones entre dispositivos. Se usa el bloqueo Web Locks cuando está disponible para coordinar pestañas del mismo origen.

## Operación

- `/` crea reservas pendientes, guarda el borrador automáticamente, calcula el total y verifica disponibilidad para la fecha.
- `/reservas` lista, filtra, confirma mediante un anticipo único del 30–100% y cancela reservas.
- Una reserva cancelada se conserva como historial y deja de ocupar inventario.
- La disponibilidad por fecha es de 120 sillas y 12 mesas. La decoración se limita a un paquete por reserva; la entrega de $250 es opcional.
- Los comprobantes se abren desde el listado y pueden imprimirse o guardarse como PDF.
