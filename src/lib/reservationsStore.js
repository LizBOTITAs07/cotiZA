import {
  cancelReservation,
  createReservationRecord,
  recordDeposit,
  recordPayment,
  updateReservation,
} from './reservations.js';

export const RESERVATIONS_STORAGE_KEY = 'miev-evento-reservas-v1';
export const PAYMENTS_STORAGE_KEY = 'vibe-cotizador-pagos-v1';

function isReservation(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof value.id === 'string'
    && typeof value.cliente === 'string'
    && typeof value.fecha === 'string'
    && Number.isSafeInteger(value.sillas)
    && Number.isSafeInteger(value.mesas)
    && Number.isSafeInteger(value.decoracion)
    && typeof value.entrega === 'boolean'
    && ['subtotal', 'descuento', 'total', 'anticipo', 'saldo'].every(
      (field) => Number.isFinite(value[field]) && value[field] >= 0,
    )
    && ['pendiente', 'confirmada', 'liquidada', 'cancelada'].includes(value.estado)
    && typeof value.creadoEn === 'string',
  );
}

export function loadReservations(storage = window.localStorage) {
  const raw = storage.getItem(RESERVATIONS_STORAGE_KEY);
  if (raw === null) {
    return [];
  }

  let reservations;
  try {
    reservations = JSON.parse(raw);
  } catch {
    throw new Error('Los datos de reservas locales están dañados; no se modificaron.');
  }
  if (!Array.isArray(reservations) || !reservations.every(isReservation)) {
    throw new Error('El formato de las reservas locales no es compatible; no se modificaron.');
  }
  return reservations;
}

export function saveReservations(reservations, storage = window.localStorage) {
  if (!Array.isArray(reservations) || !reservations.every(isReservation)) {
    throw new TypeError('Solo se pueden guardar reservas válidas.');
  }
  storage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(reservations));
}

async function withStoreLock(action, lockManager = globalThis.navigator?.locks) {
  if (lockManager?.request) {
    return lockManager.request(RESERVATIONS_STORAGE_KEY, { mode: 'exclusive' }, action);
  }
  return action();
}

export async function createReservationInStorage(input, storage = window.localStorage, lockManager) {
  return withStoreLock(() => {
    const reservations = loadReservations(storage);
    const reservation = createReservationRecord(reservations, input);
    saveReservations([...reservations, reservation], storage);
    return reservation;
  }, lockManager);
}

export async function recordDepositInStorage(reservationId, amount, storage = window.localStorage, lockManager) {
  return withStoreLock(() => {
    const reservations = loadReservations(storage);
    const updated = recordDeposit(reservations, reservationId, amount);
    saveReservations(updated, storage);
    const reservation = updated.find((item) => item.id === reservationId);
    const payments = loadPayments(storage);
    savePayments([{
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      reservaId: reservationId,
      reservaCodigo: reservationId.slice(0, 8).toUpperCase(),
      cliente: reservation.cliente,
      fechaEvento: reservation.fecha,
      fecha: new Date().toISOString(),
      metodo: 'Efectivo',
      monto: reservation.anticipo,
      saldo: reservation.saldo,
      tipo: 'Anticipo',
    }, ...payments], storage);
    return reservation;
  }, lockManager);
}

export async function cancelReservationInStorage(reservationId, storage = window.localStorage, lockManager) {
  return withStoreLock(() => {
    const reservations = loadReservations(storage);
    const updated = cancelReservation(reservations, reservationId);
    saveReservations(updated, storage);
    const cancelled = updated.find((reservation) => reservation.id === reservationId);
    if (cancelled?.anticipo > 0) {
      const payments = loadPayments(storage);
      savePayments([{
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        reservaId: reservationId,
        reservaCodigo: reservationId.slice(0, 8).toUpperCase(),
        cliente: cancelled.cliente,
        fechaEvento: cancelled.fecha,
        fecha: new Date().toISOString(),
        metodo: 'Ajuste Cancelación',
        monto: -cancelled.anticipo,
        saldo: cancelled.saldo,
      }, ...payments], storage);
    }
    return updated.find((reservation) => reservation.id === reservationId);
  }, lockManager);
}

export function loadPayments(storage = window.localStorage) {
  const raw = storage.getItem(PAYMENTS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function savePayments(payments, storage = window.localStorage) {
  storage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
}

export async function recordPaymentInStorage(reservationId, amount, method = 'Efectivo', storage = window.localStorage, lockManager) {
  return withStoreLock(() => {
    const reservations = loadReservations(storage);
    const updated = recordPayment(reservations, reservationId, amount);
    saveReservations(updated, storage);
    const reservation = updated.find((item) => item.id === reservationId);
    const payments = loadPayments(storage);
    savePayments([{
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      reservaId: reservationId,
      reservaCodigo: reservationId.slice(0, 8).toUpperCase(),
      cliente: reservation.cliente,
      fechaEvento: reservation.fecha,
      fecha: new Date().toISOString(),
      metodo: method,
      monto: Number(amount),
      saldo: reservation.saldo,
    }, ...payments], storage);
    return reservation;
  }, lockManager);
}

export async function updateReservationInStorage(reservationId, input, storage = window.localStorage, lockManager) {
  return withStoreLock(() => {
    const reservations = loadReservations(storage);
    const updated = updateReservation(reservations, reservationId, input);
    saveReservations(updated, storage);
    return updated.find((reservation) => reservation.id === reservationId);
  }, lockManager);
}
