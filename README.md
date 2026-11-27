# Cotizador y reservas / Reservation and Quote Manager

Aplicación web para crear cotizaciones, registrar reservas y llevar el control de pagos y cancelaciones de eventos.

A web application for creating quotes, managing event reservations, and tracking payments and cancellations.

## Funciones / Features

- Crear cotizaciones con datos del cliente y una fecha de evento.
- Consultar disponibilidad de sillas y mesas por fecha.
- Agregar decoración y entrega opcional.
- Guardar borradores automáticamente.
- Registrar anticipos y abonos.
- Filtrar reservas por cliente, fecha y estado.
- Editar o cancelar reservas.
- Consultar movimientos financieros.
- Generar comprobantes listos para imprimir o guardar como PDF.

- Create quotes with client details and an event date.
- Check chair and table availability by date.
- Add decorations and optional delivery.
- Save form drafts automatically.
- Record deposits and partial payments.
- Filter reservations by client, date, and status.
- Edit or cancel reservations.
- Review financial movements.
- Generate receipts ready to print or save as PDF.

## Requisitos / Requirements

- Node.js `>=22.23.4`
- npm
- Navegador moderno / A modern web browser

## Instalación y ejecución / Installation and running

```sh
npm install --no-audit --no-fund
npm run dev
```

Abre `http://localhost:4321` en tu navegador.  
Open `http://localhost:4321` in your browser.

## Desarrollo / Development

```sh
npm test
npm run build
npm run preview
```

Las pruebas y el build usan un límite de memoria de 512 MB.  
Tests and builds use a 512 MB memory limit.

## Configuración / Configuration

La aplicación puede usar el puerto configurado en `PORT`.

The application can use the port configured through `PORT`.

```env
PORT=4321
```

No requiere una base de datos ni variables de entorno adicionales.  
No database or additional environment variables are required.

## Almacenamiento de datos / Data storage

Las reservas, borradores y pagos se guardan en `localStorage` del navegador:

- Los datos permanecen en el navegador y el perfil donde fueron creados.
- Los datos no se sincronizan entre equipos, navegadores ni perfiles.
- Los datos pueden perderse si se eliminan los datos del sitio.
- Las pestañas abiertas en el mismo origen pueden coordinarse mediante Web Locks cuando estén disponibles.

Reservations, drafts, and payments are stored in the browser's `localStorage`:

- Data remains in the browser and profile where it was created.
- Data is not synchronized across devices, browsers, or profiles.
- Data may be lost if site data is cleared.
- Open tabs on the same origin can coordinate through Web Locks when available.

Esta aplicación está diseñada para un uso local y de volumen limitado; no incluye almacenamiento compartido ni multiusuario.  
This application is intended for local, limited-volume use; it does not include shared or multi-user storage.

## Rutas principales / Main routes

| Ruta / Route | Descripción / Description |
| --- | --- |
| `/` | Inicio / Home |
| `/nueva-reserva` | Crear cotización y reserva / Create a quote and reservation |
| `/reservas` | Consultar y administrar reservas / View and manage reservations |
| `/pagos` | Consultar movimientos financieros / Review financial movements |

