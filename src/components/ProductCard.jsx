import { useNavigate } from 'react-router-dom';
import T from '../theme';
import { Badge, Stars } from './ui';
import { BADGE_TYPE } from '../data';

export default function ProductCard({ product: p }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/product/${p.id}`)}
      style={{
        background: T.white, borderRadius: 12,
        border: `1px solid ${T.border}`, overflow: 'hidden',
        cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
    >
      <div style={{ height: 120, background: 'linear-gradient(135deg,#74C69D22,#B7A05A22,#1A3A2A11)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, position: 'relative' }}>
        🌾
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <Badge label={p.badge} type={BADGE_TYPE[p.badge] || 'green'} />
        </div>
        {p.sellerVerified && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: '#DCFCE7', color: '#15803D', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
            ✓ Verified
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.green, marginBottom: 2 }}>{p.name}</div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>{p.stage} · 📍 {p.location.split(',')[0]}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 17, fontWeight: 800, color: T.gold }}>₨{p.price.toLocaleString()}</span>
            <span style={{ fontSize: 11, color: T.muted }}>/{p.unit}</span>
          </div>
          <span style={{ fontSize: 11, color: T.muted }}>{p.qty} avail.</span>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 10, background: '#F0FDF4', color: '#15803D', padding: '2px 7px', borderRadius: 10 }}>💧{p.metrics.moisture}%</span>
          <span style={{ fontSize: 10, background: '#FEF3C7', color: '#B45309', padding: '2px 7px', borderRadius: 10 }}>📏{p.metrics.length}mm</span>
          <span style={{ fontSize: 10, background: '#DBEAFE', color: '#1D4ED8', padding: '2px 7px', borderRadius: 10 }}>💔{p.metrics.broken}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: p.sellerVerified ? 700 : 400, color: p.sellerVerified ? T.mid : T.muted }}>
            {p.sellerVerified ? '✓ ' : ''}{p.seller}
          </span>
          <Stars rating={p.sellerRating} />
        </div>
      </div>
    </div>
  );
}
