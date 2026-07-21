describe('Invoice State Machine Testing Suite (Volume 8 Section 3.2)', () => {
  const invoiceStates = {
    DRAFT: 'Draft',
    APPROVED: 'Approved',
    PAID: 'Paid',
    VOIDED: 'Voided'
  };

  const transitionInvoiceState = (currentStatus, targetStatus) => {
    // Transition rules:
    // Draft -> Approved -> Paid
    // Approved -> Voided
    // Paid -> Voided
    // Voided cannot transition to any other status.
    
    if (currentStatus === invoiceStates.VOIDED) {
      throw new Error('TRANSITION ERROR: Cannot change state of a voided invoice.');
    }

    if (currentStatus === invoiceStates.DRAFT && targetStatus === invoiceStates.PAID) {
      throw new Error('TRANSITION ERROR: Cannot transition Draft invoice directly to Paid. Must be Approved first.');
    }

    if (currentStatus === invoiceStates.PAID && targetStatus === invoiceStates.APPROVED) {
      throw new Error('TRANSITION ERROR: Cannot revert Paid invoice back to Approved.');
    }

    return targetStatus;
  };

  it('should allow valid state transitions', () => {
    expect(transitionInvoiceState(invoiceStates.DRAFT, invoiceStates.APPROVED)).toBe(invoiceStates.APPROVED);
    expect(transitionInvoiceState(invoiceStates.APPROVED, invoiceStates.PAID)).toBe(invoiceStates.PAID);
    expect(transitionInvoiceState(invoiceStates.PAID, invoiceStates.VOIDED)).toBe(invoiceStates.VOIDED);
  });

  it('should block illegal state transitions', () => {
    expect(() => transitionInvoiceState(invoiceStates.VOIDED, invoiceStates.PAID)).toThrow();
    expect(() => transitionInvoiceState(invoiceStates.DRAFT, invoiceStates.PAID)).toThrow();
    expect(() => transitionInvoiceState(invoiceStates.PAID, invoiceStates.APPROVED)).toThrow();
  });
});
