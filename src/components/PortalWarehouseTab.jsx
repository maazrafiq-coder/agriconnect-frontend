import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGetMyBookings, apiGetMyReceipts } from '../lib/api';
import { adaptBookings, adaptReceipts } from '../lib/adapters';
import { Card, Btn, LoadingState, ErrorState, EmptyState } from './ui';
import { STATUS_COLORS as SC } from '../data';
import T from '../theme';

const money = n => `₨${Number(n || 0).toLocaleString()}`;

// "Warehouse" tab shared by the Seller and Buyer portals. Shows the user's
// real storage requests/bookings and receipts, fetched fresh each time the
// tab mounts, so a booking made a moment ago is already here.
export default function PortalWarehouseTab({ accent = T.green }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [state, setState] = useState('loading');

  const load = () => {
    setState('loading');
    Promise.all([apiGetMyBookings(), apiGetMyReceipts()])
      .then(([b, r]) => {
        setBookings(adaptBookings(Array.isArray(b) ? b : []));
        setReceipts(adaptReceipts(Array.isArray(r) ? r : []));
        setState('ready');
      })
      .catch(() => setState('error'));
  };
  useEffect(load, []);

  const activeReceipts = receipts.filter(r => r.status !== 'released');
  const underLien = receipts.filter(r => r.status === 'lien');
  const stats = [
    [bookings.filter(b => ['requested', 'accepted', 'active'].includes(b.status)).length, 'Open Bookings', T.warn],
    [activeReceipts.length, 'Active Receipts', T.green],
    [underLien.length, 'Under Bank Lien', '#B45309'],
    [money(activeReceipts.reduce((s, r) => s + (r.currentValue || 0), 0)), 'Stored Value', T.gold],
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: accent }}>🏪 My Warehouse Activity</h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>Your storage requests, bookings and warehouse receipts</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" size="sm" onClick={load}>↻ Refresh</Btn>
          <Btn variant="gold" size="sm" onClick={() => navigate('/warehouse')}>+ Book Storage</Btn>
        </div>
      </div>

      {state === 'loading' && <LoadingState label="Loading warehouse activity…" />}
      {state === 'error' && <ErrorState message="Could not load your warehouse activity." onRetry={load} />}

      {state === 'ready' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12, marginBottom: 22 }}>
            {stats.map(([val, label, color]) => (
              <Card key={label} style={{ padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color, marginBottom: 4 }}>{val}</div>
                <div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>{label}</div>
              </Card>
            ))}
          </div>

          <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: T.green }}>Bookings & Requests ({bookings.length})</h4>
          {bookings.length === 0 && <EmptyState icon="📋" title="No storage requests yet" subtitle="Book storage from the Warehouse page and your requests will show up here." />}
          {bookings.map(b => {
            const sc = SC[b.status] || { bg: '#F3F4F6', c: '#6B7280', l: b.status };
            return (
              <Card key={b.id} style={{ marginBottom: 10, borderLeft: `4px solid ${b.lien ? T.warn : accent}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: T.muted }}>{b.reference}</span>
                      <span style={{ background: sc.bg, color: sc.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{sc.l}</span>
                      {b.lien && <span style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>{b.lien.status === 'pending' ? '⏳ Loan application pending' : '🏦 Under bank lien'}</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{b.commodity}{b.variety ? ` · ${b.variety}` : ''} — {b.qty} tons</div>
                    <div style={{ fontSize: 12, color: T.muted }}>📍 {b.warehouseName}{b.warehouseCity ? `, ${b.warehouseCity}` : ''} · {money(b.totalCost)}</div>
                    {b.lien && <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600, marginTop: 2 }}>{b.lien.status === 'pending' ? 'Loan application' : 'Collateral for'} {b.lien.bank} — {money(b.lien.amount)}</div>}
                  </div>
                  <Btn variant="secondary" size="sm" onClick={() => navigate('/warehouse')}>Manage →</Btn>
                </div>
              </Card>
            );
          })}

          <h4 style={{ margin: '22px 0 10px', fontSize: 13, fontWeight: 800, color: T.green }}>Warehouse Receipts ({receipts.length})</h4>
          {receipts.length === 0 && <EmptyState icon="📄" title="No receipts yet" subtitle="A receipt is issued once the warehouse receives your goods." />}
          {receipts.map(r => (
            <Card key={r.id} style={{ marginBottom: 10, borderLeft: `4px solid ${r.status === 'lien' ? T.warn : T.teal}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.commodity} — {r.qty} tons</div>
                  <div style={{ fontSize: 12, color: T.muted }}>📍 {r.warehouseName} · Value: <strong style={{ color: T.goldText }}>{money(r.currentValue)}</strong></div>
                  {r.lien && ['active', 'pending'].includes(r.lien.status) && <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600, marginTop: 2 }}>{r.lien.status === 'pending' ? '⏳ Application pending' : '🏦 Lien'}: {r.lien.bank} — {money(r.lien.amount)}</div>}
                  {r.insurance && <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 2 }}>🛡️ Insured by {r.insurance.provider}</div>}
                </div>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  <span style={{ background: r.status === 'lien' ? '#FEF3C7' : r.status === 'released' ? '#F3F4F6' : '#DCFCE7', color: r.status === 'lien' ? T.warn : r.status === 'released' ? T.muted : T.teal, padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                    {r.status === 'lien' ? '🏦 Bank Lien' : r.status === 'released' ? 'Released' : '✅ Active'}
                  </span>
                  <Btn variant="secondary" size="sm" onClick={() => navigate('/warehouse')}>View</Btn>
                </div>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
