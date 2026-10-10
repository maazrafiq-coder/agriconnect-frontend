import { useState, useMemo, useEffect } from 'react';
import T from '../theme';
import { apiGetWarehouses, apiGetMyReceipts, apiWithdrawLien, apiGetMyBookings, apiApproveGateOut, apiRejectGateOut } from '../lib/api';
import { adaptWarehouses, adaptReceipts, adaptBookings } from '../lib/adapters';
import { useAuth } from '../context/AuthContext';
import BookingThread from '../components/BookingThread';
import { amber, Modal, TabBar } from '../components/warehouse/shared';
import { ReceiptDetailModal } from '../components/warehouse/ReceiptDetailModal';
import { BankLienModal } from '../components/warehouse/BankLienModal';
import { InsuranceModal } from '../components/warehouse/InsuranceModal';
import { CancelBookingModal } from '../components/warehouse/CancelBookingModal';
import { BookingModal } from '../components/warehouse/BookingModal';
import { WarehouseDetailModal } from '../components/warehouse/WarehouseDetailModal';
import { BrowseTab } from '../components/warehouse/BrowseTab';
import { BookingsTab } from '../components/warehouse/BookingsTab';
import { ReceiptsTab } from '../components/warehouse/ReceiptsTab';
import { HowItWorksTab } from '../components/warehouse/HowItWorksTab';

// ─── MAIN MODULE ──────────────────────────────────────────────────────────────
export default function WarehouseModule() {
  const { user, openLogin } = useAuth();
  const [tab, setTab] = useState('browse');
  const [WAREHOUSES, setWAREHOUSES] = useState([]);
  const [warehousesState, setWarehousesState] = useState('loading'); // loading | ready | error
  const [MY_RECEIPTS, setMY_RECEIPTS] = useState([]);
  const [receiptsState, setReceiptsState] = useState('loading'); // loading | ready | error | guest
  const [MY_BOOKINGS, setMY_BOOKINGS] = useState([]);
  const [bookingsState, setBookingsState] = useState('loading'); // loading | ready | error | guest

  const loadWarehouses = () => {
    setWarehousesState('loading');
    apiGetWarehouses()
      .then(data => { setWAREHOUSES(adaptWarehouses(Array.isArray(data) ? data : [])); setWarehousesState('ready'); })
      .catch(() => {
        setWarehousesState('error');
      });
  };

  const loadReceipts = () => {
    if (!user) { setReceiptsState('guest'); setMY_RECEIPTS([]); return; }
    setReceiptsState('loading');
    apiGetMyReceipts()
      .then(data => { setMY_RECEIPTS(adaptReceipts(Array.isArray(data) ? data : [])); setReceiptsState('ready'); })
      .catch(() => {
        setReceiptsState('error');
      });
  };

  // Depositor-side paperwork actions (NEW_Changes item 10). Documents are
  // private, so a fresh short-lived signed URL is fetched on click.
  const [threadBooking, setThreadBooking] = useState(null);
  const [docError, setDocError] = useState('');
  const [docBusyId, setDocBusyId] = useState(null);
  const openDoc = async (fetcher, id) => {
    setDocError('');
    try {
      const doc = await fetcher(id);
      if (doc.downloadUrl) window.open(doc.downloadUrl, '_blank', 'noopener');
      else setDocError('This document has not been issued yet.');
    } catch (e) { setDocError(e.message || 'Could not open the document.'); }
  };
  const decideGateOut = async (bookingId, passId, approve) => {
    let note;
    if (!approve) {
      note = window.prompt('Reason for rejecting this release (optional):', '');
      if (note === null) return;
    } else if (!window.confirm('Approve release of your goods? A Gate Out Pass will be issued.')) return;
    setDocError(''); setDocBusyId(bookingId);
    try {
      if (approve) await apiApproveGateOut(passId); else await apiRejectGateOut(passId, note || undefined);
      loadBookings();
    } catch (e) { setDocError(e.message || 'Could not update the gate-out request.'); }
    finally { setDocBusyId(null); }
  };

  const loadBookings = () => {
    if (!user) { setBookingsState('guest'); setMY_BOOKINGS([]); return; }
    setBookingsState('loading');
    apiGetMyBookings()
      .then(data => { setMY_BOOKINGS(adaptBookings(Array.isArray(data) ? data : [])); setBookingsState('ready'); })
      .catch(() => setBookingsState('error'));
  };

  useEffect(() => { loadWarehouses(); loadReceipts(); loadBookings(); }, [user]);
  const [filter, setFilter] = useState({ type:'All', province:'All', commodity:'All', search:'' });
  const [bookingWarehouse, setBookingWarehouse] = useState(null);
  const [viewWarehouse, setViewWarehouse] = useState(null);
  const [viewReceipt, setViewReceipt] = useState(null);
  const [lienReceipt, setLienReceipt] = useState(null);
  const [insureReceipt, setInsureReceipt] = useState(null);
  const [cancelBookingTarget, setCancelBookingTarget] = useState(null);

  // Guests must not be able to reach the booking / lien / insurance forms at
  // all — trying to submit and only then discovering the request 401'd is a
  // worse experience than being asked to log in up front. The backend
  // (JwtAuthGuard on POST /warehouse/book, /lien/apply, /insurance/buy)
  // remains the real enforcement point; this is just so guests aren't led
  // through a form only to hit an auth wall at the very end.
  const requireAuth = (fn) => (...args) => {
    if (!user) { openLogin(); return; }
    fn(...args);
  };
  const handleBook = requireAuth(setBookingWarehouse);
  const handlePlaceLien = requireAuth(setLienReceipt);
  const handleBuyInsurance = requireAuth(setInsureReceipt);

  const filtered = useMemo(() => {
    let r = [...WAREHOUSES];
    if (filter.type!=='All') r=r.filter(w=>w.type===filter.type);
    if (filter.province!=='All') r=r.filter(w=>w.province===filter.province);
    if (filter.commodity!=='All') r=r.filter(w=>w.commodities.includes(filter.commodity));
    if (filter.search) r=r.filter(w=>w.name.toLowerCase().includes(filter.search.toLowerCase())||w.city.toLowerCase().includes(filter.search.toLowerCase()));
    return r;
  // WAREHOUSES was missing here: warehouses load asynchronously (state
  // starts as []), and useMemo only recomputes when a *dependency*
  // changes — not on every render — so the list stayed frozen at "no
  // results" until something touched `filter` (e.g. pressing "Clear"),
  // even though the real data had already arrived.
  }, [filter, WAREHOUSES]);

  const stats = [
    ['🏪', 'Total Warehouses', WAREHOUSES.length, T.green],
    ['📦', 'Total Capacity', `${(WAREHOUSES.reduce((s,w)=>s+w.capacity,0)/1000).toFixed(0)}K tons`, T.mid],
    ['✅', 'Available Now', `${(WAREHOUSES.reduce((s,w)=>s+w.available,0)/1000).toFixed(1)}K tons`, T.teal],
    ['📄', 'My Receipts', MY_RECEIPTS.length, amber],
    ['🏦', 'Under Lien', MY_RECEIPTS.filter(r=>r.lien?.status==='active').length, T.warn],
    ['🛡️', 'Insured Lots', MY_RECEIPTS.filter(r=>r.insurance).length, '#7C3AED'],
  ];

  return (
    <div style={{fontFamily:"Inter,system-ui,sans-serif",background:T.bg,minHeight:'100vh'}}>
      {/* PAGE HEADER */}
      <div style={{background:`linear-gradient(135deg,${T.green} 0%,${T.mid} 60%,${T.green} 100%)`,padding:'32px 24px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(45deg,transparent,transparent 30px,rgba(183,160,90,0.05) 30px,rgba(183,160,90,0.05) 60px)'}}/>
        <div style={{maxWidth:1100,margin:'0 auto',position:'relative'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
            <span style={{fontSize:28}}>🏪</span>
            <div>
              <h1 style={{margin:0,fontSize:24,fontWeight:900,color:T.bg,letterSpacing:'-0.5px'}}>Warehouse & Storage Module</h1>
              <p style={{margin:'3px 0 0',color:T.mint,fontSize:13}}>Book storage · Get Digital Warehouse Receipts · Apply for Bank Loans · Buy Insurance</p>
            </div>
          </div>
        </div>
      </div>

      {/* STATS STRIP */}
      <div style={{background:T.gold,padding:'12px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-around',flexWrap:'wrap',gap:8}}>
          {stats.map(([icon,label,val,color])=>(
            <div key={label} style={{textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:900,color:T.green}}>{icon} {val}</div>
              <div style={{fontSize:10,fontWeight:700,color:`${T.green}bb`,letterSpacing:0.3}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'28px 20px'}}>
        <TabBar
          tabs={[['browse','🏪 Browse Warehouses'],['bookings','📋 My Bookings ('+MY_BOOKINGS.length+')'],['receipts','📄 My Receipts ('+MY_RECEIPTS.length+')'],['howItWorks','💡 How It Works']]}
          active={tab} onChange={setTab}
        />

        {/* BROWSE TAB */}
        {tab==='browse' && <BrowseTab warehousesState={warehousesState} loadWarehouses={loadWarehouses} filter={filter} setFilter={setFilter} setViewWarehouse={setViewWarehouse} handleBook={handleBook} filtered={filtered} />}

        {/* MY BOOKINGS TAB */}
        {tab==='bookings' && <BookingsTab openLogin={openLogin} MY_BOOKINGS={MY_BOOKINGS} bookingsState={bookingsState} setThreadBooking={setThreadBooking} docError={docError} docBusyId={docBusyId} openDoc={openDoc} decideGateOut={decideGateOut} loadBookings={loadBookings} setCancelBookingTarget={setCancelBookingTarget} />}

        {/* RECEIPTS TAB */}
        {tab==='receipts' && <ReceiptsTab openLogin={openLogin} setTab={setTab} MY_RECEIPTS={MY_RECEIPTS} receiptsState={receiptsState} loadReceipts={loadReceipts} setViewReceipt={setViewReceipt} />}

        {/* HOW IT WORKS TAB */}
        {tab==='howItWorks' && <HowItWorksTab />}
      </div>

      {/* MODALS */}
      {bookingWarehouse && <BookingModal warehouse={bookingWarehouse} onClose={()=>setBookingWarehouse(null)}/>}
      {viewWarehouse && <WarehouseDetailModal w={viewWarehouse} onClose={()=>setViewWarehouse(null)} onBook={w=>{setViewWarehouse(null);handleBook(w);}}/>}
      {viewReceipt && (
        <ReceiptDetailModal
          receipt={viewReceipt}
          onClose={()=>setViewReceipt(null)}
          onPlaceLien={r=>{setViewReceipt(null);handlePlaceLien(r);}}
          onWithdrawLien={async r=>{
            if(!window.confirm('Withdraw this loan application? Your goods will no longer be on hold.')) return;
            try { await apiWithdrawLien(r.lien.id); setViewReceipt(null); loadReceipts(); loadBookings(); }
            catch(e){ alert(e?.message || 'Could not withdraw the application.'); }
          }}
          onBuyInsurance={r=>{setViewReceipt(null);handleBuyInsurance(r);}}
        />
      )}
      {lienReceipt && <BankLienModal receipt={lienReceipt} onClose={()=>{setLienReceipt(null); loadReceipts(); loadBookings();}}/>}
      {insureReceipt && <InsuranceModal receipt={insureReceipt} onClose={()=>setInsureReceipt(null)}/>}
      {threadBooking && (
        <Modal title={`Messages — ${threadBooking.reference || threadBooking.warehouseName}`} onClose={()=>{setThreadBooking(null); loadBookings();}} width={560}>
          <div style={{fontSize:12,color:T.muted,marginBottom:10}}>{threadBooking.warehouseName} · {threadBooking.commodity} — {threadBooking.qty} tons</div>
          <BookingThread bookingId={threadBooking.id} closed={['rejected','cancelled'].includes(threadBooking.status)} />
        </Modal>
      )}
      {cancelBookingTarget && (
        <CancelBookingModal
          booking={cancelBookingTarget}
          onClose={()=>setCancelBookingTarget(null)}
          onCancelled={()=>{ setCancelBookingTarget(null); loadBookings(); loadWarehouses(); }}
        />
      )}
    </div>
  );
}
