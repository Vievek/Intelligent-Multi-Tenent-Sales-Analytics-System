const { tenantRepository } = require('../../../src/repositories/tenantRepository');
const admin = require('firebase-admin');

jest.mock('firebase-admin');

describe('TenantRepository', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantRepository._db = null;

    mockDb = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true, docs: [], forEach: jest.fn() }),
      set: jest.fn().mockResolvedValue(),
      update: jest.fn().mockResolvedValue(),
      delete: jest.fn().mockResolvedValue(),
      add: jest.fn().mockResolvedValue({ id: 'newDocId' }),
      collectionGroup: jest.fn().mockReturnThis(),
    };
    // doc() with no args returns an object with a generated id
    mockDb.doc.mockImplementation(() => ({
      ...mockDb,
      id: 'tenant123',
    }));

    admin.firestore.mockReturnValue(mockDb);
    admin.firestore.FieldValue = {
      serverTimestamp: jest.fn().mockReturnValue('timestamp'),
      increment: jest.fn().mockImplementation((n) => n),
    };
  });

  test('creates tenant successfully', async () => {
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
    mockDb.get.mockResolvedValueOnce(mockDoc);

    const result = await tenantRepository.findById('tenant123');
    expect(result.id).toBe('tenant123');
    expect(result.name).toBe('Test Business');
  });

  test('finds tenant by code', async () => {
    const mockSnapshot = {
      empty: false,
      docs: [{ id: 'tenant123', data: () => ({ name: 'Test Business', tenantCode: 'TEST123' }) }],
    };
    mockDb.get.mockResolvedValueOnce(mockSnapshot);

    const result = await tenantRepository.findByCode('TEST123');
    expect(result.id).toBe('tenant123');
    expect(result.tenantCode).toBe('TEST123');
  });

  test('returns null for non-existent tenant code', async () => {
    mockDb.get.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await tenantRepository.findByCode('NONEXISTENT');
    expect(result).toBeNull();
  });

  test('finds all tenants', async () => {
    const mockSnapshot = {
      docs: [
        { id: 'tenant1', data: () => ({ name: 'Tenant 1', status: 'active' }) },
        { id: 'tenant2', data: () => ({ name: 'Tenant 2', status: 'active' }) },
      ],
      forEach(cb) { this.docs.forEach(cb); },
    };
    mockDb.get.mockResolvedValueOnce(mockSnapshot);

    const results = await tenantRepository.findAll();
    expect(results.length).toBe(2);
  });

  test('updates tenant', async () => {
    const afterUpdateDoc = {
      exists: true,
      id: 'tenant123',
      data: () => ({ name: 'Updated Business', status: 'active' }),
    };
    mockDb.get.mockResolvedValueOnce(afterUpdateDoc);

    const result = await tenantRepository.update('tenant123', { name: 'Updated Business' });
    expect(result.name).toBe('Updated Business');
  });

  test('deactivates tenant', async () => {
    const afterUpdateDoc = {
      exists: true,
      id: 'tenant123',
      data: () => ({ name: 'Test Business', status: 'inactive' }),
    };
    mockDb.get.mockResolvedValueOnce(afterUpdateDoc);

    const result = await tenantRepository.deactivate('tenant123');
    expect(result.status).toBe('inactive');
  });

  test('activates tenant', async () => {
    const afterUpdateDoc = {
      exists: true,
      id: 'tenant123',
      data: () => ({ name: 'Test Business', status: 'active' }),
    };
    mockDb.get.mockResolvedValueOnce(afterUpdateDoc);

    const result = await tenantRepository.activate('tenant123');
    expect(result.status).toBe('active');
  });

  test('gets tenant stats', async () => {
    const mockSalesSnapshot = {
      docs: [
        { data: () => ({ totalValue: 100, quantity: 5 }) },
        { data: () => ({ totalValue: 200, quantity: 10 }) },
      ],
      forEach(cb) { this.docs.forEach(cb); },
    };
    const mockAgentsSnapshot = { size: 3, forEach: jest.fn() };

    mockDb.get
      .mockResolvedValueOnce(mockSalesSnapshot)
      .mockResolvedValueOnce(mockAgentsSnapshot);

    const result = await tenantRepository.getStats('tenant123');
    expect(result.totalSales).toBe(2);
    expect(result.totalRevenue).toBe(300);
    expect(result.totalQuantity).toBe(15);
    expect(result.totalAgents).toBe(3);
    expect(result.avgSaleValue).toBe(150);
  });

  test('deletes tenant', async () => {
    await tenantRepository.delete('tenant123');
    expect(mockDb.delete).toHaveBeenCalled();
  });

  test('finds all tenants with status filter', async () => {
    const mockSnapshot = {
      docs: [
        { id: 'tenant1', data: () => ({ name: 'Tenant 1', status: 'active' }) },
      ],
      forEach(cb) { this.docs.forEach(cb); },
    };
    mockDb.get.mockResolvedValueOnce(mockSnapshot);

    const results = await tenantRepository.findAll({ status: 'active' });
    expect(results.length).toBe(1);
    expect(mockDb.where).toHaveBeenCalledWith('status', '==', 'active');
  });
});