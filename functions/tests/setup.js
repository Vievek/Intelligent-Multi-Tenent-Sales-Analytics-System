process.env.TELEGRAM_BOT_TOKEN = 'test_token';
process.env.HUGGINGFACE_TOKEN = 'test_hf_token';
process.env.GEMINI_API_KEY = 'test_gemini_key';
process.env.PUBSUB_TOPIC = 'test-topic';
process.env.PUBSUB_DEAD_LETTER = 'test-dlq';
process.env.LOG_LEVEL = 'error';

jest.mock('@google-cloud/pubsub', () => {
  const mockTopic = {
    publish: jest.fn().mockResolvedValue('mock-message-id'),
    get: jest.fn().mockRejectedValue({ code: 5 }),
    create: jest.fn().mockResolvedValue([{ name: 'mock-topic' }]),
  };
  class MockPubSub {}
  MockPubSub.prototype.topic = jest.fn().mockReturnValue(mockTopic);
  MockPubSub.prototype.createTopic = jest.fn().mockResolvedValue([{ name: 'mock-topic' }]);
  return {
    PubSub: MockPubSub,
  };
});

// Mock the modular firebase-admin/firestore sub-path used after the FieldValue fix
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn().mockReturnValue('timestamp'),
    increment: jest.fn().mockImplementation((n) => n),
  },
  Timestamp: {
    fromDate: jest.fn().mockImplementation((d) => d),
    now: jest.fn().mockReturnValue({ seconds: 0, nanoseconds: 0 }),
  },
}));


jest.mock('node-telegram-bot-api', () => {
  return jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn().mockResolvedValue(),
    setWebhook: jest.fn().mockResolvedValue(),
  }));
});

jest.mock('@huggingface/inference', () => {
  return {
    HfInference: jest.fn().mockImplementation(() => ({
      tokenClassification: jest.fn().mockResolvedValue([
        { entity_group: 'MISC', word: 'apple', score: 0.9 },
        { entity_group: 'O', word: '5', score: 0.8 },
        { entity_group: 'O', word: '$10', score: 0.7 },
      ]),
    })),
  };
});

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest.fn().mockImplementation(async (options) => {
          const prompt = options.contents || '';
          let product = 'apple';
          let quantity = 5;
          let price = 10;

          // Look for numbers like "10 bags of rice" or "10 bags"
          const qtyMatch = prompt.match(/(\d+)\s+(?:bags|items|apples|mangoes|rice)/i);
          if (qtyMatch) {
            quantity = parseInt(qtyMatch[1]);
          } else {
            const genericQtyMatch = prompt.match(/sold\s+(\d+)/i);
            if (genericQtyMatch) quantity = parseInt(genericQtyMatch[1]);
          }

          // Look for price like "$200" or "500 rupees" or "150rs"
          const priceMatch = prompt.match(/(?:\$|rs|inr|rupees?)\s*(\d+)|(\d+)\s*(?:\$|rs|inr|rupees?)/i);
          if (priceMatch) {
            price = parseInt(priceMatch[1] || priceMatch[2]);
          }

          // Look for product name
          const prodMatch = prompt.match(/(?:bags of|sold|items)\s+([a-zA-Z\s]+?)(?:\s+for|\s+\d+|\s+today|\s+yesterday|\s*[\$|\d])/i);
          if (prodMatch) {
            product = prodMatch[1].trim();
          }

          return {
            text: JSON.stringify({ product, quantity, price }),
          };
        }),
      },
    })),
  };
});

jest.mock('firebase-admin', () => {
  const mockFirestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ empty: true, docs: [], forEach: jest.fn() }),
    set: jest.fn().mockResolvedValue(),
    update: jest.fn().mockResolvedValue(),
    delete: jest.fn().mockResolvedValue(),
    add: jest.fn().mockResolvedValue({ id: 'log123' }),
    collectionGroup: jest.fn().mockReturnThis(),
  };

  const firestoreFn = jest.fn().mockReturnValue(mockFirestore);
  firestoreFn.FieldValue = {
    serverTimestamp: jest.fn().mockReturnValue('timestamp'),
    increment: jest.fn().mockImplementation((n) => n),
  };

  return {
    initializeApp: jest.fn(),
    firestore: firestoreFn,
    FieldValue: firestoreFn.FieldValue,
    auth: jest.fn().mockReturnValue({
      createCustomToken: jest.fn().mockResolvedValue('token'),
      setCustomUserClaims: jest.fn().mockResolvedValue(),
    }),
  };
});

beforeEach(() => {
  const admin = require('firebase-admin');
  const db = admin.firestore();

  db.collection.mockImplementation(() => db);
  db.doc.mockImplementation(() => db);
  db.where.mockImplementation(() => db);
  db.orderBy.mockImplementation(() => db);
  db.limit.mockImplementation(() => db);
  db.get.mockResolvedValue({ empty: true, docs: [], forEach: jest.fn() });
  db.set.mockResolvedValue();
  db.update.mockResolvedValue();
  db.delete.mockResolvedValue();
  db.add.mockResolvedValue({ id: 'log123' });
  db.collectionGroup.mockImplementation(() => db);

  // Reset singleton lazy clients so tests can re-stub constructors
  try {
    const { pubsubService } = require('../src/services/pubsubService');
    pubsubService._client = null;
  } catch (_) {}
});
