import { useState, useMemo } from "react";
import T from "../theme";
import { useEffect } from "react";
import { apiGetWarehouses, apiBookStorage, apiGetMyReceipts, apiApplyLien, apiBuyInsurance, apiGetMyBookings, apiCancelBooking, apiGetInvoice, apiGetGrn, apiGetGateOutPass, apiApproveGateOut, apiRejectGateOut } from "../lib/api";
import { adaptWarehouses, adaptReceipts, adaptBookings, toBookingRequest } from "../lib/adapters";
import { STATUS_COLORS } from "../data";
import { isDemoMode } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import BookingThread from "../components/BookingThread";

// Demo/sample data is only ever shown when explicitly enabled — never as a
// silent substitute for a failed API call. See P0 #10 (misleading mock
// fallbacks) in the fix backlog.

// Inline error banner used inside action modals (booking, lien, insurance)
// so a failed request is always visible to the user instead of silently
// proceeding to a fake success screen.
const ErrorBanner = ({ message, onLogin }) => {
  if (!message) return null;
  const isAuthError = /unauthor/i.test(message) || /log ?in/i.test(message);
  return (
    <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'10px 12px',marginBottom:14,fontSize:12,color:'#B91C1C',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
      <span>⚠ {isAuthError ? 'Please log in to continue — your session has expired or you are not signed in.' : message}</span>
      {isAuthError && onLogin && (
        <button onClick={onLogin} style={{background:'#B91C1C',color:'#fff',border:'none',borderRadius:6,padding:'5px 10px',fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>Log In</button>
      )}
    </div>
  );
};

// Colors from theme.js + extras
const amber = '#B45309';
const purple = '#7C3AED';

// ─── DATA ─────────────────────────────────────────────────────────────────────
const MOCK_WAREHOUSES = [
  { id:1, name:'Punjab Cold Chain Hub', type:'Cold Storage', city:'Sheikhupura', province:'Punjab', capacity:5000, available:1800, unit:'tons', pricePerTon:850, minDuration:7, commodities:['Rice','Wheat','Maize','Vegetables','Fruits'], certifications:['PSQCA Certified','ISO 22000','Halal Certified'], rating:4.8, reviews:142, manager:'Malik Irfan', phone:'0300-1234567', established:2018, features:['Temperature Control (0–8°C)','Humidity Control','24/7 CCTV','Fire Suppression','Pest Control','Armed Security'], bankPartners:['HBL','MCB','Bank Alfalah'], insuranceAvailable:true, gps:'31.7167° N, 73.9850° E', desc:'State-of-the-art cold chain facility with international standards. Strategically located near Sheikhupura motorway interchange for easy access from all major highways.' },
  { id:2, name:'Gujranwala Grain Silos', type:'Dry Storage', city:'Gujranwala', province:'Punjab', capacity:12000, available:4200, unit:'tons', pricePerTon:420, minDuration:30, commodities:['Rice','Wheat','Paddy','Maize','Pulses'], certifications:['PASSCO Registered','Punjab Govt. Approved'], rating:4.6, reviews:89, manager:'Ch. Naveed', phone:'0321-9876543', established:2015, features:['Hermetic Sealing','Fumigation','Moisture Monitoring','Weighbridge','Loading Dock x8','Rail Access'], bankPartners:['NBP','UBL','ZTBL'], insuranceAvailable:true, gps:'32.1877° N, 74.1945° E', desc:'Large-capacity grain storage facility with modern silos and excellent connectivity. Preferred partner of PASSCO for strategic grain reserves.' },
  { id:3, name:'Karachi Port Logistics Centre', type:'Dry Storage', city:'Karachi', province:'Sindh', capacity:8000, available:2100, unit:'tons', pricePerTon:650, minDuration:14, commodities:['Rice','Cotton','Sugar','Wheat','Oil Seeds'], certifications:['KPT Approved','Customs Bonded Warehouse','AQIS Certified'], rating:4.7, reviews:213, manager:'Rashid Mehmood', phone:'0333-5551234', established:2012, features:['Customs Bonded','Port Proximity 8km','Container Stuffing','Export Documentation','Fumigation Chamber','Weighbridge'], bankPartners:['HBL','MCB','Bank Alfalah','Meezan Bank'], insuranceAvailable:true, gps:'24.8607° N, 67.0011° E', desc:'Premium export-oriented warehouse with customs bonded status. Direct access to port makes it ideal for exporters. Container stuffing and fumigation on-site.' },
  { id:4, name:'Multan Agri Storage', type:'Dry Storage', city:'Multan', province:'Punjab', capacity:3500, available:900, unit:'tons', pricePerTon:380, minDuration:14, commodities:['Wheat','Cotton','Maize','Pulses','Oil Seeds'], certifications:['Punjab Govt. Approved'], rating:4.3, reviews:56, manager:'Tariq Husain', phone:'0311-2223344', established:2019, features:['Moisture Monitoring','Pest Control','CCTV','Weighbridge','Loading Dock x4'], bankPartners:['NBP','ZTBL'], insuranceAvailable:false, gps:'30.1979° N, 71.4711° E', desc:'Well-managed dry storage facility in Multan, serving the cotton and wheat belt of South Punjab. Competitive pricing with reliable security.' },
  { id:5, name:'Faisalabad Textile & Agri Hub', type:'Dry Storage', city:'Faisalabad', province:'Punjab', capacity:6000, available:3100, unit:'tons', pricePerTon:470, minDuration:7, commodities:['Cotton','Wheat','Rice','Maize','Pulses','Oil Seeds'], certifications:['PSQCA Certified','ISO 9001'], rating:4.5, reviews:78, manager:'Imran Butt', phone:'0300-8889900', established:2016, features:['Climate Monitoring','Pest Control','24/7 Security','Weighbridge','Dual-access Loading','Segregated Bays'], bankPartners:['HBL','UBL','MCB'], insuranceAvailable:true, gps:'31.4504° N, 73.1350° E', desc:'Centrally located in Faisalabad industrial zone with excellent connectivity to mills and processing units. Separate bays for different commodities.' },
];

const MOCK_RECEIPTS = [
  { id:'WR-2025-0041', warehouseName:'Punjab Cold Chain Hub', warehouseCity:'Sheikhupura', commodity:'1121 Basmati', variety:'1121 Basmati', qty:120, unit:'tons', entryDate:'2025-05-10', expiryDate:'2025-08-10', status:'active', quality:{ moisture:12.5, broken:2.1, purity:98.5 }, owner:'Khan Rice Mills', currentValue:4560000, lien:null, insurance:{ provider:'Jubilee Insurance', coverage:5000000, expiry:'2025-08-10', policy:'JI-AGR-2025-8821' } },
  { id:'WR-2025-0039', warehouseName:'Gujranwala Grain Silos', warehouseCity:'Gujranwala', commodity:'Wheat', variety:'Chakwal-50', qty:250, unit:'tons', entryDate:'2025-04-20', expiryDate:'2025-10-20', status:'lien', quality:{ moisture:11.0, broken:1.5, purity:99.0 }, owner:'Khan Rice Mills', currentValue:6250000, lien:{ bank:'National Bank of Pakistan', amount:4000000, placed:'2025-04-25', officer:'Mr. Ali Hassan', contact:'051-111-627-627', status:'active', releaseDate:null }, insurance:{ provider:'State Life', coverage:7000000, expiry:'2025-10-20', policy:'SL-CROP-2025-0441' } },
  { id:'WR-2025-0055', warehouseName:'Faisalabad Textile & Agri Hub', warehouseCity:'Faisalabad', commodity:'Maize', variety:'Pioneer 30Y87', qty:80, unit:'tons', entryDate:'2025-06-01', expiryDate:'2025-09-01', status:'released', quality:{ moisture:13.0, broken:3.0, purity:97.5 }, owner:'Khan Rice Mills', currentValue:1600000, lien:null, insurance:null },
];

const INSURANCE_PLANS = [
  { id:1, provider:'Jubilee Insurance', plan:'Comprehensive Agri Cover', coverage:'Fire, Theft, Flood, Spoilage, Pest Damage', premium:'0.8% of declared value / year', minCover:500000, rating:4.7, claimTime:'15 working days', features:['24/7 Helpline','On-site Surveyor','Digital Claim Filing','Urdu Support'] },
  { id:2, provider:'State Life Insurance', plan:'Crop Storage Shield', coverage:'Fire, Theft, Flood, Quality Deterioration', premium:'0.65% of declared value / year', minCover:1000000, rating:4.5, claimTime:'21 working days', features:['Govt. Backed','Low Premium','Wide Coverage','Branch Network'] },
  { id:3, provider:'EFU General', plan:'Warehouse All-Risk', coverage:'All risks including transit, loading/unloading', premium:'1.1% of declared value / year', minCover:300000, rating:4.6, claimTime:'10 working days', features:['All-Risk Cover','Fast Claims','Transit Cover Included','International Standards'] },
];

// ─── UTILITIES ─────────────────────────────────────────────────────────────────
const Btn = ({ children, variant='primary', size='md', onClick, style={}, disabled=false }) => {
  const vs = { primary:{bg:T.green,color:'#fff',border:T.green}, secondary:{bg:'transparent',color:T.green,border:T.green}, gold:{bg:T.gold,color:T.green,border:T.gold}, ghost:{bg:'transparent',color:T.muted,border:T.border}, danger:{bg:T.danger,color:'#fff',border:T.danger}, cyan:{bg:T.cyan,color:'#fff',border:T.cyan}, amber:{bg:'#92400E',color:'#fff',border:'#92400E'}, purple:{bg:purple,color:'#fff',border:purple}, teal:{bg:T.teal,color:'#fff',border:T.teal} };
  const sz = { sm:'5px 11px', md:'9px 18px', lg:'12px 26px' };
  const v = vs[variant]||vs.primary;
  return <button onClick={onClick} disabled={disabled} style={{background:v.bg,color:v.color,border:`2px solid ${v.border}`,padding:sz[size],borderRadius:8,cursor:disabled?'not-allowed':'pointer',fontWeight:700,fontSize:size==='sm'?11:size==='lg'?15:13,fontFamily:'inherit',transition:'all 0.15s',opacity:disabled?0.5:1,...style}}>{children}</button>;
};

const Card = ({ children, style={}, onClick }) => (
  <div onClick={onClick} style={{background:T.white,borderRadius:12,border:`1px solid ${T.border}`,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,0.04)',...(onClick?{cursor:'pointer'}:{}), ...style}}>{children}</div>
);

// Closes only via the ✕ button or an explicit in-dialog action — an
// accidental click on the backdrop should never discard an open form.
const Modal = ({ children, onClose, title, width=520 }) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
    <div style={{background:T.white,borderRadius:16,padding:28,maxWidth:width,width:'100%',maxHeight:'92vh',overflowY:'auto',boxShadow:'0 24px 60px rgba(0,0,0,0.35)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
        <h3 style={{margin:0,fontSize:17,fontWeight:800,color:T.green}}>{title}</h3>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:T.muted,lineHeight:1}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const StatusPill = ({ status }) => {
  const s = { active:{bg:'#DCFCE7',c:'#15803D',l:'Active'}, lien:{bg:'#FEF3C7',c:'#B45309',l:'Bank Lien'}, released:{bg:'#F3F4F6',c:'#6B7280',l:'Released'}, booked:{bg:'#DBEAFE',c:'#1D4ED8',l:'Booked'}, available:{bg:'#D1FAE5',c:'#059669',l:'Available'}, full:{bg:'#FEE2E2',c:'#DC2626',l:'Full'} };
  const t = s[status]||s.active;
  return <span style={{background:t.bg,color:t.c,padding:'3px 10px',borderRadius:12,fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>{t.l}</span>;
};

const Stars = ({ r }) => <span style={{color:T.gold,fontSize:12}}>{'★'.repeat(Math.round(r))}{'☆'.repeat(5-Math.round(r))} <span style={{color:T.muted,fontSize:11}}>{r}</span></span>;

const InfoRow = ({ label, value, accent }) => (
  <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${T.border}`}}>
    <span style={{fontSize:12,color:T.muted}}>{label}</span>
    <span style={{fontSize:12,fontWeight:700,color:accent||T.text}}>{value}</span>
  </div>
);

const TabBar = ({ tabs, active, onChange, color=T.green }) => (
  <div style={{display:'flex',borderBottom:`2px solid ${T.border}`,marginBottom:24,overflowX:'auto',gap:0}}>
    {tabs.map(([id,label])=>(
      <button key={id} onClick={()=>onChange(id)} style={{background:'none',border:'none',padding:'11px 18px',cursor:'pointer',fontSize:13,fontWeight:active===id?700:400,color:active===id?color:T.muted,borderBottom:active===id?`3px solid ${color}`:'3px solid transparent',fontFamily:'inherit',marginBottom:-2,transition:'all 0.15s',whiteSpace:'nowrap'}}>{label}</button>
    ))}
  </div>
);

const inputStyle = { width:'100%', padding:'9px 12px', border:`1.5px solid ${T.border}`, borderRadius:7, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };

// ─── DIGITAL WAREHOUSE RECEIPT ─────────────────────────────────────────────────
const DWRCard = ({ receipt:r, onViewDetails }) => {
  const statusColor = { active:T.teal, lien:T.warn, released:T.muted };
  return (
    <Card style={{borderLeft:`4px solid ${statusColor[r.status]||T.green}`,padding:0,overflow:'hidden'}} onClick={()=>onViewDetails(r)}>
      <div style={{padding:'14px 18px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.5,marginBottom:2}}>DIGITAL WAREHOUSE RECEIPT</div>
          <div style={{fontSize:16,fontWeight:900,color:T.green,fontFamily:'monospace'}}>{r.id}</div>
        </div>
        <StatusPill status={r.status}/>
      </div>
      <div style={{padding:'14px 18px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div>
            <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:2}}>COMMODITY</div>
            <div style={{fontSize:13,fontWeight:700,color:T.text}}>{r.commodity}</div>
            <div style={{fontSize:11,color:T.muted}}>{r.variety}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:2}}>QUANTITY</div>
            <div style={{fontSize:13,fontWeight:700,color:T.text}}>{r.qty} {r.unit}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:2}}>WAREHOUSE</div>
            <div style={{fontSize:12,color:T.text}}>{r.warehouseName}</div>
            <div style={{fontSize:11,color:T.muted}}>📍 {r.warehouseCity}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:2}}>CURRENT VALUE</div>
            <div style={{fontSize:14,fontWeight:800,color:T.gold}}>₨{r.currentValue.toLocaleString()}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:6,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}>
          <div style={{fontSize:11,color:T.muted}}>Entry: {r.entryDate} · Expiry: {r.expiryDate}</div>
          {r.lien && <div style={{background:'#FEF3C7',color:amber,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:8}}>🏦 Lien: {r.lien.bank}</div>}
          {r.insurance && <div style={{background:'#D1FAE5',color:T.teal,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:8}}>🛡️ Insured</div>}
        </div>
      </div>
    </Card>
  );
};

// ─── RECEIPT DETAIL MODAL ─────────────────────────────────────────────────────
const ReceiptDetailModal = ({ receipt:r, onClose, onPlaceLien, onBuyInsurance }) => (
  <Modal title={`Receipt: ${r.id}`} onClose={onClose} width={580}>
    {/* Header */}
    <div style={{background:`linear-gradient(135deg,${T.green},${T.mid})`,borderRadius:10,padding:16,marginBottom:18,color:'#fff'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div>
          <div style={{fontSize:10,color:T.mint,fontWeight:700,letterSpacing:1}}>DIGITAL WAREHOUSE RECEIPT</div>
          <div style={{fontSize:20,fontWeight:900,fontFamily:'monospace',marginTop:2}}>{r.id}</div>
        </div>
        <StatusPill status={r.status}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
        {[['Commodity',r.commodity],['Quantity',`${r.qty} ${r.unit}`],['Value',`₨${r.currentValue.toLocaleString()}`]].map(([k,v])=>(
          <div key={k}><div style={{fontSize:9,color:T.mint,fontWeight:700,letterSpacing:0.5}}>{k}</div><div style={{fontSize:13,fontWeight:700}}>{v}</div></div>
        ))}
      </div>
    </div>

    {/* Quality */}
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:8,letterSpacing:0.5}}>QUALITY METRICS</div>
      <div style={{display:'flex',gap:8}}>
        {[['Moisture',`${r.quality.moisture}%`],['Broken',`${r.quality.broken}%`],['Purity',`${r.quality.purity}%`]].map(([k,v])=>(
          <div key={k} style={{flex:1,background:T.surface,borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:14,fontWeight:800,color:T.green}}>{v}</div>
            <div style={{fontSize:9,color:T.muted,fontWeight:600}}>{k}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Warehouse */}
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:8,letterSpacing:0.5}}>WAREHOUSE DETAILS</div>
      <InfoRow label="Warehouse" value={r.warehouseName}/>
      <InfoRow label="Location" value={r.warehouseCity}/>
      <InfoRow label="Entry Date" value={r.entryDate}/>
      <InfoRow label="Expiry Date" value={r.expiryDate}/>
      <InfoRow label="Depositor" value={r.owner}/>
    </div>

    {/* Lien info */}
    {r.lien && (
      <div style={{background:'#FFFBEB',border:`1px solid #FDE68A`,borderRadius:10,padding:14,marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:amber,marginBottom:8}}>🏦 BANK LIEN ACTIVE</div>
        <InfoRow label="Bank" value={r.lien.bank}/>
        <InfoRow label="Lien Amount" value={`₨${r.lien.amount.toLocaleString()}`} accent={amber}/>
        <InfoRow label="Placed On" value={r.lien.placed}/>
        <InfoRow label="Loan Officer" value={r.lien.officer}/>
        <InfoRow label="Status" value={r.lien.status}/>
      </div>
    )}

    {/* Insurance */}
    {r.insurance && (
      <div style={{background:'#F0FDF4',border:`1px solid #86EFAC`,borderRadius:10,padding:14,marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:T.teal,marginBottom:8}}>🛡️ STORAGE INSURANCE ACTIVE</div>
        <InfoRow label="Provider" value={r.insurance.provider}/>
        <InfoRow label="Coverage" value={`₨${r.insurance.coverage.toLocaleString()}`} accent={T.teal}/>
        <InfoRow label="Policy No." value={r.insurance.policy}/>
        <InfoRow label="Expiry" value={r.insurance.expiry}/>
      </div>
    )}

    {/* Actions */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:6}}>
      {r.status==='active' && !r.lien && <Btn variant="amber" onClick={()=>onPlaceLien(r)}>🏦 Apply for Bank Loan</Btn>}
      {r.status==='active' && !r.insurance && <Btn variant="teal" onClick={()=>onBuyInsurance(r)}>🛡️ Buy Insurance</Btn>}
      <Btn variant="secondary">📄 Download PDF</Btn>
      <Btn variant="ghost">📤 Share with Bank</Btn>
    </div>
  </Modal>
);

// ─── BANK LIEN MODAL ──────────────────────────────────────────────────────────
const BankLienModal = ({ receipt, onClose, onSubmit }) => {
  const { openLogin } = useAuth();
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('working_capital');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const maxLoan = Math.round(receipt.currentValue * 0.7);

  if (submitted) return (
    <Modal title="Loan Application Submitted" onClose={onClose}>
      <div style={{textAlign:'center',padding:'24px 0'}}>
        <div style={{fontSize:56,marginBottom:14}}>🏦</div>
        <h3 style={{color:T.green,margin:'0 0 10px'}}>Application Received!</h3>
        <p style={{color:T.muted,fontSize:13,margin:'0 0 20px',lineHeight:1.6}}>Your loan application against warehouse receipt <strong>{receipt.id}</strong> has been submitted to {bank}. A bank officer will contact you within 2 working days.</p>
        <div style={{background:T.surface,borderRadius:10,padding:14,marginBottom:20,textAlign:'left'}}>
          <InfoRow label="Receipt ID" value={receipt.id}/>
          <InfoRow label="Commodity" value={`${receipt.qty} ${receipt.unit} of ${receipt.commodity}`}/>
          <InfoRow label="Collateral Value" value={`₨${receipt.currentValue.toLocaleString()}`}/>
          <InfoRow label="Requested Loan" value={`₨${Number(amount).toLocaleString()}`} accent={amber}/>
          <InfoRow label="Bank" value={bank}/>
        </div>
        <Btn variant="primary" onClick={onClose}>Done</Btn>
      </div>
    </Modal>
  );

  return (
    <Modal title="Apply for Warehouse Receipt Loan" onClose={onClose}>
      <div style={{background:'#FFFBEB',border:`1px solid #FDE68A`,borderRadius:10,padding:14,marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:700,color:amber,marginBottom:6}}>📋 Collateral Details</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[['Receipt',receipt.id],['Commodity',receipt.commodity],['Quantity',`${receipt.qty} tons`],['Market Value',`₨${receipt.currentValue.toLocaleString()}`]].map(([k,v])=>(
            <div key={k}><div style={{fontSize:9,color:T.muted,fontWeight:700}}>{k}</div><div style={{fontSize:12,fontWeight:700}}>{v}</div></div>
          ))}
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>SELECT BANK</label>
        <select value={bank} onChange={e=>setBank(e.target.value)} style={inputStyle}>
          <option value="">— Choose a bank —</option>
          {['National Bank of Pakistan','HBL','MCB Bank','UBL','Bank Alfalah','ZTBL (Agri Specialist)','Meezan Bank'].map(b=><option key={b}>{b}</option>)}
        </select>
      </div>

      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>LOAN PURPOSE</label>
        <select value={purpose} onChange={e=>setPurpose(e.target.value)} style={inputStyle}>
          <option value="working_capital">Working Capital</option>
          <option value="input_purchase">Input Purchase (Seeds, Fertilizer)</option>
          <option value="equipment">Equipment Purchase</option>
          <option value="new_crop">New Crop Financing</option>
        </select>
      </div>

      <div style={{marginBottom:8}}>
        <label style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>LOAN AMOUNT (₨)</label>
        <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder={`Max: ₨${maxLoan.toLocaleString()} (70% of value)`} style={inputStyle}/>
      </div>
      {amount && Number(amount)>maxLoan && <div style={{fontSize:11,color:T.danger,marginBottom:10}}>⚠ Exceeds maximum eligible amount of ₨{maxLoan.toLocaleString()}</div>}

      <div style={{background:T.surface,borderRadius:8,padding:12,marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:6}}>ESTIMATED TERMS (ZTBL typical)</div>
        {[['Interest Rate','6–9% p.a. (Agri markup)'],['Processing Fee','0.5% of loan amount'],['Tenure','Up to 6 months'],['Repayment','On commodity sale']].map(([k,v])=>(
          <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0'}}><span style={{color:T.muted}}>{k}</span><span style={{fontWeight:600}}>{v}</span></div>
        ))}
      </div>

      <ErrorBanner message={error} onLogin={openLogin}/>
      <Btn variant="amber" style={{width:'100%',padding:'11px'}} disabled={!bank||!amount||Number(amount)>maxLoan||submitting} onClick={async ()=>{
        setError(null);
        setSubmitting(true);
        try {
          await apiApplyLien({
            receiptId: receipt._raw?.id || receipt.id,
            bankName: bank,
            loanPurpose: purpose,
            loanAmount: Number(amount),
            interestRate: 8,
            tenureMonths: 6,
          });
          setSubmitted(true);
        } catch (e) {
          setError(e?.message || 'Failed to submit loan application. Please try again.');
        } finally {
          setSubmitting(false);
        }
      }}>
        {submitting ? 'Submitting…' : 'Submit Loan Application →'}
      </Btn>
    </Modal>
  );
};

// ─── INSURANCE MODAL ──────────────────────────────────────────────────────────
const InsuranceModal = ({ receipt, onClose }) => {
  const { openLogin } = useAuth();
  const [selected, setSelected] = useState(null);
  const [declaredValue, setDeclaredValue] = useState(String(receipt.currentValue));
  const [booked, setBooked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (booked && selected) {
    const premium = Math.round(Number(declaredValue) * parseFloat(selected.premium) / 100);
    return (
      <Modal title="Insurance Policy Issued!" onClose={onClose}>
        <div style={{textAlign:'center',padding:'20px 0'}}>
          <div style={{fontSize:52,marginBottom:14}}>🛡️</div>
          <h3 style={{color:T.teal,margin:'0 0 10px'}}>Policy Activated</h3>
          <p style={{color:T.muted,fontSize:13,margin:'0 0 20px',lineHeight:1.6}}>Your storage insurance with <strong>{selected.provider}</strong> is now active. Policy documents sent to your registered email and phone.</p>
          <div style={{background:'#F0FDF4',border:`1px solid #86EFAC`,borderRadius:10,padding:14,marginBottom:20,textAlign:'left'}}>
            <InfoRow label="Policy No." value={`${selected.provider.slice(0,3).toUpperCase()}-AGR-2025-${Math.floor(Math.random()*9000+1000)}`}/>
            <InfoRow label="Coverage" value={`₨${Number(declaredValue).toLocaleString()}`} accent={T.teal}/>
            <InfoRow label="Annual Premium" value={`₨${premium.toLocaleString()}`}/>
            <InfoRow label="Valid Until" value={receipt.expiryDate}/>
          </div>
          <Btn variant="teal" onClick={onClose}>Done</Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Buy Storage Insurance" onClose={onClose} width={560}>
      <div style={{background:'#F0FDF4',border:`1px solid #86EFAC`,borderRadius:10,padding:12,marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:700,color:T.teal,marginBottom:4}}>Insuring: {receipt.commodity} — {receipt.qty} {receipt.unit}</div>
        <div style={{fontSize:11,color:T.muted}}>Warehouse: {receipt.warehouseName} · {receipt.warehouseCity}</div>
      </div>

      <div style={{marginBottom:16}}>
        <label style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>DECLARED VALUE (₨)</label>
        <input value={declaredValue} onChange={e=>setDeclaredValue(e.target.value)} type="number" style={inputStyle}/>
        <div style={{fontSize:11,color:T.muted,marginTop:4}}>Market value: ₨{receipt.currentValue.toLocaleString()}</div>
      </div>

      <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:10,letterSpacing:0.5}}>SELECT INSURANCE PLAN</div>
      {INSURANCE_PLANS.map(plan => {
        const annualPremium = declaredValue ? Math.round(Number(declaredValue) * parseFloat(plan.premium) / 100) : 0;
        return (
          <div key={plan.id} onClick={()=>setSelected(plan)} style={{border:`2px solid ${selected?.id===plan.id?T.teal:T.border}`,borderRadius:10,padding:14,marginBottom:10,cursor:'pointer',background:selected?.id===plan.id?'#F0FDF4':T.white,transition:'all 0.15s'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div>
                <div style={{fontWeight:800,fontSize:13,color:T.green}}>{plan.provider}</div>
                <div style={{fontSize:11,color:T.muted}}>{plan.plan}</div>
                <Stars r={plan.rating}/>
              </div>
              <div style={{textAlign:'right'}}>
                {annualPremium>0&&<div style={{fontSize:15,fontWeight:800,color:T.gold}}>₨{annualPremium.toLocaleString()}/yr</div>}
                <div style={{fontSize:10,color:T.muted}}>{plan.premium}</div>
              </div>
            </div>
            <div style={{fontSize:11,color:T.muted,marginBottom:6}}>✓ {plan.coverage}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {plan.features.map(f=><span key={f} style={{background:'#D1FAE5',color:T.teal,fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:8}}>{f}</span>)}
            </div>
          </div>
        );
      })}
      <ErrorBanner message={error} onLogin={openLogin}/>
      <Btn variant="teal" style={{width:'100%',padding:'11px',marginTop:8}} disabled={!selected||!declaredValue||submitting} onClick={async ()=>{
        setError(null);
        setSubmitting(true);
        try {
          await apiBuyInsurance({
            receiptId: receipt._raw?.id || receipt.id,
            provider: selected.provider,
            planName: selected.plan,
            coverageAmount: Number(declaredValue),
            premiumAmount: Math.round(Number(declaredValue) * parseFloat(selected.premium) / 100),
            coverage: selected.coverage,
          });
          setBooked(true);
        } catch (e) {
          setError(e?.message || 'Failed to activate policy. Please try again.');
        } finally {
          setSubmitting(false);
        }
      }}>
        {submitting ? 'Activating…' : 'Activate Policy →'}
      </Btn>
    </Modal>
  );
};

// ─── CANCEL BOOKING MODAL ───────────────────────────────────────────────────
const CancelBookingModal = ({ booking, onClose, onCancelled }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await apiCancelBooking(booking.id, reason || undefined);
      onCancelled();
    } catch (e) {
      setError(e?.message || 'Failed to cancel this booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Cancel Booking — ${booking.reference}`} onClose={onClose}>
      <p style={{fontSize:13,color:T.muted,margin:'0 0 14px',lineHeight:1.6}}>
        This will cancel your booking request at <strong>{booking.warehouseName}</strong>. This can't be undone.
      </p>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:5,display:'block'}}>REASON (OPTIONAL)</label>
        <textarea
          value={reason}
          onChange={e=>setReason(e.target.value)}
          placeholder="Let the warehouse know why, if you'd like…"
          style={{width:'100%',minHeight:60,padding:'9px 12px',border:`1.5px solid ${T.border}`,borderRadius:7,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',resize:'vertical'}}
        />
      </div>
      {error && <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'10px 12px',marginBottom:14,fontSize:12,color:'#B91C1C'}}>⚠ {error}</div>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <Btn variant="ghost" onClick={onClose} disabled={submitting}>Keep Booking</Btn>
        <Btn variant="danger" onClick={submit} disabled={submitting}>{submitting ? 'Cancelling…' : 'Cancel Booking'}</Btn>
      </div>
    </Modal>
  );
};

// ─── BOOKING MODAL ────────────────────────────────────────────────────────────
const BookingModal = ({ warehouse:w, onClose }) => {
  const { openLogin } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ commodity:'', variety:'', qty:'', duration:'', entryDate:'', packagingType:'bags', insurance:false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [bookingReference, setBookingReference] = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  // Resolves the effective rate the same way the backend does (see
  // WarehouseService.resolveRatePerTonMonth): a per-commodity override if
  // the operator set one for the selected commodity, else the warehouse's
  // flat base rate.
  const effectiveRate = (form.commodity && w.ratesByCommodity?.[form.commodity] != null)
    ? Number(w.ratesByCommodity[form.commodity]) : w.pricePerTon;
  const months = form.duration ? Number(form.duration)/30 : 0;
  const storageCost = form.qty && form.duration ? Math.round(Number(form.qty)*effectiveRate*months) : 0;
  const insuranceRateKnown = w.insuranceAvailable && w.insurancePricePerTonMonth != null;
  const insuranceCost = (form.insurance && insuranceRateKnown && form.qty && form.duration)
    ? Math.round(Number(form.qty)*w.insurancePricePerTonMonth*months) : 0;
  const totalCost = storageCost + insuranceCost;

  if (step===3) return (
    <Modal title="Booking Request Sent" onClose={onClose}>
      <div style={{textAlign:'center',padding:'20px 0'}}>
        <div style={{fontSize:56,marginBottom:14}}>📨</div>
        <h3 style={{color:T.green,margin:'0 0 6px'}}>Request Sent to Warehouse</h3>
        {bookingReference && (
          <div style={{display:'inline-block',background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:'4px 14px',fontSize:12,fontWeight:800,color:T.green,marginBottom:10,letterSpacing:0.3}}>
            {bookingReference}
          </div>
        )}
        <p style={{color:T.muted,fontSize:13,margin:'0 0 20px',lineHeight:1.6}}><strong>{w.name}</strong> needs to accept your request before it's confirmed. You can track its status any time under "My Bookings".</p>
        <div style={{background:T.surface,borderRadius:10,padding:14,marginBottom:20,textAlign:'left'}}>
          <InfoRow label="Warehouse" value={w.name}/>
          <InfoRow label="Commodity" value={`${form.commodity} (${form.variety})`}/>
          <InfoRow label="Quantity" value={`${form.qty} tons`}/>
          <InfoRow label="Duration" value={`${form.duration} days`}/>
          <InfoRow label="Total Cost" value={`₨${totalCost.toLocaleString()}`} accent={T.gold}/>
          <InfoRow label="Status" value="Requested — awaiting warehouse response"/>
        </div>
        <Btn variant="primary" onClick={onClose}>Done</Btn>
      </div>
    </Modal>
  );

  return (
    <Modal title={`Book Storage — ${w.name}`} onClose={onClose}>
      {/* Step indicator */}
      <div style={{display:'flex',gap:4,marginBottom:20}}>
        {['Commodity Details','Review & Pay'].map((s,i)=>(
          <div key={s} style={{flex:1,textAlign:'center'}}>
            <div style={{width:24,height:24,borderRadius:'50%',background:step>i+1?T.teal:step===i+1?T.green:'#D1D5DB',color:step>=i+1?'#fff':'#9CA3AF',fontSize:11,fontWeight:700,margin:'0 auto 4px',display:'flex',alignItems:'center',justifyContent:'center'}}>{step>i+1?'✓':i+1}</div>
            <div style={{fontSize:10,color:step===i+1?T.green:T.muted,fontWeight:step===i+1?700:400}}>{s}</div>
          </div>
        ))}
      </div>

      {step===1 && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5}}>COMMODITY</label>
              <select value={form.commodity} onChange={e=>set('commodity',e.target.value)} style={inputStyle}>
                <option value="">— Select —</option>
                {w.commodities.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5}}>VARIETY / GRADE</label>
              <input value={form.variety} onChange={e=>set('variety',e.target.value)} placeholder="e.g. 1121 Basmati" style={inputStyle}/>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5}}>QUANTITY (tons)</label>
              <input value={form.qty} onChange={e=>set('qty',e.target.value)} type="number" placeholder="e.g. 50" style={inputStyle}/>
              {form.qty && Number(form.qty)>w.available && <div style={{fontSize:11,color:T.danger,marginTop:3}}>⚠ Only {w.available} tons available</div>}
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5}}>DURATION (days)</label>
              <input value={form.duration} onChange={e=>set('duration',e.target.value)} type="number" placeholder={`Min. ${w.minDuration} days`} style={inputStyle}/>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5}}>ENTRY DATE</label>
            <input value={form.entryDate} onChange={e=>set('entryDate',e.target.value)} type="date" style={inputStyle}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5}}>PACKAGING TYPE</label>
            <div style={{display:'flex',gap:8}}>
              {['bags','loose','pallets'].map(t=>(
                <button key={t} onClick={()=>set('packagingType',t)} style={{flex:1,padding:'8px',border:`2px solid ${form.packagingType===t?T.green:T.border}`,background:form.packagingType===t?'#F0FDF4':T.white,color:form.packagingType===t?T.green:T.muted,borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:12,fontFamily:'inherit',textTransform:'capitalize'}}>{t}</button>
              ))}
            </div>
          </div>
          {storageCost>0 && (
            <div style={{background:'#F0FDF4',borderRadius:8,padding:'10px 14px',marginBottom:14}}>
              <div style={{fontSize:11,color:T.muted}}>Estimated Storage Cost</div>
              <div style={{fontSize:20,fontWeight:900,color:T.green}}>₨{storageCost.toLocaleString()}</div>
              <div style={{fontSize:11,color:T.muted}}>₨{effectiveRate}/ton/month × {form.qty} tons × {Math.round(months*10)/10} months</div>
            </div>
          )}
          <Btn variant="primary" style={{width:'100%',padding:'11px'}} disabled={!form.commodity||!form.qty||!form.duration||!form.entryDate} onClick={()=>setStep(2)}>Review Booking →</Btn>
        </>
      )}

      {step===2 && (
        <>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:8,letterSpacing:0.5}}>BOOKING SUMMARY</div>
            <InfoRow label="Warehouse" value={w.name}/>
            <InfoRow label="City" value={w.city}/>
            <InfoRow label="Commodity" value={`${form.commodity} — ${form.variety}`}/>
            <InfoRow label="Quantity" value={`${form.qty} tons`}/>
            <InfoRow label="Entry Date" value={form.entryDate}/>
            <InfoRow label="Duration" value={`${form.duration} days`}/>
            <InfoRow label="Storage Rate" value={`₨${effectiveRate}/ton/month`}/>
            <InfoRow label="Storage Cost" value={`₨${storageCost.toLocaleString()}`}/>
            {form.insurance && insuranceRateKnown && (
              <InfoRow label="Insurance Cost" value={`₨${insuranceCost.toLocaleString()}`} accent={T.teal}/>
            )}
            <InfoRow label="Total Cost" value={`₨${totalCost.toLocaleString()}`} accent={T.gold}/>
          </div>

          <label style={{display:'flex',gap:10,alignItems:'flex-start',padding:'12px',background:T.surface,borderRadius:8,cursor:insuranceRateKnown?'pointer':'not-allowed',marginBottom:14,opacity:insuranceRateKnown?1:0.6}}>
            <input type="checkbox" checked={form.insurance} disabled={!insuranceRateKnown} onChange={e=>set('insurance',e.target.checked)} style={{width:15,height:15,marginTop:1}}/>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:T.green}}>Add Storage Insurance</div>
              {insuranceRateKnown ? (
                <div style={{fontSize:11,color:T.muted}}>Protect against fire, theft, flood and spoilage. ₨{w.insurancePricePerTonMonth}/ton/month{form.qty && form.duration ? ` — ₨${insuranceCost.toLocaleString()} for this booking` : ''}</div>
              ) : (
                <div style={{fontSize:11,color:T.muted}}>This warehouse hasn't set an insurance rate yet, so it isn't available for this booking.</div>
              )}
            </div>
          </label>

          <div style={{background:'#FEF3C7',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:12,color:amber}}>
            🏦 <strong>Tip:</strong> After storing, you can use your Digital Warehouse Receipt as collateral to get a bank loan of up to 70% of the commodity value.
          </div>

          <ErrorBanner message={error} onLogin={openLogin}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <Btn variant="ghost" onClick={()=>setStep(1)} disabled={submitting}>← Back</Btn>
            <Btn variant="primary" disabled={submitting} onClick={async ()=>{
              setError(null);
              setSubmitting(true);
              try {
                const res = await apiBookStorage(toBookingRequest({ warehouseId: w._raw?.id || w.id, commodity: form.commodity, variety: form.variety, qty: form.qty, packagingType: form.packagingType, entryDate: form.entryDate, duration: form.duration, insurance: form.insurance }));
                setBookingReference(res?.booking?.bookingReference || null);
                setStep(3);
              } catch (e) {
                setError(e?.message || 'Failed to confirm booking. Please try again.');
              } finally {
                setSubmitting(false);
              }
            }}>{submitting ? 'Sending Request…' : 'Send Booking Request →'}</Btn>
          </div>
        </>
      )}
    </Modal>
  );
};

// ─── WAREHOUSE CARD ───────────────────────────────────────────────────────────
const WarehouseCard = ({ w, onBook, onView }) => {
  const pct = Math.round((w.capacity-w.available)/w.capacity*100);
  const available = w.available>0;
  return (
    <Card onClick={()=>onView(w)}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
            <span style={{fontSize:18}}>{w.type==='Cold Storage'?'❄️':'🏪'}</span>
            <span style={{fontWeight:800,fontSize:14,color:T.green}}>{w.name}</span>
          </div>
          <div style={{fontSize:11,color:T.muted}}>📍 {w.city}, {w.province}</div>
        </div>
        <StatusPill status={available?'available':'full'}/>
      </div>

      {/* Capacity bar */}
      <div style={{marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:T.muted,marginBottom:4}}>
          <span>Capacity used: {pct}%</span>
          <span><strong style={{color:T.green}}>{w.available.toLocaleString()}</strong> / {w.capacity.toLocaleString()} {w.unit} free</span>
        </div>
        <div style={{height:6,background:'#E5E7EB',borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:pct>85?T.danger:pct>60?T.warn:T.teal,borderRadius:3,transition:'width 0.3s'}}/>
        </div>
      </div>

      {/* Key info */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
        {[['💰 Rate',`₨${w.pricePerTon}/ton/mo`],['🌡️ Type',w.type],['📦 Accepts',w.commodities.slice(0,2).join(', ')+'…'],['🏦 Banks',`${w.bankPartners.length} partners`]].map(([k,v])=>(
          <div key={k} style={{background:T.surface,borderRadius:7,padding:'7px 10px'}}>
            <div style={{fontSize:10,color:T.muted,marginBottom:1}}>{k.split(' ')[0]} <span style={{color:T.muted,fontWeight:600}}>{k.split(' ')[1]}</span></div>
            <div style={{fontSize:11,fontWeight:700,color:T.text}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:12}}>
        {w.certifications.map(c=><span key={c} style={{background:'#DCFCE7',color:'#15803D',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:8}}>✓ {c}</span>)}
        {w.insuranceAvailable&&<span style={{background:'#D1FAE5',color:T.teal,fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:8}}>🛡️ Insurance Available</span>}
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <Stars r={w.rating}/><span style={{fontSize:11,color:T.muted,marginLeft:4}}>({w.reviews})</span>
        <Btn variant="primary" size="sm" disabled={!available} onClick={e=>{e.stopPropagation();onBook(w);}}>
          {available?'Book Storage':'Full'}
        </Btn>
      </div>
    </Card>
  );
};

// ─── WAREHOUSE DETAIL MODAL ───────────────────────────────────────────────────
const WarehouseDetailModal = ({ w, onClose, onBook }) => (
  <Modal title={w.name} onClose={onClose} width={600}>
    <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
      {w.certifications.map(c=><span key={c} style={{background:'#DCFCE7',color:'#15803D',fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:10}}>✓ {c}</span>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
      {[['Type',w.type],['Location',`${w.city}, ${w.province}`],['Total Capacity',`${w.capacity.toLocaleString()} tons`],['Available',`${w.available.toLocaleString()} tons`],['Rate',`₨${w.pricePerTon}/ton/month`],['Min. Duration',`${w.minDuration} days`],['Established',w.established],['Manager',w.manager]].map(([k,v])=>(
      <div key={k} style={{background:T.surface,borderRadius:8,padding:'10px 12px'}}>
        <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:0.5,marginBottom:2}}>{k}</div>
        <div style={{fontSize:13,fontWeight:700,color:T.text}}>{v}</div>
      </div>
    ))}
    </div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:6,letterSpacing:0.5}}>FACILITIES</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
        {w.features.map(f=><div key={f} style={{fontSize:12,color:T.text}}>✓ {f}</div>)}
      </div>
    </div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:6,letterSpacing:0.5}}>ACCEPTS COMMODITIES</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
        {w.commodities.map(c=><span key={c} style={{background:'#DBEAFE',color:'#1D4ED8',fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:8}}>{c}</span>)}
      </div>
    </div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:6,letterSpacing:0.5}}>BANK PARTNERS (for DWR financing)</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
        {w.bankPartners.map(b=><span key={b} style={{background:'#FEF3C7',color:amber,fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:8}}>🏦 {b}</span>)}
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
      <Btn variant="primary" style={{padding:'11px'}} onClick={()=>{onClose();onBook(w);}}>Book Storage →</Btn>
      <Btn variant="ghost">📞 Contact Manager</Btn>
    </div>
  </Modal>
);

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
        if (isDemoMode()) { setWAREHOUSES(MOCK_WAREHOUSES); setWarehousesState('ready'); }
        else setWarehousesState('error');
      });
  };

  const loadReceipts = () => {
    if (!user) { setReceiptsState('guest'); setMY_RECEIPTS([]); return; }
    setReceiptsState('loading');
    apiGetMyReceipts()
      .then(data => { setMY_RECEIPTS(adaptReceipts(Array.isArray(data) ? data : [])); setReceiptsState('ready'); })
      .catch(() => {
        if (isDemoMode()) { setMY_RECEIPTS(MOCK_RECEIPTS); setReceiptsState('ready'); }
        else setReceiptsState('error');
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
    ['🏦', 'Under Lien', MY_RECEIPTS.filter(r=>r.lien).length, T.warn],
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
        {tab==='browse' && (
          <div>
            {/* Filters */}
            <Card style={{marginBottom:22,padding:16}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:10,alignItems:'flex-end'}}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>SEARCH</label>
                  <input value={filter.search} onChange={e=>setFilter(f=>({...f,search:e.target.value}))} placeholder="Warehouse name or city..." style={inputStyle}/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>STORAGE TYPE</label>
                  <select value={filter.type} onChange={e=>setFilter(f=>({...f,type:e.target.value}))} style={inputStyle}>
                    {['All','Cold Storage','Dry Storage'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>COMMODITY</label>
                  <select value={filter.commodity} onChange={e=>setFilter(f=>({...f,commodity:e.target.value}))} style={inputStyle}>
                    {['All','Rice','Wheat','Maize','Cotton','Pulses','Oil Seeds','Vegetables','Fruits'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <Btn variant="ghost" onClick={()=>setFilter({type:'All',province:'All',commodity:'All',search:''})}>Clear</Btn>
              </div>
            </Card>

            {warehousesState==='ready' && (
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <span style={{fontSize:13,color:T.muted}}><strong style={{color:T.text}}>{filtered.length}</strong> warehouses found</span>
              </div>
            )}

            {warehousesState==='loading' && (
              <div style={{textAlign:'center',padding:'48px 20px',color:T.muted}}>
                <div style={{fontSize:28,marginBottom:10}}>⏳</div>
                <div style={{fontSize:13,fontWeight:600}}>Loading warehouses…</div>
              </div>
            )}
            {warehousesState==='error' && (
              <div style={{textAlign:'center',padding:'40px 20px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:12}}>
                <div style={{fontSize:28,marginBottom:10}}>⚠️</div>
                <div style={{fontSize:13,fontWeight:700,color:'#B91C1C',marginBottom:4}}>Couldn't load warehouses</div>
                <div style={{fontSize:12,color:'#991B1B',marginBottom:16}}>Something went wrong talking to the server. Please try again.</div>
                <button onClick={loadWarehouses} style={{background:'#B91C1C',color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Retry</button>
              </div>
            )}
            {warehousesState==='ready' && filtered.length===0 && (
              <div style={{textAlign:'center',padding:'48px 20px',color:T.muted}}>
                <div style={{fontSize:32,marginBottom:10}}>🏪</div>
                <div style={{fontSize:14,fontWeight:700,color:T.text}}>No warehouses match these filters</div>
              </div>
            )}
            {warehousesState==='ready' && filtered.length>0 && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
                {filtered.map(w=>(
                  <WarehouseCard key={w.id} w={w} onBook={handleBook} onView={setViewWarehouse}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MY BOOKINGS TAB */}
        {tab==='bookings' && (
          <div>
            {bookingsState==='guest' && (
              <div style={{textAlign:'center',padding:'48px 20px',color:T.muted,background:T.white,borderRadius:12,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:32,marginBottom:10}}>🔒</div>
                <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:10}}>Log in to view your bookings</div>
                <Btn variant="primary" onClick={openLogin}>Log In</Btn>
              </div>
            )}
            {bookingsState==='loading' && (
              <div style={{textAlign:'center',padding:'48px 20px',color:T.muted}}>
                <div style={{fontSize:28,marginBottom:10}}>⏳</div>
                <div style={{fontSize:13,fontWeight:600}}>Loading your bookings…</div>
              </div>
            )}
            {bookingsState==='error' && (
              <div style={{textAlign:'center',padding:'40px 20px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:12}}>
                <div style={{fontSize:28,marginBottom:10}}>⚠️</div>
                <div style={{fontSize:13,fontWeight:700,color:'#B91C1C',marginBottom:4}}>Couldn't load your bookings</div>
                <div style={{fontSize:12,color:'#991B1B',marginBottom:16}}>Something went wrong talking to the server. Please try again.</div>
                <button onClick={loadBookings} style={{background:'#B91C1C',color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Retry</button>
              </div>
            )}
            {bookingsState==='ready' && MY_BOOKINGS.length===0 && (
              <div style={{textAlign:'center',padding:'48px 20px',color:T.muted}}>
                <div style={{fontSize:32,marginBottom:10}}>📋</div>
                <div style={{fontSize:14,fontWeight:700,color:T.text}}>No booking requests yet</div>
                <div style={{fontSize:12,marginTop:4}}>Browse warehouses and send a booking request to get started.</div>
              </div>
            )}
            {bookingsState==='ready' && MY_BOOKINGS.length>0 && (
              <div style={{display:'grid',gap:10}}>
                {docError && (
                  <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#B91C1C'}}>⚠ {docError}</div>
                )}
                {MY_BOOKINGS.map(b=>{
                  const sc = STATUS_COLORS[b.status] || { bg:'#F3F4F6', c:'#6B7280', l:b.status };
                  const canCancel = b.status==='requested' || b.status==='accepted';
                  return (
                    <Card key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                          <span style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:0.3}}>{b.reference}</span>
                          <span style={{background:sc.bg,color:sc.c,padding:'2px 8px',borderRadius:8,fontSize:10,fontWeight:700}}>{sc.l}</span>
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color:T.text}}>
                          {b.commodity}{b.variety ? ` · ${b.variety}` : ''} — {b.qty} tons
                        </div>
                        <div style={{fontSize:11.5,color:T.muted,marginTop:2}}>
                          {b.warehouseName} · {b.warehouseCity} · Entry {b.entryDate ? new Date(b.entryDate).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                        </div>
                        {b.status==='rejected' && b.rejectionReason && (
                          <div style={{fontSize:11.5,color:T.danger,marginTop:4}}>Reason: {b.rejectionReason}</div>
                        )}
                        {b.status==='cancelled' && b.cancelReason && (
                          <div style={{fontSize:11.5,color:T.muted,marginTop:4}}>Reason: {b.cancelReason}</div>
                        )}
                      </div>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <span style={{fontSize:12,fontWeight:700,color:T.green}}>₨{b.totalCost.toLocaleString()}</span>
                        <Btn variant="ghost" size="sm" onClick={()=>setThreadBooking(b)}>💬 Messages{b.messageCount ? ` (${b.messageCount})` : ''}</Btn>
                        {canCancel && (
                          <Btn variant="ghost" size="sm" onClick={()=>setCancelBookingTarget(b)}>Cancel</Btn>
                        )}
                      </div>

                      {!['rejected','cancelled'].includes(b.status) && (
                        <div style={{flexBasis:'100%',borderTop:`1px solid ${T.border}`,paddingTop:10,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',fontSize:12}}>
                          {b.invoice && (
                            <>
                              <span style={{color:T.muted}}>Invoice {b.invoice.invoiceNumber} (₨{Number(b.invoice.totalAmount).toLocaleString()}):</span>
                              <span style={{fontWeight:700,color:b.invoice.status==='PAID'?'#15803D':'#B45309'}}>{b.invoice.status==='PAID'?'✓ Paid':'Unpaid'}</span>
                              <Btn variant="ghost" size="sm" onClick={()=>openDoc(apiGetInvoice,b.invoice.id)}>📄 Invoice PDF</Btn>
                            </>
                          )}
                          {!b.invoice && <span style={{color:T.muted}}>🧾 Invoice: sent by the warehouse after acceptance</span>}
                          {b.grn
                            ? <Btn variant="ghost" size="sm" onClick={()=>openDoc(apiGetGrn,b.grn.id)}>📦 GRN {b.grn.grnNumber}</Btn>
                            : <span style={{color:T.muted}}>📦 GRN: issued when the warehouse receives your goods</span>}
                          {!b.gatePass && <span style={{color:T.muted}}>🚪 Gate-out pass: issued when you approve a release request</span>}
                          {b.gatePass?.status==='PENDING' && (
                            <>
                              <span style={{color:'#B45309',fontWeight:700}}>🚪 Warehouse requests release of your goods</span>
                              <Btn variant="primary" size="sm" disabled={docBusyId===b.id} onClick={()=>decideGateOut(b.id,b.gatePass.id,true)}>Approve</Btn>
                              <Btn variant="ghost" size="sm" disabled={docBusyId===b.id} onClick={()=>decideGateOut(b.id,b.gatePass.id,false)}>Reject</Btn>
                            </>
                          )}
                          {b.gatePass?.status==='APPROVED' && (
                            <Btn variant="ghost" size="sm" onClick={()=>openDoc(apiGetGateOutPass,b.gatePass.id)}>🚪 Gate Pass {b.gatePass.passNumber}</Btn>
                          )}
                          {b.gatePass?.status==='REJECTED' && <span style={{color:T.muted}}>Last release request rejected</span>}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RECEIPTS TAB */}
        {tab==='receipts' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <h2 style={{margin:0,fontSize:18,fontWeight:800,color:T.green}}>My Digital Warehouse Receipts</h2>
                <p style={{margin:'4px 0 0',fontSize:12,color:T.muted}}>Use receipts as collateral for bank loans or to buy storage insurance</p>
              </div>
              <Btn variant="gold" onClick={()=>setTab('browse')}>+ Book New Storage</Btn>
            </div>

            {receiptsState==='guest' && (
              <div style={{textAlign:'center',padding:'48px 20px',color:T.muted,background:T.white,borderRadius:12,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:32,marginBottom:10}}>🔒</div>
                <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:10}}>Log in to view your warehouse receipts</div>
                <Btn variant="primary" onClick={openLogin}>Log In</Btn>
              </div>
            )}
            {receiptsState==='loading' && (
              <div style={{textAlign:'center',padding:'48px 20px',color:T.muted}}>
                <div style={{fontSize:28,marginBottom:10}}>⏳</div>
                <div style={{fontSize:13,fontWeight:600}}>Loading your receipts…</div>
              </div>
            )}
            {receiptsState==='error' && (
              <div style={{textAlign:'center',padding:'40px 20px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:12}}>
                <div style={{fontSize:28,marginBottom:10}}>⚠️</div>
                <div style={{fontSize:13,fontWeight:700,color:'#B91C1C',marginBottom:4}}>Couldn't load your receipts</div>
                <div style={{fontSize:12,color:'#991B1B',marginBottom:16}}>Something went wrong talking to the server. Please try again.</div>
                <button onClick={loadReceipts} style={{background:'#B91C1C',color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Retry</button>
              </div>
            )}
            {receiptsState==='ready' && (
              <>
                {/* Receipts summary */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:24}}>
                  {[
                    ['Total Stored Value','₨'+MY_RECEIPTS.reduce((s,r)=>s+r.currentValue,0).toLocaleString(),T.green,'💰'],
                    ['Under Bank Lien','₨'+MY_RECEIPTS.filter(r=>r.lien).reduce((s,r)=>s+r.lien.amount,0).toLocaleString(),amber,'🏦'],
                    ['Insured Value','₨'+MY_RECEIPTS.filter(r=>r.insurance).reduce((s,r)=>s+r.insurance.coverage,0).toLocaleString(),T.teal,'🛡️'],
                    ['Active Receipts',MY_RECEIPTS.filter(r=>r.status!=='released').length,T.mid,'📄'],
                  ].map(([label,val,color,icon])=>(
                    <Card key={label} style={{padding:14,textAlign:'center'}}>
                      <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
                      <div style={{fontSize:16,fontWeight:900,color}}>{val}</div>
                      <div style={{fontSize:10,color:T.muted,fontWeight:700,letterSpacing:0.3}}>{label}</div>
                    </Card>
                  ))}
                </div>

                {MY_RECEIPTS.length===0 ? (
                  <div style={{textAlign:'center',padding:'48px 20px',color:T.muted}}>
                    <div style={{fontSize:32,marginBottom:10}}>📄</div>
                    <div style={{fontSize:14,fontWeight:700,color:T.text}}>No warehouse receipts yet</div>
                    <div style={{fontSize:12,marginTop:4}}>Book storage to get your first Digital Warehouse Receipt.</div>
                  </div>
                ) : (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:14}}>
                    {MY_RECEIPTS.map(r=>(
                      <DWRCard key={r.id} receipt={r} onViewDetails={setViewReceipt}/>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* HOW IT WORKS TAB */}
        {tab==='howItWorks' && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:28}}>
              {/* Storage flow */}
              <Card>
                <h3 style={{margin:'0 0 18px',fontSize:15,fontWeight:800,color:T.green}}>🏪 How Storage Works</h3>
                {[
                  ['1','Browse Warehouses','Search by commodity, location, and storage type. Compare rates and facilities.'],
                  ['2','Book & Confirm','Select duration, pay the booking fee, and schedule your delivery date.'],
                  ['3','Deliver Commodity','Bring your goods to the warehouse. They are weighed and quality-checked on arrival.'],
                  ['4','Receive DWR','You receive a Digital Warehouse Receipt — a legally valid document proving ownership.'],
                  ['5','Sell or Finance','Use the DWR to get a bank loan, or sell from storage directly on the marketplace.'],
                ].map(([n,title,desc])=>(
                  <div key={n} style={{display:'flex',gap:12,marginBottom:14}}>
                    <div style={{width:26,height:26,borderRadius:'50%',background:T.green,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,flexShrink:0}}>{n}</div>
                    <div><div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:2}}>{title}</div><div style={{fontSize:12,color:T.muted,lineHeight:1.5}}>{desc}</div></div>
                  </div>
                ))}
              </Card>

              {/* DWR financing flow */}
              <Card>
                <h3 style={{margin:'0 0 18px',fontSize:15,fontWeight:800,color:amber}}>🏦 DWR Bank Financing</h3>
                {[
                  ['1','Get a DWR','After storing your commodity, you receive a Digital Warehouse Receipt (DWR).'],
                  ['2','Apply for Loan','Submit your DWR to a bank partner. Eligible for up to 70% of commodity value.'],
                  ['3','Bank Places Lien','The bank places a lien on the stored goods as collateral security.'],
                  ['4','Receive Financing','Loan disbursed within 2–5 working days (ZTBL, NBP, HBL processing).'],
                  ['5','Repay & Release','Once you repay, the lien is lifted and you regain full ownership of the DWR.'],
                ].map(([n,title,desc])=>(
                  <div key={n} style={{display:'flex',gap:12,marginBottom:14}}>
                    <div style={{width:26,height:26,borderRadius:'50%',background:'#92400E',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,flexShrink:0}}>{n}</div>
                    <div><div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:2}}>{title}</div><div style={{fontSize:12,color:T.muted,lineHeight:1.5}}>{desc}</div></div>
                  </div>
                ))}
              </Card>
            </div>

            {/* Eligible loans */}
            <Card style={{marginBottom:20}}>
              <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:800,color:T.green}}>🏦 Bank Partners & Eligible Loan Products</h3>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead>
                    <tr style={{background:T.green}}>
                      {['Bank','Loan Product','Max Financing','Rate','Processing Time'].map(h=>(
                        <th key={h} style={{padding:'9px 12px',color:'#fff',textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['ZTBL','Agri Passbook / DWR Finance','70% of value','6–9% p.a.','3–5 days'],
                      ['National Bank of Pakistan','NBP Agri Loan','65% of value','8–10% p.a.','5–7 days'],
                      ['HBL','HBL Agriculture Finance','70% of value','9–12% p.a.','3–4 days'],
                      ['MCB Bank','MCB Agri Lending','60% of value','10–12% p.a.','4–6 days'],
                      ['Bank Alfalah','Agri DWR Product','65% of value','9–11% p.a.','3–5 days'],
                    ].map((row,i)=>(
                      <tr key={i} style={{background:i%2===0?T.surface:T.white}}>
                        {row.map((cell,j)=>(
                          <td key={j} style={{padding:'8px 12px',borderBottom:`1px solid ${T.border}`,fontWeight:j===0?700:400,color:j===2?T.teal:j===3?amber:T.text}}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Legal note */}
            <Card style={{background:'#FEF3C7',border:`1px solid #FDE68A`}}>
              <div style={{fontWeight:700,fontSize:13,color:amber,marginBottom:6}}>📋 Legal Framework</div>
              <p style={{fontSize:12,color:'#92400E',lineHeight:1.65,margin:0}}>Digital Warehouse Receipts on AgriConnect are issued under the <strong>Warehousing (Development and Regulatory) Act 2019</strong> and comply with the State Bank of Pakistan's guidelines on warehouse receipt financing. All partner warehouses are registered with the Pakistan Warehouse Receipt Financing Authority (WHARFA). DWRs carry legal weight as negotiable instruments under Pakistani commercial law.</p>
            </Card>
          </div>
        )}
      </div>

      {/* MODALS */}
      {bookingWarehouse && <BookingModal warehouse={bookingWarehouse} onClose={()=>setBookingWarehouse(null)}/>}
      {viewWarehouse && <WarehouseDetailModal w={viewWarehouse} onClose={()=>setViewWarehouse(null)} onBook={w=>{setViewWarehouse(null);handleBook(w);}}/>}
      {viewReceipt && (
        <ReceiptDetailModal
          receipt={viewReceipt}
          onClose={()=>setViewReceipt(null)}
          onPlaceLien={r=>{setViewReceipt(null);handlePlaceLien(r);}}
          onBuyInsurance={r=>{setViewReceipt(null);handleBuyInsurance(r);}}
        />
      )}
      {lienReceipt && <BankLienModal receipt={lienReceipt} onClose={()=>setLienReceipt(null)}/>}
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
