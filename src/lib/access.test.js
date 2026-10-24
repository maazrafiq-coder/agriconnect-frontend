import { describe, it, expect } from 'vitest';
import { accessInfo, landingPathAfterLogin } from './access';

describe('accessInfo', () => {
  it('only an APPROVED account can transact', () => {
    expect(accessInfo({ kycStatus: 'APPROVED' }).canTransact).toBe(true);
    for (const s of ['SUBMITTED', 'RECOMMENDED', 'INFO_REQUESTED', 'REJECTED', 'PENDING']) {
      const a = accessInfo({ kycStatus: s });
      expect(a.canTransact).toBe(false);
      expect(a.info.title).toBeTruthy();
    }
  });
  it('each non-approved state has its own explanation and next step', () => {
    const titles = ['SUBMITTED', 'INFO_REQUESTED', 'REJECTED'].map(s => accessInfo({ kycStatus: s }).info.title);
    expect(new Set(titles).size).toBe(3);
    expect(accessInfo({ kycStatus: 'INFO_REQUESTED' }).info.cta.to).toBe('/account');
    expect(accessInfo({ kycStatus: 'REJECTED' }).info.message).toMatch(/upload corrected documents/);
  });
  it('a guest has no access info', () => {
    expect(accessInfo(null)).toMatchObject({ signedIn: false, canTransact: false, info: null });
  });
});

describe('landingPathAfterLogin', () => {
  it('approved users go to their portal; waiting users browse; those who must act go to their account', () => {
    expect(landingPathAfterLogin({ kycStatus: 'APPROVED' }, '/seller')).toBe('/seller');
    expect(landingPathAfterLogin({ kycStatus: 'SUBMITTED' }, '/seller')).toBe('/marketplace');
    expect(landingPathAfterLogin({ kycStatus: 'RECOMMENDED' }, '/buyer')).toBe('/marketplace');
    expect(landingPathAfterLogin({ kycStatus: 'INFO_REQUESTED' }, '/buyer')).toBe('/account');
    expect(landingPathAfterLogin({ kycStatus: 'REJECTED' }, '/buyer')).toBe('/account');
  });
});
