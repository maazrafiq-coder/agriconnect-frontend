import { useState } from 'react';
import RequestFlowModal from '../ui/RequestFlowModal';
import useRequestId from '../../lib/useRequestId';
import T from '../../theme';
import { apiApplyLien } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { amber, inputStyle } from './shared';

// ─── BANK LIEN MODAL ──────────────────────────────────────────────────────────
export const BankLienModal = ({ receipt, onClose, onSubmit }) => {
  const { openLogin } = useAuth();
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('working_capital');
  const maxLoan = Math.round(receipt.currentValue * 0.7);
  const requestKey = useRequestId(JSON.stringify([receipt.id, bank, amount, purpose]));
  const purposeLabel = { working_capital: 'Working Capital', input_purchase: 'Input Purchase (Seeds, Fertilizer)', equipment: 'Equipment Purchase', new_crop: 'New Crop Financing' }[purpose];
  const rec = receipt.number || receipt.id;

  const form = (
    <div>
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

    </div>
  );

  return (
    <RequestFlowModal
      title="Apply for Warehouse Receipt Loan"
      stepLabels={['Details', 'Review', 'Submitted']}
      width={520}
      form={form}
      canReview={!!bank && !!amount}
      validate={() => (!bank ? 'Choose a bank.' : !(Number(amount) > 0) ? 'Enter a loan amount.' : Number(amount) > maxLoan ? `The amount is above the indicative limit of ₨${maxLoan.toLocaleString()}.` : null)}
      reviewTitle="Check your loan application"
      reviewNotice="Submitting places your goods on hold while an AgriConnect reviewer confirms the application. Interest, fees and tenure are set by the bank - the figures below are only indicative. You can withdraw the application any time before it is decided."
      summaryRows={[
        { label: 'Receipt No.', value: rec },
        { label: 'Commodity', value: `${receipt.qty} ${receipt.unit || ''} of ${receipt.commodity}`.replace('  ', ' ') },
        { label: 'Collateral value', value: `₨${receipt.currentValue.toLocaleString()}` },
        { label: 'Bank', value: bank },
        { label: 'Purpose', value: purposeLabel },
        { label: 'Requested loan', value: `₨${Number(amount).toLocaleString()}`, accent: amber },
        { label: 'Indicative terms', value: '8% / 6 months (final terms set by the bank)' },
      ]}
      confirmLabel="Submit Loan Application"
      confirmingLabel="Submitting…"
      onSubmit={async () => {
        const res = await apiApplyLien({
          receiptId: receipt._raw?.id || receipt.id,
          bankName: bank,
          loanPurpose: purpose,
          loanAmount: Number(amount),
          interestRate: 8,
          tenureMonths: 6,
        }, requestKey());
        onSubmit?.(res);
        return res;
      }}
      success={() => ({
        icon: '🏦',
        title: 'Application received',
        message: `Your application against receipt ${rec} (${bank}) is awaiting confirmation by an AgriConnect reviewer. Your goods are on hold until it is decided; you can withdraw it any time before then. No money has moved.`,
        rows: [
          { label: 'Receipt No.', value: rec },
          { label: 'Requested loan', value: `₨${Number(amount).toLocaleString()}`, accent: amber },
          { label: 'Bank', value: bank },
        ],
        status: 'Awaiting review',
      })}
      onClose={onClose}
      onLogin={openLogin}
    />
  );
};
