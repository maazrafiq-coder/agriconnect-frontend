import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  apiGetProfile, apiChangePassword, apiDeactivateSelf, apiUpdateProfile,
  apiGetMyDocuments, apiGetMyActivity,
  apiGetKycDocumentSignedUrl, resolveApiFileUrl,
  apiGetMyKycClarifications, apiRespondToClarification,
} from '../lib/api';
import { Card, Btn, Badge, Tabs, Modal } from '../components/ui';
import ClarificationThread from '../components/ClarificationThread';
import T from '../theme';

const inputStyle = {
  width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`,
  borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = { fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 5, display: 'block' };

const KYC_LABELS = {
  PENDING:        { label: 'Not Submitted',        type: 'gray'  },
  SUBMITTED:      { label: 'Under Review',         type: 'gold'  },
  RECOMMENDED:    { label: 'Recommended',          type: 'blue'  },
  INFO_REQUESTED: { label: 'More Info Needed',     type: 'gold'  },
  APPROVED:       { label: 'Verified',             type: 'green' },
  REJECTED:       { label: 'Rejected',             type: 'red'   },
};

const DOC_LABELS = {
  cnicFront:            '🪪 CNIC — Front',
  cnicBack:             '🪪 CNIC — Back',
  companyRegistration:  '🏢 Company Registration',
  ntnDocument:          '🧾 NTN / Tax Document',
  businessLicense:      '📄 Business License',
  otherDocument:        '📎 Other Supporting Document',
};

const DOC_STATUS = {
  pending:  { label: 'Pending Review', type: 'gold'  },
  approved: { label: 'Approved',       type: 'green' },
  rejected: { label: 'Rejected',       type: 'red'   },
};

function docLabel(docType) {
  return DOC_LABELS[docType] || (docType || 'Document').replace(/_/g, ' ');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function actionLabel(action) {
  if (!action) return 'Activity';
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── PROFILE TAB ────────────────────────────────────────────────────────────
const ProfileTab = ({ profile, loading, clarifications, onRespond }) => {
  if (loading) return <p style={{ fontSize: 13, color: T.muted }}>Loading profile…</p>;
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

  return (
    <div>
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
          {profile._count?.productsAsSeller != null && (
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
              <div style={{ fontSize: 20, fontWeight: 900, color: T.gold }}>★ {profile.avgRating}</div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>{profile.totalReviews} REVIEWS</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

// ─── EDIT PROFILE TAB ───────────────────────────────────────────────────────
// Round 2, Milestone 5 — registration data model completion. Every field
// here already existed on UserProfile in the schema (business/farm/bank
// details) but had no form anywhere to actually fill them in — this is
// that form. Sections other than Personal Details are collapsible and
// optional for every role rather than hard-gated by role server-side
// (see UpdateProfileDto), since e.g. a farmer may also run a registered
// business. cnicNumber is deliberately not editable here — that only
// changes through KYC re-submission, reviewed against the document.
const FIELD_GROUPS = {
  personal: [
    ['fullName', 'Full Name', 'text'],
    ['dateOfBirth', 'Date of Birth', 'date'],
    ['address', 'Address', 'text'],
    ['city', 'City', 'text'],
    ['province', 'Province', 'text'],
    ['country', 'Country', 'text'],
  ],
  business: [
    ['businessName', 'Business / Company Name', 'text'],
    ['ntnNumber', 'NTN Number', 'text', '1234567-1'],
    ['companyAddress', 'Company Address', 'text'],
    ['licenseNumber', 'License Number', 'text'],
  ],
  farm: [
    ['farmSizeAcres', 'Farm Size (acres)', 'number'],
    ['farmLocation', 'Farm Location', 'text'],
    ['farmGps', 'Farm GPS (lat,lng)', 'text', '30.6667,73.1000'],
  ],
  bank: [
    ['bankName', 'Bank Name', 'text'],
    ['bankAccountNo', 'Bank Account Number', 'text'],
    ['iban', 'IBAN', 'text', 'PK36SCBL0000001123456702'],
  ],
};

const ProfileFormSection = ({ title, subtitle, fields, form, onChange }) => (
  <Card style={{ marginBottom: 14 }}>
    <h3 style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: T.green }}>{title}</h3>
    {subtitle && <p style={{ margin: '0 0 14px', fontSize: 11.5, color: T.muted }}>{subtitle}</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginTop: subtitle ? 0 : 10 }}>
      {fields.map(([key, label, type, placeholder]) => (
        <div key={key}>
          <label style={labelStyle}>{label}</label>
          <input
            type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
            step={type === 'number' ? '0.01' : undefined}
            placeholder={placeholder}
            style={inputStyle}
            value={form[key] ?? ''}
            onChange={e => onChange(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  </Card>
);

const EditProfileTab = ({ profile, onSaved }) => {
  const p = profile?.profile || {};
  const [form, setForm] = useState({
    fullName: p.fullName || '',
    dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
    address: p.address || '',
    city: p.city || '',
    province: p.province || '',
    country: p.country || 'Pakistan',
    businessName: p.businessName || '',
    ntnNumber: p.ntnNumber || '',
    companyAddress: p.companyAddress || '',
    licenseNumber: p.licenseNumber || '',
    farmSizeAcres: p.farmSizeAcres ?? '',
    farmLocation: p.farmLocation || '',
    farmGps: p.farmGps || '',
    cropsGrown: (p.cropsGrown || []).join(', '),
    bankName: p.bankName || '',
    bankAccountNo: p.bankAccountNo || '',
    iban: p.iban || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const isFarmer = profile?.role === 'FARMER';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      // Only send fields the user actually touched (non-empty) — an
      // empty string for an optional field like `iban` would otherwise
      // fail its format validator on the backend even though the user
      // simply left it blank.
      const payload = {};
      for (const [key, value] of Object.entries(form)) {
        if (key === 'cropsGrown') continue;
        if (value === '' || value === null || value === undefined) continue;
        payload[key] = key === 'farmSizeAcres' ? Number(value) : value;
      }
      if (form.cropsGrown.trim()) {
        payload.cropsGrown = form.cropsGrown.split(',').map(s => s.trim()).filter(Boolean);
      }
      const updated = await apiUpdateProfile(payload);
      setSuccess('Profile updated.');
      onSaved(updated);
    } catch (err) {
      setError(err.message || 'Could not update profile. Please check the highlighted fields and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <ProfileFormSection title="Personal Details" fields={FIELD_GROUPS.personal} form={form} onChange={set} />

      {isFarmer && (
        <>
          <ProfileFormSection
            title="Farm Details"
            subtitle="Helps buyers and testing agencies understand your production."
            fields={FIELD_GROUPS.farm}
            form={form}
            onChange={set}
          />
          <Card style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Crops Grown</label>
            <input
              style={inputStyle}
              placeholder="Basmati 1121, Wheat, Sugarcane"
              value={form.cropsGrown}
              onChange={e => set('cropsGrown', e.target.value)}
            />
            <p style={{ margin: '6px 0 0', fontSize: 11, color: T.muted }}>Separate multiple crops with commas.</p>
          </Card>
        </>
      )}

      <ProfileFormSection
        title="Business Details"
        subtitle="Optional — fill in if you're registering as a company rather than an individual."
        fields={FIELD_GROUPS.business}
        form={form}
        onChange={set}
      />

      <ProfileFormSection
        title="Bank Details"
        subtitle="Used for payouts — warehouse receipt releases and order settlements."
        fields={FIELD_GROUPS.bank}
        form={form}
        onChange={set}
      />

      {error && <p style={{ color: T.danger, fontSize: 12.5, marginBottom: 12, fontWeight: 600 }}>{error}</p>}
      {success && <p style={{ color: T.green, fontSize: 12.5, marginBottom: 12, fontWeight: 600 }}>{success}</p>}
      <Btn variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Btn>
    </form>
  );
};

// ─── CHANGE PASSWORD TAB ────────────────────────────────────────────────────
const ChangePasswordTab = ({ onDone }) => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword.length < 8) return setError('New password must be at least 8 characters.');
    if (form.newPassword !== form.confirmPassword) return setError('New passwords do not match.');

    setBusy(true);
    try {
      await apiChangePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      onDone();
    } catch (err) {
      setError(err.message || 'Could not change password.');
      setBusy(false);
    }
  };

  return (
    <Card style={{ maxWidth: 420 }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: T.green }}>Change Password</h3>
      <p style={{ margin: '0 0 18px', fontSize: 12, color: T.muted }}>
        You'll be logged out of all devices and need to sign in again after this.
      </p>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Current Password</label>
          <input type="password" required style={inputStyle} value={form.currentPassword}
            onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>New Password</label>
          <input type="password" required minLength={8} style={inputStyle} value={form.newPassword}
            onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Confirm New Password</label>
          <input type="password" required style={inputStyle} value={form.confirmPassword}
            onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} />
        </div>
        {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
        <Btn variant="primary" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Updating…' : 'Update Password'}
        </Btn>
      </form>
    </Card>
  );
};

// ─── DOCUMENTS TAB ──────────────────────────────────────────────────────────
const DocumentsTab = ({ documents, loading }) => {
  const openDocument = async (docId) => {
    // Same pattern as the admin document viewer: open the tab
    // synchronously (within the click's user-gesture context) so it
    // isn't blocked as a popup, then navigate it once the signed,
    // access-checked URL comes back.
    const tab = window.open('', '_blank');
    try {
      const { url } = await apiGetKycDocumentSignedUrl(docId);
      if (tab) tab.location.href = resolveApiFileUrl(url);
    } catch (e) {
      if (tab) tab.close();
      alert(e.message || 'Could not open document — please try again.');
    }
  };

  if (loading) return <p style={{ fontSize: 13, color: T.muted }}>Loading documents…</p>;
  if (!documents.length) {
    return (
      <Card>
        <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
          No documents on file yet. Documents you upload during KYC verification will appear here.
        </p>
      </Card>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {documents.map(doc => {
        const s = DOC_STATUS[doc.status] || DOC_STATUS.pending;
        return (
          <Card key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{docLabel(doc.docType)}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Uploaded {fmtDate(doc.createdAt)}</div>
              {doc.status === 'rejected' && doc.reviewNote && (
                <div style={{ fontSize: 11, color: T.danger, marginTop: 4 }}>Reason: {doc.reviewNote}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge label={s.label} type={s.type} />
              <button onClick={() => openDocument(doc.id)} style={{ fontSize: 11, fontWeight: 700, color: T.mid, background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                View →
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// ─── ACTIVITY LOG TAB ───────────────────────────────────────────────────────
const ActivityTab = ({ activity, loading }) => {
  if (loading) return <p style={{ fontSize: 13, color: T.muted }}>Loading activity…</p>;
  if (!activity.length) {
    return (
      <Card>
        <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No recorded activity yet.</p>
      </Card>
    );
  }
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {activity.map((log, i) => (
        <div key={log.id} style={{
          padding: '13px 18px',
          borderBottom: i < activity.length - 1 ? `1px solid ${T.border}` : 'none',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{actionLabel(log.action)}</div>
            {(log.entityType || log.details) && (
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                {log.entityType ? `${log.entityType}${log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}` : ''}
                {log.details ? (log.entityType ? ' · ' : '') + JSON.stringify(log.details).slice(0, 80) : ''}
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }}>{fmtDate(log.createdAt)}</div>
        </div>
      ))}
    </Card>
  );
};

// ─── DANGER ZONE TAB ────────────────────────────────────────────────────────
const DangerZoneTab = ({ onDeactivated }) => {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const deactivate = async () => {
    setBusy(true);
    setError('');
    try {
      await apiDeactivateSelf();
      onDeactivated();
    } catch (err) {
      setError(err.message || 'Could not deactivate account.');
      setBusy(false);
    }
  };

  return (
    <>
      <Card style={{ maxWidth: 480, border: `1.5px solid #FCA5A5`, background: '#FEF2F2' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: T.danger }}>Deactivate Account</h3>
        <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#7F1D1D', lineHeight: 1.6 }}>
          This will immediately sign you out of every device and disable your ability to log in.
          Your listings, orders, and records stay in place — an admin can reactivate your account if you
          change your mind.
        </p>
        <Btn variant="danger" onClick={() => setConfirming(true)}>Deactivate My Account</Btn>
      </Card>

      {confirming && (
        <Modal title="Confirm Deactivation" onClose={() => !busy && setConfirming(false)}>
          <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: 8 }}>
            Are you sure you want to deactivate your AgriConnect account? You'll be logged out right away.
          </p>
          {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setConfirming(false)} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
            <Btn variant="danger" onClick={deactivate} disabled={busy} style={{ flex: 1 }}>
              {busy ? 'Deactivating…' : 'Yes, Deactivate'}
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
};

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function AccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [clarifications, setClarifications] = useState([]);

  const loadClarifications = () => {
    apiGetMyKycClarifications()
      .then(data => setClarifications(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => {
    apiGetProfile().then(setProfile).catch(() => {}).finally(() => setProfileLoading(false));
    apiGetMyDocuments()
      .then(data => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setDocsLoading(false));
    apiGetMyActivity()
      .then(data => setActivity(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setActivityLoading(false));
    loadClarifications();
  }, []);

  const handleRespondToClarification = async (id, message, files) => {
    await apiRespondToClarification(id, message, files);
    loadClarifications();
    // Responding moves the account back to "Under Review" — refresh the
    // profile so the status badge at the top reflects that immediately.
    apiGetProfile().then(setProfile).catch(() => {});
  };

  const handlePasswordChanged = async () => {
    setNotice('Password changed. Please log in again.');
    await logout();
    navigate('/');
  };

  const handleDeactivated = async () => {
    setNotice('Your account has been deactivated.');
    await logout();
    navigate('/');
  };

  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: T.bg, minHeight: '100vh' }}>
      <div style={{ background: `linear-gradient(135deg,${T.green} 0%,${T.mid} 60%,${T.green} 100%)`, padding: '32px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>👤</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: T.bg, letterSpacing: '-0.5px' }}>My Account</h1>
              <p style={{ margin: '3px 0 0', color: T.mint, fontSize: 13 }}>
                {user?.name ? `Manage ${user.name}'s account, security, and documents` : 'Manage your account, security, and documents'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>
        {notice && (
          <div style={{ background: '#DCFCE7', color: '#15803D', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 18 }}>
            {notice}
          </div>
        )}

        <Tabs
          tabs={[
            ['profile', '👤 Profile'],
            ['edit', '✏️ Edit Profile'],
            ['password', '🔒 Password'],
            ['documents', `📄 Documents${documents.length ? ` (${documents.length})` : ''}`],
            ['activity', '📜 Activity Log'],
            ['danger', '⚠️ Danger Zone'],
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'profile'   && <ProfileTab profile={profile} loading={profileLoading} clarifications={clarifications} onRespond={handleRespondToClarification} />}
        {tab === 'edit'      && <EditProfileTab profile={profile} onSaved={(updatedProfile) => setProfile(p => ({ ...p, profile: updatedProfile }))} />}
        {tab === 'password'  && <ChangePasswordTab onDone={handlePasswordChanged} />}
        {tab === 'documents' && <DocumentsTab documents={documents} loading={docsLoading} />}
        {tab === 'activity'  && <ActivityTab activity={activity} loading={activityLoading} />}
        {tab === 'danger'    && <DangerZoneTab onDeactivated={handleDeactivated} />}
      </div>
    </div>
  );
}
