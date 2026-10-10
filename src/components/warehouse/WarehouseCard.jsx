import T from '../../theme';
import { Btn, Card } from '../ui';
import { StatusPill, Stars } from './shared';

// ─── WAREHOUSE CARD ───────────────────────────────────────────────────────────
export const WarehouseCard = ({ w, onBook, onView }) => {
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
      <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',gap:8,marginBottom:12}}>
        {[['💰 Rate',`₨${w.pricePerTon}/ton/mo`],['🌡️ Type',w.type],['📦 Accepts',w.commodities.slice(0,2).join(', ')+'…'],['🏦 Banks',`${w.bankPartners.length} partners`]].map(([k,v])=>(
          <div key={k} style={{background:T.surface,borderRadius:7,padding:'7px 10px'}}>
            <div style={{fontSize:10,color:T.muted,marginBottom:1}}>{k.split(' ')[0]} <span style={{color:T.muted,fontWeight:600}}>{k.split(' ')[1]}</span></div>
            <div style={{fontSize:11,fontWeight:700,color:T.text}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:12}}>
        {w.certifications.map(c=><span key={c} style={{background:'#DCFCE7',color:'#15803D',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:8}}>✓ {c}</span>)}
        {w.insuranceAvailable&&<span style={{background:'#D1FAE5',color:T.tealText,fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:8}}>🛡️ Insurance Available</span>}
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
