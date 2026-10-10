import { useState } from 'react';
import { apiSubmitKyc, apiGetKycDocumentSignedUrl, resolveApiFileUrl } from '../../lib/api';
import { Card, Badge, LoadingState } from '../ui';
import T from '../../theme';
import { fmtDate } from './shared';

export const DOC_LABELS = {
  cnicFront:            '🪪 CNIC — Front',
  cnicBack:             '🪪 CNIC — Back',
  companyRegistration:  '🏢 Company Registration',
  ntnDocument:          '🧾 NTN / Tax Document',
  businessLicense:      '📄 Business License',
  otherDocument:        '📎 Other Supporting Document',
};

export const DOC_STATUS = {
  pending:  { label: 'Pending Review', type: 'gold'  },
  approved: { label: 'Approved',       type: 'green' },
  rejected: { label: 'Rejected',       type: 'red'   },
};

export function docLabel(docType) {
  return DOC_LABELS[docType] || (docType || 'Document').replace(/_/g, ' ');
}

// ─── DOCUMENTS TAB ──────────────────────────────────────────────────────────
export const UPLOAD_TYPES = [
  ['cnicFront', 'CNIC — Front'], ['cnicBack', 'CNIC — Back'],
  ['ntnDocument', 'NTN / Tax Document'], ['companyRegistration', 'Company Registration'],
  ['businessLicense', 'Business License'], ['otherDocument', 'Other Supporting Document'],
];

export const MAX_UPLOAD_MB = 10;

export const DocumentUploadCard = ({ onUploaded }) => {
  const [docType, setDocType] = useState('ntnDocument');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  const submit = async () => {
    if (!file) { setMsg({ ok: false, text: 'Choose a file first.' }); return; }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) { setMsg({ ok: false, text: `File is larger than ${MAX_UPLOAD_MB} MB.` }); return; }
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append(docType, file);
      await apiSubmitKyc(fd);
      setFile(null);
      setMsg({ ok: true, text: 'Uploaded — it will appear below once processed and is now awaiting admin review.' });
      onUploaded?.();
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'Upload failed.' });
    } finally { setBusy(false); }
  };

  return (
    <Card style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.green, marginBottom: 10 }}>⬆️ Upload a document</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={docType} onChange={e => setDocType(e.target.value)}
          style={{ padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff' }}>
          {UPLOAD_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="file" accept="image/*,application/pdf" key={file ? 'f' : 'empty'}
          onChange={e => setFile(e.target.files?.[0] || null)} style={{ fontSize: 12, maxWidth: 240 }} />
        <button onClick={submit} disabled={busy || !file}
          style={{ background: T.green, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 12, fontWeight: 700, cursor: busy || !file ? 'not-allowed' : 'pointer', opacity: busy || !file ? 0.6 : 1, fontFamily: 'inherit' }}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 8 }}>PDF or image, up to {MAX_UPLOAD_MB} MB. Uploading again for the same type adds a new version for the reviewer.</div>
      {msg && <div style={{ fontSize: 12, marginTop: 8, color: msg.ok ? '#15803D' : T.danger }}>{msg.text}</div>}
    </Card>
  );
};

export const DocumentsTab = ({ documents, loading, onUploaded }) => {
  const openDocument = async (docId) => {
    // Same pattern as the admin document viewer: open the tab
    // synchronously (within the click's user-gesture context) so it
    // isn't blocked as a popup, then navigate it once the signed,
    // access-checked URL comes back.
    const tab = window.open('', '_blank');
    try {
      const { url } = await apiGetKycDocumentSignedUrl(docId);
      if (tab) tab.location.href = resolveApiFileUrl(url);
    } catch (e) {
      if (tab) tab.close();
      alert(e.message || 'Could not open document — please try again.');
    }
  };

  if (loading) return <LoadingState label="Loading documents…" />;
  return (
    <div>
    <DocumentUploadCard onUploaded={onUploaded} />
    {!documents.length && (
      <Card>
        <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No documents on file yet. Upload your CNIC, NTN or business documents above for verification.</p>
      </Card>
    )}
    <div style={{ display: 'grid', gap: 10 }}>
      {documents.map(doc => {
        const s = DOC_STATUS[doc.status] || DOC_STATUS.pending;
        return (
          <Card key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{docLabel(doc.docType)}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Uploaded {fmtDate(doc.createdAt)}</div>
              {doc.status === 'rejected' && doc.reviewNote && (
                <div style={{ fontSize: 11, color: T.danger, marginTop: 4 }}>Reason: {doc.reviewNote}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge label={s.label} type={s.type} />
              <button onClick={() => openDocument(doc.id)} style={{ fontSize: 11, fontWeight: 700, color: T.mid, background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                View →
              </button>
            </div>
          </Card>
        );
      })}
    </div>
    </div>
  );
};
