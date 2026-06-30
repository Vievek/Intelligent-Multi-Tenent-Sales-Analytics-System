const { saleRepository } = require('../repositories/saleRepository');
const logger = require('../utils/logger');
const { Timestamp } = require('firebase-admin/firestore');

async function saleHandler(req, res) {
  const { method, query, body } = req;
  const tenantId = req.headers['x-tenant-id'] || query.tenantId;

  if (!tenantId) {
    return res.status(400).json({ error: 'Missing tenantId' });
  }

  try {
    switch (method) {
      case 'GET':
        if (query.saleId) {
          const sale = await saleRepository.findById(tenantId, query.saleId);
          if (!sale) return res.status(404).json({ error: 'Sale record not found' });
          return res.status(200).json(sale);
        } else {
          const options = {};
          if (query.limit) options.limit = parseInt(query.limit, 10);
          if (query.agentId) options.agentId = query.agentId;
          if (query.product) options.product = query.product;
          
          const sales = await saleRepository.findByTenant(tenantId, options);
          return res.status(200).json(sales);
        }

      case 'POST':
        if (!body.product || !body.quantity || !body.price || !body.agentId) {
          return res.status(400).json({ error: 'Missing product, quantity, price, or agentId' });
        }
        const saleDate = body.date ? new Date(body.date) : new Date();
        const saleData = {
          product: body.product,
          quantity: parseInt(body.quantity, 10),
          price: parseFloat(body.price),
          agentId: body.agentId,
          date: Timestamp.fromDate(saleDate),
          rawMessage: body.rawMessage || `Manual sale recorded via API`,
          confidence: body.confidence || 'HIGH',
          extractionMethod: body.extractionMethod || 'manual',
          processedAt: new Date().toISOString()
        };
        const saleId = await saleRepository.create(tenantId, saleData);
        return res.status(201).json({ id: saleId, ...saleData });

      case 'PUT':
        const updateId = query.saleId;
        if (!updateId) {
          return res.status(400).json({ error: 'Missing saleId query parameter' });
        }
        
        const updateFields = {};
        if (body.product) updateFields.product = body.product;
        if (body.quantity) updateFields.quantity = parseInt(body.quantity, 10);
        if (body.price) updateFields.price = parseFloat(body.price);
        if (body.agentId) updateFields.agentId = body.agentId;
        if (body.date) updateFields.date = Timestamp.fromDate(new Date(body.date));

        if (updateFields.quantity && updateFields.price) {
          updateFields.totalValue = updateFields.quantity * updateFields.price;
        } else if (updateFields.quantity || updateFields.price) {
          const current = await saleRepository.findById(tenantId, updateId);
          const q = updateFields.quantity !== undefined ? updateFields.quantity : current.quantity;
          const p = updateFields.price !== undefined ? updateFields.price : current.price;
          updateFields.totalValue = q * p;
        }

        await saleRepository.db.collection(`tenants/${tenantId}/sales`).doc(updateId).update(updateFields);
        const updated = await saleRepository.findById(tenantId, updateId);
        return res.status(200).json(updated);

      case 'DELETE':
        const deleteId = query.saleId;
        if (!deleteId) {
          return res.status(400).json({ error: 'Missing saleId query parameter' });
        }
        await saleRepository.delete(tenantId, deleteId);
        return res.status(200).json({ success: true });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    logger.error('Error in saleHandler:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { saleHandler };
