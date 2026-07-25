import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Modal, Btn } from '../ui';
import { apiRegister, apiVerifyOtp, apiLogin } from '../../lib/api';
import { adaptUser } from '../../lib/adapters';
import T from '../../theme';

// ─── LOGIN MODAL ──────────────────────────────────────────────────────────────
export function LoginModal() {
  const { loginWithUser, closeModal, openRegister } = useAuth();
  const navigate = useNavigate();
  const [role, setRole]       = useState('buyer');
  const [phone, setPhone]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Demo credentials map to seed accounts
  const DEMO = {
    buyer:       { phone: '0300-2222222', password: 'Buyer@123' },
    seller:      { phone: '0300-1111111', password: 'Seller@123' },
    transporter: { phone: '0300-5555555', password: 'Transport@123' },
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const credentials = (phone && password)
        ? { phoneNumber: phone, password }
        : { phoneNumber: DEMO[role]?.phone || DEMO.buyer.phone, password: DEMO[role]?.password || DEMO.buyer.password };

      const result = await apiLogin(credentials);
      const adapted = adaptUser(result.user);
      loginWithUser(adapted);
      closeModal();
      const SELLER_ROLES = ['trader', 'farmer', 'miller'];
      navigate(SELLER_ROLES.includes(adapted.role) ? '/seller' : '/buyer');
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Login to AgriConnect" onClose={closeModal}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, letterSpacing: 0.5 }}>LOGIN AS</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['buyer', '🛒 Buyer'], ['seller', '🌾 Seller'], ['transporter', '🚛 Transport']].map(([r, l]) => (
            <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: '8px 6px', border: `2px solid ${role === r ? T.green : T.border}`, background: role === r ? '#F0FDF4' : T.white, color: role === r ? T.green : T.muted, borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 6, textAlign: 'center' }}>
          Leave fields empty to use demo account · or enter your own credentials
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PHONE NUMBER (optional)</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={`Demo: ${DEMO[role]?.phone}`}
          style={{ width: '100%', padding: '10px 13px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <div style={{ marginBottom: error ? 10 : 20 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PASSWORD (optional)</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave empty for demo login"
          style={{ width: '100%', padding: '10px 13px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
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
  const { loginWithUser, closeModal, openLogin } = useAuth();
  const navigate = useNavigate();
  const [step, setStep]         = useState(1);
  const [role, setRole]         = useState('buyer');
  const [form, setForm]         = useState({ fullName: '', phone: '', email: '', password: '' });
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [devOtp, setDevOtp]     = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Frontend role labels -> backend UserRole enum values
  const ROLE_MAP = {
    buyer: 'EXPORTER',
    seller: 'TRADER',
    transporter: 'TRANSPORTER',
    testing_agency: 'TESTING_AGENCY',
  };

  const handleRegister = async () => {
    if (!form.fullName || !form.phone || !form.password) {
      setError('Full name, phone, and password are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await apiRegister({
        phoneNumber: form.phone,
        email: form.email || undefined,
        password: form.password,
        role: ROLE_MAP[role] || 'EXPORTER',
        fullName: form.fullName,
      });
      if (result.devOtp) setDevOtp(result.devOtp);
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
      const result = await apiVerifyOtp({ phoneNumber: form.phone, otp: code, purpose: 'phone_verify' });
      const adapted = adaptUser(result.user);
      loginWithUser(adapted);
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
    <Modal title={['', 'Create Account', 'Verify Phone', 'Upload KYC'][step]} onClose={closeModal}>
      {step === 1 && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8 }}>I WANT TO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[['buyer', '🛒', 'Buy Products', 'Browse & purchase commodities'], ['seller', '🌾', 'Sell Products', 'List your crops and rice'], ['transporter', '🚛', 'Offer Transport', 'Provide logistics services'], ['testing_agency', '🧪', 'Testing Agency', 'Offer quality testing']].map(([r, icon, title, desc]) => (
                <div key={r} onClick={() => setRole(r)} style={{ padding: 12, border: `2px solid ${role === r ? T.green : T.border}`, borderRadius: 10, cursor: 'pointer', background: role === r ? '#F0FDF4' : T.white }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.green }}>{title}</div>
                  <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.4 }}>{desc}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              {[['FULL NAME', 'fullName', 'Muhammad Ahmed', 'text'], ['PHONE', 'phone', '0300-1234567', 'tel']].map(([label, key, ph, type]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>{label}</label>
                  <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph} type={type}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>EMAIL (optional)</label>
            <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email"
              style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PASSWORD</label>
            <input value={form.password} onChange={e => set('password', e.target.value)} type="password" placeholder="Min. 8 characters"
              style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 10, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
          <Btn variant="primary" style={{ width: '100%', padding: '11px' }} onClick={handleRegister} disabled={loading}>
            {loading ? 'Sending OTP…' : 'Send OTP →'}
          </Btn>
        </>
      )}

      {step === 2 && (
        <>
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 4 }}>Enter the 6-digit code sent to <strong>{form.phone}</strong></p>
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
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>Upload your CNIC for identity verification. Your account will be reviewed within 24 hours.</p>
          {[['🪪', 'CNIC Front Side', 'cnic_front'], ['🪪', 'CNIC Back Side', 'cnic_back']].map(([icon, title, name]) => (
            <label key={name} style={{ border: `2px dashed ${T.border}`, borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 12, cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{title}</div>
              <div style={{ fontSize: 11, color: T.muted }}>Click to upload · JPG, PNG or PDF</div>
              <input type="file" name={name} accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} />
            </label>
          ))}
          <Btn variant="primary" style={{ width: '100%', padding: '11px' }} onClick={() => { closeModal(); navigate('/buyer'); }}>
            Submit for Verification →
          </Btn>
        </>
      )}

      <p style={{ textAlign: 'center', fontSize: 12, color: T.muted, marginTop: 14, marginBottom: 0 }}>
        Already have an account? <span onClick={() => { closeModal(); openLogin(); }} style={{ color: T.green, cursor: 'pointer', fontWeight: 700 }}>Login</span>
      </p>
    </Modal>
  );
}
