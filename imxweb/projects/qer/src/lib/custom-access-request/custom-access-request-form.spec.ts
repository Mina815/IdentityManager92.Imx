import { createCustomAccessRequestForm } from './custom-access-request-form';

describe('custom access request form', () => {
  it('requires a reason and both duration dates', () => {
    const form = createCustomAccessRequestForm();

    expect(form.valid).toBe(false);
    form.patchValue({
      reason: 'Business need',
      validFrom: '2026-10-18',
      validUntil: '2026-10-18',
    });
    expect(form.valid).toBe(true);
  });

  it('rejects an end date earlier than the start date', () => {
    const form = createCustomAccessRequestForm();
    form.patchValue({
      reason: 'Business need',
      validFrom: '2026-10-19',
      validUntil: '2026-10-18',
    });

    expect(form.hasError('invalidDateRange')).toBe(true);
    expect(form.valid).toBe(false);
  });

  it('allows an end date equal to the start date', () => {
    const form = createCustomAccessRequestForm();
    form.patchValue({
      reason: 'Business need',
      validFrom: '2026-10-18',
      validUntil: '2026-10-18',
    });

    expect(form.hasError('invalidDateRange')).toBe(false);
    expect(form.valid).toBe(true);
  });
});
