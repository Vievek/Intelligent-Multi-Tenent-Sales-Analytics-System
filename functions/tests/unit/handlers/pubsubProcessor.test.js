const { pubsubProcessor } = require('../../../src/handlers/pubsubProcessor');
const { nlpStrategy } = require('../../../src/services/nlp/nlpStrategy');
const { saleRepository } = require('../../../src/repositories/saleRepository');
const { agentRepository } = require('../../../src/repositories/agentRepository');
const { dateParser } = require('../../../src/utils/dateParser');
const { productNormalizer } = require('../../../src/services/productNormalizer');

jest.mock('../../../src/services/nlp/nlpStrategy');
jest.mock('../../../src/repositories/saleRepository');
jest.mock('../../../src/repositories/agentRepository');
jest.mock('../../../src/utils/dateParser');
jest.mock('../../../src/services/productNormalizer', () => ({
  productNormalizer: {
    normalize: jest.fn().mockImplementation((_tenantId, product) => Promise.resolve(product)),
  },
  toTitleCase: (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
  levenshtein: jest.fn(),
  tokenContainmentMatch: jest.fn(),
}));

describe('PubSubProcessor Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('processes valid message successfully', async () => {
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'HIGH',
      method: 'huggingface',
    });

    dateParser.extractDate.mockReturnValue(new Date('2024-01-01'));
    saleRepository.create.mockResolvedValue('sale123');
    agentRepository.incrementMessageCount.mockResolvedValue();

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

    expect(nlpStrategy.extract).toHaveBeenCalledWith('sold 5 apples for $10');
    expect(saleRepository.create).toHaveBeenCalled();
    expect(agentRepository.incrementMessageCount).toHaveBeenCalledWith('tenant1', '123');
  });

  test('handles missing text in message', async () => {
    const mockEvent = {
      data: {
        telegramUserId: '123',
        tenantId: 'tenant1',
        agentId: '123',
        timestamp: 1234567890,
      },
      attributes: { messageId: 'msg123' },
    };

    await pubsubProcessor(mockEvent);

    expect(nlpStrategy.extract).not.toHaveBeenCalled();
    expect(saleRepository.create).not.toHaveBeenCalled();
  });

  test('handles empty data object', async () => {
    const mockEvent = {
      data: {},
      attributes: { messageId: 'msg123' },
    };

    await pubsubProcessor(mockEvent);

    expect(nlpStrategy.extract).not.toHaveBeenCalled();
    expect(saleRepository.create).not.toHaveBeenCalled();
  });

  test('handles null data', async () => {
    const mockEvent = {
      data: null,
      attributes: { messageId: 'msg123' },
    };

    await pubsubProcessor(mockEvent);

    expect(nlpStrategy.extract).not.toHaveBeenCalled();
    expect(saleRepository.create).not.toHaveBeenCalled();
  });

  test('handles extraction error', async () => {
    nlpStrategy.extract.mockRejectedValue(new Error('Extraction failed'));
    dateParser.extractDate.mockReturnValue(new Date('2024-01-01'));

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

    await expect(pubsubProcessor(mockEvent)).rejects.toThrow('Extraction failed');
    expect(saleRepository.create).not.toHaveBeenCalled();
  });

  test('handles validation error', async () => {
    nlpStrategy.extract.mockResolvedValue({
      product: '',
      quantity: -5,
      price: -10,
      confidence: 'LOW',
      method: 'gemini',
    });

    dateParser.extractDate.mockReturnValue(new Date('2024-01-01'));

    const mockEvent = {
      data: {
        telegramUserId: '123',
        tenantId: 'tenant1',
        agentId: '123',
        text: 'invalid',
        timestamp: 1234567890,
      },
      attributes: { messageId: 'msg123' },
    };

    await expect(pubsubProcessor(mockEvent)).rejects.toThrow();
    expect(saleRepository.create).not.toHaveBeenCalled();
  });

  test('handles repository error', async () => {
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'HIGH',
      method: 'huggingface',
    });

    dateParser.extractDate.mockReturnValue(new Date('2024-01-01'));
    saleRepository.create.mockRejectedValue(new Error('Database error'));

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

    await expect(pubsubProcessor(mockEvent)).rejects.toThrow('Database error');
  });

  test('includes pubsubMessageId in sale data', async () => {
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'HIGH',
      method: 'huggingface',
    });

    dateParser.extractDate.mockReturnValue(new Date('2024-01-01'));
    saleRepository.create.mockResolvedValue('sale123');
    agentRepository.incrementMessageCount.mockResolvedValue();

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

  test('calculates totalValue correctly', async () => {
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'HIGH',
      method: 'huggingface',
    });

    dateParser.extractDate.mockReturnValue(new Date('2024-01-01'));
    saleRepository.create.mockResolvedValue('sale123');
    agentRepository.incrementMessageCount.mockResolvedValue();

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
        totalValue: 50,
      })
    );
  });

  test('processes base64 data successfully', async () => {
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'HIGH',
      method: 'huggingface',
    });
    dateParser.extractDate.mockReturnValue(new Date('2024-01-01'));
    saleRepository.create.mockResolvedValue('sale123');
    agentRepository.incrementMessageCount.mockResolvedValue();

    const base64Data = Buffer.from(JSON.stringify({
      telegramUserId: '123',
      tenantId: 'tenant1',
      agentId: '123',
      text: 'sold 5 apples for $10',
      timestamp: 1234567890,
    })).toString('base64');

    const mockEvent = {
      data: {
        message: {
          data: base64Data,
          messageId: 'msg123',
        }
      }
    };

    await pubsubProcessor(mockEvent);
    expect(saleRepository.create).toHaveBeenCalled();
  });

  test('handles invalid JSON in base64 data message', async () => {
    const mockEvent = {
      data: {
        message: {
          data: 'invalid-base64-json-{{{',
          messageId: 'msg123',
        }
      }
    };

    await pubsubProcessor(mockEvent);
    expect(saleRepository.create).not.toHaveBeenCalled();
  });

  test('updates messageLog status when document is found', async () => {
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'HIGH',
      method: 'huggingface',
    });
    dateParser.extractDate.mockReturnValue(new Date('2024-01-01'));
    saleRepository.create.mockResolvedValue('sale123');
    agentRepository.incrementMessageCount.mockResolvedValue();

    const admin = require('firebase-admin');
    const mockUpdate = jest.fn().mockResolvedValue();
    admin.firestore().get.mockResolvedValueOnce({
      empty: false,
      docs: [{
        ref: { update: mockUpdate }
      }]
    });

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
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'processed',
      saleId: 'sale123',
    }));
  });

  test('handles messageLog update error gracefully', async () => {
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'HIGH',
      method: 'huggingface',
    });
    dateParser.extractDate.mockReturnValue(new Date('2024-01-01'));
    saleRepository.create.mockResolvedValue('sale123');
    agentRepository.incrementMessageCount.mockResolvedValue();

    const admin = require('firebase-admin');
    admin.firestore().get.mockRejectedValueOnce(new Error('Firestore update error'));

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

    // Should succeed because logging error is caught
    await pubsubProcessor(mockEvent);
    expect(saleRepository.create).toHaveBeenCalled();
  });
});
