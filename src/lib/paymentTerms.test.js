import { describe, it, expect } from 'vitest';
import { blankTermsForm, formFromTerms, termsFromForm, validateTermsForm, describeTerms, scheduleFor, diffRound } from './paymentTerms';

const f = (over) => ({ ...blankTermsForm('COD'), ...over });

describe('validateTermsForm', () => {
  it('accepts simple types', () => {
    expect(validateTermsForm(f({ type: 'FULL_ADVANCE' }))).toBeNull();
    expect(validateTermsForm(f({ type: 'COD' }))).toBeNull();
  });
  it('credit: presets ok, custom 1-365 only', () => {
    expect(validateTermsForm(f({ type: 'CREDIT', creditPreset: '60' }))).toBeNull();
    expect(validateTermsForm(f({ type: 'CREDIT', creditPreset: 'custom', creditCustom: '45' }))).toBeNull();
    for (const bad of ['0', '366', '1.5', '', 'abc']) {
      expect(validateTermsForm(f({ type: 'CREDIT', creditPreset: 'custom', creditCustom: bad }))).toMatch(/1 and 365/);
    }
  });
  it('partial advance: pct strictly between 0 and 100, or a positive amount', () => {
    expect(validateTermsForm(f({ type: 'PARTIAL_ADVANCE', advancePct: '25' }))).toBeNull();
    expect(validateTermsForm(f({ type: 'PARTIAL_ADVANCE', advancePct: '0' }))).toMatch(/above 0/);
    expect(validateTermsForm(f({ type: 'PARTIAL_ADVANCE', advancePct: '100' }))).toMatch(/below 100/);
    expect(validateTermsForm(f({ type: 'PARTIAL_ADVANCE', advanceMode: 'AMOUNT', advanceAmount: '-5' }))).toMatch(/advance amount/);
    expect(validateTermsForm(f({ type: 'PARTIAL_ADVANCE', advanceMode: 'AMOUNT', advanceAmount: '5000' }))).toBeNull();
  });
  it('partial advance with credit balance also needs a valid credit period', () => {
    expect(validateTermsForm(f({ type: 'PARTIAL_ADVANCE', advancePct: '20', balanceDueEvent: 'CREDIT', creditPreset: 'custom', creditCustom: '999' }))).toMatch(/1 and 365/);
  });
  it('OTHER needs a real description', () => {
    expect(validateTermsForm(f({ type: 'OTHER', description: 'short' }))).toMatch(/at least 10/);
    expect(validateTermsForm(f({ type: 'OTHER', description: 'Letter of credit at sight' }))).toBeNull();
  });
});

describe('termsFromForm / formFromTerms', () => {
  it('sends only the fields that apply', () => {
    expect(termsFromForm(f({ type: 'COD', creditPreset: '90', advancePct: '30' }))).toEqual({ type: 'COD' });
    expect(termsFromForm(f({ type: 'CREDIT', creditPreset: '90' }))).toEqual({ type: 'CREDIT', creditDays: 90, creditStart: 'DELIVERY_ACK' });
    expect(termsFromForm(f({ type: 'PARTIAL_ADVANCE', advancePct: '30', balanceDueEvent: 'ON_DELIVERY' })))
      .toEqual({ type: 'PARTIAL_ADVANCE', advancePct: 30, balanceDueEvent: 'ON_DELIVERY' });
    expect(termsFromForm(f({ type: 'PARTIAL_ADVANCE', advanceMode: 'AMOUNT', advanceAmount: '5000', balanceDueEvent: 'CREDIT', creditPreset: 'custom', creditCustom: '45', creditStart: 'INVOICE_DATE' })))
      .toEqual({ type: 'PARTIAL_ADVANCE', advanceAmount: 5000, balanceDueEvent: 'CREDIT', creditDays: 45, creditStart: 'INVOICE_DATE' });
  });
  it('round-trips API terms into the form', () => {
    const t = { type: 'CREDIT', creditDays: 45, creditStart: 'INVOICE_DATE' };
    expect(termsFromForm(formFromTerms(t))).toEqual(t);
    const p = { type: 'PARTIAL_ADVANCE', advanceAmount: 1000, balanceDueEvent: 'ON_ACKNOWLEDGEMENT' };
    expect(termsFromForm(formFromTerms(p))).toEqual(p);
    expect(formFromTerms({ type: 'CREDIT', creditDays: 60 }).creditPreset).toBe('60');
    expect(formFromTerms(null).type).toBe('COD');
  });
});

describe('describeTerms / scheduleFor', () => {
  it('describes every type in plain words', () => {
    expect(describeTerms(null)).toBe('Not specified');
    expect(describeTerms({ type: 'CREDIT', creditDays: 30 })).toMatch(/30 days after delivery acknowledgement/);
    expect(describeTerms({ type: 'CREDIT', creditDays: 30, creditStart: 'INVOICE_DATE' })).toMatch(/invoice date/);
    expect(describeTerms({ type: 'PARTIAL_ADVANCE', advancePct: 25, balanceDueEvent: 'ON_DELIVERY' })).toBe('Partial advance - 25% on confirmation, balance on delivery');
  });
  it('splits the total exactly', () => {
    const s = scheduleFor({ type: 'PARTIAL_ADVANCE', advancePct: 33.33, balanceDueEvent: 'ON_DELIVERY' }, 100000);
    expect(s.map(x => x.amount)).toEqual([33330, 66670]);
  });
  it('an advance amount not below the total yields null (cannot be scheduled)', () => {
    expect(scheduleFor({ type: 'PARTIAL_ADVANCE', advanceAmount: 100, balanceDueEvent: 'ON_DELIVERY' }, 100)).toBeNull();
  });
  it('credit and COD rules', () => {
    expect(scheduleFor({ type: 'CREDIT', creditDays: 60 }, 500)[0].dueRule).toBe('60 days after delivery acknowledgement');
    expect(scheduleFor({ type: 'COD' }, 500)[0].dueRule).toBe('On delivery');
  });
});

describe('diffRound', () => {
  it('lists only what changed', () => {
    const prev = { price: 100, quantity: 10, paymentTerms: { type: 'COD' } };
    expect(diffRound(prev, { price: 100, quantity: 10, paymentTerms: { type: 'COD' } })).toEqual([]);
    const rows = diffRound(prev, { price: 120, quantity: 10, paymentTerms: { type: 'FULL_ADVANCE' } });
    expect(rows.map(r => r.label)).toEqual(['Price', 'Payment terms']);
  });
});
