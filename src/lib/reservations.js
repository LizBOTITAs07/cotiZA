import { calculateQuote } from './calculator.js';
import { getLocalDateString, isValidDateOnly } from './validation.js';

export const INVENTORY_LIMITS = Object.freeze({ sillas: 120, mesas: 12 });
export const DECORATION_LIMIT_PER_RESERVATION = 1;
export const MINIMUM_DEPOSIT_RATE = 0.3;

const ACTIVE_STATUSES = new Set(['pendiente', 'confirmada']);

export function getAvailability(reservations, eventDate) {
  const activeForDate = reservations.filter(
    (reservation) => reservation.fecha === eventDate && ACTIVE_STATUSES.has(reservation.estado),
  );
  const usedChairs = activeForDate.reduce((total, reservation) => total + reservation.sillas, 0);
  const usedTables = activeForDate.reduce((total, reservation) => total + reservation.mesas, 0);

  return {
    sillas: Math.max(0, INVENTORY_LIMITS.sillas - usedChairs),
    mesas: Math.max(0, INVENTORY_LIMITS.mesas - usedTables),
  };
}

function parseQuantity(value, field, label, maximum) {
  const quantity = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error(`${label}: ingresa un número entero igual o mayor que cero.`);
  }
  if (quantity > maximum) {
    throw new Error(`${label}: el máximo permitido es ${maximum}.`);
  }
  return quantity;
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createReservationRecord(reservations, input, options = {}) {
  const clientName = typeof input.clientName === 'string' ? input.clientName.trim() : '';
  if (!clientName || clientName.length > 150) {
    throw new Error('Escribe un nombre de cliente de 1 a 150 caracteres.');
  }
  if (!isValidDateOnly(input.eventDate)) {
    throw new Error('Selecciona una fecha válida para el evento.');
  }

  const today = options.today ?? getLocalDateString();
  if (input.eventDate < today) {
    throw new Error('La fecha del evento no puede ser anterior a hoy.');
  }

  const availability = getAvailability(reservations, input.eventDate);
  const chairs = parseQuantity(input.quantities?.sillas, 'sillas', 'Sillas', availability.sillas);
  const tables = parseQuantity(input.quantities?.mesas, 'mesas', 'Mesas', availability.mesas);
  const decoration = parseQuantity(
    input.quantities?.decoracion,
    'decoracion',
    'Decoración',
    DECORATION_LIMIT_PER_RESERVATION,
  );

  if (chairs === 0 && tables === 0) {
    throw new Error('La reserva debe incluir al menos una silla o una mesa.');
  }

  const delivery = input.quantities?.entrega === true || input.quantities?.entrega === 1;
  const quote = calculateQuote({
    sillas: chairs,
    mesas: tables,
    decoracion: decoration,
    entrega: delivery ? 1 : 0,
  });
  const totalCents = quote.totalCents;

  return {
    id: options.id ?? createId(),
    cliente: clientName,
    fecha: input.eventDate,
    sillas: chairs,
    mesas: tables,
    decoracion: decoration,
    entrega: delivery,
    subtotal: quote.subtotal,
    descuento: quote.discount,
    total: quote.total,
    anticipo: 0,
    saldo: quote.total,
    estado: 'pendiente',
    creadoEn: options.createdAt ?? new Date().toISOString(),
  };
}

export function recordDeposit(reservations, reservationId, amount) {
  const index = reservations.findIndex((reservation) => reservation.id === reservationId);
  if (index === -1) {
    throw new Error('No se encontró la reserva.');
  }

  const reservation = reservations[index];
  if (reservation.estado !== 'pendiente' || reservation.anticipo > 0) {
    throw new Error('El anticipo solo se puede registrar una vez en una reserva pendiente.');
  }

  const amountNumber = typeof amount === 'number' ? amount : Number(amount);
  const amountCents = Math.round(amountNumber * 100);
  const totalCents = Math.round(reservation.total * 100);
  const minimumCents = Math.round(totalCents * MINIMUM_DEPOSIT_RATE);
  if (!Number.isFinite(amountNumber) || !Number.isSafeInteger(amountCents) || amountCents < minimumCents) {
    throw new Error(`El anticipo mínimo es ${formatMoney(minimumCents / 100)} (30% del total).`);
  }
  if (amountCents > totalCents) {
    throw new Error('El anticipo no puede ser mayor que el total de la reserva.');
  }

  const updated = {
    ...reservation,
    anticipo: amountCents / 100,
    saldo: (totalCents - amountCents) / 100,
    estado: 'confirmada',
  };
  return reservations.map((item, itemIndex) => itemIndex === index ? updated : item);
}

export function cancelReservation(reservations, reservationId) {
  const index = reservations.findIndex((reservation) => reservation.id === reservationId);
  if (index === -1) {
    throw new Error('No se encontró la reserva.');
  }
  if (!ACTIVE_STATUSES.has(reservations[index].estado)) {
    throw new Error('La reserva ya está cancelada y no puede modificarse.');
  }

  return reservations.map((reservation, itemIndex) => (
    itemIndex === index ? { ...reservation, estado: 'cancelada' } : reservation
  ));
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}
