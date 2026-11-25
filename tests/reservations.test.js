import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cancelReservation,
  createReservationRecord,
  getAvailability,
  recordDeposit,
  recordPayment,
  updateReservation,
} from '../src/lib/reservations.js';
import {
  createReservationInStorage,
  loadReservations,
  RESERVATIONS_STORAGE_KEY,
} from '../src/lib/reservationsStore.js';

const DATE_F = '2026-12-01';
const DATE_G = '2026-12-02';
const today = '2026-11-18';

function create(reservations, clientName, eventDate, quantities, id) {
  return createReservationRecord(
    reservations,
    { clientName, eventDate, quantities },
    { today, id, createdAt: `${today}T12:00:00.000Z` },
  );
}

test('P1-P4: crea reservas con precios, disponibilidad por fecha y stock limitado', () => {
  const ana = create([], 'Ana', DATE_F, { sillas: 100, mesas: 5, decoracion: 0, entrega: true }, 'ana');
  assert.deepEqual(
    [ana.estado, ana.total, ana.anticipo, ana.saldo, getAvailability([ana], DATE_F)],
    ['pendiente', 2140, 0, 2140, { sillas: 20, mesas: 7 }],
  );

  assert.throws(
    () => create([ana], 'Luis', DATE_F, { sillas: 25, mesas: 1, decoracion: 0 }, 'luis'),
    /Sillas:.*120|Sillas:.*20|Stock insuficiente/i,
  );

  const luis = create([ana], 'Luis', DATE_F, { sillas: 20, mesas: 1, decoracion: 0 }, 'luis');
  assert.deepEqual(getAvailability([ana, luis], DATE_F), { sillas: 0, mesas: 6 });

  const eva = create([ana, luis], 'Eva', DATE_G, { sillas: 120, mesas: 12, decoracion: 0 }, 'eva');
  assert.equal(eva.total, 2916);
  assert.deepEqual(getAvailability([ana, luis, eva], DATE_G), { sillas: 0, mesas: 0 });
});

test('P5-P6: registra un solo anticipo mínimo y cancelación libera el inventario una vez', () => {
  const ana = create([], 'Ana', DATE_F, { sillas: 100, mesas: 5, decoracion: 0, entrega: true }, 'ana');
  assert.throws(() => recordDeposit([ana], 'ana', 641.99), /mínimo/i);

  const confirmed = recordDeposit([ana], 'ana', 642)[0];
  assert.deepEqual(
    [confirmed.estado, confirmed.anticipo, confirmed.saldo],
    ['confirmada', 642, 1498],
  );
  assert.deepEqual(getAvailability([confirmed], DATE_F), { sillas: 20, mesas: 7 });
  assert.throws(() => recordDeposit([confirmed], 'ana', 642), /una vez/i);
  assert.throws(() => recordDeposit([confirmed], 'ana', 3000), /una vez/i);

  const cancelled = cancelReservation([confirmed], 'ana');
  assert.equal(cancelled[0].estado, 'cancelada');
  assert.deepEqual(getAvailability(cancelled, DATE_F), { sillas: 120, mesas: 12 });
  assert.throws(() => cancelReservation(cancelled, 'ana'), /cancelada/i);
  assert.throws(() => recordDeposit(cancelled, 'ana', 642), /una vez/i);
  assert.equal(cancelled[0].anticipo, 642);
});

test('P8 y validaciones adicionales: rechaza cantidades, nombre, fecha, artículos y anticipo inválidos', () => {
  assert.throws(() => create([], '   ', DATE_F, { sillas: 1, mesas: 0, decoracion: 0 }), /nombre/i);
  assert.throws(() => create([], 'Ana', '2026-02-30', { sillas: 1, mesas: 0, decoracion: 0 }), /fecha válida/i);
  assert.throws(() => create([], 'Ana', today, { sillas: -1, mesas: 0, decoracion: 0 }), /entero/i);
  assert.throws(() => create([], 'Ana', DATE_F, { sillas: 1.5, mesas: 0, decoracion: 0 }), /entero/i);
  assert.throws(() => create([], 'Ana', DATE_F, { sillas: 0, mesas: 0, decoracion: 0 }), /al menos una silla o una mesa/i);
  assert.throws(() => create([], 'Ana', DATE_F, { sillas: 1, mesas: 0, decoracion: 2 }), /máximo permitido es 1/i);

  const ana = create([], 'Ana', DATE_F, { sillas: 100, mesas: 5, decoracion: 0, entrega: true }, 'ana');
  assert.throws(() => recordDeposit([ana], 'ana', 2140.01), /mayor que el total/i);
  const fullyPaid = recordDeposit([ana], 'ana', 2140)[0];
  assert.deepEqual([fullyPaid.anticipo, fullyPaid.saldo], [2140, 0]);
});

test('P7: persiste el arreglo bajo una clave nueva y lo restaura', async () => {
  const entries = new Map();
  const storage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
  assert.deepEqual(loadReservations(storage), []);
  await createReservationInStorage({
    clientName: 'Ana',
    eventDate: DATE_F,
    quantities: { sillas: 1, mesas: 0, decoracion: 0, entrega: false },
  }, storage, null);

  assert.ok(entries.has('miev-evento-reservas-v1'));
  assert.notEqual(RESERVATIONS_STORAGE_KEY, 'vibe-cotizador-draft-v1');
  const restored = loadReservations(storage);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].cliente, 'Ana');
  assert.equal(restored[0].estado, 'pendiente');
});

test('T2-T3: edición segura excluye el propio folio y rechaza faltantes de stock', () => {
  const ana = create([], 'Ana', DATE_F, { sillas: 100, mesas: 5, decoracion: 0, entrega: true }, 'ana');
  const beto = create([ana], 'Beto', DATE_G, { sillas: 30, mesas: 0, decoracion: 0 }, 'beto');
  assert.throws(
    () => updateReservation([ana, beto], 'ana', {
      clientName: 'Ana',
      eventDate: DATE_G,
      quantities: { sillas: 100, mesas: 5, decoracion: 0, entrega: true },
    }),
    /stock/i,
  );
  const withoutAna = [beto];
  const updated = updateReservation(withoutAna, 'beto', {
    clientName: 'Beto',
    eventDate: DATE_F,
    quantities: { sillas: 30, mesas: 0, decoracion: 0, entrega: false },
  });
  assert.equal(updated.find((item) => item.id === 'beto').fecha, DATE_F);
});

test('T4-T6: abonos parciales y liquidación cierran la cuenta', () => {
  const ana = create([], 'Ana', DATE_F, { sillas: 100, mesas: 5, decoracion: 0, entrega: true }, 'ana');
  const confirmed = recordDeposit([ana], 'ana', 642);
  assert.throws(() => recordPayment(confirmed, 'ana', 0), /mayor a cero/i);
  assert.throws(() => recordPayment(confirmed, 'ana', -1), /mayor a cero/i);
  assert.throws(() => recordPayment(confirmed, 'ana', 1498.01), /exceder/i);
  const partial = recordPayment(confirmed, 'ana', 500)[0];
  assert.deepEqual([partial.anticipo, partial.saldo, partial.estado], [1142, 998, 'confirmada']);
  const settled = recordPayment([partial], 'ana', 998)[0];
  assert.deepEqual([settled.anticipo, settled.saldo, settled.estado], [2140, 0, 'liquidada']);
  assert.throws(() => recordPayment([settled], 'ana', 1), /Solo se pueden registrar pagos/i);
});
