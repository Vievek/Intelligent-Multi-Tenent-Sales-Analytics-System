const { saleHandler } = require('../../../src/handlers/saleHandler');
const { saleRepository } = require('../../../src/repositories/saleRepository');

jest.mock('../../../src/repositories/saleRepository');

describe('saleHandler unit tests', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
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

    await saleHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing tenantId' });
  });

  test('GET lists sales for a tenant', async () => {
    mockReq = {
      method: 'GET',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { limit: '10' },
    };

    const salesList = [{ id: 'sale-1', product: 'Mangoes', totalValue: 50 }];
    saleRepository.findByTenant.mockResolvedValue(salesList);

    await saleHandler(mockReq, mockRes);

    expect(saleRepository.findByTenant).toHaveBeenCalledWith('tenant-123', { limit: 10 });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(salesList);
  });

  test('GET retrieves single sale record by ID', async () => {
    mockReq = {
      method: 'GET',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { saleId: 'sale-123' },
    };

    const saleObj = { id: 'sale-123', product: 'Apples' };
    saleRepository.findById.mockResolvedValue(saleObj);

    await saleHandler(mockReq, mockRes);

    expect(saleRepository.findById).toHaveBeenCalledWith('tenant-123', 'sale-123');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(saleObj);
  });

  test('GET returns 404 if sale record is not found', async () => {
    mockReq = {
      method: 'GET',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { saleId: 'non-existent' },
    };

    saleRepository.findById.mockResolvedValue(null);

    await saleHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Sale record not found' });
  });

  test('POST returns 400 if fields are missing', async () => {
    mockReq = {
      method: 'POST',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: {},
      body: { product: 'Apples' },
    };

    await saleHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing product, quantity, price, or agentId' });
  });

  test('PUT updates sale record successfully', async () => {
    mockReq = {
      method: 'PUT',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { saleId: 'sale-123' },
      body: { quantity: '12', price: '4.50' },
    };

    const updatedSale = { id: 'sale-123', quantity: 12, price: 4.5, totalValue: 54 };
    saleRepository.findById.mockResolvedValue({ id: 'sale-123', quantity: 5, price: 10 });
    
    const mockUpdate = jest.fn().mockResolvedValue();
    const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
    saleRepository.db = { collection: mockCollection };

    saleRepository.findById.mockResolvedValue(updatedSale);

    await saleHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(updatedSale);
  });

  test('PUT returns 400 if saleId query param is missing', async () => {
    mockReq = {
      method: 'PUT',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: {},
      body: {},
    };

    await saleHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing saleId query parameter' });
  });

  test('DELETE removes a sale successfully', async () => {
    mockReq = {
      method: 'DELETE',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { saleId: 'sale-123' },
    };

    await saleHandler(mockReq, mockRes);

    expect(saleRepository.delete).toHaveBeenCalledWith('tenant-123', 'sale-123');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
  });

  test('DELETE returns 400 if saleId is missing', async () => {
    mockReq = {
      method: 'DELETE',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: {},
    };

    await saleHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing saleId query parameter' });
  });

  test('returns 405 for unsupported HTTP methods', async () => {
    mockReq = {
      method: 'PATCH',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: {},
    };

    await saleHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(405);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method PATCH Not Allowed' });
  });

  test('returns 500 on repository operation errors', async () => {
    mockReq = {
      method: 'GET',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: {},
    };

    saleRepository.findByTenant.mockRejectedValue(new Error('Firestore error'));

    await saleHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Firestore error' });
  });
});
