/**
 * src/lib/adapters.js
 *
 * Converts raw API responses (API v3 field names) into the shape
 * that every frontend component already expects.
 *
 * Rule: components never import from the API directly —
 * they always receive data through these adapters.
 */

// ─── BADGE LOGIC ──────────────────────────────────────────────────────────────
function deriveBadge(product) {
  const v = product.riceDetails?.variety || '';
  if (v.includes('1121') || v.includes('Super Basmati')) return 'Premium';
  if (product.seller?.kycStatus === 'APPROVED' && product.category === 'RICE') return 'Export Grade';
  if (product.seller?.kycStatus === 'APPROVED') return 'Verified';
  if (product.quantity > 1000) return 'Bulk';
  const created = new Date(product.createdAt);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (created > weekAgo) return 'New';
  return 'Verified';
}

// ─── PRODUCT ADAPTER ──────────────────────────────────────────────────────────
export function adaptProduct(p) {
  if (!p) return null;

  const ratings = p.seller?.ratingsReceived || [];
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
      : p.seller?.avgRating || 4.0;

  const certs = (p.certDocuments || []).map((d) => d.title || d.docType);

  return {
    // Identity
    id:             p.id,
    // Basic listing fields — frontend names
    name:           p.name,
    cat:            p.category,
    stage:          titleCase(p.riceDetails?.stage) || titleCase(p.category),
    variety:        p.riceDetails?.variety || '',
    desc:           p.description || '',
    qty:            p.quantity,
    unit:           p.unit,
    price:          Number(p.askingPrice),
    minOrder:       p.minOrderQty,
    harvest:        p.harvestDate
                      ? new Date(p.harvestDate).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })
                      : '—',
    location:       [p.locationCity, p.locationProvince].filter(Boolean).join(', '),
    locationCity:   p.locationCity,
    locationProvince: p.locationProvince,
    packagingType:  p.packagingType || '',
    deliveryTerms:  p.deliveryTerms || '',
    status:         p.status,
    viewCount:      p.viewCount || 0,
    badge:          deriveBadge(p),
    certs,
    // Seller fields
    seller:         p.seller?.profile?.fullName || p.seller?.profile?.businessName || 'Unknown',
    sellerId:       p.sellerId || p.seller?.id,
    sellerVerified: p.seller?.kycStatus === 'APPROVED',
    sellerRating:   avgRating,
    sellerReviews:  p.seller?.totalReviews || ratings.length || 0,
    sellerCity:     p.seller?.profile?.city || p.locationCity,
    // Quality metrics — flat structure components expect
    metrics: {
      moisture:  p.riceDetails?.moisturePct   ?? null,
      length:    p.riceDetails?.grainLengthMm ?? null,
      width:     p.riceDetails?.grainWidthMm  ?? null,
      broken:    p.riceDetails?.brokenPct     ?? null,
      purity:    p.riceDetails?.purityPct     ?? null,
      whiteness: p.riceDetails?.whitenessIndex ?? null,
      chalk:     p.riceDetails?.chalkinessPct ?? null,
      milling:   p.riceDetails?.millingYieldPct ?? null,
    },
    // Media
    images:         (p.media || []).filter((m) => m.type === 'image').map((m) => m.url),
    // Raw detail for product detail page
    _raw: p,
  };
}

export function adaptProducts(list = []) {
  return list.map(adaptProduct);
}

// ─── WAREHOUSE ADAPTER ────────────────────────────────────────────────────────
export function adaptWarehouse(w) {
  if (!w) return null;
  return {
    id:               w.id,
    name:             w.name,
    type:             titleCase(w.type),
    city:             w.city,
    province:         w.province,
    address:          w.address,
    // Capacity — frontend expects these field names
    capacity:         w.totalCapacityTons,
    available:        w.availableCapacityTons ?? w.totalCapacityTons,
    unit:             'tons',
    // Pricing
    pricePerTon:      Number(w.pricePerTonMonth),
    minDuration:      w.minDurationDays,
    // Commodity & features
    commodities:      w.commoditiesAccepted || [],
    certifications:   w.certifications || [],
    features:         w.features || [],
    bankPartners:     w.bankPartners || [],
    insuranceAvailable: w.insuranceAvailable,
    // Info
    manager:          w.managerName || '',
    phone:            w.managerPhone || '',
    established:      w.establishedYear,
    gps:              w.gpsCoordinates || '',
    desc:             w.description || '',
    // Rating
    rating:           w.rating || 0,
    reviews:          w.reviewCount || 0,
    isVerified:       w.isVerified,
    _raw: w,
  };
}

export function adaptWarehouses(list = []) {
  return list.map(adaptWarehouse);
}

// ─── WAREHOUSE RECEIPT ADAPTER ────────────────────────────────────────────────
export function adaptReceipt(r) {
  if (!r) return null;
  return {
    id:            r.id,
    warehouseName: r.warehouse?.name || '',
    warehouseCity: r.warehouse?.city || '',
    commodity:     r.commodity,
    variety:       r.variety || '',
    qty:           r.quantityTons,
    unit:          'tons',
    entryDate:     r.entryDate?.slice(0, 10),
    expiryDate:    r.expiryDate?.slice(0, 10),
    status:        r.status === 'UNDER_LIEN' ? 'lien' : r.status?.toLowerCase(),
    owner:         r.owner?.profile?.fullName || '',
    currentValue:  Number(r.marketValue),
    quality:       r.qualityMetrics || {},
    lien:          r.lien
      ? {
          bank:        r.lien.bankName,
          amount:      Number(r.lien.loanAmount),
          placed:      r.lien.placedAt?.slice(0, 10),
          officer:     r.lien.loanOfficer || '',
          contact:     '',
          status:      r.lien.status?.toLowerCase(),
          releaseDate: r.lien.releasedAt?.slice(0, 10) || null,
        }
      : null,
    insurance:     r.insurance
      ? {
          provider:  r.insurance.provider,
          coverage:  Number(r.insurance.coverageAmount),
          expiry:    r.insurance.endDate?.slice(0, 10),
          policy:    r.insurance.policyNumber,
        }
      : null,
    _raw: r,
  };
}

export function adaptReceipts(list = []) {
  return list.map(adaptReceipt);
}

// ─── OFFER ADAPTER ────────────────────────────────────────────────────────────
export function adaptOffer(o) {
  if (!o) return null;
  return {
    id:           o.id,
    productId:    o.productId,
    product:      o.product?.name || '',
    productUnit:  o.product?.unit || '',
    asking:       Number(o.product?.askingPrice || 0),
    buyer:        o.buyer?.profile?.fullName || '',
    buyerId:      o.buyerId,
    qty:          o.quantity,
    offered:      Number(o.offeredPrice),
    counter:      o.counterPrice ? Number(o.counterPrice) : null,
    message:      o.message || '',
    counterMsg:   o.counterMessage || '',
    status:       o.status?.toLowerCase(),
    expiresAt:    o.expiresAt,
    time:         timeAgo(o.createdAt),
    _raw: o,
  };
}

export function adaptOffers(list = []) {
  return list.map(adaptOffer);
}

// ─── ORDER ADAPTER ────────────────────────────────────────────────────────────
export function adaptOrder(o) {
  if (!o) return null;
  return {
    id:          o.id,
    product:     o.offer?.product?.name || '',
    productUnit: o.offer?.product?.unit || '',
    qty:         `${o.offer?.quantity} ${o.offer?.product?.unit || ''}`.trim(),
    seller:      o.seller?.profile?.fullName || '',
    buyer:       o.buyer?.profile?.fullName || '',
    value:       `₨${Number(o.totalAmount).toLocaleString()}`,
    status:      o.status?.toLowerCase(),
    payStatus:   o.paymentStatus?.toLowerCase(),
    date:        o.createdAt?.slice(0, 10),
    timeline:    (o.statusHistory || []).map((h) => ({
      status: h.status?.toLowerCase(),
      note:   h.note || '',
      date:   h.createdAt?.slice(0, 10),
    })),
    _raw: o,
  };
}

export function adaptOrders(list = []) {
  return list.map(adaptOrder);
}

// ─── TESTING AGENCY ADAPTER ───────────────────────────────────────────────────
export function adaptAgency(a) {
  if (!a) return null;
  return {
    id:          a.id,
    userId:      a.userId,
    name:        a.name,
    city:        a.city,
    province:    a.province,
    rating:      a.rating || 0,
    reviews:     a.reviewCount || 0,
    turnaround:  `${a.turnaroundHours} hr`,
    price:       Number(a.basePrice),
    accred:      a.accreditations || [],
    services:    a.services || [],
    isVerified:  a.isVerified,
    _raw: a,
  };
}

export function adaptAgencies(list = []) {
  return list.map(adaptAgency);
}

// ─── TRANSPORTER ADAPTER ─────────────────────────────────────────────────────
export function adaptTransporter(t) {
  if (!t) return null;
  return {
    id:        t.id,
    userId:    t.userId,
    name:      t.companyName,
    rating:    t.rating || 0,
    reviews:   t.reviewCount || 0,
    vehicles:  (t.vehicleTypes || []).map(titleCase),
    provinces: t.coverageProvinces || [],
    price:     `₨${Number(t.pricePerKm).toFixed(0)}/km`,
    capacity:  `Up to ${t.maxCapacityTons} tons`,
    gps:       t.hasGps,
    insurance: t.hasInsurance,
    isVerified: t.isVerified,
    _raw: t,
  };
}

export function adaptTransporters(list = []) {
  return list.map(adaptTransporter);
}

// ─── BOOKING REQUEST ADAPTER ──────────────────────────────────────────────────
// Converts frontend form values → API request body
export function toBookingRequest(form) {
  return {
    warehouseId:      form.warehouseId,
    commodity:        form.commodity,
    variety:          form.variety || undefined,
    quantityTons:     Number(form.qty),
    packagingType:    form.packagingType || undefined,
    entryDate:        form.entryDate,
    durationDays:     Number(form.duration),
    includeInsurance: form.insurance || false,
    notes:            form.notes || undefined,
  };
}

// ─── OFFER REQUEST ADAPTER ────────────────────────────────────────────────────
export function toOfferRequest(form) {
  return {
    productId:    form.productId,
    offeredPrice: Number(form.offeredPrice),
    quantity:     Number(form.quantity),
    message:      form.message || undefined,
  };
}

// ─── AUTH ADAPTER ─────────────────────────────────────────────────────────────
// Converts frontend login form → API request body
export function toLoginRequest(form) {
  return {
    // Frontend form may use 'email' or 'phone' — normalise to phoneNumber
    phoneNumber: form.phoneNumber || form.phone || form.email,
    password:    form.password,
  };
}

export function toRegisterRequest(form) {
  return {
    phoneNumber: form.phoneNumber || form.phone,
    email:       form.email || undefined,
    password:    form.password,
    role:        form.role?.toUpperCase(),
    fullName:    form.fullName || form.name,
  };
}

// Converts API user → frontend user shape
export function adaptUser(u) {
  if (!u) return null;
  return {
    id:       u.id,
    name:     u.profile?.fullName || u.profile?.businessName || 'User',
    role:     u.role?.toLowerCase(),
    email:    u.email || '',
    phone:    u.phoneNumber,
    verified: u.kycStatus === 'APPROVED',
    kycStatus: u.kycStatus,
  };
}

// ─── UTILITY ──────────────────────────────────────────────────────────────────
// Converts a backend enum like "COLD_STORAGE" -> "Cold Storage"
function titleCase(str) {
  if (!str) return '';
  return str
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

// ─── TESTING REQUEST ADAPTER ─────────────────────────────────────────────────
// This was missing — real API testing requests were rendered directly
// without adaptation, so `t.agency` (a nested object: {name, city, user})
// got passed straight into JSX as a child, which React cannot render and
// throws immediately.
export function adaptTestingRequest(t) {
  if (!t) return null;
  return {
    id:         t.id,
    agency:     t.agency?.name || t.agency?.user?.profile?.fullName || 'Testing Agency',
    agencyCity: t.agency?.city || '',
    product:    t._product?.name || t.productId || 'Product',
    services:   t.servicesRequested || [],
    status:     t.status?.toLowerCase(),
    report:     !!t.reportUrl,
    reportUrl:  t.reportUrl || null,
    fee:        Number(t.fee || 0),
    date:       t.scheduledDate?.slice(0, 10) || t.createdAt?.slice(0, 10) || '',
    _raw: t,
  };
}

export function adaptTestingRequests(list = []) {
  return list.map(adaptTestingRequest);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
