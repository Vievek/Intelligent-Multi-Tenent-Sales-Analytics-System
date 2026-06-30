const { saleRepository } = require('../../../src/repositories/saleRepository');
const admin = require('firebase-admin');

jest.mock('firebase-admin');

describe('SaleRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates sale successfully', async () => {
    const mockDocRef = {
      id: 'sale123',
      set: jest.fn().mockResolvedValue(),
    };
    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockDocRef);

    const saleData = {
      product: 'apple',
      quantity: 5,
      price: 10,
      date: new Date().toISOString(),
      rawMessage: 'sold 5 apples for $10',
      agentId: '123',
      tenantId: 'tenant1',
      confidence: 'HIGH',
      extractionMethod: 'huggingface',
    };

    const result = await saleRepository.create('tenant1', saleData);
    expect(result).toBe('sale123');
    expect(mockDocRef.set).toHaveBeenCalled();
  });

  test('finds sale by id', async () => {
    const mockDoc = {
      exists: true,
      id: 'sale123',
      data: () => ({ product: 'apple', quantity: 5, price: 10 }),
    };
    admin.firestore().collection().doc().get = jest.fn().mockResolvedValue(mockDoc);

    const result = await saleRepository.findById('tenant1', 'sale123');
    expect(result.id).toBe('sale123');
    expect(result.product).toBe('apple');
  });

  test('returns null for non-existent sale', async () => {
    const mockDoc = {
      exists: false,
    };
    admin.firestore().collection().doc().get = jest.fn().mockResolvedValue(mockDoc);

    const result = await saleRepository.findById('tenant1', 'nonexistent');
    expect(result).toBeNull();
  });

  test('finds sales by tenant with all options', async () => {
    const mockSnapshot = {
      docs: [
        { id: 'sale1', data: () => ({ product: 'apple', quantity: 5, date: '2024-01-01' }) },
      ],
      forEach(cb) { this.docs.forEach(cb); },
    };
    const mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockSnapshot),
    };
    admin.firestore().collection = jest.fn().mockReturnValue(mockQuery);

    const results = await saleRepository.findByTenant('tenant1', {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      agentId: 'agent123',
      product: 'apple',
      limit: 5,
    });

    expect(results.length).toBe(1);
    expect(mockQuery.where).toHaveBeenCalledTimes(4);
    expect(mockQuery.limit).toHaveBeenCalledWith(5);
    expect(mockQuery.orderBy).toHaveBeenCalledWith('date', 'desc');
  });

  test('filters sales by date range', async () => {
    const mockSnapshot = {
      docs: [
        { id: 'sale1', data: () => ({ product: 'apple', quantity: 5 }) },
      ],
      forEach(cb) { this.docs.forEach(cb); },
    };
    const mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockSnapshot),
    };
    admin.firestore().collection = jest.fn().mockReturnValue(mockQuery);

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    const results = await saleRepository.getSalesByDateRange('tenant1', startDate, endDate);
    expect(results.length).toBe(1);
  });

  test('gets top products by revenue', async () => {
    const mockSnapshot = {
      docs: [
        { id: 'sale1', data: () => ({ product: 'apple', totalValue: 100 }) },
      ],
      forEach(cb) { this.docs.forEach(cb); },
    };
    const mockQuery = {
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockSnapshot),
    };
    admin.firestore().collection = jest.fn().mockReturnValue(mockQuery);

    const results = await saleRepository.getTopProducts('tenant1', 10);
    expect(results.length).toBe(1);
  });

  test('aggregates sales by week and month', async () => {
    const mockSnapshot = {
      docs: [
        // One with toDate, one with string date
        { id: 'sale1', data: () => ({ date: { toDate: () => new Date('2024-01-15') }, quantity: 5, totalValue: 50 }) },
        { id: 'sale2', data: () => ({ date: '2024-02-15', quantity: 3, totalValue: 30 }) },
      ],
      forEach(cb) { this.docs.forEach(cb); },
    };
    const mockQuery = {
      get: jest.fn().mockResolvedValue(mockSnapshot),
    };
    admin.firestore().collection = jest.fn().mockReturnValue(mockQuery);

    const weekResult = await saleRepository.aggregateByDate('tenant1', 'week');
    expect(Object.keys(weekResult).length).toBe(2);

    const monthResult = await saleRepository.aggregateByDate('tenant1', 'month');
    expect(Object.keys(monthResult).length).toBe(2);
    expect(monthResult['2024-1'].count).toBe(1);
    expect(monthResult['2024-2'].count).toBe(1);
  });

  test('deletes sale', async () => {
    const mockDocRef = {
      delete: jest.fn().mockResolvedValue(),
    };
    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockDocRef);

    await saleRepository.delete('tenant1', 'sale123');
    expect(mockDocRef.delete).toHaveBeenCalled();
  });
});