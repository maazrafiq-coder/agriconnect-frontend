import { useNavigate } from 'react-router-dom';
import T from '../theme';

export default function Footer() {
  const navigate = useNavigate();
  return (
    <footer style={{ background: '#0F1F16', padding: '44px 20px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 28, marginBottom: 32 }}>
          <div>
            <div style={{ color: T.bg, fontWeight: 900, fontSize: 16, marginBottom: 12 }}>🌾 AgriConnect PK</div>
            <p style={{ fontSize: 12, lineHeight: 1.7, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              Pakistan's digital agriculture marketplace — connecting farmers, millers, traders, and exporters across all provinces.
            </p>
          </div>
          {[
            ['Marketplace', [['/', 'Browse Products'], ['/marketplace', 'Rice & Paddy'], ['/marketplace', 'Wheat & Maize'], ['/marketplace', 'Post a Listing']]],
            ['Services',    [['/testing', 'Lab Testing'], ['/transport', 'Logistics'], ['/', 'KYC Verification'], ['/', 'Price Analytics']]],
            ['Support',     [['/', 'Help Center'], ['/', 'Dispute Resolution'], ['/', 'Contact Us'], ['/', 'Terms of Use']]],
          ].map(([title, links]) => (
            <div key={title}>
              <div style={{ color: T.gold, fontWeight: 700, fontSize: 12, marginBottom: 12, letterSpacing: 0.5 }}>{title}</div>
              {links.map(([path, label]) => (
                <div key={label} onClick={() => navigate(path)} style={{ fontSize: 12, marginBottom: 7, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>{label}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          <span>© 2025 AgriConnect Pakistan. All rights reserved.</span>
          <span>Built in 🇵🇰 Pakistan · Lahore, Punjab</span>
        </div>
      </div>
    </footer>
  );
}
