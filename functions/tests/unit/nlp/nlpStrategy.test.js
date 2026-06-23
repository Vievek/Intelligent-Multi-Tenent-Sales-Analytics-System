const { nlpStrategy } = require('../../../src/services/nlp/nlpStrategy');
const { huggingfaceNLP } = require('../../../src/services/nlp/huggingfaceNLP');
const { geminiNLP } = require('../../../src/services/nlp/geminiNLP');

jest.mock('../../../src/services/nlp/huggingfaceNLP');
jest.mock('../../../src/services/nlp/geminiNLP');

describe('NLPStrategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('UT-04: uses HuggingFace when confidence is HIGH', async () => {
    huggingfaceNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
    });

    const result = await nlpStrategy.extract('sold 5 apples for $10');
    expect(result.method).toBe('huggingface');
    expect(result.confidence).toBe('HIGH');
  });

  test('UT-03: falls back to Gemini when confidence is LOW', async () => {
    huggingfaceNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: null,
      price: null,
    });
    geminiNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
    });

    const result = await nlpStrategy.extract('random text xyz');
    expect(result.method).toBe('gemini');
  });

  test('falls back to Gemini when HuggingFace throws error', async () => {
    huggingfaceNLP.extract.mockRejectedValue(new Error('HF error'));
    geminiNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
    });

    const result = await nlpStrategy.extract('sold 5 apples for $10');
    expect(result.method).toBe('gemini');
  });

  test('handles empty text gracefully', async () => {
    geminiNLP.extract.mockResolvedValue({
      product: 'unknown',
      quantity: 1,
      price: 0.01,
    });

    const result = await nlpStrategy.extract('');
    expect(result.product).toBeDefined();
  });

  test('handles very short text', async () => {
    geminiNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: 1,
      price: 10,
    });

    const result = await nlpStrategy.extract('apple $10');
    expect(result.product).toBeDefined();
  });

  test('normalizes result to valid values', async () => {
    huggingfaceNLP.extract.mockResolvedValue({
      product: null,
      quantity: 'invalid',
      price: 'invalid',
    });

    const result = await nlpStrategy.extract('sold 5 apples for $10');
    expect(result.product).toBe('unknown');
    expect(result.quantity).toBeGreaterThan(0);
    expect(result.price).toBeGreaterThan(0);
  });

  test('sets confidence based on extraction completeness', async () => {
    huggingfaceNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: null,
    });

    const result = await nlpStrategy.extract('sold 5 apples');
    expect(result.confidence).toBe('MEDIUM');
  });
});