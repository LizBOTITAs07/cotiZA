const STORAGE_KEY = 'vibe-cotizador-draft-v1';
const DRAFT_VERSION = 1;
const SERVICE_IDS = ['sillas', 'mesas', 'decoracion', 'entrega'];

function isDraft(value) {
  if (!value || typeof value !== 'object' || value.version !== DRAFT_VERSION) {
    return false;
  }

  if (
    typeof value.clientName !== 'string'
    || typeof value.eventDate !== 'string'
    || !value.quantities
    || typeof value.quantities !== 'object'
  ) {
    return false;
  }

  return SERVICE_IDS.slice(0, 3).every((id) => typeof value.quantities[id] === 'string')
    && (value.quantities.entrega === undefined || typeof value.quantities.entrega === 'string');
}

export function loadDraft(storage = window.localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) {
    return { draft: null, error: null };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isDraft(parsed)) {
      return {
        draft: null,
        error: 'El borrador guardado no tenía un formato compatible; empieza una cotización nueva.',
      };
    }

    return {
      draft: {
        ...parsed,
        quantities: { ...parsed.quantities, entrega: parsed.quantities.entrega ?? '0' },
      },
      error: null,
    };
  } catch {
    return {
      draft: null,
      error: 'No se pudo leer el borrador guardado; empieza una cotización nueva.',
    };
  }
}

export function saveDraft(draft, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify({
    version: DRAFT_VERSION,
    clientName: draft.clientName,
    eventDate: draft.eventDate,
    quantities: Object.fromEntries(SERVICE_IDS.map((id) => [id, draft.quantities[id] ?? '0'])),
  }));
}

export function clearDraft(storage = window.localStorage) {
  storage.removeItem(STORAGE_KEY);
}
