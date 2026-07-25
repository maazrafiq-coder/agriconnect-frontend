# 🌾 AgriConnect Pakistan

Pakistan's digital agriculture marketplace — connecting farmers, millers, traders, and exporters.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev
# → Opens at http://localhost:5173

# 3. Build for production
npm run build
```

## Project Structure

```
src/
├── App.jsx                    # Root app with React Router
├── theme.js                   # Shared color tokens
├── main.jsx                   # React entry point
├── context/
│   └── AuthContext.jsx        # Global auth state (user, modals)
├── data/
│   └── index.js               # Mock data (products, agencies, transporters)
├── components/
│   ├── Navbar.jsx             # Sticky top navigation
│   ├── Footer.jsx             # Site footer
│   ├── ProductCard.jsx        # Reusable product listing card
│   ├── ui/
│   │   └── index.jsx          # Shared primitives (Btn, Card, Badge, Modal, etc.)
│   └── auth/
│       └── AuthModals.jsx     # Login & Register modals
└── pages/
    ├── HomePage.jsx           # Landing page with hero, stats, featured products
    ├── MarketplacePage.jsx    # Search + filter product grid
    ├── ProductDetailPage.jsx  # Product detail with offer & testing modals
    ├── ServicePages.jsx       # TestingPage + TransportPage
    ├── SellerDashboard.jsx    # Seller portal (listings, offers, orders, chat)
    └── BuyerDashboard.jsx     # Buyer portal (orders, saved, testing, transport)
```

## Routes

| Path            | Page                     | Auth Required |
|-----------------|--------------------------|---------------|
| `/`             | Home / Landing           | No            |
| `/marketplace`  | Product search & filters | No            |
| `/product/:id`  | Product detail           | No            |
| `/testing`      | Lab testing agencies     | No            |
| `/transport`    | Transport providers      | No            |
| `/warehouse`    | Warehouse module (browse, DWR, loans, insurance) | No |
| `/seller`       | Seller dashboard         | Yes (seller)  |
| `/buyer`        | Buyer dashboard          | Yes           |

## Deploy to Vercel (5 minutes)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Framework preset: **Vite**
4. Click **Deploy**

Vercel auto-detects Vite. The `vercel.json` file handles SPA routing so
direct URLs like `/marketplace` work correctly after deploy.

## Next Steps — Connecting a Real Backend

Replace mock data in `src/data/index.js` with API calls:

```js
// Example: fetch products from your NestJS API
const res = await fetch('https://api.agriconnect.pk/v1/products?category=Rice');
const { data } = await res.json();
```

Recommended backend stack (from PRD):
- **API**: NestJS + PostgreSQL on Railway.app or Render.com
- **Database**: Supabase (free PostgreSQL + auth + storage)
- **File uploads**: AWS S3
- **OTP SMS**: Twilio
- **Maps**: Google Maps Platform

## Environment Variables

Create a `.env` file for future API integration:

```env
VITE_API_URL=https://api.agriconnect.pk/v1
VITE_GOOGLE_MAPS_KEY=your_key_here
```

Access in code: `import.meta.env.VITE_API_URL`

## Demo Login

On the Login modal, select a role and click Login — no real credentials needed.
- **Seller** → redirects to `/seller` dashboard
- **Buyer** → redirects to `/buyer` dashboard
