import { useState } from 'react';
import { apiDeactivateSelf } from '../../lib/api';
import { Card, Btn, Modal } from '../ui';
import T from '../../theme';

// ─── DANGER ZONE TAB ────────────────────────────────────────────────────────
export const DangerZoneTab = ({ onDeactivated }) => {
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
