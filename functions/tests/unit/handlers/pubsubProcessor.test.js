const { pubsubProcessor } = require('../../../src/handlers/pubsubProcessor');
const { nlpStrategy } = require('../../../src/services/nlp/nlpStrategy');
const { saleRepository } = require('../../../src/repositories/saleRepository');
const { agentRepository } = require('../../../src/repositories/agentRepository');
const { dateParser } = require('../../../src/utils/dateParser');

jest.mock('../../../src/services/nlp/nlpStrategy');
jest.mock('../../../src/repositories/saleRepository');
jest.mock('../../../src/repositories/agentRepository');
jest.mock('../../../src/utils/dateParser');

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
});
