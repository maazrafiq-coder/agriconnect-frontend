import {
  apiAdminVerifyWarehouse,
  apiAdminSetWarehouseActive,
  apiAdminSetTestingAgencyActive,
  apiAdminSetTransportActive,
  apiAdminVerifyTestingAgency,
  apiAdminVerifyTransport,
} from '../../lib/api';
import { Card, Btn } from '../ui';
import T from '../../theme';
import { clickable } from '../../lib/a11y';
import AdminTransportDisputes from './AdminTransportDisputes';
import { notify } from '../../lib/notify';

// ─── AdminLogisticsSection ───
export function AdminLogisticsSection({ warehouses, setWarehouses, loading, setListingDetail, testingAgencies, setTestingAgencies, transporters, setTransporters, handleRequestProviderInfo }) {
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: T.green, margin: '0 0 4px' }}>🚛 Logistics & Service Listings</h1>
      <p style={{ fontSize: 13, color: T.muted, margin: '0 0 20px' }}>Warehouses, testing agencies, and transport providers</p>

      <div style={{ fontSize: 13, fontWeight: 700, color: T.green, margin: '0 0 10px' }}>🏪 Warehouses</div>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.green }}>
              {['Warehouse', 'City', 'Type', 'Capacity', 'Verified', 'Listed', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {warehouses.map((w, i) => (
              <tr key={w.id} style={{ background: i % 2 === 0 ? T.surface : T.white, opacity: w.isActive ? 1 : 0.55 }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}><span {...clickable(() => setListingDetail({ type: 'warehouse', id: w.id }))} style={{ cursor: 'pointer', color: T.green, textDecoration: 'underline' }} title="View complete details">{w.name}</span></td>
                <td style={{ padding: '10px 14px' }}>{w.city}</td>
                <td style={{ padding: '10px 14px' }}>{w.type}</td>
                <td style={{ padding: '10px 14px' }}>{w.totalCapacityTons?.toLocaleString()} tons</td>
                <td style={{ padding: '10px 14px' }}>{w.isVerified ? '✅ Verified' : '⏳ Pending'}</td>
                <td style={{ padding: '10px 14px' }}>{w.isActive ? '🟢 Listed' : '🔴 Delisted'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn variant={w.isVerified ? 'ghost' : 'primary'} size="sm" onClick={async () => {
                      try {
                        await apiAdminVerifyWarehouse(w.id, !w.isVerified);
                        setWarehouses(prev => prev.map(x => x.id === w.id ? { ...x, isVerified: !x.isVerified } : x));
                      } catch (e) { notify(e.message); }
                    }}>{w.isVerified ? 'Unverify' : 'Verify'}</Btn>
                    <Btn variant={w.isActive ? 'danger' : 'secondary'} size="sm" onClick={async () => {
                      try {
                        await apiAdminSetWarehouseActive(w.id, !w.isActive);
                        setWarehouses(prev => prev.map(x => x.id === w.id ? { ...x, isActive: !x.isActive } : x));
                      } catch (e) { notify(e.message); }
                    }}>{w.isActive ? 'Delist' : 'Relist'}</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => handleRequestProviderInfo('WAREHOUSE_PROFILE', w.id)}>Request Info</Btn>
                  </div>
                </td>
              </tr>
            ))}
            {warehouses.length === 0 && !loading && (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: T.muted }}>No warehouses registered.</td></tr>
            )}
          </tbody>
        </table></div>
      </Card>

      <div style={{ fontSize: 13, fontWeight: 700, color: T.green, margin: '0 0 10px' }}>🧪 Testing Agencies</div>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.teal }}>
              {['Agency', 'City', 'Verified', 'Listed', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {testingAgencies.map((a, i) => (
              <tr key={a.id} style={{ background: i % 2 === 0 ? T.surface : T.white, opacity: a.isActive ? 1 : 0.55 }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}><span {...clickable(() => setListingDetail({ type: 'testing_agency', id: a.id }))} style={{ cursor: 'pointer', color: T.green, textDecoration: 'underline' }} title="View complete details">{a.name}</span></td>
                <td style={{ padding: '10px 14px' }}>{a.city}</td>
                <td style={{ padding: '10px 14px' }}>{a.isVerified ? '✅ Verified' : '⏳ Pending'}</td>
                <td style={{ padding: '10px 14px' }}>{a.isActive ? '🟢 Listed' : '🔴 Delisted'}</td>
                <td style={{ padding: '10px 14px', display: 'flex', gap: 6 }}>
                  <Btn variant={a.isVerified ? 'ghost' : 'primary'} size="sm" onClick={async () => {
                    try {
                      await apiAdminVerifyTestingAgency(a.id, !a.isVerified);
                      setTestingAgencies(prev => prev.map(x => x.id === a.id ? { ...x, isVerified: !x.isVerified } : x));
                    } catch (e) { notify(e.message); }
                  }}>{a.isVerified ? 'Unverify' : 'Verify'}</Btn>
                  <Btn variant={a.isActive ? 'danger' : 'secondary'} size="sm" onClick={async () => {
                    try {
                      await apiAdminSetTestingAgencyActive(a.id, !a.isActive);
                      setTestingAgencies(prev => prev.map(x => x.id === a.id ? { ...x, isActive: !x.isActive } : x));
                    } catch (e) { notify(e.message); }
                  }}>{a.isActive ? 'Delist' : 'Relist'}</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => handleRequestProviderInfo('TESTING_AGENCY_PROFILE', a.id)}>Request Info</Btn>
                </td>
              </tr>
            ))}
            {testingAgencies.length === 0 && !loading && (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: T.muted }}>No testing agencies registered.</td></tr>
            )}
          </tbody>
        </table></div>
      </Card>

      <div style={{ fontSize: 13, fontWeight: 700, color: T.green, margin: '0 0 10px' }}>🚛 Transport Providers</div>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.cyan }}>
              {['Company', 'Verified', 'Listed', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transporters.map((t, i) => (
              <tr key={t.id} style={{ background: i % 2 === 0 ? T.surface : T.white, opacity: t.isActive ? 1 : 0.55 }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}><span {...clickable(() => setListingDetail({ type: 'transport', id: t.id }))} style={{ cursor: 'pointer', color: T.green, textDecoration: 'underline' }} title="View complete details">{t.companyName}</span></td>
                <td style={{ padding: '10px 14px' }}>{t.isVerified ? '✅ Verified' : '⏳ Pending'}</td>
                <td style={{ padding: '10px 14px' }}>{t.isActive ? '🟢 Listed' : '🔴 Delisted'}</td>
                <td style={{ padding: '10px 14px', display: 'flex', gap: 6 }}>
                  <Btn variant={t.isVerified ? 'ghost' : 'primary'} size="sm" onClick={async () => {
                    try {
                      await apiAdminVerifyTransport(t.id, !t.isVerified);
                      setTransporters(prev => prev.map(x => x.id === t.id ? { ...x, isVerified: !x.isVerified } : x));
                    } catch (e) { notify(e.message); }
                  }}>{t.isVerified ? 'Unverify' : 'Verify'}</Btn>
                  <Btn variant={t.isActive ? 'danger' : 'secondary'} size="sm" onClick={async () => {
                    try {
                      await apiAdminSetTransportActive(t.id, !t.isActive);
                      setTransporters(prev => prev.map(x => x.id === t.id ? { ...x, isActive: !x.isActive } : x));
                    } catch (e) { notify(e.message); }
                  }}>{t.isActive ? 'Delist' : 'Relist'}</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => handleRequestProviderInfo('TRANSPORT_PROFILE', t.id)}>Request Info</Btn>
                </td>
              </tr>
            ))}
            {transporters.length === 0 && !loading && (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: T.muted }}>No transport providers registered.</td></tr>
            )}
          </tbody>
        </table></div>
      </Card>

      <AdminTransportDisputes />
    </div>
  );
}
