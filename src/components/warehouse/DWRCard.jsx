import T from '../../theme';
import { Card } from '../ui';
import { amber, StatusPill, LIEN_LABEL } from './shared';

// ─── DIGITAL WAREHOUSE RECEIPT ─────────────────────────────────────────────────
export const DWRCard = ({ receipt:r, onViewDetails }) => {
  const statusColor = { active:T.teal, lien:T.warn, released:T.muted };
  return (
    <Card style={{borderLeft:`4px solid ${statusColor[r.status]||T.green}`,padding:0,overflow:'hidden'}} onClick={()=>onViewDetails(r)}>
      <div style={{padding:'14px 18px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.5,marginBottom:2}}>DIGITAL WAREHOUSE RECEIPT</div>
          <div style={{fontSize:16,fontWeight:900,color:T.green,fontFamily:'monospace'}}>{r.number||r.id}</div>
        </div>
        <StatusPill status={r.status}/>
      </div>
      <div style={{padding:'14px 18px'}}>
        <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',gap:10,marginBottom:12}}>
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
            {r.currentValue > 0
              ? <div style={{fontSize:14,fontWeight:800,color:T.goldText}}>₨{r.currentValue.toLocaleString()}</div>
              : <div style={{fontSize:12,fontWeight:700,color:T.muted}} title="An admin has not set a price for this commodity yet">Valuation pending</div>}
          </div>
        </div>
        <div style={{display:'flex',gap:6,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}>
          <div style={{fontSize:11,color:T.muted}}>Entry: {r.entryDate} · Expiry: {r.expiryDate}</div>
          {r.lien && (r.lien.status==='active'
            ? <div style={{background:'#FEF3C7',color:amber,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:8}}>🏦 Under bank lien: {r.lien.bank}</div>
            : r.lien.status==='pending'
              ? <div style={{background:'#DBEAFE',color:'#1D4ED8',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:8}}>⏳ Loan application pending: {r.lien.bank}</div>
              : <div style={{background:'#F3F4F6',color:T.muted,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:8}}>🏦 {LIEN_LABEL[r.lien.status] || 'Lien closed'}: {r.lien.bank}</div>)}
          {r.insurance && <div style={{background:'#D1FAE5',color:T.tealText,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:8}}>🛡️ Insured</div>}
        </div>
      </div>
    </Card>
  );
};
