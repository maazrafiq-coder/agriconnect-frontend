import { useState } from 'react';
import { apiChangePassword } from '../../lib/api';
import { Card, Btn } from '../ui';
import T from '../../theme';
import { inputStyle, labelStyle } from './shared';

// ─── CHANGE PASSWORD TAB ────────────────────────────────────────────────────
export const ChangePasswordTab = ({ onDone }) => {
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
          <label htmlFor="changepasswordtab-f1" style={labelStyle}>Current Password</label>
          <input id="changepasswordtab-f1" type="password" required style={inputStyle} value={form.currentPassword}
            onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="changepasswordtab-f2" style={labelStyle}>New Password</label>
          <input id="changepasswordtab-f2" type="password" required minLength={8} style={inputStyle} value={form.newPassword}
            onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="changepasswordtab-f3" style={labelStyle}>Confirm New Password</label>
          <input id="changepasswordtab-f3" type="password" required style={inputStyle} value={form.confirmPassword}
            onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} />
        </div>
        {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
        <Btn type="submit" variant="primary" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Updating…' : 'Update Password'}
        </Btn>
      </form>
    </Card>
  );
};
