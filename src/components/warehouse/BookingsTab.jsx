import T from '../../theme';
import { apiGetInvoice, apiGetGrn, apiGetGateOutPass } from '../../lib/api';
import { STATUS_COLORS } from '../../data';
import { Btn, Card, LoadingState } from '../ui';

// ─── BookingsTab ───
export function BookingsTab({ openLogin, MY_BOOKINGS, bookingsState, setThreadBooking, docError, docBusyId, openDoc, decideGateOut, loadBookings, setCancelBookingTarget }) {
  return (
    <div>
      {bookingsState==='guest' && (
        <div style={{textAlign:'center',padding:'48px 20px',color:T.muted,background:T.white,borderRadius:12,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:32,marginBottom:10}}>🔒</div>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:10}}>Log in to view your bookings</div>
          <Btn variant="primary" onClick={openLogin}>Log In</Btn>
        </div>
      )}
      {bookingsState==='loading' && <LoadingState label="Loading your bookings…" />}
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
              <div key={b.id} data-focus-id={b.id}><Card style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:0.3}}>{b.reference}</span>
                    <span style={{background:sc.bg,color:sc.c,padding:'2px 8px',borderRadius:8,fontSize:10,fontWeight:700}}>{sc.l}</span>
                    {b.lien && <span style={{background:'#FEF3C7',color:'#B45309',padding:'2px 8px',borderRadius:8,fontSize:10,fontWeight:800}}>{b.lien.status==='pending' ? '⏳ Loan application pending' : '🏦 Under bank lien'}</span>}
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
                    {b.lien && (
                      <div style={{flexBasis:'100%',background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:8,padding:'8px 12px',color:'#92400E'}}>
                        {b.lien.status==='pending'
                          ? <>⏳ A <strong>{b.lien.bank}</strong> loan application of ₨{b.lien.amount.toLocaleString()} (since {b.lien.placed}) is awaiting confirmation. The goods are on hold until it is decided.</>
                          : <>🏦 These goods are collateral for a <strong>{b.lien.bank}</strong> loan of ₨{b.lien.amount.toLocaleString()} (since {b.lien.placed}). The warehouse cannot release them until the bank's clearance is recorded.</>}
                      </div>
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
              </Card></div>
            );
          })}
        </div>
      )}
    </div>
  );
}
