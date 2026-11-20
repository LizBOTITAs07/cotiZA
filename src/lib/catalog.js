/**
 * @typedef {{
 *   id: 'sillas' | 'mesas' | 'decoracion' | 'entrega';
 *   concept: string;
 *   category: string;
 *   unitPrice: number;
 *   unitLabel: string;
 *   stockLimit: number | null;
 *   maxQuantity?: number;
 *   discountable: boolean;
 *   fixedCharge?: boolean;
 * }} CatalogService
 */

/** @type {readonly CatalogService[]} */
export const SERVICE_CATALOG = Object.freeze([
  Object.freeze({
    id: 'sillas',
    concept: 'Renta de silla',
    category: 'Mobiliario',
    unitPrice: 15,
    unitLabel: 'silla',
    stockLimit: 120,
    discountable: true,
  }),
  Object.freeze({
    id: 'mesas',
    concept: 'Renta de mesa',
    category: 'Mobiliario',
    unitPrice: 120,
    unitLabel: 'mesa',
    stockLimit: 12,
    discountable: true,
  }),
  Object.freeze({
    id: 'decoracion',
    concept: 'Paquete de decoración',
    category: 'Decoración',
    unitPrice: 800,
    unitLabel: 'paquete',
    stockLimit: null,
    maxQuantity: 1,
    discountable: true,
  }),
  Object.freeze({
    id: 'entrega',
    concept: 'Servicio de entrega',
    category: 'Logística',
    unitPrice: 250,
    unitLabel: 'evento',
    stockLimit: null,
    discountable: false,
    fixedCharge: true,
  }),
]);

export const BUSINESS_RULES = Object.freeze({
  discountThreshold: 2000,
  discountRate: 0.1,
});
