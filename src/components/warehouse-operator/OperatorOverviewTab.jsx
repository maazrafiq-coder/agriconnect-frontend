import { apiGetInvoice, apiGetGrn, apiGetGateOutPass } from '../../lib/api';
import { Card, Btn } from '../ui';
import { STATUS_COLORS } from '../../data';
import T from '../../theme';

// ─── OperatorOverviewTab ───
export function OperatorOverviewTab({ setReceiptBooking, setRejectBooking, actionError, actioningId, setDetailBooking, handleAccept, handleComplete, handleGenerateInvoice, handleConfirmPayment, handleRecordClearance, handleRequestGateOut, openDoc, recentBookings }) {
  return (
    recentBookings.length === 0 ? (
      <Card><p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No bookings yet — they'll show up here once a depositor books storage.</p></Card>
    ) : (
      <div style={{ display: 'grid', gap: 10 }}>
        {actionError && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#B91C1C' }}>⚠ {actionError}</div>
        )}
        {recentBookings.map(b => {
          const status = (b.status || 'requested').toLowerCase();
          const sc = STATUS_COLORS[status] || { bg: '#F3F4F6', c: '#6B7280', l: b.status };
          const busy = actioningId === b.id;
          return (
            <Card key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: T.muted, letterSpacing: 0.3 }}>{b.bookingReference}</span>
                  <span style={{ background: sc.bg, color: sc.c, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{sc.l}</span>
                  {['ACTIVE', 'PENDING'].includes(b.receipt?.lien?.status) && (
                    <span style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>{b.receipt.lien.status === 'PENDING' ? '⏳ Loan application pending' : '🏦 Under bank lien'}</span>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                  {b.commodity} {b.variety ? `· ${b.variety}` : ''} — {b.quantityTons} tons
                </div>
                <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                  {b.depositor?.profile?.fullName || 'Depositor'} · {b.depositor?.profile?.city || ''} · Entry {new Date(b.entryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Btn variant="ghost" size="sm" onClick={() => setDetailBooking(b)}>
                  📄 Details & Messages{b._count?.messages ? ` (${b._count.messages})` : ''}
                </Btn>
                {status === 'requested' && (
                  <>
                    <Btn variant="primary" size="sm" disabled={busy} onClick={() => handleAccept(b)}>{busy ? 'Accepting…' : 'Accept'}</Btn>
                    <Btn variant="ghost" size="sm" disabled={busy} onClick={() => setRejectBooking(b)}>Decline</Btn>
                  </>
                )}
                {status === 'accepted' && (
                  <Btn variant="secondary" size="sm" onClick={() => setReceiptBooking(b)}>Issue Receipt</Btn>
                )}
                {status === 'active' && (() => {
                  const released = (b.gateOutPasses || []).some(g => g.status === 'APPROVED');
                  return (
                    <Btn variant="secondary" size="sm" disabled={busy || !released}
                      title={released ? '' : 'Complete is available once a gate-out pass has been approved'}
                      onClick={() => handleComplete(b)}>{busy ? 'Completing…' : 'Mark Complete'}</Btn>
                  );
                })()}
              </div>

              {/* Paperwork (NEW_Changes item 10): invoice, GRN, gate-out pass */}
              {!['rejected', 'cancelled'].includes(status) && (() => {
                const gp = b.gateOutPasses?.[0];
                return (
                  <div style={{ flexBasis: '100%', borderTop: `1px solid ${T.border}`, paddingTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
                    {/* Invoice */}
                    {b.invoice ? (
                      <>
                        <span style={{ color: T.muted }}>Invoice {b.invoice.invoiceNumber}:</span>
                        <span style={{ fontWeight: 700, color: b.invoice.status === 'PAID' ? '#15803D' : '#B45309' }}>{b.invoice.status === 'PAID' ? '✓ Paid' : 'Unpaid'}</span>
                        <Btn variant="ghost" size="sm" onClick={() => openDoc(apiGetInvoice, b.invoice.id)}>📄 PDF</Btn>
                        {b.invoice.status === 'UNPAID' && (
                          <Btn variant="secondary" size="sm" disabled={busy} onClick={() => handleConfirmPayment(b)}>Confirm Payment</Btn>
                        )}
                      </>
                    ) : (
                      <Btn variant="secondary" size="sm" disabled={busy} onClick={() => handleGenerateInvoice(b)}>🧾 Generate & Send Invoice</Btn>
                    )}

                    {/* GRN — auto-issued with the receipt */}
                    {b.goodsReceiptNote ? (
                      <Btn variant="ghost" size="sm" onClick={() => openDoc(apiGetGrn, b.goodsReceiptNote.id)}>📦 GRN {b.goodsReceiptNote.grnNumber}</Btn>
                    ) : (
                      <span style={{ color: T.muted }}>📦 GRN: issued when you issue the receipt</span>
                    )}

                    {/* Bank lien: goods are collateral — no release until the bank clears */}
                    {b.receipt?.lien?.status === 'PENDING' && (
                      <div style={{ flexBasis: '100%', background: '#EFF6FF', border: '1px solid #93C5FD', borderRadius: 8, padding: '8px 12px', color: '#1E40AF' }}>
                        ⏳ A <strong>{b.receipt.lien.bankName}</strong> loan application of ₨{Number(b.receipt.lien.loanAmount).toLocaleString()} is awaiting confirmation. <strong>Do not release these goods</strong> while it is pending.
                      </div>
                    )}
                    {b.receipt?.lien?.status === 'ACTIVE' && (
                      <div style={{ flexBasis: '100%', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '8px 12px', color: '#92400E', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <span>🏦 <strong>{b.receipt.lien.bankName}</strong> holds a lien of ₨{Number(b.receipt.lien.loanAmount).toLocaleString()} on these goods. <strong>Do not release them</strong> — gate-out is blocked until the bank's clearance is recorded.</span>
                        <Btn variant="secondary" size="sm" disabled={busy} onClick={() => handleRecordClearance(b)}>Record bank clearance</Btn>
                      </div>
                    )}

                    {/* Gate-out pass */}
                    {status === 'active' && (!gp || gp.status === 'REJECTED') && !['ACTIVE', 'PENDING'].includes(b.receipt?.lien?.status) && (
                      <Btn variant="secondary" size="sm" disabled={busy} onClick={() => handleRequestGateOut(b)}>🚪 Request Gate-Out</Btn>
                    )}
                    {gp?.status === 'PENDING' && <span style={{ color: '#B45309', fontWeight: 700 }}>🚪 Gate-out awaiting depositor/admin approval</span>}
                    {gp?.status === 'REJECTED' && <span style={{ color: '#B91C1C' }}>Last gate-out rejected{gp.rejectionNote ? `: ${gp.rejectionNote}` : ''}</span>}
                    {gp?.status === 'APPROVED' && (
                      <Btn variant="ghost" size="sm" onClick={() => openDoc(apiGetGateOutPass, gp.id)}>🚪 Gate Pass {gp.passNumber}</Btn>
                    )}
                    {!gp && status !== 'active' && (
                      <span style={{ color: T.muted }}>🚪 Gate-out pass: available once goods are in storage and release is approved</span>
                    )}
                  </div>
                );
              })()}
            </Card>
          );
        })}
      </div>
    )
  );
}
