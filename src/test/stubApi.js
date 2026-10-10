// Replaces every exported api* function with a vi.fn that resolves to `[]`,
// so a page can mount without a backend. Pass overrides for specific calls.
import { vi } from 'vitest';

export function stubApi(actual, overrides = {}) {
  const out = {};
  for (const [k, v] of Object.entries(actual)) {
    out[k] = typeof v === 'function' && /^api/.test(k) ? vi.fn(() => Promise.resolve([])) : v;
  }
  return { ...out, ...overrides };
}
