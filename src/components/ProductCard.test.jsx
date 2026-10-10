import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductCard from './ProductCard';

const base = { id: 'p1', name: 'Super Basmati', stage: 'White Rice', location: 'Lahore, Punjab', price: 4200, unit: 'kg', qty: 100, badge: '', seller: 'Ali', sellerVerified: true, sellerRating: 4, images: [] };

describe('ProductCard', () => {
  it('never prints null/undefined for missing quality data', () => {
    const { container } = render(<MemoryRouter><ProductCard product={{ ...base, metrics: { moisture: null, length: null, broken: null } }} /></MemoryRouter>);
    expect(container.textContent).not.toMatch(/null|undefined/);
    expect(screen.getByText('Quality details not provided')).toBeInTheDocument();
  });
  it('shows only the metrics that exist and uses the real unit in the price', () => {
    render(<MemoryRouter><ProductCard product={{ ...base, metrics: { moisture: 12, length: null, broken: 3 } }} /></MemoryRouter>);
    expect(screen.getByText('💧12%')).toBeInTheDocument();
    expect(screen.getByText('💔3%')).toBeInTheDocument();
    expect(screen.queryByText(/mm/)).toBeNull();
    expect(screen.getByText('/kg')).toBeInTheDocument();
  });
  it('is keyboard reachable as a link', () => {
    render(<MemoryRouter><ProductCard product={{ ...base, metrics: {} }} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Super Basmati/ })).toHaveAttribute('tabindex', '0');
  });
});
