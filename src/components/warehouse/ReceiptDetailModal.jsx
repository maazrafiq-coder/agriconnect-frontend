import T from '../../theme';
import { Btn } from '../ui';
import { amber, Modal, StatusPill, InfoRow, LIEN_LABEL } from './shared';

export const lienBlocksNew = (l) => l && (l.status==='active' || l.status==='pending');

export const ReceiptDetailModal = ({ receipt:r, onClose, onPlaceLien, onBuyInsurance, onWithdrawLien }) => (
  <Modal title={`Receipt: ${r.number||r.id}`} onClose={onClose} width={580}>
    {/* Header */}
    <div style={{background:`linear-gradient(135deg,${T.green},${T.mid})`,borderRadius:10,padding:16,marginBottom:18,color:'#fff'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div>
          <div style={{fontSize:10,color:T.mint,fontWeight:700,letterSpacing:1}}>DIGITAL WAREHOUSE RECEIPT</div>
          <div style={{fontSize:20,fontWeight:900,fontFamily:'monospace',marginTop:2}}>{r.number||r.id}</div>
        </div>
        <StatusPill status={r.status}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
        {[['Commodity',r.commodity],['Quantity',`${r.qty} ${r.unit}`],['Value',`₨${r.currentValue.toLocaleString()}`]].map(([k,v])=>(
          <div key={k}><div style={{fontSize:9,color:T.mint,fontWeight:700,letterSpacing:0.5}}>{k}</div><div style={{fontSize:13,fontWeight:700}}>{v}</div></div>
        ))}
      </div>
    </div>

    {/* Quality */}
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:8,letterSpacing:0.5}}>QUALITY METRICS</div>
      <div style={{display:'flex',gap:8}}>
        {[['Moisture',r.quality?.moisture],['Broken',r.quality?.broken],['Purity',r.quality?.purity]].map(([k,raw])=>{ const v = raw!=null ? `${raw}%` : 'Not provided'; return (
          <div key={k} style={{flex:1,background:T.surface,borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:raw!=null?14:11,fontWeight:800,color:raw!=null?T.green:T.muted}}>{v}</div>
            <div style={{fontSize:9,color:T.muted,fontWeight:600}}>{k}</div>
          </div>
        );})}
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
        <div style={{fontSize:11,fontWeight:700,color:amber,marginBottom:8}}>
          {r.lien.status==='active' ? '🏦 BANK LIEN ACTIVE' : r.lien.status==='pending' ? '⏳ LOAN APPLICATION PENDING' : `🏦 ${(LIEN_LABEL[r.lien.status]||'LIEN CLOSED').toUpperCase()}`}
        </div>
        <InfoRow label="Bank" value={r.lien.bank}/>
        <InfoRow label={r.lien.status==='active' ? 'Lien Amount' : 'Requested Amount'} value={`₨${r.lien.amount.toLocaleString()}`} accent={amber}/>
        <InfoRow label={r.lien.status==='pending' ? 'Applied On' : 'Date'} value={r.lien.placed}/>
        {r.lien.loanRefNo && <InfoRow label="Bank Loan Ref." value={r.lien.loanRefNo}/>}
        {r.lien.interestRate!=null && r.lien.status==='active' && <InfoRow label="Interest Rate" value={`${r.lien.interestRate}% p.a.`}/>}
        {r.lien.decisionNote && r.lien.status==='rejected' && <InfoRow label="Reason" value={r.lien.decisionNote}/>}
        <InfoRow label="Status" value={r.lien.status}/>
        {r.lien.status==='pending' && (
          <div style={{marginTop:10}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:8}}>An AgriConnect reviewer is confirming this with the bank. Your goods stay on hold until it is decided.</div>
            <Btn variant="secondary" size="sm" onClick={()=>onWithdrawLien(r)}>Withdraw application</Btn>
          </div>
        )}
      </div>
    )}

    {/* Insurance */}
    {r.insurance && (
      <div style={{background:'#F0FDF4',border:`1px solid #86EFAC`,borderRadius:10,padding:14,marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:T.tealText,marginBottom:8}}>🛡️ STORAGE INSURANCE ACTIVE</div>
        <InfoRow label="Provider" value={r.insurance.provider}/>
        <InfoRow label="Coverage" value={`₨${r.insurance.coverage.toLocaleString()}`} accent={T.teal}/>
        <InfoRow label="Policy No." value={r.insurance.policy}/>
        <InfoRow label="Expiry" value={r.insurance.expiry}/>
      </div>
    )}

    {/* Actions */}
    <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',gap:8,marginTop:6}}>
      {r.status==='active' && !lienBlocksNew(r.lien) && r.currentValue>0 && <Btn variant="amber" onClick={()=>onPlaceLien(r)}>🏦 Apply for Bank Loan</Btn>}
      {r.status==='active' && !lienBlocksNew(r.lien) && !(r.currentValue>0) && <div style={{fontSize:12,color:T.muted,alignSelf:'center'}}>Loans open once the commodity price is set by an admin (valuation pending).</div>}
      {r.status==='active' && !r.insurance && <Btn variant="teal" onClick={()=>onBuyInsurance(r)}>🛡️ Buy Insurance</Btn>}
      <Btn variant="secondary" onClick={()=>window.print()}>🖨️ Print / Save as PDF</Btn>
    </div>
  </Modal>
);
