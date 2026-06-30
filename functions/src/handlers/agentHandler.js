const { agentRepository } = require('../repositories/agentRepository');
const logger = require('../utils/logger');

async function agentHandler(req, res) {
  const { method, query, body, params } = req;
  const tenantId = req.headers['x-tenant-id'] || query.tenantId;

  if (!tenantId) {
    return res.status(400).json({ error: 'Missing tenantId' });
  }

  try {
    switch (method) {
      case 'GET':
        if (query.agentId) {
          const agent = await agentRepository.findById(tenantId, query.agentId);
          if (!agent) return res.status(404).json({ error: 'Agent not found' });
          return res.status(200).json(agent);
        } else {
          const agents = await agentRepository.findByTenant(tenantId);
          return res.status(200).json(agents);
        }

      case 'POST':
        if (!body.telegramUserId || !body.name) {
          return res.status(400).json({ error: 'Missing telegramUserId or name' });
        }
        const created = await agentRepository.create(tenantId, body);
        return res.status(201).json(created);

      case 'PUT':
        const updateId = query.agentId || body.telegramUserId;
        if (!updateId) {
          return res.status(400).json({ error: 'Missing agent telegramUserId to update' });
        }
        const updated = await agentRepository.update(tenantId, updateId, body);
        return res.status(200).json(updated);

      case 'DELETE':
        const deleteId = query.agentId;
        if (!deleteId) {
          return res.status(400).json({ error: 'Missing agentId query parameter' });
        }
        await agentRepository.db.collection(`tenants/${tenantId}/agents`).doc(deleteId).delete();
        return res.status(200).json({ success: true });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    logger.error('Error in agentHandler:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { agentHandler };
