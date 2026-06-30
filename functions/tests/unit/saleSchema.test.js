const { saleSchema } = require('../../src/validators/saleSchema');

describe('SaleSchema', () => {
  test('UT-14: valid sale passes schema', () => {
    const validData = {
      product: 'apple',
      quantity: 5,
      price: 10,
      date: new Date().toISOString(),
      rawMessage: 'sold 5 apples for $10',
      agentId: '123',
      tenantId: 'tenant1',
      confidence: 'HIGH',
      extractionMethod: 'huggingface',
    };
    const result = saleSchema.parse(validData);
    expect(result).toEqual(validData);
  });

  test('UT-15: rejects negative price', () => {
    const invalidData = {
      product: 'apple',
      quantity: 5,
      price: -10,
      date: new Date().toISOString(),
      rawMessage: 'sold 5 apples for -$10',
      agentId: '123',
      tenantId: 'tenant1',
    };
    expect(() => saleSchema.parse(invalidData)).toThrow();
  });

  test('UT-16: rejects zero quantity', () => {
    const invalidData = {
      product: 'apple',
      quantity: 0,
      price: 10,
      date: new Date().toISOString(),
      rawMessage: 'sold 0 apples for $10',
      agentId: '123',
      tenantId: 'tenant1',
    };
    expect(() => saleSchema.parse(invalidData)).toThrow();
  });

  test('UT-17: rejects missing tenantId', () => {
    const invalidData = {
      product: 'apple',
      quantity: 5,
      price: 10,
      date: new Date().toISOString(),
      rawMessage: 'sold 5 apples for $10',
      agentId: '123',
    };
    expect(() => saleSchema.parse(invalidData)).toThrow();
  });

  test('rejects missing product', () => {
    const invalidData = {
      quantity: 5,
      price: 10,
      date: new Date().toISOString(),
      rawMessage: 'sold 5 for $10',
      agentId: '123',
      tenantId: 'tenant1',
    };
    expect(() => saleSchema.parse(invalidData)).toThrow();
  });

  test('rejects empty product', () => {
    const invalidData = {
      product: '',
      quantity: 5,
      price: 10,
      date: new Date().toISOString(),
      rawMessage: 'sold 5 for $10',
      agentId: '123',
      tenantId: 'tenant1',
    };
    expect(() => saleSchema.parse(invalidData)).toThrow();
  });

  test('rejects missing rawMessage', () => {
    const invalidData = {
      product: 'apple',
      quantity: 5,
      price: 10,
      date: new Date().toISOString(),
      agentId: '123',
      tenantId: 'tenant1',
    };
    expect(() => saleSchema.parse(invalidData)).toThrow();
  });

  test('rejects missing agentId', () => {
    const invalidData = {
      product: 'apple',
      quantity: 5,
      price: 10,
      date: new Date().toISOString(),
      rawMessage: 'sold 5 apples for $10',
      tenantId: 'tenant1',
    };
    expect(() => saleSchema.parse(invalidData)).toThrow();
  });

  test('accepts confidence as optional', () => {
    const validData = {
      product: 'apple',
      quantity: 5,
      price: 10,
      date: new Date().toISOString(),
      rawMessage: 'sold 5 apples for $10',
      agentId: '123',
      tenantId: 'tenant1',
    };
    const result = saleSchema.parse(validData);
    expect(result.confidence).toBe('LOW');
  });

  test('accepts extractionMethod as optional', () => {
    const validData = {
      product: 'apple',
      quantity: 5,
      price: 10,
      date: new Date().toISOString(),
      rawMessage: 'sold 5 apples for $10',
      agentId: '123',
      tenantId: 'tenant1',
    };
    const result = saleSchema.parse(validData);
    expect(result.extractionMethod).toBe('gemini');
  });

  test('rejects extra fields', () => {
    const invalidData = {
      product: 'apple',
      quantity: 5,
      price: 10,
      date: new Date().toISOString(),
      rawMessage: 'sold 5 apples for $10',
      agentId: '123',
      tenantId: 'tenant1',
      extraField: 'should fail',
    };
    expect(() => saleSchema.parse(invalidData)).toThrow();
  });

  test('accepts firestore timestamps in date field', () => {
    const baseData = {
      product: 'apple',
      quantity: 5,
      price: 10,
      rawMessage: 'sold 5 apples for $10',
      agentId: '123',
      tenantId: 'tenant1',
    };

    // Object with toDate function
    const dataWithToDate = {
      ...baseData,
      date: { toDate: () => new Date() },
    };
    expect(saleSchema.parse(dataWithToDate)).toBeDefined();

    // Object with seconds and nanoseconds
    const dataWithSeconds = {
      ...baseData,
      date: { seconds: 1719734567, nanoseconds: 123000 },
    };
    expect(saleSchema.parse(dataWithSeconds)).toBeDefined();

    // Object with _seconds and _nanoseconds
    const dataWithUnderscoreSeconds = {
      ...baseData,
      date: { _seconds: 1719734567, _nanoseconds: 123000 },
    };
    expect(saleSchema.parse(dataWithUnderscoreSeconds)).toBeDefined();

    // Rejecting object without required keys
    const dataWithInvalidObject = {
      ...baseData,
      date: { invalidKey: 123 },
    };
    expect(() => saleSchema.parse(dataWithInvalidObject)).toThrow();
  });
});