const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const logger = require('../utils/logger');

class TenantRepository {
  constructor() {
    this._db = null;
  }

  get db() {
    if (!this._db) {
      this._db = admin.firestore();
    }
    return this._db;
  }

  async create(data) {
    const docRef = this.db.collection('tenants').doc();
    const now = FieldValue.serverTimestamp();
    
    const docData = {
      ...data,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(docData);
    logger.info('Tenant created', { tenantId: docRef.id, name: data.name });
    return { id: docRef.id, ...docData };
  }

  async findById(tenantId) {
    const doc = await this.db.collection('tenants').doc(tenantId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async findByCode(tenantCode) {
    const snapshot = await this.db.collection('tenants')
      .where('tenantCode', '==', tenantCode.toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async findAll(options = {}) {
    let query = this.db.collection('tenants');
    
    if (options.status) {
      query = query.where('status', '==', options.status);
    }

    const snapshot = await query.get();
    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return results;
  }

  async update(tenantId, data) {
    const now = FieldValue.serverTimestamp();
    const docRef = this.db.collection('tenants').doc(tenantId);
    
    await docRef.update({
      ...data,
      updatedAt: now,
    });

    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
  }

  async deactivate(tenantId) {
    return this.update(tenantId, { status: 'inactive' });
  }

  async activate(tenantId) {
    return this.update(tenantId, { status: 'active' });
  }

  async delete(tenantId) {
    await this.db.collection('tenants').doc(tenantId).delete();
    logger.info('Tenant deleted', { tenantId });
  }

  async getStats(tenantId) {
    const salesSnapshot = await this.db.collection(`tenants/${tenantId}/sales`).get();
    const agentsSnapshot = await this.db.collection(`tenants/${tenantId}/agents`).get();
    
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
      totalSales,
      totalRevenue,
      totalQuantity,
      totalAgents: agentsSnapshot.size,
      avgSaleValue: totalSales > 0 ? totalRevenue / totalSales : 0,
    };
  }
}

const tenantRepository = new TenantRepository();
module.exports = { tenantRepository };