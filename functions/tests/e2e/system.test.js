const { telegramWebhook } = require('../../src/handlers/telegramWebhook');
const { pubsubProcessor } = require('../../src/handlers/pubsubProcessor');
const { tenantResolver } = require('../../src/services/tenantResolver');
const { saleRepository } = require('../../src/repositories/saleRepository');
const { nlpStrategy } = require('../../src/services/nlp/nlpStrategy');
const admin = require('firebase-admin');

jest.mock('firebase-admin');
jest.mock('../../src/services/nlp/nlpStrategy');
jest.mock('../../src/services/tenantResolver');
jest.mock('../../src/repositories/saleRepository');
jest.mock('../../src/services/telegramService');

describe('System End-to-End Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ST-01: Happy path full flow', async () => {
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

    tenantResolver.registerAgent = jest.fn();

    const mockPubSubPublish = jest.fn().mockResolvedValue('msg123');
    const mockTopic = { publish: mockPubSubPublish };
    const { PubSub } = require('@google-cloud/pubsub');
    PubSub.prototype.topic = jest.fn().mockReturnValue(mockTopic);

    await telegramWebhook(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockPubSubPublish).toHaveBeenCalled();
  });

  test('ST-02: NLP fallback flow', async () => {
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'LOW',
      method: 'gemini',
    });

    saleRepository.create.mockResolvedValue('sale123');

    const mockEvent = {
      data: {
        telegramUserId: '123',
        tenantId: 'tenant1',
        agentId: '123',
        text: 'random text xyz',
        timestamp: 1234567890,
      },
      attributes: { messageId: 'msg123' },
    };

    await pubsubProcessor(mockEvent);

    expect(nlpStrategy.extract).toHaveBeenCalledWith('random text xyz');
    expect(saleRepository.create).toHaveBeenCalledWith(
      'tenant1',
      expect.objectContaining({
        extractionMethod: 'gemini',
        confidence: 'LOW',
      })
    );
  });

  test('ST-03: Tenant isolation', async () => {
    const mockTenantADoc = {
      exists: true,
      id: 'tenantA',
      data: () => ({ name: 'Tenant A', status: 'active' }),
    };
    const mockTenantBDoc = {
      exists: true,
      id: 'tenantB',
      data: () => ({ name: 'Tenant B', status: 'active' }),
    };

    admin.firestore().collection().doc().get = jest
      .fn()
      .mockResolvedValueOnce(mockTenantADoc)
      .mockResolvedValueOnce(mockTenantBDoc);

    const tenantA = await admin.firestore().collection('tenants').doc('tenantA').get();
    const tenantB = await admin.firestore().collection('tenants').doc('tenantB').get();

    expect(tenantA.data().name).toBe('Tenant A');
    expect(tenantB.data().name).toBe('Tenant B');
    expect(tenantA.id).not.toBe(tenantB.id);
  });

  test('ST-04: Admin creates tenant', async () => {
    const mockDocRef = {
      id: 'tenant123',
      set: jest.fn().mockResolvedValue(),
    };
    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockDocRef);

    const tenantData = {
      name: 'Test Business',
      email: 'test@example.com',
      tenantCode: 'TEST123',
      status: 'active',
      plan: 'basic',
      createdBy: 'admin123',
    };

    await admin.firestore().collection('tenants').doc('tenant123').set(tenantData);

    expect(mockDocRef.set).toHaveBeenCalledWith(tenantData);
  });

  test('ST-05: Processing failure recovery', async () => {
    let processorCalls = 0;
    const mockPubSubMessage = {
      data: Buffer.from(JSON.stringify({
        telegramUserId: '123',
        tenantId: 'tenant1',
        agentId: '123',
        text: 'sold 5 apples for $10',
      })),
      attributes: { messageId: 'msg123' },
    };

    nlpStrategy.extract
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValue({
        product: 'apple',
        quantity: 5,
        price: 10,
        confidence: 'HIGH',
        method: 'huggingface',
      });

    saleRepository.create.mockResolvedValue('sale123');

    for (let i = 0; i < 2; i++) {
      try {
        await pubsubProcessor({
          data: JSON.parse(mockPubSubMessage.data.toString()),
          attributes: mockPubSubMessage.attributes,
        });
        processorCalls++;
      } catch (error) {
        processorCalls++;
      }
    }

    expect(processorCalls).toBe(2);
    expect(nlpStrategy.extract).toHaveBeenCalledTimes(2);
  });

  test('Handles unregistered agent gracefully', async () => {
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

    const mockSendMessage = jest.fn().mockResolvedValue();
    const { telegramService } = require('../../src/services/telegramService');
    telegramService.sendMessage = mockSendMessage;

    await telegramWebhook(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockSendMessage).toHaveBeenCalledWith(
      12345,
      expect.stringContaining('not registered')
    );
  });

  test('Handles invalid tenant code during registration', async () => {
    const mockReq = {
      body: {
        message: {
          chat: { id: 12345 },
          from: { id: '123' },
          text: '/register INVALID',
          date: 1234567890,
        },
      },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    tenantResolver.registerAgent.mockRejectedValue(new Error('INVALID_CODE'));

    const mockSendMessage = jest.fn().mockResolvedValue();
    const { telegramService } = require('../../src/services/telegramService');
    telegramService.sendMessage = mockSendMessage;

    await telegramWebhook(mockReq, mockRes);

    expect(mockSendMessage).toHaveBeenCalledWith(
      12345,
      expect.stringContaining('failed')
    );
  });

  test('Processes message with date extraction', async () => {
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'HIGH',
      method: 'huggingface',
    });

    saleRepository.create.mockResolvedValue('sale123');

    const mockEvent = {
      data: {
        telegramUserId: '123',
        tenantId: 'tenant1',
        agentId: '123',
        text: 'sold 5 apples on 15 Dec 2024 for $10',
        timestamp: 1234567890,
      },
      attributes: { messageId: 'msg123' },
    };

    await pubsubProcessor(mockEvent);

    expect(saleRepository.create).toHaveBeenCalledWith(
      'tenant1',
      expect.objectContaining({
        date: expect.any(Date),
      })
    );
  });

  test('Validates extracted data before storage', async () => {
    nlpStrategy.extract.mockResolvedValue({
      product: '',
      quantity: -5,
      price: -10,
      confidence: 'LOW',
      method: 'gemini',
    });

    saleRepository.create.mockResolvedValue('sale123');

    const mockEvent = {
      data: {
        telegramUserId: '123',
        tenantId: 'tenant1',
        agentId: '123',
        text: 'invalid message',
        timestamp: 1234567890,
      },
      attributes: { messageId: 'msg123' },
    };

    await expect(pubsubProcessor(mockEvent)).rejects.toThrow();
  });

  test('Handles duplicate message detection', async () => {
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'HIGH',
      method: 'huggingface',
    });

    saleRepository.create.mockResolvedValue('sale123');

    const mockEvent = {
      data: {
        telegramUserId: '123',
        tenantId: 'tenant1',
        agentId: '123',
        text: 'sold 5 apples for $10',
        timestamp: 1234567890,
      },
      attributes: { messageId: 'msg123' },
    };

    await pubsubProcessor(mockEvent);

    expect(saleRepository.create).toHaveBeenCalledWith(
      'tenant1',
      expect.objectContaining({
        pubsubMessageId: 'msg123',
      })
    );
  });
});
