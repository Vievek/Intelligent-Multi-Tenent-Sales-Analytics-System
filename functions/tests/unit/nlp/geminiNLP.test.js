const { geminiNLP } = require('../../../src/services/nlp/geminiNLP');

describe('GeminiNLP', () => {
  test('extracts product from message', async () => {
    const result = await geminiNLP.extract('sold 5 apples for $10');
    expect(result).toHaveProperty('product');
    expect(result).toHaveProperty('quantity');
    expect(result).toHaveProperty('price');
  });

  test('handles grammar mistakes', async () => {
    const result = await geminiNLP.extract('selled 3 mango 150rs');
    expect(result.product).toBeDefined();
    expect(result.quantity).toBeGreaterThan(0);
  });

  test('extracts quantity correctly', async () => {
    const result = await geminiNLP.extract('10 bags of rice $200');
    expect(result.quantity).toBe(10);
  });

  test('extracts price correctly', async () => {
    const result = await geminiNLP.extract('5 apples for $10');
    expect(result.price).toBe(10);
  });

  test('handles missing price with fallback', async () => {
    const result = await geminiNLP.extract('sold 5 apples');
    expect(result.price).toBeDefined();
  });

  test('handles informal currency formats', async () => {
    const result = await geminiNLP.extract('5 items 500 rupees');
    expect(result.price).toBe(500);
  });

  test('handles multiple products', async () => {
    const result = await geminiNLP.extract('5 apples $10, 3 mangoes $15');
    expect(result.product).toBeDefined();
  });

  test('returns default quantity when not specified', async () => {
    const result = await geminiNLP.extract('apple $10');
    expect(result.quantity).toBeGreaterThan(0);
  });

  test('handles empty text gracefully', async () => {
    await expect(geminiNLP.extract('')).rejects.toThrow();
  });

  test('handles very long text', async () => {
    const longText = 'sold ' + 'apple '.repeat(100) + 'for $100';
    const result = await geminiNLP.extract(longText);
    expect(result.product).toBeDefined();
  });

  test('handles malformed JSON response', async () => {
    const result = await geminiNLP.extract('sold 5 apples for $10');
    expect(result).toHaveProperty('product');
    expect(result).toHaveProperty('quantity');
    expect(result).toHaveProperty('price');
  });
});