const { tenantRepository } = require('../../../src/repositories/tenantRepository');
const admin = require('firebase-admin');

jest.mock('firebase-admin');

describe('TenantRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates tenant successfully', async () => {
    const mockDocRef = {
      id: 'tenant123',
      set: jest.fn().mockResolvedValue(),
    };
    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockDocRef);

    const tenantData = {
      name: 'Test Business',
      email: 'test@example.com',
      tenantCode: 'TEST123',
      plan: 'basic',
    };

    const result = await tenantRepository.create(tenantData);
    expect(result.id).toBe('tenant123');
    expect(result.status).toBe('active');
  });

  test('finds tenant by id', async () => {
    const mockDoc = {
      exists: true,
      id: 'tenant123',
      data: () => ({ name: 'Test Business', status: 'active' }),
    };
    admin.firestore().collection().doc().get = jest.fn().mockResolvedValue(mockDoc);

    const result = await tenantRepository.findById('tenant123');
    expect(result.id).toBe('tenant123');
    expect(result.name).toBe('Test Business');
  });

  test('finds tenant by code', async () => {
    const mockDoc = {
      id: 'tenant123',
      data: () => ({ name: 'Test Business', tenantCode: 'TEST123' }),
    };
    const mockSnapshot = {
      empty: false,
      docs: [mockDoc],
    };
    admin.firestore().collection().where().limit().get = jest.fn().mockResolvedValue(mockSnapshot);

    const result = await tenantRepository.findByCode('TEST123');
    expect(result.id).toBe('tenant123');
    expect(result.tenantCode).toBe('TEST123');
  });

  test('returns null for non-existent tenant code', async () => {
    const mockSnapshot = {
      empty: true,
      docs: [],
    };
    admin.firestore().collection().where().limit().get = jest.fn().mockResolvedValue(mockSnapshot);

    const result = await tenantRepository.findByCode('NONEXISTENT');
    expect(result).toBeNull();
  });

  test('finds all tenants', async () => {
    const mockSnapshot = {
      docs: [
        { id: 'tenant1', data: () => ({ name: 'Tenant 1', status: 'active' }) },
        { id: 'tenant2', data: () => ({ name: 'Tenant 2', status: 'active' }) },
      ],
    };
    admin.firestore().collection().get = jest.fn().mockResolvedValue(mockSnapshot);

    const results = await tenantRepository.findAll();
    expect(results.length).toBe(2);
  });

  test('updates tenant', async () => {
    const mockDocRef = {
      update: jest.fn().mockResolvedValue(),
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'tenant123',
        data: () => ({ name: 'Updated Business', status: 'active' }),
      }),
    };
    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockDocRef);

    const result = await tenantRepository.update('tenant123', { name: 'Updated Business' });
    expect(result.name).toBe('Updated Business');
  });

  test('deactivates tenant', async () => {
    const mockDocRef = {
      update: jest.fn().mockResolvedValue(),
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'tenant123',
        data: () => ({ name: 'Test Business', status: 'inactive' }),
      }),
    };
    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockDocRef);

    const result = await tenantRepository.deactivate('tenant123');
    expect(result.status).toBe('inactive');
  });

  test('activates tenant', async () => {
    const mockDocRef = {
      update: jest.fn().mockResolvedValue(),
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'tenant123',
        data: () => ({ name: 'Test Business', status: 'active' }),
      }),
    };
    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockDocRef);

    const result = await tenantRepository.activate('tenant123');
    expect(result.status).toBe('active');
  });

  test('gets tenant stats', async () => {
    const mockSalesSnapshot = {
      docs: [
        { data: () => ({ totalValue: 100, quantity: 5 }) },
        { data: () => ({ totalValue: 200, quantity: 10 }) },
      ],
    };
    const mockAgentsSnapshot = {
      size: 3,
    };
    admin.firestore().collection().doc().collection().get = jest
      .fn()
      .mockResolvedValueOnce(mockSalesSnapshot)
      .mockResolvedValueOnce(mockAgentsSnapshot);

    const result = await tenantRepository.getStats('tenant123');
    expect(result.totalSales).toBe(2);
    expect(result.totalRevenue).toBe(300);
    expect(result.totalQuantity).toBe(15);
    expect(result.totalAgents).toBe(3);
    expect(result.avgSaleValue).toBe(150);
  });
});