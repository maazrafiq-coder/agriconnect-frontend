// Payment terms on the client: the form model, validation that mirrors the
// server (backend src/offers/terms/payment-terms.ts - the server is the
// authority and re-validates everything), and plain-language descriptions.
// Due DATES are never computed here: they depend on delivery acknowledgement,
// so the server returns them on orders / invoices.

export const TERM_TYPES = [
  { value: 'FULL_ADVANCE', label: 'Full advance', hint: '100% paid when the order is confirmed' },
  { value: 'COD', label: 'Cash on delivery', hint: '100% paid when the goods are delivered' },
  { value: 'CREDIT', label: 'Credit', hint: 'Paid after a credit period (30 / 60 / 90 days or custom)' },
  { value: 'PARTIAL_ADVANCE', label: 'Partial advance', hint: 'Part paid up front, balance later' },
  { value: 'OTHER', label: 'Other arrangement', hint: 'Describe a different arrangement in words' },
];
export const CREDIT_PRESETS = ['30', '60', '90'];
export const BALANCE_EVENTS = [
  { value: 'ON_DELIVERY', label: 'On delivery' },
  { value: 'ON_ACKNOWLEDGEMENT', label: 'On delivery acknowledgement' },
  { value: 'CREDIT', label: 'After a credit period' },
];

export const money = (n) => `₨${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
const round2 = (n) => Math.round(n * 100) / 100;

export function blankTermsForm(type = 'COD') {
  return {
    type, creditPreset: '30', creditCustom: '', creditStart: 'DELIVERY_ACK',
    advanceMode: 'PCT', advancePct: '', advanceAmount: '', balanceDueEvent: 'ON_DELIVERY', description: '',
  };
}

// API terms object -> editable form state
export function formFromTerms(t) {
  if (!t || !t.type) return blankTermsForm();
  const f = blankTermsForm(t.type);
  if (t.creditDays != null) {
    if (CREDIT_PRESETS.includes(String(t.creditDays))) f.creditPreset = String(t.creditDays);
    else { f.creditPreset = 'custom'; f.creditCustom = String(t.creditDays); }
  }
  if (t.creditStart) f.creditStart = t.creditStart;
  if (t.advancePct != null) { f.advanceMode = 'PCT'; f.advancePct = String(t.advancePct); }
  if (t.advanceAmount != null) { f.advanceMode = 'AMOUNT'; f.advanceAmount = String(t.advanceAmount); }
  if (t.balanceDueEvent) f.balanceDueEvent = t.balanceDueEvent;
  if (t.description) f.description = t.description;
  return f;
}

const creditDaysOf = (f) => Number(f.creditPreset === 'custom' ? f.creditCustom : f.creditPreset);
const needsCredit = (f) => f.type === 'CREDIT' || (f.type === 'PARTIAL_ADVANCE' && f.balanceDueEvent === 'CREDIT');

// form state -> payload for the API (only the fields that apply to the chosen type)
export function termsFromForm(f) {
  const out = { type: f.type };
  if (needsCredit(f)) { out.creditDays = creditDaysOf(f); out.creditStart = f.creditStart || 'DELIVERY_ACK'; }
  if (f.type === 'PARTIAL_ADVANCE') {
    if (f.advanceMode === 'AMOUNT') out.advanceAmount = Number(f.advanceAmount);
    else out.advancePct = Number(f.advancePct);
    out.balanceDueEvent = f.balanceDueEvent;
  }
  if (f.type === 'OTHER') out.description = (f.description || '').trim();
  else if ((f.description || '').trim()) out.description = f.description.trim();
  return out;
}

// -> readable problem, or null when valid
export function validateTermsForm(f) {
  if (!f || !TERM_TYPES.some(t => t.value === f.type)) return 'Choose payment terms.';
  if (needsCredit(f)) {
    const d = creditDaysOf(f);
    if (!Number.isInteger(d) || d < 1 || d > 365) return 'Credit period must be a whole number of days between 1 and 365.';
  }
  if (f.type === 'PARTIAL_ADVANCE') {
    if (f.advanceMode === 'AMOUNT') {
      const a = Number(f.advanceAmount);
      if (!Number.isFinite(a) || a <= 0) return 'Enter the advance amount (greater than zero).';
    } else {
      const p = Number(f.advancePct);
      if (!Number.isFinite(p) || p <= 0 || p >= 100) return 'Advance percentage must be above 0 and below 100.';
    }
  }
  if (f.type === 'OTHER' && (f.description || '').trim().length < 10) return 'Describe the payment arrangement (at least 10 characters).';
  return null;
}

export function describeTerms(t) {
  if (!t || !t.type) return 'Not specified';
  const start = (t.creditStart || 'DELIVERY_ACK') === 'INVOICE_DATE' ? 'invoice date' : 'delivery acknowledgement';
  switch (t.type) {
    case 'FULL_ADVANCE': return 'Full advance - 100% paid on order confirmation';
    case 'COD': return 'Cash on delivery - 100% paid on delivery';
    case 'CREDIT': return `Credit - 100% due ${t.creditDays} days after ${start}`;
    case 'PARTIAL_ADVANCE': {
      const adv = t.advancePct != null ? `${t.advancePct}%` : money(t.advanceAmount);
      const bal = t.balanceDueEvent === 'ON_DELIVERY' ? 'on delivery'
        : t.balanceDueEvent === 'ON_ACKNOWLEDGEMENT' ? 'on delivery acknowledgement'
        : `${t.creditDays} days after ${start}`;
      return `Partial advance - ${adv} on confirmation, balance ${bal}`;
    }
    default: return `Other - ${t.description || ''}`.trim();
  }
}

// Instalments with their due RULE (no dates). Returns null when it cannot be
// computed (e.g. a fixed advance that is not below the total).
export function scheduleFor(t, total) {
  const T = round2(Number(total) || 0);
  if (!t || !T) return [];
  const start = (t.creditStart || 'DELIVERY_ACK') === 'INVOICE_DATE' ? 'invoice date' : 'delivery acknowledgement';
  const credit = `${t.creditDays} days after ${start}`;
  switch (t.type) {
    case 'FULL_ADVANCE': return [{ label: 'Full advance', amount: T, dueRule: 'On order confirmation' }];
    case 'COD': return [{ label: 'Cash on delivery', amount: T, dueRule: 'On delivery' }];
    case 'CREDIT': return [{ label: 'Credit payment', amount: T, dueRule: credit }];
    case 'PARTIAL_ADVANCE': {
      const adv = t.advancePct != null ? round2((T * t.advancePct) / 100) : round2(t.advanceAmount);
      if (adv >= T) return null;
      const rule = t.balanceDueEvent === 'ON_DELIVERY' ? 'On delivery' : t.balanceDueEvent === 'ON_ACKNOWLEDGEMENT' ? 'On delivery acknowledgement' : credit;
      return [
        { label: 'Advance', amount: adv, dueRule: 'On order confirmation' },
        { label: 'Balance', amount: round2(T - adv), dueRule: rule },
      ];
    }
    default: return [{ label: 'Payment', amount: T, dueRule: t.description || 'As agreed' }];
  }
}

// Plain-language "what changed" between two rounds, for the review step.
export function diffRound(prev, next) {
  if (!prev) return [];
  const rows = [];
  if (Number(prev.price) !== Number(next.price)) rows.push({ label: 'Price', value: `${money(prev.price)} → ${money(next.price)}` });
  if (Number(prev.quantity) !== Number(next.quantity)) rows.push({ label: 'Quantity', value: `${prev.quantity} → ${next.quantity}` });
  if (describeTerms(prev.paymentTerms) !== describeTerms(next.paymentTerms)) {
    rows.push({ label: 'Payment terms', value: `${describeTerms(prev.paymentTerms)} → ${describeTerms(next.paymentTerms)}` });
  }
  return rows;
}
