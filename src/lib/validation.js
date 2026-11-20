import { SERVICE_CATALOG } from './catalog.js';

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function validateQuantity(value, serviceName, available) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return 'Ingresa un número entero igual o mayor que cero.';
  }

  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity)) {
    return 'La cantidad ingresada está fuera del rango permitido.';
  }

  if (Number.isInteger(available) && quantity > available) {
    return `Stock insuficiente. Máximo disponible: ${available} ${serviceName} para esta fecha.`;
  }

  return '';
}

export function validateQuote({ clientName, eventDate, quantities, availability }, today = getLocalDateString()) {
  const errors = {};
  const name = typeof clientName === 'string' ? clientName.trim() : '';

  if (!name) {
    errors.clientName = 'Escribe el nombre del cliente.';
  } else if (name.length > 150) {
    errors.clientName = 'El nombre no puede superar los 150 caracteres.';
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
    errors.clientName = 'El nombre del cliente solo debe contener letras y espacios.';
  }

  if (!isValidDateOnly(eventDate)) {
    errors.eventDate = 'Selecciona una fecha de evento válida.';
  } else if (eventDate < today) {
    errors.eventDate = 'La fecha del evento no puede ser anterior a hoy.';
  }

  for (const [serviceId, value] of Object.entries(quantities)) {
    const service = SERVICE_CATALOG.find((item) => item.id === serviceId);
    if (service?.fixedCharge) {
      continue;
    }
    const serviceName = service
      ? service.id === 'decoracion'
        ? 'paquetes de decoración'
        : `${service.unitLabel}${availability[serviceId] === 1 ? '' : 's'}`
      : serviceId;
    const maximum = service?.maxQuantity ?? availability[serviceId];
    const message = validateQuantity(value, serviceName, maximum);
    if (message) {
      errors[serviceId] = message;
    }
  }

  return errors;
}
