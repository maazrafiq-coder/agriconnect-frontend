import { describe, it, expect } from 'vitest';
import { adaptProduct, adaptTransportRequest, adaptReceipt, adaptOffer } from './adapters';

describe('adaptProduct', () => {
  it('keeps missing quality metrics as null (never 0 or "undefined")', () => {
    const p = adaptProduct({ id: 'p1', name: 'Basmati', askingPrice: '4200', unit: 'kg', quantity: 10, riceDetails: { moisturePct: 12 } });
    expect(p.metrics.moisture).toBe(12);
    expect(p.metrics.broken).toBeNull();
    expect(p.metrics.length).toBeNull();
  });
});

describe('adaptTransportRequest', () => {
  it('renders no ETA text when there is no estimate (fixes "ETA: undefined")', () => {
    const r = adaptTransportRequest({ id: 't1', status: 'BOOKED', pickupCity: 'Lahore', deliveryCity: 'Karachi' });
    expect(r.eta).toBe('');
    expect(r.quotedPrice).toBeNull();
    expect(r.from).toBe('Lahore');
  });
  it('maps quote and agreed prices to numbers', () => {
    const r = adaptTransportRequest({ id: 't1', status: 'QUOTED', quotedPrice: '45000.00', agreedPrice: null });
    expect(r.quotedPrice).toBe(45000);
    expect(r.agreedPrice).toBeNull();
  });
});

describe('adaptReceipt', () => {
  it('exposes the human receipt number separately from the internal id', () => {
    const r = adaptReceipt({ id: 'uuid-1', receiptNumber: 'DWR-2026-000012', commodity: 'Rice', marketValue: '100', status: 'ACTIVE' });
    expect(r.id).toBe('uuid-1');
    expect(r.number).toBe('DWR-2026-000012');
  });
});

describe('adaptOffer', () => {
  it('carries the product unit so price labels are not hard-coded', () => {
    const o = adaptOffer({ id: 'o1', offeredPrice: '100', quantity: 5, status: 'PENDING', product: { name: 'Wheat', unit: 'maund', askingPrice: '120' } });
    expect(o.productUnit).toBe('maund');
  });
});
