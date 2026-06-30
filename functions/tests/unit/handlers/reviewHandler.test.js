const { reviewHandler } = require('../../../src/handlers/reviewHandler');
const { pendingReviewRepository } = require('../../../src/repositories/pendingReviewRepository');

jest.mock('../../../src/repositories/pendingReviewRepository');

describe('reviewHandler unit tests', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
  });

  test('returns 400 if tenantId is missing', async () => {
    mockReq = {
      method: 'GET',
      headers: {},
      query: {},
    };

    await reviewHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing tenantId' });
  });

  test('GET returns pending reviews successfully', async () => {
    mockReq = {
      method: 'GET',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { status: 'pending' },
    };

    const mockList = [{ id: 'review-1', status: 'pending' }];
    pendingReviewRepository.findByTenant.mockResolvedValue(mockList);

    await reviewHandler(mockReq, mockRes);

    expect(pendingReviewRepository.findByTenant).toHaveBeenCalledWith('tenant-123', 'pending');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockList);
  });

  test('POST with approve action succeeds', async () => {
    mockReq = {
      method: 'POST',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { action: 'approve' },
      body: {
        reviewId: 'review-123',
        correctedData: { product: 'Apple', quantity: 5, price: 10 },
      },
    };

    pendingReviewRepository.approve.mockResolvedValue({ saleId: 'sale-999' });

    await reviewHandler(mockReq, mockRes);

    expect(pendingReviewRepository.approve).toHaveBeenCalledWith('tenant-123', 'review-123', mockReq.body.correctedData);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, saleId: 'sale-999' });
  });

  test('POST with approve action using path routing works', async () => {
    mockReq = {
      method: 'POST',
      headers: {},
      path: '/approve',
      query: {},
      body: {
        tenantId: 'tenant-123',
        reviewId: 'review-123',
        correctedData: { product: 'Apple', quantity: 5, price: 10 },
      },
    };

    pendingReviewRepository.approve.mockResolvedValue({ saleId: 'sale-999' });

    await reviewHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test('POST with approve action using query param tenantId works', async () => {
    mockReq = {
      method: 'POST',
      headers: {},
      path: '/approve',
      query: { tenantId: 'tenant-123' },
      body: {
        reviewId: 'review-123',
        correctedData: { product: 'Apple', quantity: 5, price: 10 },
      },
    };

    pendingReviewRepository.approve.mockResolvedValue({ saleId: 'sale-999' });

    await reviewHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test('POST with approve action returns 400 if parameters are missing', async () => {
    mockReq = {
      method: 'POST',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { action: 'approve' },
      body: {},
    };

    await reviewHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing reviewId or correctedData' });
  });

  test('POST with reject action succeeds', async () => {
    mockReq = {
      method: 'POST',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { action: 'reject' },
      body: {
        reviewId: 'review-123',
        reason: 'spam',
      },
    };

    pendingReviewRepository.reject.mockResolvedValue();

    await reviewHandler(mockReq, mockRes);

    expect(pendingReviewRepository.reject).toHaveBeenCalledWith('tenant-123', 'review-123', 'spam');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
  });

  test('POST with reject action returns 400 if reviewId is missing', async () => {
    mockReq = {
      method: 'POST',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { action: 'reject' },
      body: {},
    };

    await reviewHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing reviewId' });
  });

  test('POST with unknown action returns 400', async () => {
    mockReq = {
      method: 'POST',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { action: 'unknown' },
      body: {},
    };

    await reviewHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unknown action. Use ?action=approve or ?action=reject' });
  });

  test('returns 405 for unsupported method', async () => {
    mockReq = {
      method: 'DELETE',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: {},
    };

    await reviewHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(405);
  });
});
