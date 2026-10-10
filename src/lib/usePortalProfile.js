import { useState, useEffect } from 'react';
import { apiGetProfile } from './api';

// Real account details for the portal headers (name, business, location,
// KYC status, rating). Replaces the hard-coded "Khan Rice Mills · Verified ·
// Sheikhupura" strings that every new account used to see.
export default function usePortalProfile() {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    let cancelled = false;
    apiGetProfile().then(p => { if (!cancelled) setProfile(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const p = profile?.profile || {};
  const displayName = p.businessName || p.fullName || '';
  const location = [p.city, p.province].filter(Boolean).join(', ');
  const kyc = profile?.kycStatus;
  const kycLabel = !profile ? '' : kyc === 'APPROVED' ? '✓ Verified'
    : kyc === 'SUBMITTED' || kyc === 'RECOMMENDED' ? '⏳ Verification pending'
    : kyc === 'INFO_REQUESTED' ? '❓ More info requested'
    : kyc === 'REJECTED' ? '✗ Verification rejected' : 'Not verified yet';
  const subtitle = [displayName, kycLabel, location].filter(Boolean).join(' · ');
  return {
    profile, displayName, location, kycLabel, subtitle,
    initial: (displayName || p.fullName || '?').charAt(0).toUpperCase(),
    avgRating: profile?.totalReviews > 0 ? profile.avgRating : null,
  };
}
