import { SERVICE_CATALOG } from '../lib/catalog.js';
import { calculateQuote } from '../lib/calculator.js';
import { getLocalDateString, validateQuote } from '../lib/validation.js';
import { clearDraft, loadDraft, saveDraft } from '../lib/localStore.js';
import { getAvailability } from '../lib/reservations.js';
import { createReservationInStorage, loadReservations, RESERVATIONS_STORAGE_KEY } from '../lib/reservationsStore.js';

const form = document.querySelector('#quote-form');

if (form instanceof HTMLFormElement) {
  const dateInput = form.querySelector('#event-date');
  const nameInput = form.querySelector('#client-name');
  const deliveryInput = form.querySelector('#include-delivery');
  const formStatus = form.querySelector('#form-status');
  const inventoryStatus = form.querySelector('#inventory-status');
  const saveButton = form.querySelector('#save-quote');
  const printLink = form.querySelector('#print-quote');
  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const editableServices = SERVICE_CATALOG.filter((service) => !service.fixedCharge);
  const availability = Object.fromEntries(
    editableServices.map((service) => [service.id, service.stockLimit ?? service.maxQuantity]),
  );
  const touched = new Set();
  let saveInProgress = false;

  dateInput.min = getLocalDateString();

  function getQuantities() {
    return {
      ...Object.fromEntries(editableServices.map((service) => {
        const input = form.querySelector(`#quantity-${service.id}`);
        return [service.id, input.value];
      })),
      entrega: deliveryInput.checked ? 1 : 0,
    };
  }

  function readDraft() {
    try {
      const { draft, error } = loadDraft();
      if (error) {
        formStatus.textContent = error;
        formStatus.dataset.tone = 'error';
      }
      if (!draft) {
        return;
      }

      nameInput.value = draft.clientName;
      dateInput.value = draft.eventDate;
      deliveryInput.checked = draft.quantities.entrega === '1';

      for (const service of editableServices) {
        const input = form.querySelector(`#quantity-${service.id}`);
        if (typeof draft.quantities[service.id] === 'string') {
          input.value = draft.quantities[service.id];
          touched.add(input);
        }
      }
      if (nameInput.value) touched.add(nameInput);
      if (dateInput.value) touched.add(dateInput);
    } catch (error) {
      console.error('[cotizador] No se pudo acceder al borrador local.', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      formStatus.textContent = 'No se pudo acceder al almacenamiento local. La cotización no se conservará al recargar.';
      formStatus.dataset.tone = 'error';
    }
  }

  function persistDraft() {
    try {
      const quantities = getQuantities();
      saveDraft({
        clientName: nameInput.value,
        eventDate: dateInput.value,
        quantities: Object.fromEntries(
          Object.entries(quantities).map(([id, value]) => [id, String(value)]),
        ),
      });
    } catch (error) {
      console.error('[cotizador] No se pudo guardar el borrador local.', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      formStatus.textContent = 'No se pudo guardar el borrador en este navegador; podría perderse si recargas.';
      formStatus.dataset.tone = 'error';
    }
  }

  function showFieldError(input, errorElement, message) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    errorElement.textContent = message;
    errorElement.hidden = !message;
  }

  function getValidationErrors() {
    return validateQuote({
      clientName: nameInput.value,
      eventDate: dateInput.value,
      quantities: getQuantities(),
      availability,
    });
  }

  function renderQuote(showAllErrors = false) {
    const errors = getValidationErrors();
    showFieldError(
      nameInput,
      form.querySelector('#client-name-error'),
      showAllErrors || touched.has(nameInput) ? errors.clientName ?? '' : '',
    );
    showFieldError(
      dateInput,
      form.querySelector('#event-date-error'),
      showAllErrors || touched.has(dateInput) ? errors.eventDate ?? '' : '',
    );

    for (const service of editableServices) {
      const input = form.querySelector(`#quantity-${service.id}`);
      const errorElement = form.querySelector(`[data-quantity-error="${service.id}"]`);
      showFieldError(
        input,
        errorElement,
        showAllErrors || touched.has(input) ? errors[service.id] ?? '' : '',
      );
    }

    const parsedQuantities = {
      sillas: Number(getQuantities().sillas),
      mesas: Number(getQuantities().mesas),
      decoracion: Number(getQuantities().decoracion),
      entrega: getQuantities().entrega,
    };
    const hasValidFurniture = !errors.sillas && !errors.mesas
      && (parsedQuantities.sillas > 0 || parsedQuantities.mesas > 0);

    const quantityErrors = editableServices.filter((service) => errors[service.id]);
    if (quantityErrors.length > 0) {
      for (const total of form.querySelectorAll('[data-total]')) {
        total.textContent = '—';
      }
      if (saveButton instanceof HTMLButtonElement) {
        saveButton.disabled = true;
      }
      formStatus.textContent = 'Corrige las cantidades marcadas para calcular la reserva.';
      formStatus.dataset.tone = 'error';
      return false;
    }

    const quote = calculateQuote(parsedQuantities);
    for (const item of quote.lineItems) {
      const row = form.querySelector(`[data-summary-item="${item.id}"]`);
      if (!row) {
        continue;
      }
      row.hidden = item.quantity === 0;
      row.querySelector('[data-line-quantity]').textContent = String(item.quantity);
      row.querySelector('[data-line-amount]').textContent = currency.format(item.amountCents / 100);
    }

    form.querySelector('[data-empty-row]').hidden = true;
    form.querySelector('[data-total="subtotal"]').textContent = currency.format(quote.subtotal);
    form.querySelector('[data-total="discount"]').textContent = `−${currency.format(quote.discount)}`;
    form.querySelector('[data-total="delivery"]').textContent = currency.format(quote.delivery);
    form.querySelector('[data-total="grand"]').textContent = currency.format(quote.total);
    if (saveButton instanceof HTMLButtonElement) {
      saveButton.disabled = Boolean(errors.clientName || errors.eventDate || !hasValidFurniture);
    }

    if (errors.clientName || errors.eventDate) {
      formStatus.textContent = 'Completa el nombre del cliente y una fecha válida para guardar la reserva.';
      formStatus.dataset.tone = 'error';
      return false;
    }

    if (!hasValidFurniture) {
      formStatus.textContent = 'Incluye al menos una silla o una mesa para guardar la reserva.';
      formStatus.dataset.tone = 'error';
      return false;
    }

    formStatus.textContent = quote.discount > 0
      ? `Descuento de ${currency.format(quote.discount)} aplicado al mobiliario y la decoración.`
      : 'Los importes están actualizados. El descuento se activa desde $2,000.';
    formStatus.dataset.tone = 'success';
    return true;
  }

  function refreshInventory() {
    const eventDate = dateInput.value;
    if (!eventDate) {
      inventoryStatus.textContent = 'Elige una fecha para consultar el inventario local de ese día.';
      inventoryStatus.dataset.tone = '';
      return;
    }

    try {
      const reservations = loadReservations();
      const dateAvailability = getAvailability(reservations, eventDate);
      for (const service of editableServices) {
        if (service.id === 'decoracion') {
          availability[service.id] = service.maxQuantity;
        } else {
          availability[service.id] = dateAvailability[service.id];
        }
        const input = form.querySelector(`#quantity-${service.id}`);
        const label = form.querySelector(`[data-service-row="${service.id}"] .availability-label`);
        input.max = String(availability[service.id]);
        label.textContent = service.id === 'decoracion'
          ? 'Máximo por reserva: 1 paquete'
          : `Disponibles para ${eventDate}: ${availability[service.id]} (máximo ${service.stockLimit})`;
      }
      inventoryStatus.textContent = `Disponibilidad local actualizada para ${eventDate}.`;
      inventoryStatus.dataset.tone = 'success';
      renderQuote();
    } catch (error) {
      console.error('[cotizador] No se pudo consultar el inventario local.', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      inventoryStatus.textContent = error instanceof Error
        ? error.message
        : 'No se pudo leer el inventario local.';
      inventoryStatus.dataset.tone = 'error';
      saveButton.disabled = true;
    }
  }

  form.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement) {
      touched.add(event.target);
      renderQuote();
      persistDraft();
      if (event.target === dateInput) {
        refreshInventory();
      }
    }
  });

  form.addEventListener('focusout', (event) => {
    if (event.target instanceof HTMLInputElement) {
      touched.add(event.target);
      renderQuote();
      persistDraft();
    }
  });

  form.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement) {
      touched.add(event.target);
      renderQuote();
      persistDraft();
      if (event.target === dateInput) {
        refreshInventory();
      }
    }
  });

  form.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const stepButton = event.target.closest('[data-step]');
    if (stepButton instanceof HTMLButtonElement) {
      const inputId = stepButton.getAttribute('aria-controls');
      const input = inputId ? form.querySelector(`#${inputId}`) : null;
      if (!(input instanceof HTMLInputElement)) {
        return;
      }
      const current = /^\d+$/.test(input.value) ? Number(input.value) : 0;
      const serviceId = inputId.replace('quantity-', '');
      const next = Math.max(0, Math.min(availability[serviceId], current + Number(stepButton.dataset.step)));
      input.value = String(next);
      touched.add(input);
      renderQuote();
      persistDraft();
      input.focus();
      return;
    }

    const removeButton = event.target.closest('[data-remove-item]');
    if (removeButton instanceof HTMLButtonElement) {
      const input = form.querySelector(`#quantity-${removeButton.dataset.removeItem}`);
      if (input instanceof HTMLInputElement) {
        input.value = '0';
        touched.add(input);
        renderQuote();
        persistDraft();
      }
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saveInProgress) {
      return;
    }
    const valid = renderQuote(true);
    if (!valid) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    saveInProgress = true;
    saveButton.disabled = true;
    saveButton.setAttribute('aria-busy', 'true');
    formStatus.textContent = 'Guardando la reserva en este navegador…';
    formStatus.dataset.tone = '';

    try {
      const reservation = await createReservationInStorage({
        clientName: nameInput.value,
        eventDate: dateInput.value,
        quantities: {
          sillas: Number(getQuantities().sillas),
          mesas: Number(getQuantities().mesas),
          decoracion: Number(getQuantities().decoracion),
          entrega: deliveryInput.checked,
        },
      });
      clearDraft();
      window.location.assign(`/cotizacion/${encodeURIComponent(reservation.id)}`);
    } catch (error) {
      console.error('[cotizador] No se pudo guardar la reserva local.', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      formStatus.textContent = error instanceof Error
        ? error.message
        : 'No se pudo guardar la reserva en este navegador.';
      formStatus.dataset.tone = 'error';
      saveInProgress = false;
      saveButton.removeAttribute('aria-busy');
      refreshInventory();
    }
  });

  printLink?.addEventListener('click', (event) => {
    event.preventDefault();
    formStatus.textContent = 'Primero guarda la reserva para generar su comprobante.';
    formStatus.dataset.tone = 'error';
    saveButton.focus();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === RESERVATIONS_STORAGE_KEY && dateInput.value) {
      refreshInventory();
    }
  });

  readDraft();
  renderQuote();
  if (dateInput.value && !dateInput.validity.badInput) {
    refreshInventory();
  }
}
