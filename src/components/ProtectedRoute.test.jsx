import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const state = vi.hoisted(() => ({ value: { user: null, loading: false } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => state.value }));
import ProtectedRoute from './ProtectedRoute';

const at = (props, path = '/p') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/" element={<div>HOME</div>} />
      <Route path="/p" element={<ProtectedRoute {...props}><div>SECRET</div></ProtectedRoute>} />
    </Routes>
  </MemoryRouter>,
);

describe('ProtectedRoute', () => {
  it('renders nothing while the session is rehydrating (no premature redirect)', () => {
    state.value = { user: null, loading: true };
    const { container } = at({});
    expect(container).toBeEmptyDOMElement();
  });
  it('sends anonymous visitors home', () => {
    state.value = { user: null, loading: false };
    at({});
    expect(screen.getByText('HOME')).toBeInTheDocument();
  });
  it('lets any signed-in user through when no role is required', () => {
    state.value = { user: { role: 'buyer' }, loading: false };
    at({});
    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });
  it('admin routes accept admin and moderator only', () => {
    state.value = { user: { role: 'moderator' }, loading: false };
    at({ requireAdmin: true });
    expect(screen.getByText('SECRET')).toBeInTheDocument();
    state.value = { user: { role: 'buyer' }, loading: false };
    at({ requireAdmin: true });
    expect(screen.getByText('HOME')).toBeInTheDocument();
  });
  it('seller routes accept every seller-side role incl. exporter, not buyers', () => {
    state.value = { user: { role: 'exporter' }, loading: false };
    at({ requireSeller: true });
    expect(screen.getByText('SECRET')).toBeInTheDocument();
    state.value = { user: { role: 'buyer' }, loading: false };
    at({ requireSeller: true });
    expect(screen.getAllByText('HOME').length).toBeGreaterThan(0);
  });
  it('operator portals require the exact role', () => {
    state.value = { user: { role: 'transporter' }, loading: false };
    at({ requireRole: 'warehouse' });
    expect(screen.getByText('HOME')).toBeInTheDocument();
  });
});
