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
