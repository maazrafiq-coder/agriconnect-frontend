// Money helpers for transport quotes. The server computes the real total (base + charges);
// this mirrors it for the live preview and the review / accept screens.
const round2 = (n) => Math.round(n * 100) / 100;

export const MAX_CHARGES = 10;

// -> all-in total. Blank / non-positive rows are ignored.
export function chargesTotal(price, charges) {
  const extra = (charges || []).reduce((s, c) => {
    const a = Number(c?.amount);
    return s + (Number.isFinite(a) && a > 0 ? a : 0);
  }, 0);
  const base = Number(price);
  return round2((Number.isFinite(base) ? base : 0) + extra);
}

// Total of a round returned by the API (older rounds have no totalPrice / additionalCharges).
export function roundTotal(round) {
  if (!round) return 0;
  if (round.totalPrice != null && Number.isFinite(Number(round.totalPrice))) return Number(round.totalPrice);
  return chargesTotal(round.price, round.additionalCharges);
}

// -> readable problem or null. Rows must be complete (label + amount > 0) or entirely empty.
export function validateCharges(charges) {
  const rows = charges || [];
  if (rows.length > MAX_CHARGES) return `You can list at most ${MAX_CHARGES} additional charges.`;
  for (const c of rows) {
    const label = String(c.label || '').trim();
    const blankAmount = c.amount === '' || c.amount == null;
    if (!label && blankAmount) continue;
    if (!label) return 'Give each additional charge a name (e.g. Loading, Tolls).';
    if (!(Number(c.amount) > 0)) return `Enter an amount greater than zero for "${label}" (or remove the row).`;
  }
  return null;
}

export const cleanCharges = (charges) => (charges || [])
  .filter(c => String(c.label || '').trim() && Number(c.amount) > 0)
  .map(c => ({ label: String(c.label).trim(), amount: Number(c.amount) }));

// ISO string -> value for <input type="datetime-local"> in the viewer's time zone
export function toLocalInput(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : undefined);
