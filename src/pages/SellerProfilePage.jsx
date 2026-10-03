import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { Card, Stars, LoadingState, ErrorState } from '../components/ui';
import { apiGetSellerProfile } from '../lib/api';
import { adaptProducts } from '../lib/adapters';
import T from '../theme';

// Marketplace "view seller" click-through (NEW_Changes item 5): a buyer
// browsing a listing should be able to see everything about who's selling
// it — verification, rating, and every other active listing — not just
// the one product they clicked into.
export default function SellerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seller,  setSeller]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGetSellerProfile(id)
      .then(setSeller)
      .catch(err => setError(err?.message || 'This seller could not be found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState label="Loading seller profile…" />;
  if (error || !seller) return <ErrorState message={error || 'Seller not found.'} onRetry={() => navigate(-1)} />;

  const listings = adaptProducts(seller.listings || []);
  const displayName = seller.businessName || seller.fullName || 'Seller';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>
      <Card style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: T.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, flexShrink: 0 }}>
            {displayName[0]}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, color: T.text }}>{displayName}</h2>
              {seller.verified && (
                <span style={{ fontSize: 11, background: '#DCFCE7', color: '#15803D', fontWeight: 700, padding: '3px 9px', borderRadius: 10 }}>✓ Verified</span>
              )}
            </div>
            {seller.fullName && seller.businessName && (
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{seller.fullName}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Stars rating={seller.avgRating} />
              <span style={{ fontSize: 12, color: T.muted }}>({seller.totalReviews} reviews)</span>
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
              {[seller.city, seller.province].filter(Boolean).join(', ') || '—'}
              {' · '}Member since {new Date(seller.memberSince).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })}
              {' · '}{seller.completedSalesCount} completed sale{seller.completedSalesCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </Card>

      <h3 style={{ color: T.text, marginBottom: 12 }}>
        {listings.length ? `Active Listings (${listings.length})` : 'No active listings right now'}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {listings.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
