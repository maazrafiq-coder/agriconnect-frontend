// src/lib/roles.js
// Central place for "which portal does this UserRole land on" — App.jsx's
// route guards and Navbar's "My Portal" button both need this mapping and
// previously only handled admin/seller/buyer, silently dropping warehouse,
// testing_agency, and transporter accounts onto the generic buyer view.

// Backend UserRole enum values that count as "seller" for route-guard
// purposes. adaptUser() lowercases the raw enum (TRADER -> 'trader'), so
// this must be checked against the enum's actual values.
// Includes 'exporter' — UserRole.EXPORTER is a real, distinct seller-side
// business role (see AdminDashboard's user-creation form), not a synonym
// for buyer. It was missing here, which meant an Exporter account fell
// through to the generic buyer portal by default.
export const SELLER_ROLES = ['trader', 'farmer', 'miller', 'exporter'];

// role -> { path, icon, label }
export const OPERATOR_PORTALS = {
  warehouse:       { path: '/warehouse-portal', icon: '🏭', label: 'Warehouse Portal' },
  testing_agency:  { path: '/testing-portal',   icon: '🧪', label: 'Lab Portal' },
  transporter:     { path: '/transport-portal', icon: '🚚', label: 'Transport Portal' },
};

export function portalPathForRole(role) {
  if (role === 'admin') return '/admin';
  if (SELLER_ROLES.includes(role)) return '/seller';
  if (OPERATOR_PORTALS[role]) return OPERATOR_PORTALS[role].path;
  return '/buyer';
}

export function portalIconForRole(role) {
  if (role === 'admin') return '🔐';
  if (SELLER_ROLES.includes(role)) return '📦';
  if (OPERATOR_PORTALS[role]) return OPERATOR_PORTALS[role].icon;
  return '🛒';
}
