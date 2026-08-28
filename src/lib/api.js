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

// Uploaded files (product photos, KYC docs, listing media, etc.) are stored
// with paths relative to the API's origin (e.g. "/uploads/products/x.jpg"),
// served by a static file handler that sits outside the "/api/v1" prefix.
// Turn one of those into a URL a browser can actually load.
export function resolveMediaUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    const origin = new URL(BASE).origin;
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  } catch {
    return url;
  }
}

// KYC document signed-url paths (e.g. "/auth/kyc/documents/file/<token>")
// are regular API routes — unlike static /uploads paths, they DO live
// under the "/api/v1" prefix, so they resolve against the full BASE, not
// just its origin. Kept separate from resolveMediaUrl() to avoid silently
// stripping that prefix off a path that actually needs it.
export function resolveApiFileUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

// ─── IN-MEMORY ACCESS TOKEN ────────────────────────────────────────────────────
let accessToken = null;
export const getToken = () => accessToken;
export const setAccessToken = (token) => { accessToken = token; };
export const clearTokens = () => { accessToken = null; };
// Kept for backward-compat call sites; refresh token is cookie-only now.
export const setTokens = (access) => setAccessToken(access);

// ─── IN-MEMORY REGISTRATION TOKEN ──────────────────────────────────────────────
// Short-lived token issued by verify-otp, used ONLY for the KYC submit/status
// calls a not-yet-approved user makes mid-registration (see backend
// RegistrationTokenGuard). Same in-memory-only pattern as the access token —
// never persisted, lost on reload by design (a reload mid-registration just
// means re-verifying OTP, which is an acceptable tradeoff for not persisting
// a bearer token in storage).
let registrationToken = null;
export const getRegistrationToken = () => registrationToken;
export const setRegistrationToken = (token) => { registrationToken = token; };
export const clearRegistrationToken = () => { registrationToken = null; };

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
    // NOTE: previously this did a hard `window.location.href = '/'` here,
    // which force-navigated the *entire app* to the home page any time any
    // 401 happened — including optional/authenticated calls made from
    // public pages (e.g. WarehousePage calling apiGetMyReceipts() for a
    // guest). That's what caused "click Warehouses -> flashes -> bounced
    // to Home": the page mounted fine, then its receipts call 401'd, the
    // refresh failed (no session), and this line yanked the user away.
    // Real auth gating is already handled by <ProtectedRoute> in App.jsx
    // and by AuthContext's own silent-refresh-on-boot effect, so we just
    // throw here and let each call site's existing .catch() decide what
    // to do (WarehousePage already falls back to mock data, for example).
    throw new Error('Unauthorized');
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
    body: JSON.stringify({ phoneNumber: phoneNumber || undefined, email: email || undefined, password, role, fullName }),
  });
}

export async function apiVerifyOtp({ identifier, otp, purpose = 'phone_verify' }) {
  // No longer auto-logs the user in — verifying OTP moves the account to
  // "pending admin approval," it does not grant login tokens. It DOES
  // return a short-lived registrationToken, scoped only to the KYC
  // submit/status endpoints, so the next step (document upload) has
  // something valid to authenticate with. Stash it the same way the login
  // access token is stashed — in memory only.
  const data = await apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ identifier, otp, purpose }),
  });
  if (data?.registrationToken) setRegistrationToken(data.registrationToken);
  return data;
}

export async function apiLogin({ identifier, password }) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
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

export async function apiGetKycDocumentSignedUrl(docId) {
  return apiFetch(`/auth/kyc/documents/${docId}/signed-url`);
}

export async function apiSubmitKyc(formData) {
  // Prefer the registration token (mid-registration, not logged in yet).
  // Falls back to a normal access token for an already-approved user
  // re-uploading/replacing a document from My Portal -> Documents — the
  // backend's KycAuthGuard accepts either.
  const token = getRegistrationToken() || getToken();
  const res = await fetch(`${BASE}/auth/kyc/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData, // multipart — don't set Content-Type manually
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || (Array.isArray(data?.message) ? data.message[0] : data?.message) || 'KYC submission failed');
  return data;
}

export async function apiForgotPassword(identifier) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  });
}

export async function apiResetPassword({ identifier, otp, newPassword }) {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ identifier, otp, newPassword }),
  });
}

// ─── SELF-SERVICE ───────────────────────────────────────────────────────────
export async function apiChangePassword({ currentPassword, newPassword }) {
  return apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function apiDeactivateSelf() {
  return apiFetch('/auth/deactivate-self', { method: 'POST' });
}

export async function apiGetMyDocuments() {
  return apiFetch('/auth/my-documents');
}

export async function apiGetMyActivity() {
  return apiFetch('/auth/my-activity');
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

// ─── PRODUCT MEDIA (display picture + docs on a marketplace listing) ───────────
// apiUploadProductMedia / apiSetProductMediaPrimary are defined further down
// in this file (kept there from when the backend endpoints were first
// scaffolded) — see the "PRODUCT MEDIA" note near apiToggleSaveProduct.

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

export async function apiRejectOffer(offerId, reason) {
  return apiFetch(`/offers/${offerId}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
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

export async function apiGetMyBookings() {
  return apiFetch('/warehouse/bookings/my');
}

export async function apiGetBooking(id) {
  return apiFetch(`/warehouse/bookings/${id}`);
}

export async function apiAcceptBooking(id) {
  return apiFetch(`/warehouse/bookings/${id}/accept`, { method: 'PATCH' });
}

export async function apiRejectBooking(id, reason) {
  return apiFetch(`/warehouse/bookings/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export async function apiCancelBooking(id, reason) {
  return apiFetch(`/warehouse/bookings/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export async function apiCompleteBooking(id) {
  return apiFetch(`/warehouse/bookings/${id}/complete`, { method: 'PATCH' });
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

export async function apiRegisterWarehouse(data) {
  return apiFetch('/warehouse/register', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiIssueReceipt(bookingId, { qualityMetrics, actualQuantityTons }) {
  return apiFetch(`/warehouse/receipts/issue/${bookingId}`, {
    method: 'POST',
    body: JSON.stringify({ qualityMetrics, actualQuantityTons }),
  });
}

// ─── MEDIA — GENERIC LISTINGS (warehouse / testing_agency / transport) ────────
// apiGetListingMedia / apiUploadListingMedia / apiSetListingMediaPrimary /
// apiDeleteListingMedia are defined further down in this file, near the
// admin warehouse/transport/testing endpoints (kept there from when the
// backend media endpoints were first scaffolded).

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

export async function apiSubmitTestingReport(requestId, { reportUrl, reportData }) {
  return apiFetch(`/testing/requests/${requestId}/report`, {
    method: 'POST',
    body: JSON.stringify({ reportUrl, reportData }),
  });
}

// ─── TESTING AGENCY — OPERATOR SELF-SERVICE ────────────────────────────────
export async function apiRegisterAgency(data) {
  return apiFetch('/testing/register', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiGetMyAgency() {
  return apiFetch('/testing/my-agency');
}

export async function apiUpdateMyAgency(data) {
  return apiFetch('/testing/my-agency', { method: 'PATCH', body: JSON.stringify(data) });
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

// ─── TRANSPORT PROVIDER — OPERATOR SELF-SERVICE ────────────────────────────
export async function apiRegisterProvider(data) {
  return apiFetch('/transport/register', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiGetMyProvider() {
  return apiFetch('/transport/my-provider');
}

export async function apiUpdateMyProvider(data) {
  return apiFetch('/transport/my-provider', { method: 'PATCH', body: JSON.stringify(data) });
}

// ─── ADMIN ─────────────────────────────────────────────────────────────────────
export async function apiAdminGetUsers(params = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
  return apiFetch(`/users/admin/list${qs ? `?${qs}` : ''}`);
}

export async function apiAdminGetUserDetail(userId) {
  return apiFetch(`/users/admin/${userId}/detail`);
}

export async function apiAdminUpdateKyc(userId, status, note) {
  return apiFetch(`/users/admin/${userId}/kyc`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
}

// ─── KYC CLARIFICATION THREAD (Round 2 Milestone 3) ────────────────────────
// Reusable request/respond/resolve workflow — see ReviewClarification in
// the backend schema. Round 2 Milestone 6 reuses this same workflow for
// provider profile review (warehouse/testing agency/transport listings)
// — see the PROVIDER LISTING CLARIFICATION section further down.
export async function apiGetMyKycClarifications() {
  return apiFetch('/review/clarifications/my/kyc');
}

// Generic: opens a new clarification request against any supported
// subjectType (USER_KYC has its own specialized wrapper —
// apiAdminUpdateKyc with status 'INFO_REQUESTED' — since that one also
// needs to flip kycStatus; provider profile types have no such side
// effect, so they go through this generic endpoint directly).
export async function apiRequestClarification(subjectType, subjectId, requestMessage) {
  return apiFetch('/review/clarifications', {
    method: 'POST',
    body: JSON.stringify({ subjectType, subjectId, requestMessage }),
  });
}

export async function apiGetClarifications(subjectType, subjectId) {
  const qs = new URLSearchParams({ subjectType, subjectId }).toString();
  return apiFetch(`/review/clarifications?${qs}`);
}

// files: array of File objects (optional)
export async function apiRespondToClarification(clarificationId, responseMessage, files = []) {
  const formData = new FormData();
  formData.append('responseMessage', responseMessage);
  files.forEach(f => formData.append('attachments', f));
  const res = await fetch(`${BASE}/review/clarifications/${clarificationId}/respond`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    credentials: 'include',
    body: formData, // multipart — don't set Content-Type manually
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || (Array.isArray(data?.message) ? data.message[0] : data?.message) || 'Could not send your response');
  return data;
}

export async function apiResolveClarification(clarificationId) {
  return apiFetch(`/review/clarifications/${clarificationId}/resolve`, { method: 'PATCH' });
}

export async function apiGetClarificationAttachmentUrl(clarificationId, attachmentId) {
  return apiFetch(`/review/clarifications/${clarificationId}/attachments/${attachmentId}/signed-url`);
}

// ─── PROVIDER LISTING CLARIFICATION (Round 2 Milestone 6) ──────────────────
// Convenience for a provider operator's own listing thread — mirrors
// apiGetMyKycClarifications above. subjectType is one of
// 'WAREHOUSE_PROFILE' | 'TESTING_AGENCY_PROFILE' | 'TRANSPORT_PROFILE'.
export async function apiGetMyProviderClarifications(subjectType) {
  return apiFetch(`/review/clarifications/my/provider/${subjectType}`);
}

export async function apiAdminSetUserActive(userId, isActive) {
  return apiFetch(`/users/admin/${userId}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export async function apiAdminGetProducts(params = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
  return apiFetch(`/products/admin/all${qs ? `?${qs}` : ''}`);
}

export async function apiAdminApproveProduct(productId) {
  return apiFetch(`/products/admin/${productId}/approve`, { method: 'PATCH' });
}

export async function apiAdminRejectProduct(productId, reason) {
  return apiFetch(`/products/admin/${productId}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export async function apiAdminRemoveProduct(productId, reason) {
  return apiFetch(`/products/admin/${productId}/remove`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export async function apiAdminRestoreProduct(productId) {
  return apiFetch(`/products/admin/${productId}/restore`, { method: 'PATCH' });
}

export async function apiAdminGetOrders(params = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
  return apiFetch(`/orders/admin${qs ? `?${qs}` : ''}`);
}

export async function apiAdminResolveDispute(orderId, resolution, note) {
  return apiFetch(`/orders/admin/${orderId}/resolve-dispute`, {
    method: 'PATCH',
    body: JSON.stringify({ resolution, note }),
  });
}

export async function apiAdminGetWarehouses() {
  return apiFetch('/warehouse/admin/all');
}

export async function apiAdminVerifyWarehouse(warehouseId, verified) {
  return apiFetch(`/warehouse/admin/${warehouseId}/verify`, {
    method: 'PATCH',
    body: JSON.stringify({ verified }),
  });
}

// ─── CATEGORIES ─────────────────────────────────────────────────────────────────
export async function apiGetCategories() {
  return apiFetch('/categories');
}

export async function apiAdminGetCategories() {
  return apiFetch('/categories/admin/all');
}

export async function apiAdminCreateCategory({ name, icon, description, sortOrder }) {
  return apiFetch('/categories/admin', {
    method: 'POST',
    body: JSON.stringify({ name, icon, description, sortOrder }),
  });
}

export async function apiAdminUpdateCategory(id, data) {
  return apiFetch(`/categories/admin/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function apiAdminDeactivateCategory(id) {
  return apiFetch(`/categories/admin/${id}/deactivate`, { method: 'PATCH' });
}

export async function apiAdminReactivateCategory(id) {
  return apiFetch(`/categories/admin/${id}/reactivate`, { method: 'PATCH' });
}

// ─── CITIES ─────────────────────────────────────────────────────────────────────
export async function apiGetCities(province) {
  const qs = province ? `?province=${encodeURIComponent(province)}` : '';
  return apiFetch(`/cities${qs}`);
}

export async function apiAdminGetCities() {
  return apiFetch('/cities/admin/all');
}

export async function apiAdminCreateCity({ name, province, sortOrder }) {
  return apiFetch('/cities/admin', { method: 'POST', body: JSON.stringify({ name, province, sortOrder }) });
}

export async function apiAdminUpdateCity(id, data) {
  return apiFetch(`/cities/admin/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiAdminDeactivateCity(id) {
  return apiFetch(`/cities/admin/${id}/deactivate`, { method: 'PATCH' });
}

export async function apiAdminReactivateCity(id) {
  return apiFetch(`/cities/admin/${id}/reactivate`, { method: 'PATCH' });
}

// ─── UNITS ──────────────────────────────────────────────────────────────────────
export async function apiGetUnits(categorySlug) {
  const qs = categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : '';
  return apiFetch(`/units${qs}`);
}

export async function apiAdminGetUnits() {
  return apiFetch('/units/admin/all');
}

export async function apiAdminCreateUnit({ name, categoryId, sortOrder }) {
  return apiFetch('/units/admin', { method: 'POST', body: JSON.stringify({ name, categoryId, sortOrder }) });
}

export async function apiAdminUpdateUnit(id, data) {
  return apiFetch(`/units/admin/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiAdminDeactivateUnit(id) {
  return apiFetch(`/units/admin/${id}/deactivate`, { method: 'PATCH' });
}

export async function apiAdminReactivateUnit(id) {
  return apiFetch(`/units/admin/${id}/reactivate`, { method: 'PATCH' });
}

// ─── ADMIN: USER MANAGEMENT ──────────────────────────────────────────────────
export async function apiAdminCreateUser({ phoneNumber, email, fullName, role, password }) {
  return apiFetch('/auth/admin/create-user', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber: phoneNumber || undefined, email: email || undefined, fullName, role, password: password || undefined }),
  });
}

export async function apiAdminResetUserPassword(userId, newPassword) {
  return apiFetch(`/auth/admin/${userId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword: newPassword || undefined }),
  });
}

// ─── MODERATOR (delegated staff) ────────────────────────────────────────────
export async function apiModeratorRecommend(userId, note) {
  return apiFetch(`/auth/moderator/${userId}/recommend`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

// ─── ADMIN: DELIST SERVICE LISTINGS ─────────────────────────────────────────
export async function apiAdminSetTestingAgencyActive(id, isActive) {
  return apiFetch(`/testing/admin/${id}/active`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
}

// Round 2, Milestone 6 — mirrors apiAdminVerifyWarehouse below (which
// previously had no equivalent for testing agencies/transport providers).
export async function apiAdminVerifyTestingAgency(id, verified) {
  return apiFetch(`/testing/admin/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ verified }) });
}

export async function apiAdminGetAllAgencies() {
  return apiFetch('/testing/admin/all');
}

export async function apiAdminSetTransportActive(id, isActive) {
  return apiFetch(`/transport/admin/${id}/active`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
}

// Round 2, Milestone 6.
export async function apiAdminVerifyTransport(id, verified) {
  return apiFetch(`/transport/admin/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ verified }) });
}

export async function apiAdminGetAllTransporters() {
  return apiFetch('/transport/admin/all');
}

export async function apiAdminSetWarehouseActive(id, isActive) {
  return apiFetch(`/warehouse/admin/${id}/active`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
}

// ─── LISTING MEDIA (warehouse / testing agency / transport) ────────────────
export async function apiGetListingMedia(entityType, entityId) {
  return apiFetch(`/media/${entityType}/${entityId}`);
}

export async function apiUploadListingMedia(entityType, entityId, files, type = 'image') {
  const token = getToken();
  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  const res = await fetch(`${BASE}/media/${entityType}/${entityId}?type=${type}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Upload failed');
  return data;
}

export async function apiSetListingMediaPrimary(mediaId) {
  return apiFetch(`/media/${mediaId}/set-primary`, { method: 'PATCH' });
}

export async function apiDeleteListingMedia(mediaId) {
  return apiFetch(`/media/${mediaId}`, { method: 'DELETE' });
}

export async function apiSetProductMediaPrimary(mediaId) {
  return apiFetch(`/products/media/${mediaId}/set-primary`, { method: 'PATCH' });
}
