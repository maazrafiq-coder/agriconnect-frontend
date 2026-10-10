import { useNavigate } from 'react-router-dom';
import T from '../theme';
import { Badge, Stars } from './ui';
import { BADGE_TYPE } from '../data';

export default function ProductCard({ product: p }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/product/${p.id}`)}
      role="link"
      tabIndex={0}
      aria-label={`${p.name}, ${p.location}`}
      onKeyDown={e => { if (e.key === 'Enter') navigate(`/product/${p.id}`); }}
      style={{
        background: T.white, borderRadius: 12,
        border: `1px solid ${T.border}`, overflow: 'hidden',
        cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
    >
      <div style={{ height: 120, background: p.images?.[0] ? `url(${p.images[0]}) center/cover no-repeat` : 'linear-gradient(135deg,#74C69D22,#B7A05A22,#1A3A2A11)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, position: 'relative' }}>
        {!p.images?.[0] && '🌾'}
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
            <span style={{ fontSize: 17, fontWeight: 800, color: T.goldText }}>₨{p.price.toLocaleString()}</span>
            <span style={{ fontSize: 11, color: T.muted }}>/{p.unit}</span>
          </div>
          <span style={{ fontSize: 11, color: T.muted }}>{p.qty} avail.</span>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {[
            ['💧', p.metrics?.moisture, '%', '#F0FDF4', '#15803D'],
            ['📏', p.metrics?.length, 'mm', '#FEF3C7', '#B45309'],
            ['💔', p.metrics?.broken, '%', '#DBEAFE', '#1D4ED8'],
          ].map(([icon, v, unit, bg, fg]) => v != null && (
            <span key={icon} style={{ fontSize: 10, background: bg, color: fg, padding: '2px 7px', borderRadius: 10 }}>{icon}{v}{unit}</span>
          ))}
          {p.metrics?.moisture == null && p.metrics?.length == null && p.metrics?.broken == null && (
            <span style={{ fontSize: 10, background: '#F3F4F6', color: T.muted, padding: '2px 7px', borderRadius: 10 }}>Quality details not provided</span>
          )}
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
