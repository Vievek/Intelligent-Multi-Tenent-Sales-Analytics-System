const { pubsubService } = require('../../../src/services/pubsubService');
const { PubSub } = require('@google-cloud/pubsub');

jest.mock('@google-cloud/pubsub');

describe('PubSubService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('publishes message successfully', async () => {
    const mockPublish = jest.fn().mockResolvedValue('msg123');
    const mockTopic = {
      publish: mockPublish,
    };
    PubSub.prototype.topic = jest.fn().mockReturnValue(mockTopic);

    const messageData = { test: 'data' };
    const result = await pubsubService.publish(messageData);
    expect(result).toBe('msg123');
    expect(mockPublish).toHaveBeenCalled();
  });

  test('handles publish error', async () => {
    const mockPublish = jest.fn().mockRejectedValue(new Error('Publish failed'));
    const mockTopic = {
      publish: mockPublish,
    };
    PubSub.prototype.topic = jest.fn().mockReturnValue(mockTopic);

    await expect(pubsubService.publish({ test: 'data' })).rejects.toThrow('Publish failed');
  });

  test('creates topic if it does not exist', async () => {
    const mockGet = jest.fn().mockRejectedValue({ code: 5 });
    const mockCreate = jest.fn().mockResolvedValue([{ name: 'test-topic' }]);
    const mockTopic = {
      get: mockGet,
      create: mockCreate,
    };
    PubSub.prototype.topic = jest.fn().mockReturnValue(mockTopic);

    const result = await pubsubService.createTopic();
    expect(result).toBeDefined();
    expect(mockCreate).toHaveBeenCalled();
  });

  test('retries publish on failure', async () => {
    const mockPublish = jest.fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValue('msg123');
    const mockTopic = {
      publish: mockPublish,
    };
    PubSub.prototype.topic = jest.fn().mockReturnValue(mockTopic);

    const result = await pubsubService.publishWithRetry({ test: 'data' }, 3);
    expect(result).toBe('msg123');
    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  test('throws after max retries', async () => {
    const mockPublish = jest.fn().mockRejectedValue(new Error('Persistent failure'));
    const mockTopic = {
      publish: mockPublish,
    };
    PubSub.prototype.topic = jest.fn().mockReturnValue(mockTopic);

    await expect(pubsubService.publishWithRetry({ test: 'data' }, 3)).rejects.toThrow();
    expect(mockPublish).toHaveBeenCalledTimes(3);
  });
});