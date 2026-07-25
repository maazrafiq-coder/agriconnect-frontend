/**
 * src/lib/api.js
 * Central API client for AgriConnect Pakistan
 * Base URL from VITE_API_URL env var, falls back to localhost
 *
 * SECURITY NOTE: the access token lives in memory only (this module-level
 * variable), never in localStorage/sessionStorage. It is lost on hard page
 * reload by design — apiGetMe() + the httpOnly refresh cookie silently
 * re-establishes the session (see AuthContext's rehydrate-on-load effect).
 * The refresh token itself is an httpOnly, sameSite cookie set by the
 * server — JavaScript never touches it, which closes the XSS token-theft
 * gap that localStorage-based storage has.
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// ─── IN-MEMORY ACCESS TOKEN ────────────────────────────────────────────────────
let accessToken = null;
export const getToken = () => accessToken;
export const setAccessToken = (token) => { accessToken = token; };
export const clearTokens = () => { accessToken = null; };
// Kept for backward-compat call sites; refresh token is cookie-only now.
export const setTokens = (access) => setAccessToken(access);

// ─── CORE FETCH ───────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include', // sends the httpOnly refresh cookie automatically
  });

  // Try to refresh token on 401 (cookie-based — no token passed manually)
  if (res.status === 401 && !options._retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch(path, { ...options, _retry: true });
    }
    clearTokens();
    window.location.href = '/';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.error?.message ||
      (Array.isArray(data?.message) ? data.message[0] : data?.message) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

async function tryRefresh() {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // sends the httpOnly refresh cookie
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.accessToken) return false;
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────
export async function apiRegister({ phoneNumber, email, password, role, fullName }) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, email, password, role, fullName }),
  });
}

export async function apiVerifyOtp({ phoneNumber, otp, purpose = 'phone_verify' }) {
  const data = await apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, otp, purpose }),
  });
  if (data?.accessToken) setAccessToken(data.accessToken);
  return data;
}

export async function apiLogin({ phoneNumber, password }) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, password }),
  });
  if (data?.accessToken) setAccessToken(data.accessToken);
  return data;
}

export async function apiLogout() {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  clearTokens();
}

export async function apiGetMe() {
  return apiFetch('/auth/me');
}

export async function apiGetKycStatus() {
  return apiFetch('/auth/kyc/status');
}

export async function apiSubmitKyc(formData) {
  const token = getToken();
  const res = await fetch(`${BASE}/auth/kyc/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData, // multipart — don't set Content-Type manually
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'KYC submission failed');
  return data;
}

export async function apiForgotPassword(phoneNumber) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
}

export async function apiResetPassword({ phoneNumber, otp, newPassword }) {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, otp, newPassword }),
  });
}

// ─── USERS ─────────────────────────────────────────────────────────────────────
export async function apiGetProfile() {
  return apiFetch('/users/profile');
}

export async function apiUpdateProfile(data) {
  return apiFetch('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function apiGetPublicProfile(userId) {
  return apiFetch(`/users/${userId}`);
}

// ─── PRODUCTS ──────────────────────────────────────────────────────────────────
export async function apiGetProducts(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== 'All'))
  ).toString();
  return apiFetch(`/products${qs ? `?${qs}` : ''}`);
}

export async function apiGetProduct(id) {
  return apiFetch(`/products/${id}`);
}

export async function apiGetMyProducts() {
  return apiFetch('/products/my');
}

export async function apiGetSavedProducts() {
  return apiFetch('/products/saved');
}

export async function apiCreateProduct(data) {
  return apiFetch('/products', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateProduct(id, data) {
  return apiFetch(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiChangeProductStatus(id, status) {
  return apiFetch(`/products/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function apiToggleSaveProduct(id) {
  return apiFetch(`/products/${id}/save`, { method: 'POST' });
}

export async function apiUploadProductMedia(productId, files, type = 'image') {
  const token = getToken();
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  formData.append('type', type);
  const res = await fetch(`${BASE}/products/${productId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Upload failed');
  return data;
}

// ─── OFFERS ────────────────────────────────────────────────────────────────────
export async function apiSubmitOffer({ productId, offeredPrice, quantity, message }) {
  return apiFetch('/offers', {
    method: 'POST',
    body: JSON.stringify({ productId, offeredPrice, quantity, message }),
  });
}

export async function apiGetReceivedOffers() {
  return apiFetch('/offers/received');
}

export async function apiGetSentOffers() {
  return apiFetch('/offers/sent');
}

export async function apiAcceptOffer(offerId) {
  return apiFetch(`/offers/${offerId}/accept`, { method: 'PATCH' });
}

export async function apiRejectOffer(offerId) {
  return apiFetch(`/offers/${offerId}/reject`, { method: 'PATCH' });
}

export async function apiCounterOffer(offerId, { counterPrice, counterMessage }) {
  return apiFetch(`/offers/${offerId}/counter`, {
    method: 'PATCH',
    body: JSON.stringify({ counterPrice, counterMessage }),
  });
}

// ─── ORDERS ────────────────────────────────────────────────────────────────────
export async function apiGetOrders(role = 'buyer', status) {
  const qs = new URLSearchParams({ role, ...(status ? { status } : {}) }).toString();
  return apiFetch(`/orders?${qs}`);
}

export async function apiGetOrder(id) {
  return apiFetch(`/orders/${id}`);
}

export async function apiUpdateOrderStatus(id, status, note) {
  return apiFetch(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
}

// ─── WAREHOUSE ─────────────────────────────────────────────────────────────────
export async function apiGetWarehouses(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== 'All'))
  ).toString();
  const res = await apiFetch(`/warehouse${qs ? `?${qs}` : ''}`);
  // Backend now paginates ({ data, meta }) — unwrap so existing callers
  // that expect a plain array keep working unchanged. Use
  // apiGetWarehousesPaged() below if you need the meta (totalPages etc).
  return Array.isArray(res) ? res : res?.data || [];
}

export async function apiGetWarehousesPaged(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== 'All'))
  ).toString();
  return apiFetch(`/warehouse${qs ? `?${qs}` : ''}`);
}

export async function apiGetWarehouse(id) {
  return apiFetch(`/warehouse/${id}`);
}

export async function apiBookStorage(data) {
  return apiFetch('/warehouse/book', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiGetMyReceipts() {
  return apiFetch('/warehouse/receipts/my');
}

export async function apiGetReceipt(id) {
  return apiFetch(`/warehouse/receipts/${id}`);
}

export async function apiApplyLien(data) {
  return apiFetch('/warehouse/lien/apply', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiReleaseLien(lienId, note) {
  return apiFetch(`/warehouse/lien/${lienId}/release`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });
}

export async function apiBuyInsurance(data) {
  return apiFetch('/warehouse/insurance/buy', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiGetWarehouseDashboard() {
  return apiFetch('/warehouse/dashboard/operator');
}

// ─── TESTING ───────────────────────────────────────────────────────────────────
export async function apiGetAgencies(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString();
  const res = await apiFetch(`/testing/agencies${qs ? `?${qs}` : ''}`);
  return Array.isArray(res) ? res : res?.data || [];
}

export async function apiBookTesting({ agencyId, productId, orderId, servicesRequested, scheduledDate, sampleLocation, notes }) {
  return apiFetch('/testing/requests', {
    method: 'POST',
    body: JSON.stringify({ agencyId, productId, orderId, servicesRequested, scheduledDate, sampleLocation, notes }),
  });
}

export async function apiGetMyTestingRequests(role = 'requester') {
  return apiFetch(`/testing/requests/my?role=${role}`);
}

export async function apiUpdateTestingStatus(requestId, status) {
  return apiFetch(`/testing/requests/${requestId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ─── TRANSPORT ─────────────────────────────────────────────────────────────────
export async function apiGetTransporters(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString();
  const res = await apiFetch(`/transport/providers${qs ? `?${qs}` : ''}`);
  return Array.isArray(res) ? res : res?.data || [];
}

export async function apiCreateTransportRequest(data) {
  return apiFetch('/transport/requests', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiBookTransport({ requestId, providerId, agreedPrice }) {
  return apiFetch('/transport/book', {
    method: 'POST',
    body: JSON.stringify({ requestId, providerId, agreedPrice }),
  });
}

export async function apiGetMyTransportRequests(role = 'requester') {
  return apiFetch(`/transport/requests/my?role=${role}`);
}

export async function apiTrackShipment(requestId) {
  return apiFetch(`/transport/track/${requestId}`);
}

export async function apiUpdateTracking(requestId, data) {
  return apiFetch(`/transport/requests/${requestId}/tracking`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
