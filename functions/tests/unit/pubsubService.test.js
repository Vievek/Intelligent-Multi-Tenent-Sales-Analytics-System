const { pubsubService } = require('../../src/services/pubsubService');
const { PubSub } = require('@google-cloud/pubsub');

jest.mock('@google-cloud/pubsub');

describe('PubSubService', () => {
  let mockPublish;
  let mockTopic;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset lazy client so the mock PubSub is used fresh each test
    pubsubService._client = null;

    mockPublish = jest.fn().mockResolvedValue('msg123');
    mockTopic = { publish: mockPublish, get: jest.fn() };
    PubSub.prototype.topic = jest.fn().mockReturnValue(mockTopic);
    PubSub.prototype.createTopic = jest.fn().mockResolvedValue([{ name: 'test-topic' }]);
  });

  test('publishes message successfully', async () => {
    const messageData = { test: 'data' };
    const result = await pubsubService.publish(messageData);
    expect(result).toBe('msg123');
    expect(mockPublish).toHaveBeenCalled();
  });

  test('handles publish error', async () => {
    mockPublish.mockRejectedValue(new Error('Publish failed'));
    await expect(pubsubService.publish({ test: 'data' })).rejects.toThrow('Publish failed');
  });

  test('creates topic if it does not exist', async () => {
    mockTopic.get = jest.fn().mockRejectedValue({ code: 5 });

    const result = await pubsubService.createTopic();
    expect(result).toBeDefined();
    expect(PubSub.prototype.createTopic).toHaveBeenCalled();
  });

  test('retries publish on failure', async () => {
    mockPublish
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValue('msg123');

    // Pass baseDelay=0 so no real sleeps in tests
    const result = await pubsubService.publishWithRetry({ test: 'data' }, 3, 0);
    expect(result).toBe('msg123');
    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  test('throws after max retries', async () => {
    mockPublish.mockRejectedValue(new Error('Persistent failure'));

    await expect(pubsubService.publishWithRetry({ test: 'data' }, 3, 0)).rejects.toThrow();
    expect(mockPublish).toHaveBeenCalledTimes(3);
  });

  test('createTopic returns topic if it exists', async () => {
    const mockTopicInstance = { name: 'topic-exists' };
    mockTopic.get = jest.fn().mockResolvedValue([mockTopicInstance]);

    const result = await pubsubService.createTopic();
    expect(result).toBe(mockTopicInstance);
  });

  test('createTopic throws general error', async () => {
    const error = new Error('General error');
    error.code = 3;
    mockTopic.get = jest.fn().mockRejectedValue(error);

    await expect(pubsubService.createTopic()).rejects.toThrow('General error');
  });

  test('createDeadLetterTopic returns topic if it exists', async () => {
    const mockTopicInstance = { name: 'dlq-exists' };
    mockTopic.get = jest.fn().mockResolvedValue([mockTopicInstance]);

    const result = await pubsubService.createDeadLetterTopic();
    expect(result).toBe(mockTopicInstance);
  });

  test('createDeadLetterTopic creates if it does not exist', async () => {
    mockTopic.get = jest.fn().mockRejectedValue({ code: 5 });

    const result = await pubsubService.createDeadLetterTopic();
    expect(result).toBeDefined();
    expect(PubSub.prototype.createTopic).toHaveBeenCalled();
  });

  test('createDeadLetterTopic throws general error', async () => {
    const error = new Error('General error');
    error.code = 3;
    mockTopic.get = jest.fn().mockRejectedValue(error);

    await expect(pubsubService.createDeadLetterTopic()).rejects.toThrow('General error');
  });

  test('subscribe registers listener, handles message successfully', async () => {
    const mockOn = jest.fn();
    const mockSubscription = {
      on: mockOn,
      get: jest.fn().mockResolvedValue([{ on: mockOn }]),
    };
    mockTopic.subscription = jest.fn().mockReturnValue(mockSubscription);

    const mockCallback = jest.fn();
    await pubsubService.subscribe('test-topic', 'test-sub', mockCallback);

    expect(mockOn).toHaveBeenCalledTimes(2);

    // Get the 'message' event handler registered
    const messageHandler = mockOn.mock.calls.find(c => c[0] === 'message')[1];
    const errorHandler = mockOn.mock.calls.find(c => c[0] === 'error')[1];

    // Trigger success scenario
    const mockAck = jest.fn();
    const mockMsg = {
      data: Buffer.from(JSON.stringify({ value: 'hello' })),
      ack: mockAck,
    };
    messageHandler(mockMsg);
    expect(mockCallback).toHaveBeenCalledWith({ value: 'hello' }, mockMsg);
    expect(mockAck).toHaveBeenCalled();

    // Trigger failure scenario (malformed JSON)
    const mockNack = jest.fn();
    const mockBadMsg = {
      data: Buffer.from('invalid-json'),
      nack: mockNack,
    };
    messageHandler(mockBadMsg);
    expect(mockNack).toHaveBeenCalled();

    // Trigger error handler
    errorHandler(new Error('sub error'));
  });
});