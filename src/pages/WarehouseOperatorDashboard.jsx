import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiGetWarehouseDashboard,
  apiAcceptBooking,
  apiCompleteBooking,
  apiGenerateInvoice,
  apiConfirmInvoicePayment,
  apiGetInvoice,
  apiRequestGateOut,
  apiGetGateOutPass,
  apiReleaseLien,
  apiGetOperatorInvoices,
  apiGetOperatorGateOutPasses,
  apiGetMyProviderClarifications,
  apiRespondToClarification,
} from '../lib/api';
import { Card, Btn, Tabs, Modal, LoadingState } from '../components/ui';
import TextPromptModal from '../components/ui/TextPromptModal';
import MediaManagerModal from '../components/MediaManager';
import T from '../theme';
import { RegisterWarehouseForm } from '../components/warehouse-operator/RegisterWarehouseForm';
import { EditWarehouseModal } from '../components/warehouse-operator/EditWarehouseModal';
import { RejectBookingModal } from '../components/warehouse-operator/RejectBookingModal';
import { IssueReceiptModal } from '../components/warehouse-operator/IssueReceiptModal';
import { BookingDetailModal } from '../components/warehouse-operator/BookingDetailModal';
import { OperatorList } from '../components/warehouse-operator/OperatorList';
import { OperatorOverviewTab } from '../components/warehouse-operator/OperatorOverviewTab';
import { OperatorListingTab } from '../components/warehouse-operator/OperatorListingTab';
import { OperatorReviewTab } from '../components/warehouse-operator/OperatorReviewTab';

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function WarehouseOperatorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [mediaOpen, setMediaOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState(null);
  const [rejectBooking, setRejectBooking] = useState(null);
  const [actionError, setActionError] = useState('');
  const [askClearance, setAskClearance] = useState(null); // booking awaiting a clearance reference
  const [actioningId, setActioningId] = useState(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [addingAnother, setAddingAnother] = useState(false);
  const [clarifications, setClarifications] = useState([]);
  const [detailBooking, setDetailBooking] = useState(null);

  const loadClarifications = () => {
    apiGetMyProviderClarifications('WAREHOUSE_PROFILE')
      .then(d => setClarifications(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  const handleRespondToClarification = async (id, message, files) => {
    await apiRespondToClarification(id, message, files);
    loadClarifications();
  };

  const load = (warehouseId) => {
    setLoading(true);
    apiGetWarehouseDashboard(warehouseId || selectedWarehouseId || undefined)
      .then(d => { setData(d); setSelectedWarehouseId(d.warehouse.id); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  // Switching which of the operator's warehouses is shown (NEW_Changes
  // item 10 — an operator can now run more than one). Passes the id
  // straight through rather than relying on state + a useEffect
  // dependency, so switching doesn't cost an extra redundant fetch.
  const switchWarehouse = (id) => load(id);

  useEffect(() => load(), []);
  useEffect(loadClarifications, []);

  const handleAccept = async (booking) => {
    setActionError('');
    setActioningId(booking.id);
    try {
      await apiAcceptBooking(booking.id);
      load();
    } catch (err) {
      setActionError(err.message || 'Could not accept this booking.');
    } finally {
      setActioningId(null);
    }
  };

  const handleComplete = async (booking) => {
    setActionError('');
    setActioningId(booking.id);
    try {
      await apiCompleteBooking(booking.id);
      load();
    } catch (err) {
      setActionError(err.message || 'Could not mark this booking complete.');
    } finally {
      setActioningId(null);
    }
  };

  // Generic wrapper for the document actions below — same busy/error
  // handling as accept/complete, then refresh so the row shows new state.
  const runDocAction = async (booking, fn, fallbackMsg) => {
    setActionError('');
    setActioningId(booking.id);
    try {
      await fn();
      load();
    } catch (err) {
      setActionError(err.message || fallbackMsg);
    } finally {
      setActioningId(null);
    }
  };

  const handleGenerateInvoice = (b) => runDocAction(b, () => apiGenerateInvoice(b.id), 'Could not generate the invoice.');
  const handleConfirmPayment = (b) => {
    const ref = window.prompt('Payment reference (bank transfer ID, cheque no., etc. — optional):', '');
    if (ref === null) return; // cancelled
    return runDocAction(b, () => apiConfirmInvoicePayment(b.invoice.id, ref || undefined), 'Could not confirm payment.');
  };
  // The bank sends the warehouse a release letter when the loan is cleared;
  // the operator records its reference here, which frees the goods.
  const handleRecordClearance = (b) => setAskClearance(b);
  const handleRequestGateOut = (b) => {
    if (!window.confirm('Request gate-out approval from the depositor for the full stored quantity?')) return;
    return runDocAction(b, () => apiRequestGateOut(b.id), 'Could not request gate-out.');
  };

  // Documents are private — fetch a fresh short-lived signed URL right
  // when the operator clicks, then open it, rather than keeping a
  // long-lived link in the page.
  const openDoc = async (fetcher, id) => {
    setActionError('');
    try {
      const doc = await fetcher(id);
      if (doc.downloadUrl) window.open(doc.downloadUrl, '_blank', 'noopener');
      else setActionError('This document has not been issued yet.');
    } catch (err) {
      setActionError(err.message || 'Could not open the document.');
    }
  };

  if (loading) {
    return <LoadingState label="Loading your warehouse dashboard…" />;
  }

  if (notFound || !data) {
    return (
      <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: T.bg, minHeight: '100vh', padding: '48px 20px' }}>
        <RegisterWarehouseForm onRegistered={load} />
      </div>
    );
  }

  const { warehouse, stats, recentBookings, warehouses = [] } = data;

  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: T.bg, minHeight: '100vh' }}>
      <div style={{ background: `linear-gradient(135deg,${T.green} 0%,${T.mid} 60%,${T.green} 100%)`, padding: '32px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🏭</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.bg }}>{warehouse.name}</h1>
              <p style={{ margin: '3px 0 0', color: T.mint, fontSize: 13 }}>{warehouse.city}, {warehouse.province} · {warehouse.isVerified ? '✓ Verified' : 'Pending verification'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="gold" size="sm" onClick={() => setMediaOpen(true)}>📷 Photos & Documents</Btn>
            <Btn variant="secondary" size="sm" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }} onClick={() => setEditOpen(true)}>✏️ Edit Details</Btn>
            <Btn variant="secondary" size="sm" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }} onClick={() => navigate(`/warehouse`)}>View Public Listing</Btn>
          </div>
        </div>

        {/* Warehouse picker — an operator can run more than one warehouse
            (NEW_Changes item 10), so switch between them here. */}
        {(
          <div style={{ maxWidth: 1000, margin: '18px auto 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {warehouses.map(w => (
              <button key={w.id} onClick={() => switchWarehouse(w.id)}
                style={{
                  padding: '6px 14px', borderRadius: 16, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${w.id === warehouse.id ? '#fff' : 'rgba(255,255,255,0.4)'}`,
                  background: w.id === warehouse.id ? '#fff' : 'transparent',
                  color: w.id === warehouse.id ? T.green : '#fff',
                }}>
                {w.name} · {w.city}
              </button>
            ))}
            <button onClick={() => setAddingAnother(true)}
              style={{ padding: '6px 14px', borderRadius: 16, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: '1.5px dashed rgba(255,255,255,0.6)', background: 'transparent', color: '#fff' }}>
              + Add Another Warehouse
            </button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            ['Total Bookings', stats.totalBookings],
            ['Active Receipts', stats.activeReceipts],
            ['Used Capacity', `${stats.usedCapacityTons.toLocaleString()}t`],
            ['Available', `${stats.availableCapacityTons.toLocaleString()}t`],
            ['Revenue', `₨${Number(stats.totalRevenue).toLocaleString()}`],
          ].map(([label, val]) => (
            <Card key={label} style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: T.green }}>{val}</div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, marginTop: 2 }}>{label.toUpperCase()}</div>
            </Card>
          ))}
        </div>

        <Tabs
          tabs={[
            ['overview', '📋 Bookings'],
            ['invoices', '🧾 Invoices'],
            ['gateout', '🚪 Gate-Out Passes'],
            ['listing', '🏭 Listing Details'],
            ['review', `🔍 Listing Review${clarifications.filter(c => c.status === 'OPEN').length ? ` (${clarifications.filter(c => c.status === 'OPEN').length})` : ''}`],
          ]}
          active={tab} onChange={setTab}
        />

        {tab === 'overview' && <OperatorOverviewTab setReceiptBooking={setReceiptBooking} setRejectBooking={setRejectBooking} actionError={actionError} actioningId={actioningId} setDetailBooking={setDetailBooking} handleAccept={handleAccept} handleComplete={handleComplete} handleGenerateInvoice={handleGenerateInvoice} handleConfirmPayment={handleConfirmPayment} handleRecordClearance={handleRecordClearance} handleRequestGateOut={handleRequestGateOut} openDoc={openDoc} recentBookings={recentBookings} />}

        {tab === 'invoices' && <OperatorList kind="invoices" fetcher={apiGetOperatorInvoices} onOpen={(row) => openDoc(apiGetInvoice, row.id)} error={actionError} />}
        {tab === 'gateout' && <OperatorList kind="gateout" fetcher={apiGetOperatorGateOutPasses} onOpen={(row) => openDoc(apiGetGateOutPass, row.id)} error={actionError} />}

        {tab === 'listing' && <OperatorListingTab setEditOpen={setEditOpen} warehouse={warehouse} />}

        {tab === 'review' && <OperatorReviewTab clarifications={clarifications} handleRespondToClarification={handleRespondToClarification} />}
      </div>

      {addingAnother && (
        <Modal title="Add Another Warehouse" onClose={() => setAddingAnother(false)} width={640}>
          <RegisterWarehouseForm onRegistered={() => { setAddingAnother(false); load(); }} />
        </Modal>
      )}

    {askClearance && (
      <TextPromptModal
        title="Record bank clearance"
        description={`${askClearance.receipt?.lien?.bankName || 'The bank'} has cleared the loan. Recording the reference frees the goods for gate-out and notifies the depositor.`}
        label="Bank's release letter / reference number"
        multiline={false}
        submitLabel="Record clearance"
        onClose={() => setAskClearance(null)}
        onSubmit={async (ref) => { await apiReleaseLien(askClearance.receipt.lien.id, ref); load(); }}
      />
    )}

      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          onAccept={async (b) => { setDetailBooking(null); await handleAccept(b); }}
          onDecline={(b) => { setDetailBooking(null); setRejectBooking(b); }}
        />
      )}

      {editOpen && (
        <EditWarehouseModal
          warehouse={warehouse}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); load(); }}
        />
      )}

      {mediaOpen && (
        <MediaManagerModal
          mode="listing" entityType="warehouse" entityId={warehouse.id}
          title="Warehouse Photos & Documents"
          onClose={() => setMediaOpen(false)}
        />
      )}

      {receiptBooking && (
        <IssueReceiptModal
          booking={receiptBooking}
          onClose={() => setReceiptBooking(null)}
          onIssued={() => { setReceiptBooking(null); load(); }}
        />
      )}

      {rejectBooking && (
        <RejectBookingModal
          booking={rejectBooking}
          onClose={() => setRejectBooking(null)}
          onRejected={() => { setRejectBooking(null); load(); }}
        />
      )}
    </div>
  );
}
