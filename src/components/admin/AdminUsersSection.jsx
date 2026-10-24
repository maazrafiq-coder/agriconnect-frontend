import { apiAdminSetUserActive } from '../../lib/api';
import { Card, Btn } from '../ui';
import T from '../../theme';
import { Pager } from './Pager';
import useConfirm from '../ui/useConfirm';
import { notify } from '../../lib/notify';

// ─── AdminUsersSection ───
export function AdminUsersSection({ userSearch, setUserSearch, kycFilter, setKycFilter, users, setUsers, usersMeta, userPage, setUserPage, usersLoading, setKycModal, setCreateUserModal, setResetPasswordModal, loadAll }) {
  const [confirmNode, confirm] = useConfirm();
  return (
    <div>
      {confirmNode}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 4px' }}>👥 User Management</h1>
          <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>Farmers · Buyers · Transporters · KYC · Activate/Suspend</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="gold" onClick={() => setCreateUserModal(true)}>+ Create User</Btn>
          <Btn variant="secondary" onClick={loadAll}>↻ Refresh</Btn>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', maxWidth: 340, flex: 1, minWidth: 220 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: 14 }}>🔍</span>
          <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by AgriConnect ID, name, phone, role, city…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={kycFilter} onChange={e => setKycFilter(e.target.value)}
          style={{ padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: T.white }}>
          <option value="ALL">All KYC statuses</option>
          <option value="SUBMITTED">Pending (Submitted)</option>
          <option value="RECOMMENDED">Recommended</option>
          <option value="INFO_REQUESTED">Info Requested</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PENDING">Not Submitted</option>
        </select>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.green }}>
              {['AgriConnect ID', 'User', 'Role', 'City', 'KYC Status', 'Account', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ background: i % 2 === 0 ? T.surface : T.white }}>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: T.green }}>{u.agriConnectId || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700 }}>{u.profile?.fullName || '—'}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>{u.phoneNumber}</div>
                </td>
                <td style={{ padding: '10px 14px' }}>{u.role}</td>
                <td style={{ padding: '10px 14px' }}>{u.profile?.city || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    background: u.kycStatus === 'APPROVED' ? '#DCFCE7' : u.kycStatus === 'SUBMITTED' ? '#FEF3C7' : u.kycStatus === 'REJECTED' ? '#FEE2E2' : '#F3F4F6',
                    color: u.kycStatus === 'APPROVED' ? '#15803D' : u.kycStatus === 'SUBMITTED' ? '#B45309' : u.kycStatus === 'REJECTED' ? '#DC2626' : '#6B7280',
                    padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                  }}>{u.kycStatus}</span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ color: u.isActive ? '#15803D' : T.danger, fontWeight: 700 }}>{u.isActive ? 'Active' : 'Suspended'}</span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Btn variant="secondary" size="sm" onClick={() => setKycModal(u)}>View Profile</Btn>
                    {u.kycStatus === 'SUBMITTED' && (
                      <Btn variant="primary" size="sm" onClick={() => setKycModal(u)}>Review KYC</Btn>
                    )}
                    <Btn variant={u.isActive ? 'danger' : 'secondary'} size="sm" onClick={() => confirm({
                      title: u.isActive ? `Suspend ${u.fullName || u.email || u.phoneNumber || 'user'}` : `Reactivate ${u.fullName || u.email || u.phoneNumber || 'user'}`,
                      danger: u.isActive,
                      confirmLabel: u.isActive ? 'Suspend account' : 'Reactivate account',
                      description: u.isActive ? 'Suspend this account?' : 'Reactivate this account?',
                      consequences: u.isActive
                        ? ['They can no longer log in or use the platform.', 'Their open listings and orders are not deleted.', 'You can reactivate the account at any time.']
                        : ['They can log in and trade again.'],
                      run: async () => {
                        await apiAdminSetUserActive(u.id, !u.isActive);
                        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
                      },
                      successTitle: u.isActive ? 'Account suspended' : 'Account reactivated',
                    })}>{u.isActive ? 'Suspend' : 'Activate'}</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => setResetPasswordModal(u)}>Reset PW</Btn>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && !usersLoading && (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: T.muted }}>No users found.</td></tr>
            )}
          </tbody>
        </table></div>
      </Card>
      <Pager page={userPage} totalPages={usersMeta.totalPages} total={usersMeta.total} busy={usersLoading} onPage={setUserPage} />
    </div>
  );
}
