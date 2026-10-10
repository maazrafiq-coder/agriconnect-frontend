import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Modal, Btn } from '../ui';
import { apiRegister, apiVerifyOtp, apiLogin, apiSubmitKyc, apiResendOtp, apiForgotPassword, apiResetPassword, getRegistrationToken, clearRegistrationToken } from '../../lib/api';
import { adaptUser } from '../../lib/adapters';
import { portalPathForRole } from '../../lib/roles';
import T from '../../theme';
import { clickable } from '../../lib/a11y';

const inputStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

// ─── LOGIN MODAL ──────────────────────────────────────────────────────────────
export function LoginModal() {
  const { loginWithUser, closeModal, openRegister, openForgot } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!identifier || !password) {
      setError('Enter your phone/email and password to continue');
      return;
    }
    setLoading(true);
    try {
      const credentials = { identifier, password };

      const result = await apiLogin(credentials);
      const adapted = adaptUser(result.user);
      loginWithUser(adapted);
      closeModal();
      // Central role -> portal mapping (src/lib/roles.js) — was previously
      // duplicated here as a local SELLER_ROLES array that only handled
      // buyer/seller/admin and silently dropped every operator role
      // (warehouse, testing agency, transporter) onto the buyer portal.
      navigate(portalPathForRole(adapted.role));
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Login to AgriConnect" onClose={closeModal} closeOnBackdrop={false}>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="authmodals-f1" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PHONE OR EMAIL *</label>
        <input id="authmodals-f1" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="0300-XXXXXXX or email@example.com"
          style={inputStyle} />
      </div>
      <div style={{ marginBottom: error ? 10 : 20 }}>
        <label htmlFor="authmodals-f2" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PASSWORD *</label>
        <input id="authmodals-f2" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password"
          onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inputStyle} />
        <div style={{ textAlign: 'right', marginTop: 6 }}>
          <span {...clickable(openForgot)} style={{ fontSize: 12, color: T.green, cursor: 'pointer', fontWeight: 700 }}>Forgot password?</span>
        </div>
      </div>
      {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 14, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}

      <Btn variant="primary" style={{ width: '100%', padding: '11px' }} onClick={handleLogin} disabled={loading}>
        {loading ? 'Logging in…' : 'Login →'}
      </Btn>
      <p style={{ textAlign: 'center', fontSize: 13, color: T.muted, marginTop: 14, marginBottom: 0 }}>
        No account? <span {...clickable(() => { closeModal(); openRegister(); })} style={{ color: T.green, cursor: 'pointer', fontWeight: 700 }}>Register Free</span>
      </p>
    </Modal>
  );
}

// Step 3 (document upload) can be resumed after a refresh: the registration
// token and a "you were at step 3" marker live in sessionStorage (per tab).
const STEP_KEY = 'agri_reg_step';
const readResumeStep = () => {
  try { return sessionStorage.getItem(STEP_KEY) === '3' && getRegistrationToken() ? 3 : 1; } catch { return 1; }
};
const markStep = (v) => { try { v ? sessionStorage.setItem(STEP_KEY, v) : sessionStorage.removeItem(STEP_KEY); } catch { /* ignore */ } };

// ─── REGISTER MODAL ───────────────────────────────────────────────────────────
export function RegisterModal() {
  const { closeModal, openLogin } = useAuth();
  const [step, setStep]         = useState(readResumeStep);
  const [resendIn, setResendIn] = useState(0);
  const [info, setInfo]         = useState('');
  const [role, setRole]         = useState('buyer');
  const [sellerKind, setSellerKind] = useState('TRADER'); // FARMER | TRADER | MILLER | EXPORTER
  const [form, setForm]         = useState({ fullName: '', phone: '', email: '', password: '' });
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [devOtp, setDevOtp]     = useState('');
  const [registeredIdentifier, setRegisteredIdentifier] = useState('');
  // fieldName -> File, e.g. { cnicFront: File, businessLicense: File }
  const [kycFiles, setKycFiles]       = useState({});
  const [kycError, setKycError]       = useState('');
  const [kycSubmitting, setKycSubmitting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Frontend role labels -> backend UserRole enum values.
  // Buyer used to incorrectly map to EXPORTER (a real, distinct seller-side
  // business role — see AdminDashboard's own user-creation form, which
  // already lists BUYER and EXPORTER as separate options). That silently
  // turned every new buyer into an exporter account. UserRole already has
  // a dedicated BUYER value; it just wasn't being used here.
  // Seller intentionally maps to TRADER, which is already this app's
  // generic "seller" role everywhere else (see SELLER_ROLES in
  // src/lib/roles.js) — that part of the original mapping was correct.
  const ROLE_MAP = {
    buyer: 'BUYER',
    seller: 'TRADER', // overridden by the Farmer / Trader / Miller / Exporter picker
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
        role: role === 'seller' ? sellerKind : (ROLE_MAP[role] || 'BUYER'),
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
      markStep('3');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const finishRegistration = () => { markStep(null); clearRegistrationToken(); setStep(4); };

  // Resend only issues a fresh code for the SAME pending registration — it
  // no longer re-submits the whole form (which used to fail with "already
  // registered" on the second try).
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleResend = async () => {
    if (resendIn > 0) return;
    setError(''); setInfo('');
    try {
      const r = await apiResendOtp(registeredIdentifier);
      if (r?.devOtp) setDevOtp(r.devOtp);
      setInfo('A new code has been sent.');
      setResendIn(30);
    } catch (err) { setError(err.message || 'Could not resend the code'); }
  };

  const handleOtpKey = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
  };

  const handleKycFilePick = (fieldName, file) => {
    setKycFiles(f => ({ ...f, [fieldName]: file }));
  };

  const handleKycSubmit = async () => {
    const selected = Object.entries(kycFiles).filter(([, file]) => file);
    // Nothing selected — same as "Skip for now", documents can be added
    // later from the user's own portal once they're approved and logged in.
    if (selected.length === 0) { finishRegistration(); return; }

    setKycError('');
    setKycSubmitting(true);
    try {
      const formData = new FormData();
      selected.forEach(([fieldName, file]) => formData.append(fieldName, file));
      await apiSubmitKyc(formData);
      finishRegistration();
    } catch (err) {
      setKycError(err.message || 'Document upload failed. You can try again, or skip and add them later from your portal.');
    } finally {
      setKycSubmitting(false);
    }
  };

  return (
    <Modal title={['', 'Create Account', 'Verify Contact', 'Upload Documents', 'Registration Submitted'][step]} onClose={closeModal} closeOnBackdrop={false}>
      {step === 1 && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8 }}>I WANT TO</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 8, marginBottom: 14 }}>
              {[
                ['buyer', '🛒', 'Buy Products', 'Browse & purchase commodities'],
                ['seller', '🌾', 'Sell Products', 'List your crops and rice'],
                ['transporter', '🚛', 'Offer Transport', 'Provide logistics services'],
                ['testing_agency', '🧪', 'Testing Agency', 'Offer quality testing'],
                ['warehouse', '🏪', 'Offer Warehousing', 'List storage space for rent'],
              ].map(([r, icon, title, desc]) => (
                <div key={r} {...clickable(() => setRole(r))} style={{ padding: 12, border: `2px solid ${role === r ? T.green : T.border}`, borderRadius: 10, cursor: 'pointer', background: role === r ? '#F0FDF4' : T.white }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.green }}>{title}</div>
                  <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.4 }}>{desc}</div>
                </div>
              ))}
            </div>
            {role === 'seller' && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 6 }}>I AM A</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[['FARMER', '🧑‍🌾 Farmer'], ['TRADER', '🤝 Trader'], ['MILLER', '🏭 Miller'], ['EXPORTER', '🚢 Exporter']].map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setSellerKind(k)} style={{ padding: '7px 12px', border: `2px solid ${sellerKind === k ? T.green : T.border}`, background: sellerKind === k ? '#F0FDF4' : T.white, color: sellerKind === k ? T.green : T.muted, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>{l}</button>
                  ))}
                </div>
              </div>
            )}
            <label htmlFor="authmodals-f3" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>FULL NAME *</label>
            <input id="authmodals-f3" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Muhammad Ahmed"
              style={{ ...inputStyle, marginBottom: 10 }} />

            <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#1D4ED8' }}>
              ℹ️ Provide at least one of phone or email — both aren't required.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 10 }}>
              <div>
                <label htmlFor="authmodals-f4" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PHONE</label>
                <input id="authmodals-f4" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0300-1234567" type="tel" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="authmodals-f5" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>EMAIL</label>
                <input id="authmodals-f5" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email" style={inputStyle} />
              </div>
            </div>
            <label htmlFor="authmodals-f6" style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>PASSWORD *</label>
            <input id="authmodals-f6" value={form.password} onChange={e => set('password', e.target.value)} type="password" placeholder="Min. 8 characters"
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
          {info && <div style={{ fontSize: 12, color: '#15803D', marginBottom: 10, background: '#DCFCE7', padding: '8px 12px', borderRadius: 7 }}>{info}</div>}
          {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 10, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>}
          <Btn variant="primary" style={{ width: '100%', padding: '11px' }} onClick={handleVerifyOtp} disabled={loading}>
            {loading ? 'Verifying…' : 'Verify OTP →'}
          </Btn>
          <p style={{ textAlign: 'center', fontSize: 12, color: T.muted, marginTop: 12, marginBottom: 0 }}>
            Didn't receive it? <span style={{ color: resendIn > 0 ? T.muted : T.green, cursor: resendIn > 0 ? 'default' : 'pointer', fontWeight: 700 }} {...clickable(handleResend)}>{resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend'}</span>
          </p>
        </>
      )}

      {step === 3 && (
        <>
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>
            Your number is verified. Optional: upload supporting documents now to speed up review — or skip and add them later from your portal once approved.
          </p>
          {[
            ['🪪', 'CNIC Front Side', 'cnicFront'],
            ['🪪', 'CNIC Back Side', 'cnicBack'],
            ['🏢', 'Company Registration', 'companyRegistration'],
            ['📄', 'Business License', 'businessLicense'],
          ].map(([icon, title, name]) => {
            const file = kycFiles[name];
            return (
              <label key={name} style={{ border: `2px dashed ${file ? T.green : T.border}`, background: file ? '#F0FDF4' : 'transparent', borderRadius: 10, padding: 16, textAlign: 'center', marginBottom: 10, cursor: 'pointer', display: 'block' }}>
                <div style={{ fontSize: 26, marginBottom: 4 }}>{file ? '✅' : icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{title}</div>
                <div style={{ fontSize: 11, color: T.muted, wordBreak: 'break-all', padding: '0 8px' }}>
                  {file ? file.name : 'Click to upload (optional) · JPG, PNG or PDF'}
                </div>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  style={{ display: 'none' }}
                  onChange={e => handleKycFilePick(name, e.target.files?.[0] || null)}
                />
              </label>
            );
          })}
          {kycError && <div style={{ fontSize: 12, color: T.danger, marginTop: 6, marginBottom: 10, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {kycError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 8, marginTop: 4 }}>
            <Btn variant="ghost" onClick={() => finishRegistration()} disabled={kycSubmitting}>Skip for now</Btn>
            <Btn variant="primary" onClick={handleKycSubmit} disabled={kycSubmitting}>
              {kycSubmitting ? 'Uploading…' : 'Continue →'}
            </Btn>
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
          Already have an account? <span {...clickable(() => { closeModal(); openLogin(); })} style={{ color: T.green, cursor: 'pointer', fontWeight: 700 }}>Login</span>
        </p>
      )}
    </Modal>
  );
}

// ─── FORGOT / RESET PASSWORD MODAL ────────────────────────────────────────────
// Step 1: ask for phone/email -> OTP. Step 2: OTP + new password. The
// backend answers step 1 identically whether or not the account exists.
export function ForgotPasswordModal() {
  const { closeModal, openLogin } = useAuth();
  const [step, setStep]         = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp]           = useState('');
  const [pw, setPw]             = useState('');
  const [pw2, setPw2]           = useState('');
  const [devOtp, setDevOtp]     = useState('');
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);

  const send = async () => {
    if (!identifier.trim()) { setError('Enter your phone number or email'); return; }
    setBusy(true); setError('');
    try {
      const r = await apiForgotPassword(identifier.trim());
      if (r?.devOtp) setDevOtp(r.devOtp);
      setStep(2);
    } catch (e) { setError(e.message || 'Could not send the code'); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    if (otp.trim().length < 6) { setError('Enter the 6-digit code'); return; }
    if (pw.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (pw !== pw2) { setError('Passwords do not match'); return; }
    setBusy(true); setError('');
    try {
      await apiResetPassword({ identifier: identifier.trim(), otp: otp.trim(), newPassword: pw });
      setStep(3);
    } catch (e) { setError(e.message || 'Could not reset the password'); }
    finally { setBusy(false); }
  };

  const errBox = error && <div style={{ fontSize: 12, color: T.danger, margin: '0 0 10px', background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>⚠ {error}</div>;

  return (
    <Modal title="Reset your password" onClose={closeModal} closeOnBackdrop={false}>
      {step === 1 && (
        <>
          <p style={{ color: T.muted, fontSize: 13, margin: '0 0 12px' }}>Enter the phone number or email you registered with. We'll send a 6-digit code.</p>
          <input autoFocus value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="0300-XXXXXXX or email@example.com"
            onKeyDown={e => e.key === 'Enter' && send()} style={{ ...inputStyle, marginBottom: 12 }} />
          {errBox}
          <Btn variant="primary" style={{ width: '100%', padding: '11px' }} onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send code →'}</Btn>
        </>
      )}
      {step === 2 && (
        <>
          <p style={{ color: T.muted, fontSize: 13, margin: '0 0 12px' }}>If an account exists for <strong>{identifier}</strong>, a code is on its way. Enter it with your new password.</p>
          {devOtp && <div style={{ background: '#DBEAFE', borderRadius: 7, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#1D4ED8' }}>🔧 Dev Mode OTP: <strong style={{ fontFamily: 'monospace', fontSize: 16 }}>{devOtp}</strong></div>}
          <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" inputMode="numeric" style={{ ...inputStyle, marginBottom: 10 }} />
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password (min. 8 characters)" style={{ ...inputStyle, marginBottom: 10 }} />
          <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repeat new password" onKeyDown={e => e.key === 'Enter' && reset()} style={{ ...inputStyle, marginBottom: 12 }} />
          {errBox}
          <Btn variant="primary" style={{ width: '100%', padding: '11px' }} onClick={reset} disabled={busy}>{busy ? 'Saving…' : 'Reset password'}</Btn>
          <p style={{ textAlign: 'center', fontSize: 12, color: T.muted, marginTop: 12, marginBottom: 0 }}>
            No code? <span {...clickable(() => { setOtp(''); setError(''); send(); })} style={{ color: T.green, cursor: 'pointer', fontWeight: 700 }}>Send again</span>
          </p>
        </>
      )}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
          <h3 style={{ color: T.green, margin: '0 0 8px' }}>Password updated</h3>
          <p style={{ color: T.muted, fontSize: 13, margin: '0 0 18px' }}>You've been signed out everywhere. Log in with your new password.</p>
          <Btn variant="primary" style={{ width: '100%' }} onClick={openLogin}>Go to login</Btn>
        </div>
      )}
      {step < 3 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: T.muted, marginTop: 14, marginBottom: 0 }}>
          Remembered it? <span {...clickable(openLogin)} style={{ color: T.green, cursor: 'pointer', fontWeight: 700 }}>Back to login</span>
        </p>
      )}
    </Modal>
  );
}
