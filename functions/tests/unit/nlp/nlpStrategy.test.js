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

  test('normalizes result — Gemini fallback provides valid values when HF returns nulls', async () => {
    // When HF returns nulls, confidence=LOW, Gemini fallback runs
    huggingfaceNLP.extract.mockResolvedValue({
      product: null,
      quantity: null,
      price: null,
    });
    geminiNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
    });

    const result = await nlpStrategy.extract('sold 5 apples for $10');
    // Gemini provides the final values — they should be valid
    expect(result.product).toBeDefined();
    expect(result.quantity).toBeGreaterThan(0);
    expect(result.price).toBeGreaterThan(0);
    expect(result.method).toBe('gemini');
  });

  test('keeps HF result at MEDIUM confidence when price missing (not low enough for Gemini)', async () => {
    // HF returns product + quantity but price=null → confidenceScorer = MEDIUM
    // Strategy only falls back when confidence=LOW, so HF result is kept
    huggingfaceNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: null,
    });

    const result = await nlpStrategy.extract('sold 5 apples');
    expect(result.method).toBe('huggingface');
    expect(result.confidence).toBe('MEDIUM');
  });

  test('normalizeResult handles empty/falsy inputs correctly', () => {
    const normalized = nlpStrategy.normalizeResult({}, null);
    expect(normalized).toEqual({
      product: 'unknown',
      quantity: 1,
      price: 0.01,
      confidence: 'LOW',
      method: 'gemini',
    });
  });
});