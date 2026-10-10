// src/components/admin/AdminListingDetailModal.jsx
//
// Admin → click a listing name (warehouse, testing agency, transport
// provider, product) → everything we hold about it in one place: all listing
// fields, owner contact + submitted KYC documents, uploaded photos/documents,
// certificates, activity stats, and the clarification thread.
import { useState, useEffect } from 'react';
import { Modal, Btn, LoadingState } from '../ui';
import {
  apiAdminGetListingDetail, apiGetKycDocumentSignedUrl, resolveApiFileUrl,
  apiGetClarifications, apiRespondToClarification, apiResolveClarification,
  apiRequestClarification, apiReleaseLien,
  apiAdminApproveProduct, apiAdminRejectProduct,
  apiAdminVerifyWarehouse, apiAdminVerifyTestingAgency, apiAdminVerifyTransport,
} from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import TextPromptModal from '../ui/TextPromptModal';
import ClarificationThread from '../ClarificationThread';
import T from '../../theme';

const DOC_LABELS = {
  cnicFront: 'CNIC Front', cnicBack: 'CNIC Back',
  companyRegistration: 'Company Registration', ntnDocument: 'NTN / Tax Document',
  businessLicense: 'Business License', otherDocument: 'Other Supporting Document',
};

const TYPE_TITLES = {
  warehouse: 'Warehouse', testing_agency: 'Testing Agency', transport: 'Transport Provider', product: 'Product Listing',
};

// Fields that are plumbing, not information an admin needs to read.
const HIDDEN_KEYS = new Set([
  'id', 'userId', 'sellerId', 'updatedAt', 'riceDetails', 'categoryId', 'cityId', 'unitId',
]);

const fmtDate = d => (d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const humanize = k => k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()).trim();

function fmtValue(key, v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (/At$|Date$/.test(key) && typeof v === 'string') return fmtDate(v);
  if (typeof v === 'object') {
    return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(' · ') || '—';
  }
  if (/price|cost|fee|amount/i.test(key) && !isNaN(Number(v))) return `₨${Number(v).toLocaleString()}`;
  return String(v);
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: T.muted, textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

const Empty = ({ children }) => <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>{children}</div>;

export default function AdminListingDetailModal({ type, id, onClose, onOpenUser, onDecision }) {
  const { user: viewer } = useAuth();
  const canDecide = viewer?.role === 'admin';
  const [deciding, setDeciding] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [clarifications, setClarifications] = useState([]);
  const [ask, setAsk] = useState(null);

  const clar = detail?.clarificationSubject;

  const loadClarifications = (subject) => {
    if (!subject) return;
    apiGetClarifications(subject.subjectType, subject.subjectId)
      .then(d => setClarifications(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    apiAdminGetListingDetail(type, id)
      .then(d => { if (!cancelled) { setDetail(d); loadClarifications(d.clarificationSubject); } })
      .catch(e => { if (!cancelled) setError(e.message || 'Failed to load listing'); });
    return () => { cancelled = true; };
  }, [type, id]);

  const openKycDoc = async (docId) => {
    const tab = window.open('', '_blank');
    try {
      const { url } = await apiGetKycDocumentSignedUrl(docId);
      if (tab) tab.location.href = resolveApiFileUrl(url);
    } catch (e) {
      if (tab) tab.close();
      alert(e.message || 'Could not open document.');
    }
  };

  const clearLien = (lien) => setAsk({
    title: 'Record bank clearance',
    description: `${lien.bankName} — ₨${Number(lien.loanAmount).toLocaleString()}. This lets the warehouse release the goods and notifies the operator and the depositor.`,
    label: "Bank's clearance reference / letter number",
    multiline: false,
    submitLabel: 'Record clearance',
    onSubmit: async (ref) => {
      await apiReleaseLien(lien.id, ref);
      setDetail(d => ({
        ...d,
        activeLienList: d.activeLienList.filter(l => l.id !== lien.id),
        stats: { ...d.stats, activeLiens: Math.max(0, (d.stats?.activeLiens || 1) - 1) },
      }));
    },
  });

  const requestInfo = () => {
    if (!clar) return;
    setAsk({
      title: 'Request more information',
      label: 'What additional information is needed?',
      submitLabel: 'Send request',
      onSubmit: async (note) => { await apiRequestClarification(clar.subjectType, clar.subjectId, note); loadClarifications(clar); },
    });
  };

  // Approve / reject straight from the detail view — admins previously had to
  // close this window and find the listing in the table to act on it.
  const isProduct = type === 'product';
  const awaitingDecision = detail && (isProduct ? detail.entity?.status === 'PENDING_REVIEW' : detail.entity?.isVerified === false);
  const approve = async () => {
    setDeciding(true);
    try {
      if (isProduct) await apiAdminApproveProduct(id);
      else if (type === 'warehouse') await apiAdminVerifyWarehouse(id, true);
      else if (type === 'testing_agency') await apiAdminVerifyTestingAgency(id, true);
      else if (type === 'transport') await apiAdminVerifyTransport(id, true);
      setDetail(d => ({ ...d, entity: { ...d.entity, ...(isProduct ? { status: 'ACTIVE' } : { isVerified: true }) } }));
      onDecision?.();
    } catch (e) { alert(e.message || 'Could not approve'); } finally { setDeciding(false); }
  };
  const rejectListing = () => setAsk({
    title: 'Reject listing', label: 'Reason (shown to the seller)', submitLabel: 'Reject listing',
    onSubmit: async (reason) => {
      await apiAdminRejectProduct(id, reason);
      setDetail(d => ({ ...d, entity: { ...d.entity, status: 'REJECTED' } }));
      onDecision?.();
    },
  });

  const entityRows = detail
    ? Object.entries(detail.entity || {}).filter(([k]) => !HIDDEN_KEYS.has(k))
    : [];
  const images = (detail?.media || []).filter(m => m.type !== 'document');
  const mediaDocs = (detail?.media || []).filter(m => m.type === 'document');
  const owner = detail?.owner;

  return (
    <Modal title={`${TYPE_TITLES[type] || 'Listing'} — Complete Details`} onClose={onClose} width={760}>
      {error && <div style={{ color: T.danger, fontSize: 13 }}>⚠ {error}</div>}
      {!detail && !error && <LoadingState />}
      {detail && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{detail.entity?.name || detail.entity?.companyName || 'Listing'}</div>
            <div style={{ fontSize: 12, color: T.muted }}>
              Submitted {fmtDate(detail.entity?.createdAt)}
              {detail.entity?.isVerified !== undefined && ` · ${detail.entity.isVerified ? '✅ Verified' : '⏳ Awaiting approval'}`}
              {detail.entity?.status && ` · ${String(detail.entity.status).replace(/_/g, ' ')}`}
            </div>
          </div>

          {canDecide && awaitingDecision && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, padding: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#92400E', fontWeight: 700, flex: '1 1 200px' }}>This {TYPE_TITLES[type]?.toLowerCase() || 'listing'} is waiting for a decision.</span>
              <Btn variant="primary" size="sm" disabled={deciding} onClick={approve}>✅ Approve</Btn>
              {isProduct && <Btn variant="danger" size="sm" disabled={deciding} onClick={rejectListing}>❌ Reject</Btn>}
            </div>
          )}

          {/* ── Stats ── */}
          {detail.stats && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              {Object.entries(detail.stats).map(([k, v]) => (
                <div key={k} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 14px' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: T.green }}>{v}</div>
                  <div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>{humanize(k)}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Listing fields ── */}
          <Section title="Listing Details">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '6px 16px', fontSize: 12 }}>
              {entityRows.map(([k, v]) => (
                <div key={k} style={{ gridColumn: k === 'description' ? '1 / -1' : undefined }}>
                  <span style={{ color: T.muted }}>{humanize(k)}:</span> <strong>{fmtValue(k, v)}</strong>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Owner ── */}
          <Section title="Owner / Submitted By">
            {!owner && <Empty>Owner record not found.</Empty>}
            {owner && (
              <div style={{ fontSize: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 6, marginBottom: 8 }}>
                  <div>Name: <strong>{owner.profile?.fullName || '—'}</strong></div>
                  <div>AgriConnect ID: <strong style={{ fontFamily: 'monospace' }}>{owner.agriConnectId || '—'}</strong></div>
                  <div>Phone: <strong>{owner.phoneNumber || '—'}</strong></div>
                  <div>Email: <strong>{owner.email || '—'}</strong></div>
                  <div>Business: <strong>{owner.profile?.businessName || '—'}</strong></div>
                  <div>Location: <strong>{owner.profile?.city || '—'}{owner.profile?.province ? `, ${owner.profile.province}` : ''}</strong></div>
                  <div>NTN: <strong>{owner.profile?.ntnNumber || '—'}</strong></div>
                  <div>License: <strong>{owner.profile?.licenseNumber || '—'}</strong></div>
                  <div>KYC status: <strong>{owner.kycStatus}</strong></div>
                  <div>Account: <strong>{owner.isActive ? 'Active' : 'Suspended'}</strong></div>
                </div>
                {onOpenUser && <Btn variant="ghost" size="sm" onClick={() => onOpenUser(owner.id)}>Open full user profile →</Btn>}
              </div>
            )}
          </Section>

          {/* ── Submitted documents (KYC) ── */}
          <Section title={`Owner's Submitted Documents (${owner?.kycDocuments?.length || 0})`}>
            {!owner?.kycDocuments?.length && <Empty>No KYC documents submitted.</Empty>}
            {!!owner?.kycDocuments?.length && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {owner.kycDocuments.map(doc => (
                  <button key={doc.id} onClick={() => openKycDoc(doc.id)}
                    style={{ border: `1.5px solid ${T.border}`, borderRadius: 8, padding: 10, textAlign: 'left', background: '#fff', cursor: 'pointer', font: 'inherit' }}>
                    <div style={{ fontSize: 20 }}>📄</div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{DOC_LABELS[doc.docType] || doc.docType}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{fmtDate(doc.createdAt)}</div>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* ── Listing photos / documents ── */}
          <Section title={`Photos (${images.length})`}>
            {!images.length && <Empty>No photos uploaded.</Empty>}
            {!!images.length && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                {images.map(m => (
                  <a key={m.id} href={resolveApiFileUrl(m.url)} target="_blank" rel="noreferrer">
                    <img src={resolveApiFileUrl(m.url)} alt={m.label || ''} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }} />
                  </a>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Listing Documents (${mediaDocs.length + (detail.documents?.length || 0)})`}>
            {!mediaDocs.length && !detail.documents?.length && <Empty>No documents attached to this listing.</Empty>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {mediaDocs.map(m => (
                <a key={m.id} href={resolveApiFileUrl(m.url)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.green, fontWeight: 700 }}>
                  📎 {m.label || 'Document'}
                </a>
              ))}
              {(detail.documents || []).map(d => (
                <a key={d.id} href={resolveApiFileUrl(d.url)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.green, fontWeight: 700 }}>
                  📎 {d.label || d.title || d.docType || d.type || d.fileName || 'Certificate / lab report'}
                </a>
              ))}
            </div>
          </Section>

          {/* ── Active bank liens (warehouses) ── */}
          {detail.activeLienList && (
            <Section title={`Active Bank Liens (${detail.activeLienList.length})`}>
              {!detail.activeLienList.length && <Empty>No goods are currently under lien.</Empty>}
              {detail.activeLienList.map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 12px', border: '1px solid #FCD34D', background: '#FFFBEB', borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
                  <div>
                    <strong>{l.bankName}</strong> — ₨{Number(l.loanAmount).toLocaleString()}{l.loanRefNo ? ` · Ref ${l.loanRefNo}` : ''}
                    <div style={{ color: T.muted }}>{l.receipt?.receiptNumber} · {l.receipt?.commodity} {l.receipt?.quantityTons}t · since {fmtDate(l.placedAt)}</div>
                  </div>
                  <Btn variant="primary" size="sm" onClick={() => clearLien(l)}>Record bank clearance</Btn>
                </div>
              ))}
              <div style={{ fontSize: 11, color: T.muted }}>Clearing a lien lets the warehouse issue the gate-out pass and notifies the operator and the depositor.</div>
            </Section>
          )}

          {/* ── Recent bookings (warehouses) ── */}
          {detail.recentBookings && (
            <Section title="Recent Bookings">
              {!detail.recentBookings.length && <Empty>No bookings yet.</Empty>}
              {!!detail.recentBookings.length && (
                <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    {detail.recentBookings.map(b => (
                      <tr key={b.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{b.reference || b.id.slice(0, 8)}</td>
                        <td style={{ padding: '6px 8px' }}>{b.commodity}</td>
                        <td style={{ padding: '6px 8px' }}>{b.quantityTons}t</td>
                        <td style={{ padding: '6px 8px' }}>₨{Number(b.totalCost || 0).toLocaleString()}</td>
                        <td style={{ padding: '6px 8px' }}>{b.status}</td>
                        <td style={{ padding: '6px 8px' }}>{fmtDate(b.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </Section>
          )}

          {/* ── Clarifications ── */}
          {clar && (
            <Section title={`Clarification Thread (${clarifications.length})`}>
              {!!clarifications.length && (
                <ClarificationThread
                  clarifications={clarifications}
                  viewerRole="reviewer"
                  onRespond={async (cid, message, files) => { await apiRespondToClarification(cid, message, files); loadClarifications(clar); }}
                  onResolve={async (cid) => { try { await apiResolveClarification(cid); loadClarifications(clar); } catch (e) { alert(e.message); } }}
                />
              )}
              {!clarifications.length && <Empty>No information requests yet.</Empty>}
              <div style={{ marginTop: 8 }}><Btn variant="secondary" size="sm" onClick={requestInfo}>❓ Request more information</Btn></div>
            </Section>
          )}
        </div>
      )}
      {ask && <TextPromptModal {...ask} onClose={() => setAsk(null)} />}
    </Modal>
  );
}
