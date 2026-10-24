// Helpers over an offer's rounds (OfferRound rows come with every offer list response).
export const currentRound = (offer) => (offer?.rounds || []).find(r => r.status === 'CURRENT') || null;
export const lastRound = (offer) => { const r = offer?.rounds || []; return r.length ? r[r.length - 1] : null; };

// Whose move is it? 'SELLER' | 'BUYER' | null (closed). The party who did NOT propose the current round.
export function turnOf(offer) {
  const c = currentRound(offer);
  if (!c) return null;
  return c.proposerRole === 'BUYER' ? 'SELLER' : 'BUYER';
}
export const roundTotal = (r) => Math.round(Number(r.price) * Number(r.quantity) * 100) / 100;
