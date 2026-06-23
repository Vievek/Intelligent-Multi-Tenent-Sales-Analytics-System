const { huggingfaceNLP } = require('../../../src/services/nlp/huggingfaceNLP');

describe('HuggingFaceNLP', () => {
  test('extracts product from clean message', async () => {
    const result = await huggingfaceNLP.extract('sold 5 apples for $10');
    expect(result).toHaveProperty('product');
    expect(result).toHaveProperty('quantity');
    expect(result).toHaveProperty('price');
  });

  test('handles grammar mistakes', async () => {
    const result = await huggingfaceNLP.extract('selled 3 mango 150rs');
    expect(result.product).toBeDefined();
    expect(result.quantity).toBeGreaterThan(0);
  });

  test('extracts quantity from text', async () => {
    const result = await huggingfaceNLP.extract('10 bags of rice $200');
    expect(result.quantity).toBe(10);
  });

  test('extracts price from text', async () => {
    const result = await huggingfaceNLP.extract('5 apples for $10');
    expect(result.price).toBe(10);
  });

  test('handles missing price', async () => {
    const result = await huggingfaceNLP.extract('sold 5 apples');
    expect(result.price).toBeNull();
  });

  test('handles informal currency formats', async () => {
    const result = await huggingfaceNLP.extract('5 items 500 rupees');
    expect(result.price).toBe(500);
  });

  test('handles multiple products in one message', async () => {
    const result = await huggingfaceNLP.extract('5 apples $10, 3 mangoes $15');
    expect(result.product).toBeDefined();
  });

  test('returns default quantity when not specified', async () => {
    const result = await huggingfaceNLP.extract('apple $10');
    expect(result.quantity).toBe(1);
  });

  test('handles empty text gracefully', async () => {
    await expect(huggingfaceNLP.extract('')).rejects.toThrow();
  });

  test('handles very long text', async () => {
    const longText = 'sold ' + 'apple '.repeat(100) + 'for $100';
    const result = await huggingfaceNLP.extract(longText);
    expect(result.product).toBeDefined();
  });
});