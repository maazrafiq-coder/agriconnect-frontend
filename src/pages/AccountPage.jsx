import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGetProfile, apiGetMyDocuments, apiGetMyActivity, apiGetMyKycClarifications, apiRespondToClarification } from '../lib/api';
import { Tabs } from '../components/ui';
import T from '../theme';
import { ProfileTab } from '../components/account/ProfileTab';
import { EditProfileTab } from '../components/account/EditProfileTab';
import { ChangePasswordTab } from '../components/account/ChangePasswordTab';
import { DocumentsTab } from '../components/account/DocumentsTab';
import { ActivityTab } from '../components/account/ActivityTab';
import { DangerZoneTab } from '../components/account/DangerZoneTab';

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

  const reloadDocuments = () => {
    apiGetMyDocuments().then(data => setDocuments(Array.isArray(data) ? data : [])).catch(() => {});
    apiGetProfile().then(setProfile).catch(() => {});
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
        {tab === 'documents' && <DocumentsTab documents={documents} loading={docsLoading} onUploaded={reloadDocuments} />}
        {tab === 'activity'  && <ActivityTab activity={activity} loading={activityLoading} />}
        {tab === 'danger'    && <DangerZoneTab onDeactivated={handleDeactivated} />}
      </div>
    </div>
  );
}
