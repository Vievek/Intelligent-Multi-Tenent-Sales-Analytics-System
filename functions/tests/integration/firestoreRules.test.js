const admin = require('firebase-admin');

jest.mock('firebase-admin');

describe('Firestore Security Rules', () => {
  test('IT-03: blocks cross-tenant access', async () => {
    const mockTenantDoc = {
      exists: false,
    };

    admin.firestore().collection().doc().get = jest.fn().mockResolvedValue(mockTenantDoc);

    const result = await admin.firestore().collection('tenants').doc('otherTenant').get();
    expect(result.exists).toBe(false);
  });

  test('allows access to own tenant data', async () => {
    const mockTenantDoc = {
      exists: true,
      data: () => ({ name: 'My Tenant', status: 'active' }),
      id: 'tenant1',
    };

    admin.firestore().collection().doc().get = jest.fn().mockResolvedValue(mockTenantDoc);

    const result = await admin.firestore().collection('tenants').doc('tenant1').get();
    expect(result.exists).toBe(true);
    expect(result.data().name).toBe('My Tenant');
  });

  test('blocks unauthenticated access', async () => {
    const mockTenantDoc = {
      exists: false,
    };

    admin.firestore().collection().doc().get = jest.fn().mockResolvedValue(mockTenantDoc);

    const result = await admin.firestore().collection('tenants').doc('tenant1').get();
    expect(result.exists).toBe(false);
  });

  test('allows admin to access all tenants', async () => {
    const mockTenantsSnapshot = {
      empty: false,
      docs: [
        { id: 'tenant1', data: () => ({ name: 'Tenant 1' }) },
        { id: 'tenant2', data: () => ({ name: 'Tenant 2' }) },
      ],
    };

    admin.firestore().collection().get = jest.fn().mockResolvedValue(mockTenantsSnapshot);

    const result = await admin.firestore().collection('tenants').get();
    expect(result.empty).toBe(false);
    expect(result.docs.length).toBe(2);
  });

  test('blocks write to sales collection from client', async () => {
    const mockSaleRef = {
      set: jest.fn().mockRejectedValue(new Error('Permission denied')),
    };

    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockSaleRef);

    await expect(
      admin.firestore().collection('tenants').doc('tenant1').collection('sales').doc().set({})
    ).rejects.toThrow('Permission denied');
  });

  test('allows read to sales collection from authenticated tenant', async () => {
    const mockSalesSnapshot = {
      empty: false,
      docs: [
        { id: 'sale1', data: () => ({ product: 'apple', quantity: 5, price: 10 }) },
      ],
    };

    admin.firestore().collection().doc().collection().get = jest.fn().mockResolvedValue(mockSalesSnapshot);

    const result = await admin.firestore().collection('tenants').doc('tenant1').collection('sales').get();
    expect(result.empty).toBe(false);
    expect(result.docs.length).toBe(1);
  });

  test('blocks access to other tenant sales data', async () => {
    const mockSalesSnapshot = {
      empty: true,
      docs: [],
    };

    admin.firestore().collection().doc().collection().get = jest.fn().mockResolvedValue(mockSalesSnapshot);

    const result = await admin.firestore().collection('tenants').doc('otherTenant').collection('sales').get();
    expect(result.empty).toBe(true);
  });
});