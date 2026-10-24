import { apiChangeProductStatus, apiDeleteProduct } from '../../lib/api';
import { Card, Btn, Badge, LoadingState, ErrorState } from '../ui';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useState } from 'react';
import T from '../../theme';

import { useApprovalGate } from '../../context/ApprovalGate';
export const LISTING_STATUS = {
  ACTIVE:          { label: 'Active',            type: 'green' },
  PENDING_REVIEW:  { label: 'Pending Review',     type: 'gold'  },
  REJECTED:        { label: 'Rejected',           type: 'red'   },
  PAUSED:          { label: 'Paused',             type: 'gray'  },
  UNDER_OFFER:     { label: 'Under Offer',        type: 'blue'  },
  SOLD:            { label: 'Sold',               type: 'purple'},
  REMOVED:         { label: 'Removed',            type: 'red'   },
};

// ─── SellerListingsTab ───
export function SellerListingsTab({ navigate, setNewListingModal, setEditListing, setMediaModalProduct, myListings, setMyListings, listingsState, loadListings }) {
  const gate = useApprovalGate();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionError, setActionError] = useState('');
  return (
    <div>
      {actionError && <div role="alert" style={{ color: T.danger, fontSize: 12, marginBottom: 10 }}>{actionError}</div>}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete listing" danger confirmLabel="Delete listing"
          description={`Delete "${deleteTarget.name || deleteTarget.title || 'this listing'}"?`}
          consequences={['Listings with existing offers are archived instead of deleted, to keep their history.']}
          onConfirm={async () => {
            const p = deleteTarget;
            const result = await apiDeleteProduct(p._raw?.id || p.id);
            if (result?.archived) setMyListings(prev => prev.map(x => x.id === p.id ? { ...x, status: 'REMOVED' } : x));
            else setMyListings(prev => prev.filter(x => x.id !== p.id));
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {listingsState === 'loading' && <LoadingState label="Loading your listings…" />}
      {listingsState === 'error' && <ErrorState message="Could not load your listings." onRetry={loadListings} />}
      {listingsState === 'ready' && (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 14 }}>
      {myListings.map(p => (
        <div key={p.id} data-focus-id={p.id}><Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ height: 90, background: p.images?.[0] ? `url(${p.images[0]}) center/cover no-repeat` : 'linear-gradient(135deg,#74C69D22,#B7A05A22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, position: 'relative' }}>
            {!p.images?.[0] && '🌾'}
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <Badge label={(LISTING_STATUS[p.status] || LISTING_STATUS.ACTIVE).label} type={(LISTING_STATUS[p.status] || LISTING_STATUS.ACTIVE).type} />
            </div>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.green, marginBottom: 3 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>{p.qty} {p.unit} · ₨{p.price.toLocaleString()}/{p.unit}</div>
            {p.status === 'REJECTED' && p.rejectionNote && (
              <div style={{ fontSize: 11, color: T.danger, background: '#FEE2E2', padding: '6px 8px', borderRadius: 6, marginBottom: 8 }}>
                {p.rejectionNote} — edit and save to resubmit for review.
              </div>
            )}
            {p.status === 'PENDING_REVIEW' && (
              <div style={{ fontSize: 11, color: '#B45309', marginBottom: 8 }}>
                Awaiting admin approval before it appears on the marketplace.
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Btn variant="secondary" size="sm" onClick={() => navigate(`/product/${p.id}`)}>View</Btn>
              {!['SOLD', 'REMOVED'].includes(p.status) && (
                <Btn variant="ghost" size="sm" onClick={() => setEditListing(p)}>Edit</Btn>
              )}
              <Btn variant="ghost" size="sm" onClick={() => setMediaModalProduct(p)}>
                📷 {p.images?.length ? `Photos (${p.images.length})` : 'Add Photos'}
              </Btn>
              {(p.status === 'ACTIVE' || p.status === 'PAUSED') && (
                <Btn variant="ghost" size="sm" onClick={async () => {
                  try {
                    await apiChangeProductStatus(p._raw?.id || p.id, p.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED');
                    setMyListings(prev => prev.map(x => x.id === p.id ? { ...x, status: x.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED' } : x));
                  } catch (e) { setActionError(e.message || 'Could not update listing status'); }
                }}>{p.status === 'PAUSED' ? 'Resume' : 'Pause'}</Btn>
              )}
              {p.status !== 'SOLD' && (
                <Btn variant="danger" size="sm" onClick={() => setDeleteTarget(p)}>🗑️ Delete</Btn>
              )}
            </div>
          </div>
        </Card></div>
      ))}
      <Card
        onClick={gate(() => setNewListingModal(true), 'create a listing')}
        style={{ border: `2px dashed ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, cursor: 'pointer' }}
      >
        <div style={{ textAlign: 'center', color: T.muted }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>+</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Add New Listing</div>
        </div>
      </Card>
    </div>
      )}
    </div>
  );
}
