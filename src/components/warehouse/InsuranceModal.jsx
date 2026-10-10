import { useState, useEffect } from 'react';
import T from '../../theme';
import { apiBuyInsurance, apiGetInsuranceQuote } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Btn } from '../ui';
import { ErrorBanner, Modal, InfoRow } from './shared';

// ─── INSURANCE MODAL ──────────────────────────────────────────────────────────
// The premium is priced by the warehouse (rate × tons × months left) and
// computed on the server — what you see here is exactly what is charged.
export const InsuranceModal = ({ receipt, onClose }) => {
  const { openLogin } = useAuth();
  const [quote, setQuote] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [booked, setBooked] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const receiptId = receipt._raw?.id || receipt.id;

  useEffect(() => {
    apiGetInsuranceQuote(receiptId).then(setQuote).catch(e => setLoadError(e?.message || 'Could not get a quote.'));
  }, [receiptId]);

  if (booked) {
    return (
      <Modal title="Storage Cover Active" onClose={onClose}>
        <div style={{textAlign:'center',padding:'20px 0'}}>
          <div style={{fontSize:52,marginBottom:14}}>🛡️</div>
          <h3 style={{color:T.tealText,margin:'0 0 10px'}}>Cover Activated</h3>
          <div style={{background:'#F0FDF4',border:`1px solid #86EFAC`,borderRadius:10,padding:14,marginBottom:20,textAlign:'left'}}>
            <InfoRow label="Policy No." value={booked.insurance?.policyNumber || '—'}/>
            <InfoRow label="Provided by" value={quote.provider}/>
            <InfoRow label="Cover amount" value={`₨${quote.coverageAmount.toLocaleString()}`} accent={T.teal}/>
            <InfoRow label="Premium" value={`₨${quote.premiumAmount.toLocaleString()}`}/>
            <InfoRow label="Valid until" value={receipt.expiryDate}/>
          </div>
          <Btn variant="teal" onClick={onClose}>Done</Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Storage Insurance" onClose={onClose} width={520}>
      <div style={{background:'#F0FDF4',border:`1px solid #86EFAC`,borderRadius:10,padding:12,marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:700,color:T.tealText,marginBottom:4}}>Insuring: {receipt.commodity} — {receipt.qty} {receipt.unit}</div>
        <div style={{fontSize:11,color:T.muted}}>Warehouse: {receipt.warehouseName} · {receipt.warehouseCity}</div>
      </div>
      {!quote && !loadError && <div style={{fontSize:13,color:T.muted,padding:'12px 0'}}>Getting your quote…</div>}
      {loadError && <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#B91C1C'}}>{loadError}</div>}
      {quote && (
        <>
          <div style={{background:T.surface,borderRadius:10,padding:14,marginBottom:14}}>
            <InfoRow label="Provided by" value={quote.provider}/>
            <InfoRow label="Rate" value={`₨${quote.rate.toLocaleString()} per ton per month`}/>
            <InfoRow label="Period" value={`${quote.months} month${quote.months===1?'':'s'} (until receipt expiry)`}/>
            <InfoRow label="Cover amount" value={`₨${quote.coverageAmount.toLocaleString()} (current value of the goods)`}/>
            <InfoRow label="Premium" value={`₨${quote.premiumAmount.toLocaleString()}`} accent={T.gold}/>
          </div>
          <div style={{fontSize:11,color:T.muted,marginBottom:14,lineHeight:1.6}}>This cover is offered by the warehouse under its own storage insurance terms. Ask the warehouse for the full policy wording.</div>
          <ErrorBanner message={error} onLogin={openLogin}/>
          <Btn variant="teal" style={{width:'100%',padding:'11px'}} disabled={submitting} onClick={async ()=>{
            setError(null);
            setSubmitting(true);
            try {
              setBooked(await apiBuyInsurance({ receiptId }));
            } catch (e) {
              setError(e?.message || 'Failed to activate cover. Please try again.');
            } finally {
              setSubmitting(false);
            }
          }}>
            {submitting ? 'Activating…' : `Activate cover — ₨${quote.premiumAmount.toLocaleString()}`}
          </Btn>
        </>
      )}
    </Modal>
  );
};
