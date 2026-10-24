export const statusLabel = (s) => (s || '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
