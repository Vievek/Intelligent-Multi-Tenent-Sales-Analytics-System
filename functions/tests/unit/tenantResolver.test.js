const { tenantResolver } = require('../../src/services/tenantResolver');
const admin = require('firebase-admin');

jest.mock('firebase-admin');

describe('TenantResolver', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantResolver.cache.clear();
    tenantResolver._db = null;

    // Fresh chainable mock for every test
    mockDb = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      set: jest.fn().mockResolvedValue(),
      update: jest.fn().mockResolvedValue(),
      delete: jest.fn().mockResolvedValue(),
      collectionGroup: jest.fn().mockReturnThis(),
      add: jest.fn().mockResolvedValue({ id: 'newDocId' }),
    };

    admin.firestore.mockReturnValue(mockDb);
    admin.firestore.FieldValue = {
      serverTimestamp: jest.fn().mockReturnValue('timestamp'),
      increment: jest.fn().mockImplementation((n) => n),
    };
  });

  test('UT-09: resolves registered agent correctly', async () => {
    const mockAgentDoc = {
      exists: true,
      data: () => ({ telegramUserId: '123', status: 'active' }),
      ref: { parent: { parent: { id: 'tenant1' } } },
    };
    const mockTenantDoc = {
      exists: true,
      data: () => ({ name: 'Test Tenant', status: 'active' }),
    };

    // First call: collectionGroup query for agent
    mockDb.get
      .mockResolvedValueOnce({ empty: false, docs: [mockAgentDoc] })
      // Second call: tenant doc fetch
      .mockResolvedValueOnce(mockTenantDoc);

    const result = await tenantResolver.resolveAgent('123');
    expect(result.agentId).toBe('123');
    expect(result.tenantId).toBe('tenant1');
  });

  test('UT-10: rejects unregistered agent', async () => {
    mockDb.get.mockResolvedValueOnce({ empty: true, docs: [] });

    await expect(tenantResolver.resolveAgent('999')).rejects.toThrow('UNREGISTERED_AGENT');
  });

  test('UT-11: rejects deactivated tenant', async () => {
    const mockAgentDoc = {
      exists: true,
      data: () => ({ telegramUserId: '123', status: 'active' }),
      ref: { parent: { parent: { id: 'tenant1' } } },
    };
    const mockTenantDoc = {
      exists: true,
      data: () => ({ name: 'Test Tenant', status: 'inactive' }),
    };

    mockDb.get
      .mockResolvedValueOnce({ empty: false, docs: [mockAgentDoc] })
      .mockResolvedValueOnce(mockTenantDoc);

    await expect(tenantResolver.resolveAgent('123')).rejects.toThrow('TENANT_INACTIVE');
  });

  test('UT-12: registers agent with valid code', async () => {
    const mockTenantDoc = {
      exists: true,
      id: 'tenant1',
      data: () => ({ name: 'Test Tenant', tenantCode: 'TEST123', status: 'active' }),
    };

    mockDb.get
      // First call: find tenant by code
      .mockResolvedValueOnce({ empty: false, docs: [mockTenantDoc] })
      // Second call: check for duplicate registration
      .mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await tenantResolver.registerAgent('123', 'TEST123', 456);
    expect(result.id).toBe('tenant1');
    expect(result.name).toBe('Test Tenant');
  });

  test('UT-13: rejects invalid tenant code', async () => {
    mockDb.get.mockResolvedValueOnce({ empty: true, docs: [] });

    await expect(tenantResolver.registerAgent('123', 'INVALID', 456)).rejects.toThrow('INVALID_CODE');
  });

  test('caches resolved agent', async () => {
    const mockAgentDoc = {
      exists: true,
      data: () => ({ telegramUserId: '123', status: 'active' }),
      ref: { parent: { parent: { id: 'tenant1' } } },
    };
    const mockTenantDoc = {
      exists: true,
      data: () => ({ name: 'Test Tenant', status: 'active' }),
    };

    mockDb.get
      .mockResolvedValueOnce({ empty: false, docs: [mockAgentDoc] })
      .mockResolvedValueOnce(mockTenantDoc);

    await tenantResolver.resolveAgent('123');
    await tenantResolver.resolveAgent('123'); // should hit cache

    // get() should only have been called twice (for the first resolution)
    expect(mockDb.get).toHaveBeenCalledTimes(2);
  });

  test('rejects blocked agent', async () => {
    const mockAgentDoc = {
      exists: true,
      data: () => ({ telegramUserId: '456', status: 'blocked' }),
      ref: { parent: { parent: { id: 'tenant1' } } },
    };

    // collectionGroup query returns no active agents (blocked status filtered out)
    mockDb.get.mockResolvedValueOnce({ empty: true, docs: [] });

    await expect(tenantResolver.resolveAgent('456')).rejects.toThrow('UNREGISTERED_AGENT');
  });

  test('rejects duplicate registration', async () => {
    const mockTenantDoc = {
      exists: true,
      id: 'tenant1',
      data: () => ({ name: 'Test Tenant', tenantCode: 'TEST123', status: 'active' }),
    };
    const mockExistingAgent = {
      exists: true,
      data: () => ({ telegramUserId: '123' }),
    };

    mockDb.get
      .mockResolvedValueOnce({ empty: false, docs: [mockTenantDoc] })
      .mockResolvedValueOnce({ empty: false, docs: [mockExistingAgent] });

    await expect(tenantResolver.registerAgent('123', 'TEST123', 456)).rejects.toThrow('DUPLICATE_REGISTRATION');
  });
});