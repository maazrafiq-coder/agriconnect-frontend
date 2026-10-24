import { Card, Badge, LoadingState } from '../ui';
import ClarificationThread from '../ClarificationThread';
import T from '../../theme';
import { fmtDate } from './shared';
import { accessInfo } from '../../lib/access';

export const KYC_LABELS = {
  PENDING:        { label: 'Not Submitted',        type: 'gray'  },
  SUBMITTED:      { label: 'Under Review',         type: 'gold'  },
  RECOMMENDED:    { label: 'Recommended',          type: 'blue'  },
  INFO_REQUESTED: { label: 'More Info Needed',     type: 'gold'  },
  APPROVED:       { label: 'Verified',             type: 'green' },
  REJECTED:       { label: 'Rejected',             type: 'red'   },
};

// ─── PROFILE TAB ────────────────────────────────────────────────────────────
export const ProfileTab = ({ profile, loading, clarifications, onRespond }) => {
  if (loading) return <LoadingState label="Loading profile…" />;
  if (!profile) return <p style={{ fontSize: 13, color: T.muted }}>Couldn't load your profile right now.</p>;

  const kyc = KYC_LABELS[profile.kycStatus] || KYC_LABELS.PENDING;
  const rows = [
    ['AgriConnect ID', profile.agriConnectId || '—'],
    ['Full Name', profile.profile?.fullName || '—'],
    ['Role', (profile.role || '').replace(/_/g, ' ')],
    ['Phone Number', profile.phoneNumber ? `${profile.phoneNumber} ${profile.isPhoneVerified ? '✓' : '(unverified)'}` : '—'],
    ['Email', profile.email || '—'],
    ...(profile.profile?.businessName ? [['Business Name', profile.profile.businessName]] : []),
    ...(profile.profile?.ntnNumber ? [['NTN Number', profile.profile.ntnNumber]] : []),
    ...(profile.profile?.city ? [['City', `${profile.profile.city}${profile.profile?.province ? ', ' + profile.profile.province : ''}`]] : []),
    ...(profile.profile?.farmSizeAcres ? [['Farm Size', `${profile.profile.farmSizeAcres} acres`]] : []),
    ...(profile.profile?.cropsGrown?.length ? [['Crops Grown', profile.profile.cropsGrown.join(', ')]] : []),
    ...(profile.profile?.bankName ? [['Bank', profile.profile.bankName]] : []),
    ['Member Since', fmtDate(profile.createdAt)],
  ];

  const access = accessInfo({ kycStatus: profile.kycStatus });
  const toneStyle = { info: ['#BFDBFE', '#EFF6FF', '#1E40AF'], warn: ['#FDBA74', '#FFF7ED', '#9A3412'], danger: ['#FCA5A5', '#FEF2F2', '#991B1B'] };

  return (
    <div>
      {/* Where the account stands and what the person can do next. */}
      {!access.approved && access.info && (() => { const [bd, bg, fg] = toneStyle[access.info.tone] || toneStyle.info; return (
        <Card style={{ marginBottom: 16, border: `1.5px solid ${bd}`, background: bg }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: fg, marginBottom: 4 }}>{access.info.icon} {access.info.title}</div>
          <div style={{ fontSize: 12.5, color: fg, lineHeight: 1.6 }}>{access.info.message}</div>
          {profile.kycStatus === 'REJECTED' && <div style={{ fontSize: 12.5, color: fg, lineHeight: 1.6, marginTop: 6 }}>Next step: open the <strong>Documents</strong> tab and upload corrected documents — your registration is then reviewed again.</div>}
        </Card>
      ); })()}
      {profile.kycStatus === 'APPROVED' && (
        <Card style={{ marginBottom: 16, border: '1.5px solid #86EFAC', background: '#F0FDF4' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#166534' }}>✅ Your account is approved — all marketplace and service features are available.</div>
        </Card>
      )}
      {profile.kycStatus === 'REJECTED' && profile.kycRejectionNote && (
        <Card style={{ marginBottom: 16, border: '1.5px solid #FCA5A5', background: '#FEF2F2' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#991B1B', marginBottom: 4 }}>Registration Rejected</div>
          <div style={{ fontSize: 12, color: '#7F1D1D' }}>{profile.kycRejectionNote}</div>
        </Card>
      )}
      {!!clarifications?.filter(c => c.status !== 'RESOLVED').length && (
        <Card style={{ marginBottom: 16, border: '1.5px solid #FDBA74', background: '#FFF7ED' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#9A3412', marginBottom: 10 }}>
            Additional Information Needed — Verification Team
          </div>
          <ClarificationThread
            clarifications={clarifications.filter(c => c.status !== 'RESOLVED')}
            viewerRole="subject"
            onRespond={onRespond}
          />
        </Card>
      )}
      {!!clarifications?.filter(c => c.status === 'RESOLVED').length && (
        <Card style={{ marginBottom: 16 }}>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 800, color: T.muted }}>Earlier verification conversations ({clarifications.filter(c => c.status === 'RESOLVED').length})</summary>
            <div style={{ marginTop: 10 }}>
              <ClarificationThread clarifications={clarifications.filter(c => c.status === 'RESOLVED')} viewerRole="subject" />
            </div>
          </details>
        </Card>
      )}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.green }}>Account Details</h3>
          <Badge label={kyc.label} type={kyc.type} />
        </div>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 12, color: T.muted }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{value}</span>
          </div>
        ))}
      </Card>

      {(profile._count || profile.avgRating != null) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
          {/* Warehouse operators list warehouses, not products — counting
              only products made their profile read "0 listings". */}
          {profile._count?.warehouseProfiles > 0 && (
            <Card style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.green }}>{profile._count.warehouseProfiles}</div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>WAREHOUSE LISTINGS</div>
            </Card>
          )}
          {profile._count?.productsAsSeller != null && !(profile._count?.warehouseProfiles > 0 && profile._count.productsAsSeller === 0) && (
            <Card style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.green }}>{profile._count.productsAsSeller}</div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>LISTINGS</div>
            </Card>
          )}
          {profile._count?.ordersAsBuyer != null && (
            <Card style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.green }}>{profile._count.ordersAsBuyer}</div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>ORDERS AS BUYER</div>
            </Card>
          )}
          {profile._count?.ordersAsSeller != null && (
            <Card style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.green }}>{profile._count.ordersAsSeller}</div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>ORDERS AS SELLER</div>
            </Card>
          )}
          {profile.totalReviews > 0 && (
            <Card style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.goldText }}>★ {profile.avgRating}</div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>{profile.totalReviews} REVIEWS</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
