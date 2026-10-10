import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';
import { Btn, LoadingState, ErrorState, EmptyState } from '../components/ui';
import { apiGetProducts, apiGetPublicStats } from '../lib/api';
import { adaptProducts } from '../lib/adapters';
import T from '../theme';

export default function HomePage() {
  const navigate = useNavigate();
  const { openRegister } = useAuth();
  const [search, setSearch]     = useState('');
  const [featured, setFeatured] = useState([]);
  const [stats, setStats] = useState(null);
  const [featuredState, setFeaturedState] = useState('loading'); // loading | ready | error

  const loadFeatured = () => {
    setFeaturedState('loading');
    apiGetProducts({ limit: 4, sortBy: 'featured' })
      .then(res => { setFeatured(adaptProducts(res.data || [])); setFeaturedState('ready'); })
      .catch(() => {
        // Demo data only ever appears when VITE_DEMO_MODE=true is explicitly
        // set — never as a silent stand-in for a failed API call.
        setFeaturedState('error');
      });
  };

  useEffect(() => { loadFeatured(); apiGetPublicStats().then(setStats).catch(() => setStats(null)); }, []);

  return (
    <div>
      {/* HERO */}
      <div style={{ background: `linear-gradient(135deg, ${T.green} 0%, ${T.mid} 55%, ${T.green} 100%)`, padding: '64px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 40px,rgba(183,160,90,0.04) 40px,rgba(183,160,90,0.04) 80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(183,160,90,0.15)', border: '1px solid rgba(183,160,90,0.3)', color: T.gold, padding: '5px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 18 }}>
            🇵🇰 PAKISTAN'S DIGITAL AGRICULTURE MARKETPLACE
          </div>
          <h1 style={{ color: T.bg, margin: '0 0 14px', fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-1.5px' }}>
            Buy & Sell Agricultural<br />Products with Confidence
          </h1>
          <p style={{ color: T.mint, fontSize: 'clamp(13px,2vw,17px)', margin: '0 0 32px', lineHeight: 1.65 }}>
            Connect with verified farmers, millers, and traders. Get lab-certified quality reports and arrange transport — all in one platform.
          </p>
          <div style={{ display: 'flex', gap: 8, background: T.white, borderRadius: 14, padding: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.25)', maxWidth: 580, margin: '0 auto 24px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: 16 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/marketplace?q=${encodeURIComponent(search)}`)}
                placeholder="Search variety, seller, location..."
                style={{ width: '100%', padding: '10px 12px 10px 38px', border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: 'transparent', color: T.text }} />
            </div>
            <Btn variant="gold" onClick={() => navigate(`/marketplace?q=${encodeURIComponent(search)}`)}>Search Products</Btn>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[['🌾 Rice', 'rice'], ['🌾 Paddy', 'paddy'], ['🌽 Maize', 'maize'], ['🌿 Wheat', 'wheat'], ['🫘 Pulses', 'pulses'], ['🛢️ Oil Seeds', 'oil-seeds']].map(([c, slug]) => (
              <button key={c} onClick={() => navigate(`/marketplace?category=${slug}`)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.88)', padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* STATS — real numbers from the server; hidden if unavailable or still empty */}
      {stats && (stats.verifiedSellers > 0 || stats.activeListings > 0) && (
        <div style={{ background: T.gold, padding: '14px 20px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 10 }}>
            {[[stats.verifiedSellers, 'Verified Sellers'], [stats.activeListings, 'Active Listings'], [stats.completedOrders, 'Completed Orders'], [stats.verifiedWarehouses, 'Verified Warehouses']]
              .filter(([v]) => v > 0)
              .map(([v, l]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: T.green, lineHeight: 1.1 }}>{Number(v).toLocaleString()}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: `${T.green}cc`, letterSpacing: 0.3 }}>{l}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* FEATURED PRODUCTS */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '52px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: T.green, letterSpacing: '-0.5px' }}>Featured Listings</h2>
            <p style={{ margin: '4px 0 0', color: T.muted, fontSize: 14 }}>Hand-picked quality products from verified sellers</p>
          </div>
          <Btn variant="secondary" onClick={() => navigate('/marketplace')}>View All Products →</Btn>
        </div>
        {featuredState === 'loading' && <LoadingState label="Loading featured listings…" />}
        {featuredState === 'error' && <ErrorState message="Could not load featured listings from the server." onRetry={loadFeatured} />}
        {featuredState === 'ready' && featured.length === 0 && (
          <EmptyState icon="🌾" title="No featured listings yet" subtitle="Check back soon, or browse the full marketplace." />
        )}
        {featuredState === 'ready' && featured.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
            {featured.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      {/* HOW IT WORKS */}
      <div style={{ background: T.surface, padding: '52px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: T.green, letterSpacing: '-0.5px' }}>How AgriConnect Works</h2>
            <p style={{ margin: '6px 0 0', color: T.muted, fontSize: 14 }}>From listing to delivery in four simple steps</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 28 }}>
            {[
              ['📋', 'List or Browse', 'Sellers create detailed listings with full quality metrics. Buyers search by variety, location, price, and grade.', 1],
              ['💬', 'Negotiate & Offer', 'Submit offers, counter-offer, and negotiate. All chats and documents are tracked in one place.', 2],
              ['🧪', 'Verify Quality', 'Book a certified lab for moisture, grain size, and broken % testing. Digital reports auto-attach to the listing.', 3],
              ['🚛', 'Arrange Delivery', 'Request quotes from transport providers, accept the one you like, and follow the shipment status updates.', 4],
            ].map(([icon, title, desc, step]) => (
              <div key={step} style={{ textAlign: 'center', padding: '24px 16px', background: T.white, borderRadius: 14, border: `1px solid ${T.border}` }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' }}>{icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.gold, letterSpacing: 1.5, marginBottom: 6 }}>STEP {step}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: T.green, margin: '0 0 8px' }}>{title}</h3>
                <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SERVICES CTA */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '52px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
        <div style={{ background: 'linear-gradient(135deg,#059669,#065F46)', borderRadius: 14, padding: 32 }}>
          <div style={{ fontSize: 38, marginBottom: 14 }}>🧪</div>
          <h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 900, color: '#fff' }}>Quality Testing Services</h3>
          <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 1.65 }}>Connect with certified labs for moisture, grain size, broken %, whiteness, and milling yield analysis. Digital reports attached instantly.</p>
          <Btn onClick={() => navigate('/testing')} style={{ background: '#fff', color: '#059669', border: 'none' }}>Browse Testing Agencies →</Btn>
        </div>
        <div style={{ background: 'linear-gradient(135deg,#0891B2,#075985)', borderRadius: 14, padding: 32 }}>
          <div style={{ fontSize: 38, marginBottom: 14 }}>🚛</div>
          <h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 900, color: '#fff' }}>Transport & Logistics</h3>
          <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 1.65 }}>Find trucking providers, request a quote for your route, and follow delivery progress.</p>
          <Btn onClick={() => navigate('/transport')} style={{ background: '#fff', color: '#0891B2', border: 'none' }}>Find Transporters →</Btn>
        </div>
      </div>

      {/* WAREHOUSE CTA */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 52px' }}>
        <div style={{ background: 'linear-gradient(135deg,#78350F,#B45309)', borderRadius: 14, padding: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🏪</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: '#fff' }}>Warehouse & Digital Receipts</h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 1.65, maxWidth: 560 }}>Store your commodities in certified warehouses. Get a Digital Warehouse Receipt (DWR) and use it as supporting documentation when you ask a bank for financing (lending terms are set by the bank).</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
            <Btn onClick={() => navigate('/warehouse')} style={{ background: '#fff', color: '#B45309', border: 'none', padding: '11px 22px' }}>Browse Warehouses →</Btn>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {['🏦 Lien requests', '🛡️ Storage cover', '📄 Digital Receipts'].map(f => <span key={f} style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{f}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* REGISTER CTA */}
      <div style={{ background: T.green, padding: '52px 20px', textAlign: 'center' }}>
        <h2 style={{ color: T.bg, margin: '0 0 12px', fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>Ready to Start Trading?</h2>
        <p style={{ color: T.mint, margin: '0 0 28px', fontSize: 15 }}>Registration is free for sellers and buyers.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Btn variant="gold" size="lg" onClick={openRegister}>Register as Seller</Btn>
          <Btn size="lg" style={{ background: 'transparent', color: T.bg, border: `2px solid ${T.bg}` }} onClick={openRegister}>Register as Buyer</Btn>
        </div>
      </div>

      <Footer />
    </div>
  );
}
