// Indicative lab fee shown BEFORE the request is sent. This mirrors the server's
// formula (TestingService.createRequest: base price for the first service, +35% of
// the base price for each additional one). The server computes the real fee and
// returns it on the created request; the success screen shows THAT value.
export function estimateLabFee(basePrice, serviceCount) {
  const base = Number(basePrice) || 0;
  const n = Math.max(0, Number(serviceCount) || 0);
  if (n === 0) return 0;
  return Math.round(base + (n - 1) * base * 0.35);
}
