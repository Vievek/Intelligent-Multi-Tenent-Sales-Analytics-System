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

  test('finds sales by tenant', async () => {
    const mockSnapshot = {
      docs: [
        { id: 'sale1', data: () => ({ product: 'apple', quantity: 5 }) },
        { id: 'sale2', data: () => ({ product: 'mango', quantity: 3 }) },
      ],
    };
    const mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockSnapshot),
    };
    admin.firestore().collection().doc().collection = jest.fn().mockReturnValue(mockQuery);

    const results = await saleRepository.findByTenant('tenant1');
    expect(results.length).toBe(2);
  });

  test('filters sales by date range', async () => {
    const mockSnapshot = {
      docs: [
        { id: 'sale1', data: () => ({ product: 'apple', quantity: 5 }) },
      ],
    };
    const mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockSnapshot),
    };
    admin.firestore().collection().doc().collection = jest.fn().mockReturnValue(mockQuery);

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    const results = await saleRepository.getSalesByDateRange('tenant1', startDate, endDate);
    expect(results.length).toBe(1);
  });

  test('gets top products by revenue', async () => {
    const mockSnapshot = {
      docs: [
        { id: 'sale1', data: () => ({ product: 'apple', totalValue: 100 }) },
        { id: 'sale2', data: () => ({ product: 'mango', totalValue: 75 }) },
      ],
    };
    const mockQuery = {
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockSnapshot),
    };
    admin.firestore().collection().doc().collection = jest.fn().mockReturnValue(mockQuery);

    const results = await saleRepository.getTopProducts('tenant1', 10);
    expect(results.length).toBe(2);
  });

  test('aggregates sales by date', async () => {
    const mockSnapshot = {
      docs: [
        { id: 'sale1', data: () => ({ date: new Date('2024-01-01'), quantity: 5, totalValue: 50 }) },
        { id: 'sale2', data: () => ({ date: new Date('2024-01-01'), quantity: 3, totalValue: 30 }) },
      ],
    };
    admin.firestore().collection().doc().collection().get = jest.fn().mockResolvedValue(mockSnapshot);

    const results = await saleRepository.aggregateByDate('tenant1', 'day');
    expect(Object.keys(results).length).toBe(1);
    expect(results['2024-01-01'].count).toBe(2);
    expect(results['2024-01-01'].total).toBe(8);
    expect(results['2024-01-01'].revenue).toBe(80);
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