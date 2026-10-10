import T from '../../theme';
import { Btn } from '../ui';
import { amber, Modal } from './shared';

// ─── WAREHOUSE DETAIL MODAL ───────────────────────────────────────────────────
export const WarehouseDetailModal = ({ w, onClose, onBook }) => (
  <Modal title={w.name} onClose={onClose} width={600}>
    <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
      {w.certifications.map(c=><span key={c} style={{background:'#DCFCE7',color:'#15803D',fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:10}}>✓ {c}</span>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',gap:10,marginBottom:16}}>
      {[['Type',w.type],['Location',`${w.city}, ${w.province}`],['Total Capacity',`${w.capacity.toLocaleString()} tons`],['Available',`${w.available.toLocaleString()} tons`],['Rate',`₨${w.pricePerTon}/ton/month`],['Min. Duration',`${w.minDuration} days`],['Established',w.established],['Manager',w.manager]].map(([k,v])=>(
      <div key={k} style={{background:T.surface,borderRadius:8,padding:'10px 12px'}}>
        <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:0.5,marginBottom:2}}>{k}</div>
        <div style={{fontSize:13,fontWeight:700,color:T.text}}>{v}</div>
      </div>
    ))}
    </div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:6,letterSpacing:0.5}}>FACILITIES</div>
      <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',gap:4}}>
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
    <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',gap:8}}>
      <Btn variant="primary" style={{padding:'11px'}} onClick={()=>{onClose();onBook(w);}}>Book Storage →</Btn>
      {w.phone ? (
        <a href={`tel:${w.phone}`} style={{textDecoration:'none'}}><Btn variant="ghost" style={{width:'100%'}}>📞 Call {w.manager || 'Manager'} · {w.phone}</Btn></a>
      ) : (
        <Btn variant="ghost" disabled>Contact details not listed</Btn>
      )}
    </div>
  </Modal>
);
