import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateQuote } from '../src/lib/calculator.js';
import { validateQuantity, validateQuote } from '../src/lib/validation.js';

test('aplica el caso oficial Vibe y excluye la entrega del descuento', () => {
  const quote = calculateQuote({ sillas: 100, mesas: 5, decoracion: 0, entrega: 1 });

  assert.equal(quote.subtotal, 2100);
  assert.equal(quote.discount, 210);
  assert.equal(quote.delivery, 250);
  assert.equal(quote.total, 2140);
});

test('no aplica descuento por debajo del umbral y sí al alcanzar 2,000', () => {
  const belowThreshold = calculateQuote({ sillas: 5, mesas: 16, decoracion: 0 });
  const exactThreshold = calculateQuote({ sillas: 0, mesas: 10, decoracion: 1 });
  const aboveThreshold = calculateQuote({ sillas: 134, mesas: 0, decoracion: 0 });

  assert.equal(belowThreshold.subtotal, 1995);
  assert.equal(belowThreshold.discount, 0);
  assert.equal(belowThreshold.total, 1995);
  assert.equal(exactThreshold.subtotal, 2000);
  assert.equal(exactThreshold.discount, 200);
  assert.equal(exactThreshold.total, 1800);
  assert.equal(aboveThreshold.discount, 201);
  assert.equal(aboveThreshold.total, 1809);
});

test('la entrega es opcional y se cobra solo cuando se selecciona', () => {
  const quote = calculateQuote({ sillas: 0, mesas: 0, decoracion: 0 });
  const withDelivery = calculateQuote({ sillas: 1, mesas: 0, decoracion: 0, entrega: 1 });

  assert.equal(quote.subtotal, 0);
  assert.equal(quote.discount, 0);
  assert.equal(quote.delivery, 0);
  assert.equal(quote.total, 0);
  assert.equal(withDelivery.delivery, 250);
  assert.equal(withDelivery.total, 265);
});

test('rechaza cantidades negativas, decimales, vacías y fuera del inventario', () => {
  assert.match(validateQuantity('-5', 'mesas', 30), /entero/);
  assert.match(validateQuantity('2.5', 'decoración', 5), /entero/);
  assert.match(validateQuantity('', 'sillas', 300), /entero/);
  assert.match(validateQuantity('121', 'sillas', 120), /Stock insuficiente.*120/);
  assert.equal(validateQuantity('120', 'sillas', 120), '');
});

test('valida cliente y fecha de evento', () => {
  const valid = validateQuote({
    clientName: 'María García',
    eventDate: '2026-12-15',
    quantities: { sillas: '10', mesas: '0', decoracion: '0' },
    availability: { sillas: 120, mesas: 12, decoracion: 1 },
  }, '2026-11-17');
  const invalid = validateQuote({
    clientName: '   ',
    eventDate: '2026-02-30',
    quantities: { sillas: '-1', mesas: '0', decoracion: '0' },
    availability: { sillas: 120, mesas: 12, decoracion: 1 },
  }, '2026-11-17');

  assert.deepEqual(valid, {});
  assert.ok(invalid.clientName);
  assert.ok(invalid.eventDate);
  assert.ok(invalid.sillas);
});

test('no admite fechas anteriores al día actual', () => {
  const errors = validateQuote({
    clientName: 'María García',
    eventDate: '2026-11-16',
    quantities: { sillas: '0', mesas: '0', decoracion: '0' },
    availability: { sillas: 120, mesas: 12, decoracion: 1 },
  }, '2026-11-17');

  assert.match(errors.eventDate, /anterior a hoy/);
});
