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

describe('adaptTransportRequest — Phase 3 fields', () => {
  const raw = {
    id: 't1', status: 'QUOTED', pickupCity: 'Lahore', deliveryCity: 'Karachi', requestRef: 'TRQ-2026-000001', orderRef: 'AB12CD34',
    order: { id: 'AB12CD34-x', ref: 'AB12CD34', productName: 'Basmati' }, requesterName: 'Bilal',
    provider: { companyName: 'FastHaul', name: 'Omar' }, rounds: [{ id: 'q1', roundNo: 1 }], currentRound: { id: 'q1', price: 5 }, turn: 'REQUESTER',
    vehicleRegNo: 'LEA-1', invoice: { id: 'i1' }, dispute: null, disputes: [], canAcknowledge: false, quotedPrice: '45000.00',
  };
  it('carries references, rounds, turn, driver plate, invoice and names', () => {
    const a = adaptTransportRequest(raw);
    expect(a).toMatchObject({ requestRef: 'TRQ-2026-000001', orderRef: 'AB12CD34', orderProduct: 'Basmati', requester: 'Bilal', provider: 'FastHaul', turn: 'REQUESTER', vehicleRegNo: 'LEA-1', quotedPrice: 45000 });
    expect(a.rounds).toHaveLength(1);
    expect(a.currentRound.id).toBe('q1');
    expect(a.invoice.id).toBe('i1');
  });
  it('stays backwards compatible with older payloads (no rounds / refs)', () => {
    const a = adaptTransportRequest({ id: 't2', status: 'REQUESTED', pickupCity: 'A', deliveryCity: 'B', requester: { profile: { fullName: 'X' } } });
    expect(a).toMatchObject({ requestRef: '', rounds: [], currentRound: null, turn: null, disputes: [], invoice: null, requester: 'X' });
  });
});
