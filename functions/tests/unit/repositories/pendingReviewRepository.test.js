const { pendingReviewRepository } = require('../../../src/repositories/pendingReviewRepository');
const admin = require('firebase-admin');

jest.mock('firebase-admin');

describe('PendingReviewRepository', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    pendingReviewRepository._db = null;

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
      add: jest.fn().mockResolvedValue({ id: 'newReviewId' }),
      collectionGroup: jest.fn().mockReturnThis(),
      runTransaction: jest.fn(),
    };

    mockDb.doc.mockImplementation(() => ({
      ...mockDb,
      id: 'review123',
    }));

    admin.firestore.mockReturnValue(mockDb);
  });

  test('creates a pending review successfully', async () => {
    const reviewData = {
      rawMessage: 'sold 5 apples for $10',
      errorReason: 'Gemini extraction failed',
    };

    const id = await pendingReviewRepository.create('tenant123', reviewData);
    expect(id).toBe('review123');
    expect(mockDb.set).toHaveBeenCalled();
  });

  test('finds pending reviews by tenant code', async () => {
    const mockSnapshot = {
      docs: [
        { id: 'review123', data: () => ({ status: 'pending', rawMessage: 'raw' }) }
      ],
      forEach(cb) { this.docs.forEach(cb); },
    };
    mockDb.get.mockResolvedValueOnce(mockSnapshot);

    const result = await pendingReviewRepository.findByTenant('tenant123', 'pending');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('review123');
  });

  test('approves a pending review successfully', async () => {
    const mockDoc = {
      exists: true,
      data: () => ({ status: 'pending', rawMessage: 'sold 5 apples for $10', agentId: 'agent123' }),
    };
    mockDb.get.mockResolvedValueOnce(mockDoc);
    mockDb.runTransaction.mockImplementation(async (cb) => {
      return cb({
        get: jest.fn().mockResolvedValue({ exists: false }),
        set: jest.fn(),
      });
    });

    const correctedData = {
      product: 'Apple',
      quantity: 5,
      price: 10,
      agentId: 'agent123',
      date: '2026-06-30T10:00:00Z',
    };

    const res = await pendingReviewRepository.approve('tenant123', 'review123', correctedData);
    expect(res).toHaveProperty('saleId');
    expect(mockDb.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'approved',
    }));
  });

  test('throws error if approving a non-existent review', async () => {
    mockDb.get.mockResolvedValueOnce({ exists: false });
    await expect(
      pendingReviewRepository.approve('tenant123', 'non-existent', {})
    ).rejects.toThrow('Pending review not found');
  });

  test('throws error if approving an already approved/rejected review', async () => {
    const mockDoc = {
      exists: true,
      data: () => ({ status: 'approved' }),
    };
    mockDb.get.mockResolvedValueOnce(mockDoc);

    await expect(
      pendingReviewRepository.approve('tenant123', 'review123', {})
    ).rejects.toThrow('Review is already approved');
  });

  test('rejects a pending review successfully', async () => {
    const mockDoc = {
      exists: true,
      data: () => ({ status: 'pending' }),
    };
    mockDb.get.mockResolvedValueOnce(mockDoc);

    await pendingReviewRepository.reject('tenant123', 'review123', 'invalid product');
    expect(mockDb.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'rejected',
      rejectionReason: 'invalid product',
    }));
  });

  test('rejects a pending review successfully without a reason', async () => {
    const mockDoc = {
      exists: true,
      data: () => ({ status: 'pending' }),
    };
    mockDb.get.mockResolvedValueOnce(mockDoc);

    await pendingReviewRepository.reject('tenant123', 'review123');
    expect(mockDb.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'rejected',
      rejectionReason: null,
    }));
  });

  test('throws error if rejecting a non-existent review', async () => {
    mockDb.get.mockResolvedValueOnce({ exists: false });
    await expect(
      pendingReviewRepository.reject('tenant123', 'non-existent')
    ).rejects.toThrow('Pending review not found');
  });

  test('finds pending reviews by tenant code with null status filter', async () => {
    const mockSnapshot = {
      docs: [
        { id: 'review-1', data: () => ({ status: 'pending' }) }
      ],
      forEach(cb) { this.docs.forEach(cb); },
    };
    mockDb.get.mockResolvedValueOnce(mockSnapshot);

    const result = await pendingReviewRepository.findByTenant('tenant-123', null);
    expect(result.length).toBe(1);
    expect(mockDb.where).not.toHaveBeenCalled();
  });

  test('approves a pending review with missing fields using defaults and fallback dates', async () => {
    const mockDoc = {
      exists: true,
      data: () => ({ status: 'pending', rawMessage: '', agentId: '' }),
    };
    mockDb.get.mockResolvedValueOnce(mockDoc);
    mockDb.runTransaction.mockImplementation(async (cb) => {
      return cb({
        get: jest.fn().mockResolvedValue({ exists: false }),
        set: jest.fn(),
      });
    });

    const correctedData = {
      product: 'Apple',
      quantity: 0,
      price: 0,
    };

    const res = await pendingReviewRepository.approve('tenant123', 'review123', correctedData);
    expect(res).toHaveProperty('saleId');
    expect(mockDb.update).toHaveBeenCalled();
  });
});
