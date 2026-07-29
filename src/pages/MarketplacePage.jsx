import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { Card } from '../components/ui';
import { apiGetProducts, apiGetCategories } from '../lib/api';
import { adaptProducts } from '../lib/adapters';
import { PRODUCTS as MOCK } from '../data';
import T from '../theme';

export default function MarketplacePage() {
  const [searchParams] = useSearchParams();
  const [search,       setSearch]       = useState(searchParams.get('q') || '');
  const [cat,          setCat]          = useState('All');
  const [province,     setProvince]     = useState('All');
  const [stage,        setStage]        = useState('All');
  const [maxPrice,     setMaxPrice]     = useState('');
  const [sortBy,       setSortBy]       = useState('featured');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [products,     setProducts]     = useState([]);
  const [total,        setTotal]        = useState(0);
  const [categories,   setCategories]   = useState([
    { slug: 'rice', name: 'Rice' }, { slug: 'paddy', name: 'Paddy' }, { slug: 'wheat', name: 'Wheat' },
    { slug: 'maize', name: 'Maize' }, { slug: 'pulses', name: 'Pulses' }, { slug: 'oil-seeds', name: 'Oil Seeds' },
  ]); // sensible fallback shown instantly, replaced once the real list loads

  useEffect(() => {
    apiGetCategories().then(setCategories).catch(() => {});
  }, []);
  const [loading,      setLoading]      = useState(true);

  // Fetch from API whenever filters change
  useEffect(() => {
    setLoading(true);
    const params = {
      ...(search       && { search }),
      ...(cat !== 'All'      && { category: cat }),
      ...(province !== 'All' && { province }),
      ...(stage !== 'All'    && { stage }),
      ...(maxPrice           && { maxPrice: Number(maxPrice) }),
      ...(verifiedOnly       && { verifiedOnly: true }),
      ...(sortBy !== 'featured' && { sortBy }),
      limit: 20,
    };

    apiGetProducts(params)
      .then(res => {
        setProducts(adaptProducts(res.data || []));
        setTotal(res.meta?.total ?? 0);
      })
      .catch(() => {
        // Fallback: filter mock data locally
        let r = [...MOCK];
        if (search)      r = r.filter(p => [p.name, p.variety, p.seller, p.location].some(s => s?.toLowerCase().includes(search.toLowerCase())));
        if (cat !== 'All')      r = r.filter(p => p.cat === cat);
        if (province !== 'All') r = r.filter(p => p.location?.includes(province));
        if (maxPrice)    r = r.filter(p => p.price <= Number(maxPrice));
        if (verifiedOnly) r = r.filter(p => p.sellerVerified);
        if (sortBy === 'price_asc')  r.sort((a, b) => a.price - b.price);
        if (sortBy === 'price_desc') r.sort((a, b) => b.price - a.price);
        if (sortBy === 'rating')     r.sort((a, b) => b.sellerRating - a.sellerRating);
        setProducts(r);
        setTotal(r.length);
      })
      .finally(() => setLoading(false));
  }, [search, cat, province, stage, maxPrice, sortBy, verifiedOnly]);

  const clear = () => {
    setSearch(''); setCat('All'); setProvince('All');
    setStage('All'); setMaxPrice(''); setVerifiedOnly(false);
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px',
    border: `1.5px solid ${T.border}`, borderRadius: 7,
    fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.green, letterSpacing: '-0.3px' }}>Agricultural Marketplace</h1>
        <p style={{ margin: '4px 0 0', color: T.muted, fontSize: 13 }}>{loading ? 'Loading…' : `${total} products available`}</p>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* ── Sidebar ── */}
        <div style={{ width: 210, flexShrink: 0 }}>
          <Card style={{ position: 'sticky', top: 74, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.green, marginBottom: 14 }}>🔽 Filters</div>

            <div style={{ marginBottom: 13 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5, letterSpacing: 0.5 }}>SEARCH</label>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Variety, seller…" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 13 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>CATEGORY</label>
              <div onClick={() => setCat('All')} style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: cat === 'All' ? 700 : 400, color: cat === 'All' ? T.green : T.text, background: cat === 'All' ? '#F0FDF4' : 'transparent', marginBottom: 1 }}>All Categories</div>
              {categories.map(c => (
                <div key={c.slug} onClick={() => setCat(c.slug)} style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: cat === c.slug ? 700 : 400, color: cat === c.slug ? T.green : T.text, background: cat === c.slug ? '#F0FDF4' : 'transparent', marginBottom: 1 }}>
                  {c.icon ? `${c.icon} ` : ''}{c.name}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 13 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6, letterSpacing: 0.5 }}>STAGE</label>
              {['All', 'PADDY', 'BROWN_RICE', 'MILLED_WHITE', 'WHITE_RICE'].map(s => (
                <div key={s} onClick={() => setStage(s)} style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: stage === s ? 700 : 400, color: stage === s ? T.green : T.text, background: stage === s ? '#F0FDF4' : 'transparent', marginBottom: 1 }}>
                  {s === 'All' ? 'All Stages' : s.replace(/_/g, ' ')}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 13 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5, letterSpacing: 0.5 }}>PROVINCE</label>
              <select value={province} onChange={e => setProvince(e.target.value)} style={{ ...inputStyle, padding: '8px 10px' }}>
                {['All', 'Punjab', 'Sindh', 'KPK', 'Balochistan'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 13 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5, letterSpacing: 0.5 }}>MAX PRICE (₨/unit)</label>
              <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="e.g. 4000" type="number" style={inputStyle} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', marginBottom: 12 }}>
              <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} style={{ width: 14, height: 14 }} />
              Verified sellers only
            </label>

            <button onClick={clear} style={{ background: 'none', border: 'none', color: T.danger, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}>
              ✕ Clear filters
            </button>
          </Card>
        </div>

        {/* ── Grid ── */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: T.muted }}><strong style={{ color: T.text }}>{total}</strong> products</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: T.muted }}>Sort:</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '7px 10px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none' }}>
                <option value="featured">Featured</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="rating">Top Rated</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, height: 280, animation: 'pulse 1.5s infinite' }}>
                  <div style={{ height: 120, background: '#F3F4F6', borderRadius: '12px 12px 0 0' }} />
                  <div style={{ padding: 14 }}>
                    {[80, 60, 40].map((w, j) => <div key={j} style={{ height: 12, background: '#F3F4F6', borderRadius: 6, marginBottom: 8, width: `${w}%` }} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: T.muted }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>🔍</div>
              <h3 style={{ color: T.green, marginBottom: 8 }}>No products found</h3>
              <p style={{ margin: 0, fontSize: 13 }}>Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
