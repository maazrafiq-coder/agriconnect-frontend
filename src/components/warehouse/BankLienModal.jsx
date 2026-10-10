import { useState } from 'react';
import T from '../../theme';
import { apiApplyLien } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Btn } from '../ui';
import { ErrorBanner, amber, Modal, InfoRow, inputStyle } from './shared';

// ─── BANK LIEN MODAL ──────────────────────────────────────────────────────────
export const BankLienModal = ({ receipt, onClose, onSubmit }) => {
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
        <p style={{color:T.muted,fontSize:13,margin:'0 0 20px',lineHeight:1.6}}>Your loan application against warehouse receipt <strong>{receipt.number||receipt.id}</strong> ({bank}) is awaiting confirmation by an AgriConnect reviewer. Your goods are on hold until it is decided, and you can withdraw the application any time before then.</p>
        <div style={{background:T.surface,borderRadius:10,padding:14,marginBottom:20,textAlign:'left'}}>
          <InfoRow label="Receipt No." value={receipt.number||receipt.id}/>
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
        <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',gap:8}}>
          {[['Receipt',receipt.number||receipt.id],['Commodity',receipt.commodity],['Quantity',`${receipt.qty} tons`],['Market Value',`₨${receipt.currentValue.toLocaleString()}`]].map(([k,v])=>(
            <div key={k}><div style={{fontSize:9,color:T.muted,fontWeight:700}}>{k}</div><div style={{fontSize:12,fontWeight:700}}>{v}</div></div>
          ))}
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <label htmlFor="banklienmodal-f1" style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>SELECT BANK</label>
        <select id="banklienmodal-f1" value={bank} onChange={e=>setBank(e.target.value)} style={inputStyle}>
          <option value="">— Choose a bank —</option>
          {['National Bank of Pakistan','HBL','MCB Bank','UBL','Bank Alfalah','ZTBL (Agri Specialist)','Meezan Bank'].map(b=><option key={b}>{b}</option>)}
        </select>
      </div>

      <div style={{marginBottom:12}}>
        <label htmlFor="banklienmodal-f2" style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>LOAN PURPOSE</label>
        <select id="banklienmodal-f2" value={purpose} onChange={e=>setPurpose(e.target.value)} style={inputStyle}>
          <option value="working_capital">Working Capital</option>
          <option value="input_purchase">Input Purchase (Seeds, Fertilizer)</option>
          <option value="equipment">Equipment Purchase</option>
          <option value="new_crop">New Crop Financing</option>
        </select>
      </div>

      <div style={{marginBottom:8}}>
        <label htmlFor="banklienmodal-f3" style={{fontSize:11,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>LOAN AMOUNT (₨)</label>
        <input id="banklienmodal-f3" value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder={`Up to ₨${maxLoan.toLocaleString()} (indicative)`} style={inputStyle}/>
      </div>
      {amount && Number(amount)>maxLoan && <div style={{fontSize:11,color:T.danger,marginBottom:10}}>⚠ Above the indicative limit of ₨{maxLoan.toLocaleString()}</div>}

      <div style={{background:T.surface,borderRadius:8,padding:12,marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:6}}>INDICATIVE TERMS (final terms are set by the bank)</div>
        {[['Interest rate','Set by the bank'],['Fees','Set by the bank'],['Tenure','Set by the bank'],['Repayment','As agreed with the bank']].map(([k,v])=>(
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
