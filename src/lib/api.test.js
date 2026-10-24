import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGetPublicStats, setAccessToken, clearTokens } from './api';

const json = (status, body) => Promise.resolve({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) });

describe('api client', () => {
  beforeEach(() => { clearTokens(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('sends the in-memory bearer token and surfaces the server error message', async () => {
    const f = vi.fn().mockImplementation(() => json(400, { error: { message: 'Nope' } }));
    vi.stubGlobal('fetch', f);
    setAccessToken('abc');
    await expect(apiGetPublicStats()).rejects.toThrow('Nope');
    expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
    expect(f.mock.calls[0][1].credentials).toBe('include');
  });

  it('on 401 refreshes once and retries with the new token', async () => {
    const f = vi.fn()
      .mockImplementationOnce(() => json(401, {}))
      .mockImplementationOnce(() => json(200, { accessToken: 'new', data: { accessToken: 'new' } }))
      .mockImplementationOnce(() => json(200, { verifiedSellers: 3 }));
    vi.stubGlobal('fetch', f);
    setAccessToken('old');
    const res = await apiGetPublicStats();
    expect(res.verifiedSellers).toBe(3);
    expect(f.mock.calls[1][0]).toMatch(/\/auth\/refresh$/);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('gives up with "Unauthorized" when the refresh fails (no redirect loop)', async () => {
    const f = vi.fn().mockImplementation((url) => json(401, {}));
    vi.stubGlobal('fetch', f);
    await expect(apiGetPublicStats()).rejects.toThrow('Unauthorized');
  });
});

describe('transport Phase 3 API helpers', () => {
  it('accept sends the round id; quote/counter send an Idempotency-Key; invoices use /transport-invoices', async () => {
    const calls = [];
    globalThis.fetch = vi.fn(async (url, init) => { calls.push([String(url), init]); return { ok: true, status: 200, json: async () => ({}), headers: new Headers() }; });
    const m = await import('./api');
    await m.apiAcceptTransportQuote('t1', 'q9');
    await m.apiQuoteTransport('t1', { price: '100' }, 'key-1');
    await m.apiCounterTransportQuote('t1', { price: 90, roundId: 'q9' }, 'key-2');
    await m.apiIssueTransportInvoice('t1');
    await m.apiRaiseTransportDispute('t1', { category: 'OTHER', description: 'long enough text' }, 'key-3');
    const find = (frag) => calls.find(([u]) => u.includes(frag));
    expect(JSON.parse(find('/accept')[1].body)).toEqual({ roundId: 'q9', acceptTerms: true });
    expect(find('/quote')[1].headers['Idempotency-Key']).toBe('key-1');
    expect(find('/counter')[1].headers['Idempotency-Key']).toBe('key-2');
    expect(find('/transport-invoices/request/t1')[1].method).toBe('POST');
    expect(find('/transport/disputes/request/t1')[1].headers['Idempotency-Key']).toBe('key-3');
  });
});
