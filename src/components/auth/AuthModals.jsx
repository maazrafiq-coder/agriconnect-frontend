import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Modal, Btn } from '../ui';
import { apiRegister, apiVerifyOtp, apiLogin } from '../../lib/api';
import { adaptUser } from '../../lib/adapters';
import T from '../../theme';

const inputStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

// ─── LOGIN MODAL ──────────────────────────────────────────────────────────────
export function LoginModal() {
  const { loginWithUser, closeModal, openRegister } = useAuth();
  const navigate = useNavigate();
  const [role, setRole]         = useState('buyer');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Demo credentials for the two roles that have a single obvious demo
  // account. "Others" covers Transporter/Lab/Warehouse/Admin/Moderator —
  // too varied for one autofill, so it requires typing real credentials.
  const DEMO = {
    buyer:  { identifier: '0300-2222222', password: 'Buyer@123' },
    seller: { identifier: '0300-1111111', password: 'Seller@123' },
    other:  null,
  };

  const handleLogin = async () => {
    setError('');
    if (role === 'other' && (!identifier || !password)) {
      setError('Enter your phone/email and password to continue');
      return;
    }
    setLoading(true);
    try {
      const credentials = (identifier && password)
        ? { identifier, password }
        : { identifier: DEMO[role]?.identifier, password: DEMO[role]?.password };

      const result = await apiLogin(credentials);
      const adapted = adaptUser(result.user);
      loginWithUser(adapted);
      closeModal();
      const SELLER_ROLES = ['trader', 'farmer', 'miller'];
      navigate(adapted.role === 'admin' ? '/admin' : SELLER_ROLES.includes(adapted.role) ? '/seller' : '/buyer');
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Login to AgriConnect" onClose={closeModal} closeOnBackdrop={false}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, letterSpacing: 0.5 }}>LOGIN AS</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['buyer', '🛒 Buyer'], ['seller', '🌾 Seller'], ['other', '🔧 Others']].map(([r, l]) => (
            <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: '8px 6px', border: `2px solid ${role === r ? T.green : T.border}`, background: role === r ? '#F0FDF4' : T.white, color: role === r ? T.green : T.muted, borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 6, textAlign: 'center' }}>
          {role === 'other' ? 'Enter credentials for transporter, lab, warehouse, or admin accounts' : 'Leave fields empty to use demo account · or enter your own credentials'}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PHONE OR EMAIL {role === 'other' ? '*' : '(optional)'}</label>
        <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={DEMO[role] ? `Demo: ${DEMO[role].identifier}` : '0300-XXXXXXX or email@example.com'}
          style={inputStyle} />
      </div>
      <div style={{ marginBottom: error ? 10 : 20 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PASSWORD {role === 'other' ? '*' : '(optional)'}</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={role === 'other' ? 'Your password' : 'Leave empty for demo login'}
          style={inputStyle} />
      </div>
      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 14, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}

      <Btn variant="primary" style={{ width: '100%', padding: '11px' }} onClick={handleLogin} disabled={loading}>
        {loading ? 'Logging in…' : 'Login →'}
      </Btn>
      <p style={{ textAlign: 'center', fontSize: 13, color: T.muted, marginTop: 14, marginBottom: 0 }}>
        No account? <span onClick={() => { closeModal(); openRegister(); }} style={{ color: T.green, cursor: 'pointer', fontWeight: 700 }}>Register Free</span>
      </p>
    </Modal>
  );
}

// ─── REGISTER MODAL ───────────────────────────────────────────────────────────
export function RegisterModal() {
  const { closeModal, openLogin } = useAuth();
  const [step, setStep]         = useState(1);
  const [role, setRole]         = useState('buyer');
  const [form, setForm]         = useState({ fullName: '', phone: '', email: '', password: '' });
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [devOtp, setDevOtp]     = useState('');
  const [registeredIdentifier, setRegisteredIdentifier] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Frontend role labels -> backend UserRole enum values
  const ROLE_MAP = {
    buyer: 'EXPORTER',
    seller: 'TRADER',
    transporter: 'TRANSPORTER',
    testing_agency: 'TESTING_AGENCY',
    warehouse: 'WAREHOUSE',
  };

  const handleRegister = async () => {
    if (!form.fullName || (!form.phone && !form.email) || !form.password) {
      setError('Full name, password, and at least one of phone/email are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await apiRegister({
        phoneNumber: form.phone || undefined,
        email: form.email || undefined,
        password: form.password,
        role: ROLE_MAP[role] || 'EXPORTER',
        fullName: form.fullName,
      });
      if (result.devOtp) setDevOtp(result.devOtp);
      setRegisteredIdentifier(result.identifier || form.phone || form.email);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Enter the 6-digit OTP'); return; }
    setError('');
    setLoading(true);
    try {
      // Verifying OTP no longer logs the user in — the account now needs
      // admin review before it can log in (Register -> OTP -> Documents ->
      // Pending Approval -> Admin Review -> Approved -> Can Login).
      await apiVerifyOtp({ identifier: registeredIdentifier, otp: code, purpose: 'phone_verify' });
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpKey = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
  };

  return (
    <Modal title={['', 'Create Account', 'Verify Contact', 'Upload Documents', 'Registration Submitted'][step]} onClose={closeModal} closeOnBackdrop={false}>
      {step === 1 && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8 }}>I WANT TO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                ['buyer', '🛒', 'Buy Products', 'Browse & purchase commodities'],
                ['seller', '🌾', 'Sell Products', 'List your crops and rice'],
                ['transporter', '🚛', 'Offer Transport', 'Provide logistics services'],
                ['testing_agency', '🧪', 'Testing Agency', 'Offer quality testing'],
                ['warehouse', '🏪', 'Offer Warehousing', 'List storage space for rent'],
              ].map(([r, icon, title, desc]) => (
                <div key={r} onClick={() => setRole(r)} style={{ padding: 12, border: `2px solid ${role === r ? T.green : T.border}`, borderRadius: 10, cursor: 'pointer', background: role === r ? '#F0FDF4' : T.white }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.green }}>{title}</div>
                  <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.4 }}>{desc}</div>
                </div>
              ))}
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>FULL NAME *</label>
            <input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Muhammad Ahmed"
              style={{ ...inputStyle, marginBottom: 10 }} />

            <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#1D4ED8' }}>
              ℹ️ Provide at least one of phone or email — both aren't required.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PHONE</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0300-1234567" type="tel" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>EMAIL</label>
                <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email" style={inputStyle} />
              </div>
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PASSWORD *</label>
            <input value={form.password} onChange={e => set('password', e.target.value)} type="password" placeholder="Min. 8 characters"
              style={inputStyle} />
          </div>
          {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 10, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
          <Btn variant="primary" style={{ width: '100%', padding: '11px' }} onClick={handleRegister} disabled={loading}>
            {loading ? 'Sending OTP…' : 'Send OTP →'}
          </Btn>
        </>
      )}

      {step === 2 && (
        <>
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 4 }}>Enter the 6-digit code sent to <strong>{registeredIdentifier}</strong></p>
          {devOtp && (
            <div style={{ background: '#DBEAFE', borderRadius: 7, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#1D4ED8' }}>
              🔧 Dev Mode OTP: <strong style={{ fontFamily: 'monospace', fontSize: 16 }}>{devOtp}</strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            {otp.map((digit, i) => (
              <input id={`otp-${i}`} key={i} maxLength={1} value={digit} onChange={e => handleOtpKey(i, e.target.value)}
                style={{ width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 800, border: `2px solid ${T.border}`, borderRadius: 8, outline: 'none', fontFamily: 'inherit' }} />
            ))}
          </div>
          {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 10, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
          <Btn variant="primary" style={{ width: '100%', padding: '11px' }} onClick={handleVerifyOtp} disabled={loading}>
            {loading ? 'Verifying…' : 'Verify OTP →'}
          </Btn>
          <p style={{ textAlign: 'center', fontSize: 12, color: T.muted, marginTop: 12, marginBottom: 0 }}>
            Didn't receive it? <span style={{ color: T.green, cursor: 'pointer', fontWeight: 700 }} onClick={handleRegister}>Resend</span>
          </p>
        </>
      )}

      {step === 3 && (
        <>
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>
            Optional: upload supporting documents now (CNIC, business license, certifications) to speed up review — or skip and add them later from your dashboard.
          </p>
          {[['🪪', 'CNIC Front Side', 'cnic_front'], ['🪪', 'CNIC Back Side', 'cnic_back']].map(([icon, title, name]) => (
            <label key={name} style={{ border: `2px dashed ${T.border}`, borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 12, cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{title}</div>
              <div style={{ fontSize: 11, color: T.muted }}>Click to upload (optional) · JPG, PNG or PDF</div>
              <input type="file" name={name} accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} />
            </label>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Btn variant="ghost" onClick={() => setStep(4)}>Skip for now</Btn>
            <Btn variant="primary" onClick={() => setStep(4)}>Continue →</Btn>
          </div>
        </>
      )}

      {step === 4 && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>⏳</div>
          <h3 style={{ color: T.green, margin: '0 0 10px' }}>Registration Submitted!</h3>
          <p style={{ color: T.muted, fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
            Your account is now pending review by our admin team. You'll be able to log in once it's approved — this usually takes up to 24 hours.
          </p>
          <div style={{ background: T.surface, borderRadius: 10, padding: 14, marginBottom: 20, textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, letterSpacing: 0.5 }}>WHAT HAPPENS NEXT</div>
            {['Registered', 'OTP Verified', 'Pending Admin Review', 'Approved → You can log in'].map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: i < 2 ? T.green : T.border, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i < 2 ? '✓' : i + 1}</div>
                <span style={{ fontSize: 12, color: i < 2 ? T.text : T.muted, fontWeight: i === 2 ? 700 : 400 }}>{s}</span>
              </div>
            ))}
          </div>
          <Btn variant="primary" style={{ width: '100%' }} onClick={closeModal}>Done</Btn>
        </div>
      )}

      {step < 4 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: T.muted, marginTop: 14, marginBottom: 0 }}>
          Already have an account? <span onClick={() => { closeModal(); openLogin(); }} style={{ color: T.green, cursor: 'pointer', fontWeight: 700 }}>Login</span>
        </p>
      )}
    </Modal>
  );
}
