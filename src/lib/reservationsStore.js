import {
  cancelReservation,
  createReservationRecord,
  recordDeposit,
} from './reservations.js';

export const RESERVATIONS_STORAGE_KEY = 'miev-evento-reservas-v1';

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
    && ['pendiente', 'confirmada', 'cancelada'].includes(value.estado)
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
    return updated.find((reservation) => reservation.id === reservationId);
  }, lockManager);
}

export async function cancelReservationInStorage(reservationId, storage = window.localStorage, lockManager) {
  return withStoreLock(() => {
    const reservations = loadReservations(storage);
    const updated = cancelReservation(reservations, reservationId);
    saveReservations(updated, storage);
    return updated.find((reservation) => reservation.id === reservationId);
  }, lockManager);
}
