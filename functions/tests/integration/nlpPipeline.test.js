const { nlpStrategy } = require('../../src/services/nlp/nlpStrategy');
const { huggingfaceNLP } = require('../../src/services/nlp/huggingfaceNLP');
const { geminiNLP } = require('../../src/services/nlp/geminiNLP');
const { confidenceScorer } = require('../../src/services/nlp/confidenceScorer');
const { preprocessor } = require('../../src/services/nlp/preprocessor');

jest.mock('../../src/services/nlp/huggingfaceNLP');
jest.mock('../../src/services/nlp/geminiNLP');

describe('NLP Pipeline Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Full pipeline processes message correctly', async () => {
    huggingfaceNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
    });

    const text = 'sold 5 apples for $10';
    const cleaned = preprocessor.clean(text);
    const result = await nlpStrategy.extract(text);
    const confidence = confidenceScorer.score(result);

    expect(cleaned).toBeDefined();
    expect(result.product).toBe('apple');
    expect(result.quantity).toBe(5);
    expect(result.price).toBe(10);
    expect(confidence).toBe('HIGH');
  });

  test('Preprocessor + HF + Confidence works together', async () => {
    huggingfaceNLP.extract.mockResolvedValue({
      product: 'mango',
      quantity: 3,
      price: 150,
    });

    const text = 'selled 3 mango 150rs';
    const result = await nlpStrategy.extract(text);
    const confidence = confidenceScorer.score(result);

    expect(result.product).toBe('mango');
    expect(result.quantity).toBe(3);
    expect(result.price).toBe(150);
    expect(confidence).toBe('HIGH');
  });

  test('Preprocessor + Gemini fallback works', async () => {
    huggingfaceNLP.extract.mockResolvedValue({
      product: 'unknown',
      quantity: null,
      price: null,
    });

    geminiNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
    });

    const text = 'random text xyz';
    const result = await nlpStrategy.extract(text);
    const confidence = confidenceScorer.score(result);

    expect(result.method).toBe('gemini');
    expect(result.product).toBe('apple');
    expect(confidence).toBe('HIGH');
  });

  test('Handles multiple products in one message', async () => {
    huggingfaceNLP.extract.mockResolvedValue({
      product: 'apples',
      quantity: 5,
      price: 10,
    });

    const text = '5 apples $10, 3 mangoes $15';
    const result = await nlpStrategy.extract(text);

    expect(result.product).toBeDefined();
    expect(result.quantity).toBeGreaterThan(0);
    expect(result.price).toBeGreaterThan(0);
  });

  test('Extracts date from message', async () => {
    huggingfaceNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
    });

    const { dateParser } = require('../../src/utils/dateParser');
    const text = 'sold 5 apples today for $10';
    const date = dateParser.extractDate(text, 1234567890);

    expect(date).toBeInstanceOf(Date);
    expect(date.getDate()).toBe(new Date().getDate());
  });

  test('Validates extracted data against schema', async () => {
    huggingfaceNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
    });

    const { saleSchema } = require('../../src/validators/saleSchema');
    const text = 'sold 5 apples for $10';
    const result = await nlpStrategy.extract(text);

    const validated = saleSchema.parse({
      product: result.product,
      quantity: result.quantity,
      price: result.price,
      date: new Date().toISOString(),
      rawMessage: text,
      agentId: '123',
      tenantId: 'tenant1',
      confidence: result.confidence,
      extractionMethod: result.method,
    });

    expect(validated.product).toBe('apple');
    expect(validated.quantity).toBe(5);
    expect(validated.price).toBe(10);
  });

  test('Handles informal currency formats', async () => {
    huggingfaceNLP.extract.mockResolvedValue({
      product: 'items',
      quantity: 5,
      price: 500,
    });

    const text = '5 items 500 rupees';
    const result = await nlpStrategy.extract(text);

    expect(result.price).toBe(500);
  });

  test('Handles missing quantity with default', async () => {
    huggingfaceNLP.extract.mockResolvedValue({
      product: 'apple',
      quantity: 1,
      price: 10,
    });

    const text = 'apple $10';
    const result = await nlpStrategy.extract(text);

    expect(result.quantity).toBe(1);
  });
});
