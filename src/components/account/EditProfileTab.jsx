import { useState } from 'react';
import { apiUpdateProfile } from '../../lib/api';
import { Card, Btn } from '../ui';
import T from '../../theme';
import { inputStyle, labelStyle } from './shared';

// ─── EDIT PROFILE TAB ───────────────────────────────────────────────────────
// Round 2, Milestone 5 — registration data model completion. Every field
// here already existed on UserProfile in the schema (business/farm/bank
// details) but had no form anywhere to actually fill them in — this is
// that form. Sections other than Personal Details are collapsible and
// optional for every role rather than hard-gated by role server-side
// (see UpdateProfileDto), since e.g. a farmer may also run a registered
// business. cnicNumber is deliberately not editable here — that only
// changes through KYC re-submission, reviewed against the document.
export const FIELD_GROUPS = {
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

export const ProfileFormSection = ({ title, subtitle, fields, form, onChange }) => (
  <Card style={{ marginBottom: 14 }}>
    <h3 style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: T.green }}>{title}</h3>
    {subtitle && <p style={{ margin: '0 0 14px', fontSize: 11.5, color: T.muted }}>{subtitle}</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginTop: subtitle ? 0 : 10 }}>
      {fields.map(([key, label, type, placeholder]) => (
        <div key={key}>
          <label htmlFor="editprofiletab-f1" style={labelStyle}>{label}</label>
          <input id="editprofiletab-f1"
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

export const EditProfileTab = ({ profile, onSaved }) => {
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
            <label htmlFor="editprofiletab-f2" style={labelStyle}>Crops Grown</label>
            <input id="editprofiletab-f2"
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
      <Btn type="submit" variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Btn>
    </form>
  );
};
