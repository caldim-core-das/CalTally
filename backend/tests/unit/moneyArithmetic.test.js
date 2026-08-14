describe('Money Arithmetic & Decimals Validation (Volume 8 Section 3.2)', () => {
  // Utility rounding function matching Tally-style decimal alignment
  const roundHalfUp = (value, decimals = 2) => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  };

  it('should round money amounts correctly using half-up arithmetic to 2 decimal places', () => {
    expect(roundHalfUp(10.254)).toBe(10.25);
    expect(roundHalfUp(10.255)).toBe(10.26);
    expect(roundHalfUp(10.256)).toBe(10.26);
    expect(roundHalfUp(100.999)).toBe(101.00);
  });

  it('should reject negative posting amount parameters', () => {
    const validateAmount = (amount) => {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed < 0) {
        throw new Error('INTEGRITY ERROR: Negative or non-numeric amounts are prohibited.');
      }
      return parsed;
    };

    expect(() => validateAmount(-150.25)).toThrow(/Negative or non-numeric/);
    expect(() => validateAmount('abc')).toThrow(/Negative or non-numeric/);
    expect(validateAmount(450.50)).toBe(450.50);
  });
});
