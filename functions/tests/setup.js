process.env.TELEGRAM_BOT_TOKEN = 'test_token';
process.env.HUGGINGFACE_TOKEN = 'test_hf_token';
process.env.GEMINI_API_KEY = 'test_gemini_key';
process.env.PUBSUB_TOPIC = 'test-topic';
process.env.PUBSUB_DEAD_LETTER = 'test-dlq';
process.env.LOG_LEVEL = 'error';

jest.mock('@google-cloud/pubsub', () => {
  return {
    PubSub: jest.fn().mockImplementation(() => ({
      topic: jest.fn().mockReturnValue({
        publish: jest.fn().mockResolvedValue('mock-message-id'),
        get: jest.fn().mockRejectedValue({ code: 5 }),
        create: jest.fn().mockResolvedValue([{ name: 'mock-topic' }]),
      }),
      createTopic: jest.fn().mockResolvedValue([{ name: 'mock-topic' }]),
    })),
  };
});

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

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue('{"product":"apple","quantity":5,"price":10}'),
          },
        }),
      }),
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
    collectionGroup: jest.fn().mockReturnThis(),
  };

  return {
    initializeApp: jest.fn(),
    firestore: jest.fn().mockReturnValue(mockFirestore),
    FieldValue: {
      serverTimestamp: jest.fn().mockReturnValue('timestamp'),
      increment: jest.fn().mockImplementation((n) => n),
    },
    auth: jest.fn().mockReturnValue({
      createCustomToken: jest.fn().mockResolvedValue('token'),
      setCustomUserClaims: jest.fn().mockResolvedValue(),
    }),
  };
});
