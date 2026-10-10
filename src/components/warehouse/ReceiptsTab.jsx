import T from '../../theme';
import { Btn, Card, LoadingState } from '../ui';
import { amber } from './shared';
import { DWRCard } from './DWRCard';

// ─── ReceiptsTab ───
export function ReceiptsTab({ openLogin, setTab, MY_RECEIPTS, receiptsState, loadReceipts, setViewReceipt }) {
  return (
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
      {receiptsState==='loading' && <LoadingState label="Loading your receipts…" />}
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
              ['Under Bank Lien','₨'+MY_RECEIPTS.filter(r=>r.lien?.status==='active').reduce((s,r)=>s+r.lien.amount,0).toLocaleString(),amber,'🏦'],
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
  );
}
