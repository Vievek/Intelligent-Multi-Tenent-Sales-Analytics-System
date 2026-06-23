const { telegramWebhook } = require('../../../src/handlers/telegramWebhook');
const { tenantResolver } = require('../../../src/services/tenantResolver');
const { telegramService } = require('../../../src/services/telegramService');
const { PubSub } = require('@google-cloud/pubsub');

jest.mock('../../../src/services/tenantResolver');
jest.mock('../../../src/services/telegramService');
jest.mock('@google-cloud/pubsub');

describe('TelegramWebhook Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles /start command', async () => {
    const mockReq = {
      body: {
        message: {
          chat: { id: 12345 },
          from: { id: '123' },
          text: '/start',
        },
      },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    telegramService.sendMessage.mockResolvedValue();

    await telegramWebhook(mockReq, mockRes);

    expect(telegramService.sendMessage).toHaveBeenCalledWith(
      12345,
      expect.stringContaining('Welcome')
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test('handles /register command with valid code', async () => {
    const mockReq = {
      body: {
        message: {
          chat: { id: 12345 },
          from: { id: '123' },
          text: '/register TEST123',
        },
      },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    tenantResolver.registerAgent.mockResolvedValue({
      id: 'tenant1',
      name: 'Test Tenant',
    });
    telegramService.sendMessage.mockResolvedValue();

    await telegramWebhook(mockReq, mockRes);

    expect(tenantResolver.registerAgent).toHaveBeenCalledWith('123', 'TEST123', 12345);
    expect(telegramService.sendMessage).toHaveBeenCalledWith(
      12345,
      expect.stringContaining('successful')
    );
  });

  test('handles /register with missing code', async () => {
    const mockReq = {
      body: {
        message: {
          chat: { id: 12345 },
          from: { id: '123' },
          text: '/register',
        },
      },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    telegramService.sendMessage.mockResolvedValue();

    await telegramWebhook(mockReq, mockRes);

    expect(telegramService.sendMessage).toHaveBeenCalledWith(
      12345,
      expect.stringContaining('Please provide tenant code')
    );
  });

  test('handles /register with invalid code', async () => {
    const mockReq = {
      body: {
        message: {
          chat: { id: 12345 },
          from: { id: '123' },
          text: '/register INVALID',
        },
      },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    tenantResolver.registerAgent.mockRejectedValue(new Error('INVALID_CODE'));
    telegramService.sendMessage.mockResolvedValue();

    await telegramWebhook(mockReq, mockRes);

    expect(telegramService.sendMessage).toHaveBeenCalledWith(
      12345,
      expect.stringContaining('failed')
    );
  });

  test('handles sales message from registered agent', async () => {
    const mockReq = {
      body: {
        message: {
          chat: { id: 12345 },
          from: { id: '123' },
          text: 'sold 5 apples for $10',
          date: 1234567890,
        },
      },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    tenantResolver.resolveAgent.mockResolvedValue({
      tenantId: 'tenant1',
      agentId: '123',
    });

    const mockPublish = jest.fn().mockResolvedValue('msg123');
    const mockTopic = { publish: mockPublish };
    PubSub.prototype.topic = jest.fn().mockReturnValue(mockTopic);

    telegramService.sendMessage.mockResolvedValue();

    await telegramWebhook(mockReq, mockRes);

    expect(mockPublish).toHaveBeenCalled();
    expect(telegramService.sendMessage).toHaveBeenCalledWith(
      12345,
      expect.stringContaining('queued')
    );
  });

  test('handles sales message from unregistered agent', async () => {
    const mockReq = {
      body: {
        message: {
          chat: { id: 12345 },
          from: { id: '999' },
          text: 'sold 5 apples for $10',
          date: 1234567890,
        },
      },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    tenantResolver.resolveAgent.mockRejectedValue(new Error('UNREGISTERED_AGENT'));
    telegramService.sendMessage.mockResolvedValue();

    await telegramWebhook(mockReq, mockRes);

    expect(telegramService.sendMessage).toHaveBeenCalledWith(
      12345,
      expect.stringContaining('not registered')
    );
  });

  test('handles empty message body', async () => {
    const mockReq = { body: {} };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await telegramWebhook(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ status: 'no message' });
  });

  test('handles message without text', async () => {
    const mockReq = {
      body: {
        message: {
          chat: { id: 12345 },
          from: { id: '123' },
        },
      },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    tenantResolver.resolveAgent.mockResolvedValue({
      tenantId: 'tenant1',
      agentId: '123',
    });

    const mockPublish = jest.fn().mockResolvedValue('msg123');
    const mockTopic = { publish: mockPublish };
    PubSub.prototype.topic = jest.fn().mockReturnValue(mockTopic);

    await telegramWebhook(mockReq, mockRes);

    expect(mockPublish).toHaveBeenCalled();
  });

  test('handles deactivated tenant', async () => {
    const mockReq = {
      body: {
        message: {
          chat: { id: 12345 },
          from: { id: '123' },
          text: 'sold 5 apples for $10',
          date: 1234567890,
        },
      },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    tenantResolver.resolveAgent.mockRejectedValue(new Error('TENANT_INACTIVE'));
    telegramService.sendMessage.mockResolvedValue();

    await telegramWebhook(mockReq, mockRes);

    expect(telegramService.sendMessage).toHaveBeenCalledWith(
      12345,
      expect.stringContaining('not registered')
    );
  });

  test('handles duplicate registration', async () => {
    const mockReq = {
      body: {
        message: {
          chat: { id: 12345 },
          from: { id: '123' },
          text: '/register TEST123',
        },
      },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    tenantResolver.registerAgent.mockRejectedValue(new Error('DUPLICATE_REGISTRATION'));
    telegramService.sendMessage.mockResolvedValue();

    await telegramWebhook(mockReq, mockRes);

    expect(telegramService.sendMessage).toHaveBeenCalledWith(
      12345,
      expect.stringContaining('failed')
    );
  });
});
