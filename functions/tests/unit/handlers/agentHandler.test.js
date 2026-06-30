const { agentHandler } = require('../../../src/handlers/agentHandler');
const { agentRepository } = require('../../../src/repositories/agentRepository');

jest.mock('../../../src/repositories/agentRepository');

describe('agentHandler unit tests', () => {
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

    await agentHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing tenantId' });
  });

  test('GET lists agents for a tenant', async () => {
    mockReq = {
      method: 'GET',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: {},
    };

    const agentsList = [{ id: '111', name: 'Agent Smith' }];
    agentRepository.findByTenant.mockResolvedValue(agentsList);

    await agentHandler(mockReq, mockRes);

    expect(agentRepository.findByTenant).toHaveBeenCalledWith('tenant-123');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(agentsList);
  });

  test('GET retrieves single agent by ID', async () => {
    mockReq = {
      method: 'GET',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { agentId: '111' },
    };

    const agentObj = { id: '111', name: 'Agent Smith' };
    agentRepository.findById.mockResolvedValue(agentObj);

    await agentHandler(mockReq, mockRes);

    expect(agentRepository.findById).toHaveBeenCalledWith('tenant-123', '111');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(agentObj);
  });

  test('GET returns 404 if agent not found by ID', async () => {
    mockReq = {
      method: 'GET',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { agentId: 'non-existent' },
    };

    agentRepository.findById.mockResolvedValue(null);

    await agentHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Agent not found' });
  });

  test('POST returns 400 if telegramUserId or name is missing', async () => {
    mockReq = {
      method: 'POST',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: {},
      body: { name: 'Agent Bond' },
    };

    await agentHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing telegramUserId or name' });
  });

  test('PUT updates an agent successfully', async () => {
    mockReq = {
      method: 'PUT',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { agentId: '111' },
      body: { name: 'Agent Updated' },
    };

    const updatedAgent = { id: '111', name: 'Agent Updated' };
    agentRepository.update.mockResolvedValue(updatedAgent);

    await agentHandler(mockReq, mockRes);

    expect(agentRepository.update).toHaveBeenCalledWith('tenant-123', '111', mockReq.body);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(updatedAgent);
  });

  test('PUT returns 400 if agentId is missing', async () => {
    mockReq = {
      method: 'PUT',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: {},
      body: {},
    };

    await agentHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing agent telegramUserId to update' });
  });

  test('DELETE deletes an agent successfully', async () => {
    mockReq = {
      method: 'DELETE',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: { agentId: '111' },
    };

    const mockDocDelete = jest.fn().mockResolvedValue();
    const mockDoc = jest.fn().mockReturnValue({ delete: mockDocDelete });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
    agentRepository.db = { collection: mockCollection };

    await agentHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
  });

  test('DELETE returns 400 if agentId is missing', async () => {
    mockReq = {
      method: 'DELETE',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: {},
    };

    await agentHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing agentId query parameter' });
  });

  test('returns 405 for unsupported HTTP methods', async () => {
    mockReq = {
      method: 'PATCH',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: {},
    };

    await agentHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(405);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method PATCH Not Allowed' });
  });

  test('returns 500 on repository operation errors', async () => {
    mockReq = {
      method: 'GET',
      headers: { 'x-tenant-id': 'tenant-123' },
      query: {},
    };

    agentRepository.findByTenant.mockRejectedValue(new Error('DB connection failed'));

    await agentHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'DB connection failed' });
  });
});
