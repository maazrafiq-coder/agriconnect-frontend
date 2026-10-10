import { useState } from 'react';
import T from '../../theme';
import { apiBookStorage } from '../../lib/api';
import { toBookingRequest } from '../../lib/adapters';
import { useAuth } from '../../context/AuthContext';
import { Btn } from '../ui';
import { ErrorBanner, amber, Modal, InfoRow, inputStyle } from './shared';

// ─── BOOKING MODAL ────────────────────────────────────────────────────────────
export const BookingModal = ({ warehouse:w, onClose }) => {
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
          <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',gap:10,marginBottom:12}}>
            <div>
              <label htmlFor="bookingmodal-f1" style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5}}>COMMODITY</label>
              <select id="bookingmodal-f1" value={form.commodity} onChange={e=>set('commodity',e.target.value)} style={inputStyle}>
                <option value="">— Select —</option>
                {w.commodities.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="bookingmodal-f2" style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5}}>VARIETY / GRADE</label>
              <input id="bookingmodal-f2" value={form.variety} onChange={e=>set('variety',e.target.value)} placeholder="e.g. 1121 Basmati" style={inputStyle}/>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',gap:10,marginBottom:12}}>
            <div>
              <label htmlFor="bookingmodal-f3" style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5}}>QUANTITY (tons)</label>
              <input id="bookingmodal-f3" value={form.qty} onChange={e=>set('qty',e.target.value)} type="number" placeholder="e.g. 50" style={inputStyle}/>
              {form.qty && Number(form.qty)>w.available && <div style={{fontSize:11,color:T.danger,marginTop:3}}>⚠ Only {w.available} tons available</div>}
            </div>
            <div>
              <label htmlFor="bookingmodal-f4" style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5}}>DURATION (days)</label>
              <input id="bookingmodal-f4" value={form.duration} onChange={e=>set('duration',e.target.value)} type="number" placeholder={`Min. ${w.minDuration} days`} style={inputStyle}/>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label htmlFor="bookingmodal-f5" style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5}}>ENTRY DATE</label>
            <input id="bookingmodal-f5" value={form.entryDate} onChange={e=>set('entryDate',e.target.value)} type="date" style={inputStyle}/>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5}}>PACKAGING TYPE</div>
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
          <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',gap:8}}>
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
