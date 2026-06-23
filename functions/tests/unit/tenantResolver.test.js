const { tenantResolver } = require('../../src/services/tenantResolver');
const admin = require('firebase-admin');

jest.mock('firebase-admin');

describe('TenantResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tenantResolver.cache.clear();
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

    admin.firestore().collectionGroup().where().limit().get = jest.fn().mockResolvedValue({
      empty: false,
      docs: [mockAgentDoc],
    });

    admin.firestore().collection().doc().get = jest.fn().mockResolvedValue(mockTenantDoc);

    const result = await tenantResolver.resolveAgent('123');
    expect(result.agentId).toBe('123');
    expect(result.tenantId).toBe('tenant1');
  });

  test('UT-10: rejects unregistered agent', async () => {
    admin.firestore().collectionGroup().where().limit().get = jest.fn().mockResolvedValue({
      empty: true,
      docs: [],
    });

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

    admin.firestore().collectionGroup().where().limit().get = jest.fn().mockResolvedValue({
      empty: false,
      docs: [mockAgentDoc],
    });

    admin.firestore().collection().doc().get = jest.fn().mockResolvedValue(mockTenantDoc);

    await expect(tenantResolver.resolveAgent('123')).rejects.toThrow('TENANT_INACTIVE');
  });

  test('UT-12: registers agent with valid code', async () => {
    const mockTenantDoc = {
      exists: true,
      id: 'tenant1',
      data: () => ({ name: 'Test Tenant', tenantCode: 'TEST123', status: 'active' }),
    };

    admin.firestore().collection().where().where().limit().get = jest.fn().mockResolvedValue({
      empty: false,
      docs: [mockTenantDoc],
    });

    admin.firestore().collection().where().limit().get = jest.fn().mockResolvedValue({
      empty: true,
      docs: [],
    });

    admin.firestore().collection().doc().set = jest.fn().mockResolvedValue();

    const result = await tenantResolver.registerAgent('123', 'TEST123', 456);
    expect(result.id).toBe('tenant1');
    expect(result.name).toBe('Test Tenant');
  });

  test('UT-13: rejects invalid tenant code', async () => {
    admin.firestore().collection().where().where().limit().get = jest.fn().mockResolvedValue({
      empty: true,
      docs: [],
    });

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

    admin.firestore().collectionGroup().where().limit().get = jest.fn().mockResolvedValue({
      empty: false,
      docs: [mockAgentDoc],
    });

    admin.firestore().collection().doc().get = jest.fn().mockResolvedValue(mockTenantDoc);

    await tenantResolver.resolveAgent('123');
    await tenantResolver.resolveAgent('123');

    expect(admin.firestore().collectionGroup).toHaveBeenCalledTimes(1);
  });
});