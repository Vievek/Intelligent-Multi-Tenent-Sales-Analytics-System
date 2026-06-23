const { pubsubProcessor } = require('../../src/handlers/pubsubProcessor');
const { saleRepository } = require('../../src/repositories/saleRepository');
const { agentRepository } = require('../../src/repositories/agentRepository');
const admin = require('firebase-admin');

jest.mock('firebase-admin');
jest.mock('../../src/services/nlp/nlpStrategy');
jest.mock('../../src/repositories/saleRepository');
jest.mock('../../src/repositories/agentRepository');

describe('MessageFlow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('IT-01: full message flow receive -> queue -> process -> store', async () => {
    const { nlpStrategy } = require('../../src/services/nlp/nlpStrategy');
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'HIGH',
      method: 'huggingface',
    });

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
    expect(agentRepository.incrementMessageCount).toHaveBeenCalled();
  });

  test('handles invalid message data gracefully', async () => {
    const mockEvent = {
      data: {},
      attributes: { messageId: 'msg123' },
    };

    await pubsubProcessor(mockEvent);

    expect(saleRepository.create).not.toHaveBeenCalled();
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

    expect(saleRepository.create).not.toHaveBeenCalled();
  });

  test('handles extraction errors gracefully', async () => {
    const { nlpStrategy } = require('../../src/services/nlp/nlpStrategy');
    nlpStrategy.extract.mockRejectedValue(new Error('Extraction failed'));

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
  });

  test('handles database errors gracefully', async () => {
    const { nlpStrategy } = require('../../src/services/nlp/nlpStrategy');
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'HIGH',
      method: 'huggingface',
    });

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

  test('includes processedAt timestamp in sale data', async () => {
    const { nlpStrategy } = require('../../src/services/nlp/nlpStrategy');
    nlpStrategy.extract.mockResolvedValue({
      product: 'apple',
      quantity: 5,
      price: 10,
      confidence: 'HIGH',
      method: 'huggingface',
    });

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
        processedAt: expect.any(String),
      })
    );
  });
});