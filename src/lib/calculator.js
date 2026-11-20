import { BUSINESS_RULES, SERVICE_CATALOG } from './catalog.js';

function toCents(amount) {
  return Math.round(amount * 100);
}

function toAmount(cents) {
  return cents / 100;
}

export function calculateQuote(quantities) {
  const lineItems = SERVICE_CATALOG.map((service) => {
    const rawQuantity = service.fixedCharge
      ? (quantities[service.id] === true || quantities[service.id] === 1 ? 1 : 0)
      : quantities[service.id];
    if (!Number.isSafeInteger(rawQuantity) || rawQuantity < 0) {
      throw new RangeError(`La cantidad de ${service.concept} no es válida.`);
    }

    const unitPriceCents = toCents(service.unitPrice);
    const amountCents = unitPriceCents * rawQuantity;
    if (!Number.isSafeInteger(amountCents)) {
      throw new RangeError(`El importe de ${service.concept} está fuera del rango permitido.`);
    }

    return {
      id: service.id,
      concept: service.concept,
      quantity: rawQuantity,
      unitPriceCents,
      amountCents,
      discountable: service.discountable,
    };
  });

  const subtotalCents = lineItems
    .filter((line) => line.discountable)
    .reduce((sum, line) => sum + line.amountCents, 0);
  const thresholdCents = toCents(BUSINESS_RULES.discountThreshold);
  const discountCents = subtotalCents >= thresholdCents
    ? Math.round(subtotalCents * BUSINESS_RULES.discountRate)
    : 0;
  const deliveryCents = lineItems.find((line) => line.id === 'entrega').amountCents;
  const totalCents = subtotalCents - discountCents + deliveryCents;

  return {
    lineItems,
    subtotalCents,
    discountCents,
    deliveryCents,
    totalCents,
    subtotal: toAmount(subtotalCents),
    discount: toAmount(discountCents),
    delivery: toAmount(deliveryCents),
    total: toAmount(totalCents),
  };
}
