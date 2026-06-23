const admin = require('firebase-admin');
const logger = require('../utils/logger');

class AgentRepository {
  constructor() {
    this.db = admin.firestore();
  }

  async create(tenantId, agentData) {
    const docRef = this.db.collection(`tenants/${tenantId}/agents`).doc(agentData.telegramUserId);
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const docData = {
      ...agentData,
      status: 'active',
      registeredAt: now,
      messageCount: 0,
      updatedAt: now,
    };

    await docRef.set(docData);
    logger.info('Agent created', { tenantId, agentId: agentData.telegramUserId });
    return { id: agentData.telegramUserId, ...docData };
  }

  async findById(tenantId, agentId) {
    const doc = await this.db.collection(`tenants/${tenantId}/agents`).doc(agentId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async findByTelegramUserId(telegramUserId) {
    const snapshot = await this.db.collectionGroup('agents')
      .where('telegramUserId', '==', telegramUserId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const tenantId = doc.ref.parent.parent.id;
    return { id: doc.id, tenantId, ...doc.data() };
  }

  async findByTenant(tenantId) {
    const snapshot = await this.db.collection(`tenants/${tenantId}/agents`)
      .where('status', '==', 'active')
      .get();

    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return results;
  }

  async update(tenantId, agentId, data) {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = this.db.collection(`tenants/${tenantId}/agents`).doc(agentId);
    
    await docRef.update({
      ...data,
      updatedAt: now,
    });

    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
  }

  async incrementMessageCount(tenantId, agentId) {
    const docRef = this.db.collection(`tenants/${tenantId}/agents`).doc(agentId);
    await docRef.update({
      messageCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  async block(tenantId, agentId) {
    return this.update(tenantId, agentId, { status: 'blocked' });
  }

  async activate(tenantId, agentId) {
    return this.update(tenantId, agentId, { status: 'active' });
  }

  async getPerformance(tenantId, agentId) {
    const salesSnapshot = await this.db.collection(`tenants/${tenantId}/sales`)
      .where('agentId', '==', agentId)
      .get();

    let totalSales = 0;
    let totalRevenue = 0;
    let totalQuantity = 0;

    salesSnapshot.forEach(doc => {
      const data = doc.data();
      totalSales++;
      totalRevenue += data.totalValue || 0;
      totalQuantity += data.quantity || 0;
    });

    return {
      agentId,
      totalSales,
      totalRevenue,
      totalQuantity,
      avgSaleValue: totalSales > 0 ? totalRevenue / totalSales : 0,
    };
  }
}

const agentRepository = new AgentRepository();
module.exports = { agentRepository };