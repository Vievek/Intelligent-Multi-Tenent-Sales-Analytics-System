const admin = require('firebase-admin');
const logger = require('../utils/logger');

class SaleRepository {
  constructor() {
    this.db = admin.firestore();
  }

  async create(tenantId, saleData) {
    const docRef = this.db.collection(`tenants/${tenantId}/sales`).doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const docData = {
      ...saleData,
      tenantId,
      totalValue: saleData.quantity * saleData.price,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(docData);
    logger.debug('Sale created', { tenantId, saleId: docRef.id });
    return docRef.id;
  }

  async findById(tenantId, saleId) {
    const doc = await this.db.collection(`tenants/${tenantId}/sales`).doc(saleId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async findByTenant(tenantId, options = {}) {
    let query = this.db.collection(`tenants/${tenantId}/sales`);
    
    if (options.startDate) {
      query = query.where('date', '>=', options.startDate);
    }
    if (options.endDate) {
      query = query.where('date', '<=', options.endDate);
    }
    if (options.agentId) {
      query = query.where('agentId', '==', options.agentId);
    }
    if (options.product) {
      query = query.where('product', '==', options.product);
    }

    query = query.orderBy('date', 'desc');
    
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return results;
  }

  async getSalesByDateRange(tenantId, startDate, endDate) {
    const snapshot = await this.db.collection(`tenants/${tenantId}/sales`)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();

    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return results;
  }

  async getTopProducts(tenantId, limit = 10) {
    const snapshot = await this.db.collection(`tenants/${tenantId}/sales`)
      .orderBy('totalValue', 'desc')
      .limit(limit)
      .get();

    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return results;
  }

  async aggregateByDate(tenantId, interval = 'day') {
    const sales = await this.db.collection(`tenants/${tenantId}/sales`).get();
    const groups = {};
    
    sales.forEach(doc => {
      const data = doc.data();
      const date = data.date.toDate ? data.date.toDate() : new Date(data.date);
      let key;
      
      if (interval === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (interval === 'week') {
        const week = this.getWeekNumber(date);
        key = `${date.getFullYear()}-W${week}`;
      } else {
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      }

      if (!groups[key]) groups[key] = { count: 0, total: 0, revenue: 0 };
      groups[key].count++;
      groups[key].total += data.quantity || 0;
      groups[key].revenue += data.totalValue || 0;
    });

    return groups;
  }

  getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  async delete(tenantId, saleId) {
    await this.db.collection(`tenants/${tenantId}/sales`).doc(saleId).delete();
    logger.debug('Sale deleted', { tenantId, saleId });
  }
}

const saleRepository = new SaleRepository();
module.exports = { saleRepository };