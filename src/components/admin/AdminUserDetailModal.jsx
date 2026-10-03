// src/components/admin/AdminUserDetailModal.jsx
//
// Admin → Users → "View Complete Profile". Replaces the old KYC review
// modal, which showed only role/phone/city and had no way to see the
// actual submitted documents before approving or rejecting someone —
// exactly the gap this component closes.
import { useState, useEffect } from 'react';
import { Modal, Btn } from '../ui';
import {
  apiAdminGetUserDetail, apiAdminUpdateKyc, apiGetKycDocumentSignedUrl, resolveApiFileUrl,
  apiGetClarifications, apiRespondToClarification, apiResolveClarification,
} from '../../lib/api';
import ClarificationThread from '../ClarificationThread';
import T from '../../theme';

const DOC_LABELS = {
  cnicFront: 'CNIC Front', cnicBack: 'CNIC Back',
  companyRegistration: 'Company Registration', ntnDocument: 'NTN / Tax Document',
  businessLicense: 'Business License', otherDocument: 'Other Supporting Document',
};

const KYC_BADGE = {
  APPROVED: { bg: '#DCFCE7', fg: '#15803D' },
  SUBMITTED: { bg: '#FEF3C7', fg: '#B45309' },
  RECOMMENDED: { bg: '#DBEAFE', fg: '#1D4ED8' },
  INFO_REQUESTED: { bg: '#FFEDD5', fg: '#C2410C' },
  REJECTED: { bg: '#FEE2E2', fg: '#DC2626' },
  PENDING: { bg: '#F3F4F6', fg: '#6B7280' },
};

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'; }
function fmtMoney(n) { return `₨${Number(n || 0).toLocaleString()}`; }

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: T.muted, textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function ActivityTable({ rows, columns, empty }) {
  if (!rows?.length) return <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>{empty}</div>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} style={{ borderBottom: `1px solid ${T.border}` }}>
            {columns.map((c, i) => <td key={i} style={{ padding: '6px 8px' }}>{c.render(r)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminUserDetailModal({ userId, onClose, onKycChanged }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [clarifications, setClarifications] = useState([]);

  const loadClarifications = () => {
    apiGetClarifications('USER_KYC', userId)
      .then(data => setClarifications(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    apiAdminGetUserDetail(userId)
      .then(d => { if (!cancelled) setDetail(d); })
      .catch(e => { if (!cancelled) setError(e.message || 'Failed to load user'); });
    loadClarifications();
    return () => { cancelled = true; };
  }, [userId]);

  const openDocument = async (docId) => {
    // Open the tab synchronously (still within the click's user-gesture
    // context) with a placeholder, then navigate it once the signed URL
    // comes back — fetching first and calling window.open() only after
    // the await would get blocked as a popup by most browsers.
    const tab = window.open('', '_blank');
    try {
      const { url } = await apiGetKycDocumentSignedUrl(docId);
      if (tab) tab.location.href = resolveApiFileUrl(url);
    } catch (e) {
      if (tab) tab.close();
      alert(e.message || 'Could not open document — the link may need to be requested again.');
    }
  };

  const runAction = async (status, note) => {
    setBusy(true);
    try {
      await apiAdminUpdateKyc(userId, status, note);
      setDetail(d => ({ ...d, kycStatus: status === 'INFO_REQUESTED' ? 'INFO_REQUESTED' : status, kycRejectionNote: status === 'REJECTED' ? note : d.kycRejectionNote }));
      if (status === 'INFO_REQUESTED') loadClarifications();
      onKycChanged?.(userId, status);
      // Approving is a terminal action for this screen — close the window
      // immediately instead of leaving it open showing a now-stale state.
      // Reject/Request Info stay open since the admin is likely to keep
      // reviewing (e.g. re-checking documents) after either of those.
      if (status === 'APPROVED') onClose?.();
    } catch (e) {
      alert(e.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const handleReviewerRespond = async (clarificationId, message, files) => {
    await apiRespondToClarification(clarificationId, message, files);
    loadClarifications();
  };

  const handleResolve = async (clarificationId) => {
    try {
      await apiResolveClarification(clarificationId);
      loadClarifications();
    } catch (e) {
      alert(e.message || 'Could not resolve this request.');
    }
  };

  return (
    <Modal title="Complete Profile" onClose={onClose} width={720}>
      {error && <div style={{ color: T.danger, fontSize: 13 }}>⚠ {error}</div>}
      {!detail && !error && <div style={{ padding: 30, textAlign: 'center', color: T.muted }}>Loading…</div>}
      {detail && (
        <div>
          {/* ── Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, color: T.green, fontSize: 14 }}>{detail.agriConnectId || '—'}</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{detail.profile?.fullName || detail.profile?.businessName || 'Unnamed User'}</div>
              <div style={{ fontSize: 12, color: T.muted }}>{(detail.role || '').replace(/_/g, ' ')} · Registered {fmtDate(detail.createdAt)}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ background: KYC_BADGE[detail.kycStatus]?.bg, color: KYC_BADGE[detail.kycStatus]?.fg, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                KYC: {detail.kycStatus}
              </span>
              <span style={{ background: detail.isActive ? '#DCFCE7' : '#FEE2E2', color: detail.isActive ? '#15803D' : '#DC2626', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                {detail.isActive ? 'ACTIVE' : 'SUSPENDED'}
              </span>
            </div>
          </div>

          {detail.kycRejectionNote && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '8px 12px', borderRadius: 7, fontSize: 12, marginBottom: 14 }}>
              <strong>Rejection note:</strong> {detail.kycRejectionNote}
            </div>
          )}
          {detail.kycInfoRequestNote && !clarifications.length && (
            <div style={{ background: '#FFEDD5', color: '#9A3412', padding: '8px 12px', borderRadius: 7, fontSize: 12, marginBottom: 14 }}>
              <strong>Info requested ({fmtDate(detail.kycInfoRequestedAt)}):</strong> {detail.kycInfoRequestNote}
            </div>
          )}
          {!!clarifications.length && (
            <Section title={`Clarification Thread (${clarifications.length})`}>
              <ClarificationThread
                clarifications={clarifications}
                viewerRole="reviewer"
                onRespond={handleReviewerRespond}
                onResolve={handleResolve}
              />
            </Section>
          )}

          {/* ── Identity / Contact ── */}
          <Section title="Identity & Contact">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              <div>Phone: <strong>{detail.phoneNumber || '—'}</strong> {detail.isPhoneVerified ? '✓' : ''}</div>
              <div>Email: <strong>{detail.email || '—'}</strong> {detail.isEmailVerified ? '✓' : ''}</div>
              <div>CNIC: <strong>{detail.profile?.cnicNumber || '—'}</strong></div>
              <div>City / Province: <strong>{detail.profile?.city || '—'}{detail.profile?.province ? `, ${detail.profile.province}` : ''}</strong></div>
              {detail.profile?.businessName && <div>Business Name: <strong>{detail.profile.businessName}</strong></div>}
            </div>
          </Section>

          {/* ── Documents ── */}
          <Section title={`Documents (${detail.kycDocuments?.length || 0})`}>
            {!detail.kycDocuments?.length && <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>No documents submitted yet.</div>}
            {!!detail.kycDocuments?.length && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {detail.kycDocuments.map(doc => (
                  <button key={doc.id} onClick={() => openDocument(doc.id)}
                    style={{ border: `1.5px solid ${T.border}`, borderRadius: 8, padding: 10, textAlign: 'left', background: '#fff', cursor: 'pointer', display: 'block', font: 'inherit' }}>
                    <div style={{ fontSize: 20 }}>📄</div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{DOC_LABELS[doc.docType] || doc.docType}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{fmtDate(doc.createdAt)}</div>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* ── Business info (role-specific profile) ── */}
          {((detail.warehouseProfiles && detail.warehouseProfiles.length > 0) || detail.testingAgencyProfile || detail.transportProfile) && (
            <Section title="Business Information">
              <div style={{ fontSize: 12, color: T.muted }}>
                {detail.warehouseProfiles?.map(wp => (
                  <div key={wp.id}>Warehouse: <strong>{wp.name}</strong> · {wp.city}</div>
                ))}
                {detail.testingAgencyProfile && <div>Testing Agency: <strong>{detail.testingAgencyProfile.name}</strong></div>}
                {detail.transportProfile && <div>Transport Provider: <strong>{detail.transportProfile.name}</strong></div>}
              </div>
            </Section>
          )}

          {/* ── Activity ── */}
          <Section title={`Listings (${detail._count?.productsAsSeller ?? 0})`}>
            <ActivityTable rows={detail.productsAsSeller} empty="No listings."
              columns={[
                { render: r => <strong>{r.name}</strong> },
                { render: r => `${r.quantity} ${r.unit}` },
                { render: r => fmtMoney(r.askingPrice) },
                { render: r => r.status },
                { render: r => fmtDate(r.createdAt) },
              ]} />
          </Section>

          <Section title={`Orders — as Seller (${detail._count?.ordersAsSeller ?? 0}) / as Buyer (${detail._count?.ordersAsBuyer ?? 0})`}>
            <ActivityTable rows={[...(detail.ordersAsSeller || []), ...(detail.ordersAsBuyer || [])]} empty="No orders."
              columns={[
                { render: r => fmtMoney(r.totalAmount) },
                { render: r => r.status },
                { render: r => fmtDate(r.createdAt) },
              ]} />
          </Section>

          <Section title={`Offers Made (${detail._count?.offersAsBuyer ?? 0})`}>
            <ActivityTable rows={detail.offersAsBuyer} empty="No offers."
              columns={[
                { render: r => fmtMoney(r.offeredPrice) },
                { render: r => `${r.quantity}` },
                { render: r => r.status },
                { render: r => fmtDate(r.createdAt) },
              ]} />
          </Section>

          <Section title={`Warehouse Bookings (${detail._count?.storageBookings ?? 0}) / Receipts (${detail._count?.warehouseReceipts ?? 0})`}>
            <ActivityTable rows={detail.storageBookings} empty="No warehouse bookings."
              columns={[
                { render: r => r.commodity },
                { render: r => `${r.quantityTons}t` },
                { render: r => fmtMoney(r.totalCost) },
                { render: r => r.status },
                { render: r => fmtDate(r.createdAt) },
              ]} />
          </Section>

          <Section title={`Testing Requests (${detail._count?.testingRequests ?? 0}) / Transport Requests (${detail._count?.transportRequests ?? 0})`}>
            <ActivityTable rows={detail.testingRequests} empty="No testing requests."
              columns={[
                { render: r => (r.servicesRequested || []).join(', ') || '—' },
                { render: r => fmtMoney(r.fee) },
                { render: r => r.status },
                { render: r => fmtDate(r.createdAt) },
              ]} />
          </Section>

          <Section title={`Transactions (${detail._count?.transactions ?? 0})`}>
            <ActivityTable rows={detail.transactions} empty="No transactions."
              columns={[
                { render: r => r.description },
                { render: r => r.type },
                { render: r => fmtMoney(r.amount) },
                { render: r => fmtDate(r.createdAt) },
              ]} />
          </Section>

          {/* ── Actions ── */}
          <Section title="Actions">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <Btn variant="primary" disabled={busy || detail.kycStatus === 'APPROVED'} onClick={() => runAction('APPROVED')}>
                {detail.kycStatus === 'APPROVED' ? '✅ Approved' : '✅ Approve'}
              </Btn>
              <Btn variant="secondary" disabled={busy} onClick={() => {
                const note = prompt('What additional information is needed?');
                if (note) runAction('INFO_REQUESTED', note);
              }}>❓ Request Info</Btn>
              <Btn variant="danger" disabled={busy} onClick={() => {
                const note = prompt('Reason for rejection:');
                if (note) runAction('REJECTED', note);
              }}>❌ Reject</Btn>
            </div>
          </Section>
        </div>
      )}
    </Modal>
  );
}
