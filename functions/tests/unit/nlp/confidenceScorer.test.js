const { confidenceScorer } = require('../../../src/services/nlp/confidenceScorer');

describe('ConfidenceScorer', () => {
  test('returns HIGH when all 3 entities found', () => {
    const result = confidenceScorer.score({
      product: 'apple',
      quantity: 5,
      price: 10,
    });
    expect(result).toBe('HIGH');
  });

  test('returns MEDIUM when 2 entities found', () => {
    const result = confidenceScorer.score({
      product: 'apple',
      quantity: 5,
      price: null,
    });
    expect(result).toBe('MEDIUM');
  });

  test('returns LOW when 1 entity found', () => {
    const result = confidenceScorer.score({
      product: 'apple',
      quantity: null,
      price: null,
    });
    expect(result).toBe('LOW');
  });

  test('returns LOW when 0 entities found', () => {
    const result = confidenceScorer.score({
      product: null,
      quantity: null,
      price: null,
    });
    expect(result).toBe('LOW');
  });

  test('considers product unknown as missing', () => {
    const result = confidenceScorer.score({
      product: 'unknown',
      quantity: 5,
      price: 10,
    });
    expect(result).toBe('MEDIUM');
  });

  test('considers empty product as missing', () => {
    const result = confidenceScorer.score({
      product: '',
      quantity: 5,
      price: 10,
    });
    expect(result).toBe('MEDIUM');
  });

  test('considers zero quantity as missing', () => {
    const result = confidenceScorer.score({
      product: 'apple',
      quantity: 0,
      price: 10,
    });
    expect(result).toBe('MEDIUM');
  });

  test('considers zero price as missing', () => {
    const result = confidenceScorer.score({
      product: 'apple',
      quantity: 5,
      price: 0,
    });
    expect(result).toBe('MEDIUM');
  });

  test('handles null values gracefully', () => {
    const result = confidenceScorer.score({
      product: null,
      quantity: null,
      price: null,
    });
    expect(result).toBe('LOW');
  });

  test('handles undefined values gracefully', () => {
    const result = confidenceScorer.score({
      product: undefined,
      quantity: undefined,
      price: undefined,
    });
    expect(result).toBe('LOW');
  });
});