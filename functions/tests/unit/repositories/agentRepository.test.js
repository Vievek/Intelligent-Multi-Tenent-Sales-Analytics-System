const { agentRepository } = require('../../../src/repositories/agentRepository');
const admin = require('firebase-admin');

jest.mock('firebase-admin');

describe('AgentRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates agent successfully', async () => {
    const mockDocRef = {
      id: '123',
      set: jest.fn().mockResolvedValue(),
    };
    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockDocRef);

    const agentData = {
      telegramUserId: '123',
      chatId: 456,
    };

    const result = await agentRepository.create('tenant1', agentData);
    expect(result.id).toBe('123');
    expect(result.status).toBe('active');
    expect(result.messageCount).toBe(0);
  });

  test('finds agent by id', async () => {
    const mockDoc = {
      exists: true,
      id: '123',
      data: () => ({ telegramUserId: '123', status: 'active' }),
    };
    admin.firestore().collection().doc().get = jest.fn().mockResolvedValue(mockDoc);

    const result = await agentRepository.findById('tenant1', '123');
    expect(result.id).toBe('123');
    expect(result.telegramUserId).toBe('123');
  });

  test('returns null if agent not found by id', async () => {
    const mockDoc = {
      exists: false,
    };
    admin.firestore().collection().doc().get = jest.fn().mockResolvedValue(mockDoc);

    const result = await agentRepository.findById('tenant1', 'nonexistent');
    expect(result).toBeNull();
  });

  test('finds agent by telegram user id', async () => {
    const mockDoc = {
      id: '123',
      ref: { parent: { parent: { id: 'tenant1' } } },
      data: () => ({ telegramUserId: '123', status: 'active' }),
    };
    const mockSnapshot = {
      empty: false,
      docs: [mockDoc],
    };
    admin.firestore().collectionGroup().where().limit().get = jest.fn().mockResolvedValue(mockSnapshot);

    const result = await agentRepository.findByTelegramUserId('123');
    expect(result.id).toBe('123');
    expect(result.tenantId).toBe('tenant1');
  });

  test('returns null for non-existent agent', async () => {
    const mockSnapshot = {
      empty: true,
      docs: [],
    };
    admin.firestore().collectionGroup().where().limit().get = jest.fn().mockResolvedValue(mockSnapshot);

    const result = await agentRepository.findByTelegramUserId('999');
    expect(result).toBeNull();
  });

  test('finds agents by tenant', async () => {
    const mockSnapshot = {
      docs: [
        { id: '123', data: () => ({ telegramUserId: '123', status: 'active' }) },
        { id: '456', data: () => ({ telegramUserId: '456', status: 'active' }) },
      ],
      forEach(cb) { this.docs.forEach(cb); },
    };
    admin.firestore().collection().doc().collection().where().get = jest.fn().mockResolvedValue(mockSnapshot);

    const results = await agentRepository.findByTenant('tenant1');
    expect(results.length).toBe(2);
  });

  test('updates agent', async () => {
    const mockDocRef = {
      update: jest.fn().mockResolvedValue(),
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: '123',
        data: () => ({ telegramUserId: '123', status: 'blocked' }),
      }),
    };
    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockDocRef);

    const result = await agentRepository.update('tenant1', '123', { status: 'blocked' });
    expect(result.status).toBe('blocked');
  });

  test('increments message count', async () => {
    const mockDocRef = {
      update: jest.fn().mockResolvedValue(),
    };
    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockDocRef);

    await agentRepository.incrementMessageCount('tenant1', '123');
    expect(mockDocRef.update).toHaveBeenCalled();
  });

  test('blocks agent', async () => {
    const mockDocRef = {
      update: jest.fn().mockResolvedValue(),
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: '123',
        data: () => ({ telegramUserId: '123', status: 'blocked' }),
      }),
    };
    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockDocRef);

    const result = await agentRepository.block('tenant1', '123');
    expect(result.status).toBe('blocked');
  });

  test('activates agent', async () => {
    const mockDocRef = {
      update: jest.fn().mockResolvedValue(),
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: '123',
        data: () => ({ telegramUserId: '123', status: 'active' }),
      }),
    };
    admin.firestore().collection().doc = jest.fn().mockReturnValue(mockDocRef);

    const result = await agentRepository.activate('tenant1', '123');
    expect(result.status).toBe('active');
  });

  test('gets agent performance', async () => {
    const mockSnapshot = {
      docs: [
        { data: () => ({ totalValue: 100, quantity: 5 }) },
        { data: () => ({ totalValue: 200, quantity: 10 }) },
      ],
      forEach(cb) { this.docs.forEach(cb); },
    };
    admin.firestore().collection().where().get = jest.fn().mockResolvedValue(mockSnapshot);

    const result = await agentRepository.getPerformance('tenant1', '123');
    expect(result.agentId).toBe('123');
    expect(result.totalSales).toBe(2);
    expect(result.totalRevenue).toBe(300);
    expect(result.totalQuantity).toBe(15);
    expect(result.avgSaleValue).toBe(150);
  });
});