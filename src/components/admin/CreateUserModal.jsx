import { useState } from 'react';
import { apiAdminCreateUser } from '../../lib/api';
import { Btn, Modal } from '../ui';
import T from '../../theme';
import { inputStyle } from './shared';

// ─── CREATE USER MODAL (admin registers someone on their behalf) ──────────────
export function CreateUserModal({ onClose, onCreated }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('BUYER');
  const [customPassword, setCustomPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ROLES = ['FARMER', 'TRADER', 'MILLER', 'EXPORTER', 'BUYER', 'TRANSPORTER', 'WAREHOUSE', 'TESTING_AGENCY', 'ADMIN', 'MODERATOR'];

  const handleCreate = async () => {
    if (!fullName || (!phone && !email)) {
      setError('Full name and at least one of phone/email are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await apiAdminCreateUser({ phoneNumber: phone || undefined, email: email || undefined, fullName, role, password: customPassword || undefined });
      onCreated(result);
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create User on Their Behalf" onClose={onClose}>
      <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: '#1D4ED8' }}>
        ℹ️ Accounts created here are automatically approved — no OTP or review needed.
      </div>
      <label htmlFor="createusermodal-f1" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>FULL NAME *</label>
      <input id="createusermodal-f1" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Muhammad Ahmed" style={{ ...inputStyle, marginBottom: 12 }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 12 }}>
        <div>
          <label htmlFor="createusermodal-f2" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PHONE</label>
          <input id="createusermodal-f2" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0300-1234567" style={inputStyle} />
        </div>
        <div>
          <label htmlFor="createusermodal-f3" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>EMAIL</label>
          <input id="createusermodal-f3" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" style={inputStyle} />
        </div>
      </div>

      <label htmlFor="createusermodal-f4" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>ROLE</label>
      <select id="createusermodal-f4" value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
        {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
      </select>

      <label htmlFor="createusermodal-f5" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PASSWORD (optional — auto-generated if left blank)</label>
      <input id="createusermodal-f5" value={customPassword} onChange={e => setCustomPassword(e.target.value)} placeholder="Leave blank to auto-generate" type="password" style={{ ...inputStyle, marginBottom: 12 }} />

      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 12, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
      <Btn variant="primary" style={{ width: '100%' }} onClick={handleCreate} disabled={loading}>{loading ? 'Creating…' : 'Create User →'}</Btn>
    </Modal>
  );
}
