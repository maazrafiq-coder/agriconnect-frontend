import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiGetMyAgency, apiRegisterAgency, apiUpdateTestingStatus, apiSubmitTestingReport,
} from '../lib/api';
import { Card, Btn, Badge, Tabs, Modal } from '../components/ui';
import MediaManagerModal from '../components/MediaManager';
import T from '../theme';

const inputStyle = {
  width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`,
  borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, display: 'block', letterSpacing: '0.3px' };
const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan'];
const SERVICES = [
  'Moisture', 'Grain Size', 'Broken %', 'Whiteness Index', 'Milling Yield',
  'Purity Analysis', 'Full Panel', 'Export Certification', 'Contaminant Screen',
  'Heavy Metals', 'Aflatoxin',
];
const STATUS_FLOW = ['REQUESTED', 'ASSIGNED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED'];
const STATUS_BADGE = {
  REQUESTED: 'gold', ASSIGNED: 'blue', SAMPLE_COLLECTED: 'blue',
  IN_PROGRESS: 'blue', COMPLETED: 'green', CANCELLED: 'red',
};
const statusLabel = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ─── REGISTER FORM ───────────────────────────────────────────────────────────
function RegisterAgencyForm({ onRegistered }) {
  const [form, setForm] = useState({
    name: '', city: '', province: 'Punjab', services: [],
    basePrice: '', turnaroundHours: '48', accreditations: '', coverageAreas: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleService = (s) => {
    setForm(f => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter(x => x !== s) : [...f.services, s],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.city) return setError('Name and city are required.');
    if (!form.services.length) return setError('Select at least one testing service you offer.');
    if (!form.basePrice) return setError('Base price is required.');

    setBusy(true);
    try {
      await apiRegisterAgency({
        name: form.name, city: form.city, province: form.province, services: form.services,
        basePrice: Number(form.basePrice), turnaroundHours: Number(form.turnaroundHours),
        accreditations: form.accreditations.split(',').map(s => s.trim()).filter(Boolean),
        coverageAreas: form.coverageAreas.split(',').map(s => s.trim()).filter(Boolean),
      });
      onRegistered();
    } catch (err) {
      setError(err.message || 'Could not register your lab.');
      setBusy(false);
    }
  };

  return (
    <Card style={{ maxWidth: 560, margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: T.green }}>List Your Testing Lab</h3>
      <p style={{ margin: '0 0 20px', fontSize: 12.5, color: T.muted }}>
        Set up your lab's listing once — buyers and sellers will be able to book tests with you from the marketplace.
      </p>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>LAB / AGENCY NAME</label>
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Punjab Food Authority Lab" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>CITY</label>
            <input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Lahore" />
          </div>
          <div>
            <label style={labelStyle}>PROVINCE</label>
            <select style={inputStyle} value={form.province} onChange={e => set('province', e.target.value)}>
              {PROVINCES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>SERVICES OFFERED</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SERVICES.map(s => (
              <button type="button" key={s} onClick={() => toggleService(s)}
                style={{
                  padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1.5px solid ${form.services.includes(s) ? T.mid : T.border}`,
                  background: form.services.includes(s) ? '#EFFDF5' : '#fff',
                  color: form.services.includes(s) ? T.mid : T.muted,
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>BASE PRICE (₨)</label>
            <input type="number" min="0" style={inputStyle} value={form.basePrice} onChange={e => set('basePrice', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>TURNAROUND (HOURS)</label>
            <input type="number" min="1" style={inputStyle} value={form.turnaroundHours} onChange={e => set('turnaroundHours', e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>ACCREDITATIONS (COMMA-SEPARATED, OPTIONAL)</label>
          <input style={inputStyle} value={form.accreditations} onChange={e => set('accreditations', e.target.value)} placeholder="ISO 17025, PNAC Accredited" />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>COVERAGE AREAS (COMMA-SEPARATED, OPTIONAL)</label>
          <input style={inputStyle} value={form.coverageAreas} onChange={e => set('coverageAreas', e.target.value)} placeholder="Lahore, Sheikhupura, Gujranwala" />
        </div>
        {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
        <Btn variant="primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Registering…' : 'Register Lab'}</Btn>
      </form>
    </Card>
  );
}

// ─── SUBMIT REPORT MODAL ─────────────────────────────────────────────────────
function SubmitReportModal({ request, onClose, onSubmitted }) {
  const [reportUrl, setReportUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!reportUrl) return setError('Provide a link to the report file.');
    setBusy(true);
    try {
      await apiSubmitTestingReport(request.id, { reportUrl, reportData: notes ? { notes } : undefined });
      onSubmitted();
    } catch (err) {
      setError(err.message || 'Could not submit report.');
      setBusy(false);
    }
  };

  return (
    <Modal title="Submit Test Report" onClose={onClose}>
      <p style={{ fontSize: 12.5, color: T.muted, marginBottom: 16 }}>
        {request.servicesRequested?.join(', ')} for {request.requester?.profile?.fullName || 'requester'}
      </p>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>REPORT FILE URL</label>
        <input style={inputStyle} value={reportUrl} onChange={e => setReportUrl(e.target.value)} placeholder="https://…" />
        <p style={{ fontSize: 10.5, color: T.muted, marginTop: 4 }}>
          Upload the report as a document under "Photos & Documents" first, then paste its link here.
        </p>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>NOTES (OPTIONAL)</label>
        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      {error && <p style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="ghost" onClick={onClose} disabled={busy} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant="primary" onClick={submit} disabled={busy} style={{ flex: 1 }}>{busy ? 'Submitting…' : 'Submit & Complete'}</Btn>
      </div>
    </Modal>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function TestingAgencyDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [reportRequest, setReportRequest] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    apiGetMyAgency()
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const advanceStatus = async (req) => {
    const idx = STATUS_FLOW.indexOf(req.status);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return;
    if (next === 'COMPLETED') { setReportRequest(req); return; }
    setBusyId(req.id);
    try {
      await apiUpdateTestingStatus(req.id, next);
      load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: T.muted, fontFamily: 'Inter,sans-serif' }}>Loading your lab dashboard…</div>;
  }

  if (notFound || !data) {
    return (
      <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: T.bg, minHeight: '100vh', padding: '48px 20px' }}>
        <RegisterAgencyForm onRegistered={load} />
      </div>
    );
  }

  const { agency, stats, recentRequests } = data;

  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: T.bg, minHeight: '100vh' }}>
      <div style={{ background: `linear-gradient(135deg,${T.green} 0%,${T.mid} 60%,${T.green} 100%)`, padding: '32px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🧪</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.bg }}>{agency.name}</h1>
              <p style={{ margin: '3px 0 0', color: T.mint, fontSize: 13 }}>{agency.city}, {agency.province} · {agency.isVerified ? '✓ Verified' : 'Pending verification'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="gold" size="sm" onClick={() => setMediaOpen(true)}>📷 Photos & Documents</Btn>
            <Btn variant="secondary" size="sm" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }} onClick={() => navigate('/testing')}>View Public Listing</Btn>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            ['Total Requests', stats.totalRequests],
            ['Pending / In Progress', stats.pendingRequests],
            ['Completed', stats.completedRequests],
            ['Rating', agency.reviewCount ? `★ ${agency.rating}` : '—'],
          ].map(([label, val]) => (
            <Card key={label} style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: T.green }}>{val}</div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, marginTop: 2 }}>{label.toUpperCase()}</div>
            </Card>
          ))}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 800, color: T.green, marginBottom: 12 }}>Incoming Requests</h3>
        {recentRequests.length === 0 ? (
          <Card><p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No test requests yet — they'll show up here once a buyer or seller books your lab.</p></Card>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {recentRequests.map(r => {
              const idx = STATUS_FLOW.indexOf(r.status);
              const nextLabel = idx >= 0 && idx < STATUS_FLOW.length - 1
                ? (STATUS_FLOW[idx + 1] === 'COMPLETED' ? 'Submit Report' : `Mark ${statusLabel(STATUS_FLOW[idx + 1])}`)
                : null;
              return (
                <Card key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{(r.servicesRequested || []).join(', ')}</div>
                    <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                      {r.requester?.profile?.fullName || 'Requester'} · {r.requester?.profile?.city || ''} · ₨{Number(r.fee).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge label={statusLabel(r.status)} type={STATUS_BADGE[r.status] || 'gray'} />
                    {nextLabel && r.status !== 'CANCELLED' && (
                      <Btn variant="secondary" size="sm" disabled={busyId === r.id} onClick={() => advanceStatus(r)}>
                        {busyId === r.id ? '…' : nextLabel}
                      </Btn>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {mediaOpen && (
        <MediaManagerModal
          mode="listing" entityType="testing_agency" entityId={agency.id}
          title="Lab Photos & Documents"
          onClose={() => setMediaOpen(false)}
        />
      )}

      {reportRequest && (
        <SubmitReportModal
          request={reportRequest}
          onClose={() => setReportRequest(null)}
          onSubmitted={() => { setReportRequest(null); load(); }}
        />
      )}
    </div>
  );
}
