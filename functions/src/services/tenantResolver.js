const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const logger = require('../utils/logger');

class TenantResolver {
  constructor() {
    this._db = null; // Lazy — do NOT call admin.firestore() here
    this.cache = new Map();
    this.cacheTTL = 300000;
  }

  // Lazy getter: only accesses Firestore after admin.initializeApp() has run
  get db() {
    if (!this._db) {
      this._db = admin.firestore();
    }
    return this._db;
  }

  async resolveAgent(telegramUserId) {
    const cacheKey = `agent:${telegramUserId}`;
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const snapshot = await this.db.collectionGroup('agents')
      .where('telegramUserId', '==', telegramUserId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error('UNREGISTERED_AGENT');
    }

    const doc = snapshot.docs[0];
    const agentData = doc.data();
    const tenantId = doc.ref.parent.parent.id;

    const tenantDoc = await this.db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists || tenantDoc.data().status !== 'active') {
      throw new Error('TENANT_INACTIVE');
    }

    const result = {
      agentId: telegramUserId,
      tenantId,
      agentData,
      tenantData: tenantDoc.data(),
    };

    this.setCache(cacheKey, result);
    return result;
  }

  async registerAgent(telegramUserId, tenantCode, chatId) {
    const snapshot = await this.db.collection('tenants')
      .where('tenantCode', '==', tenantCode)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error('INVALID_CODE');
    }

    const tenantDoc = snapshot.docs[0];
    const tenantId = tenantDoc.id;

    const existing = await this.db.collection(`tenants/${tenantId}/agents`)
      .where('telegramUserId', '==', telegramUserId)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new Error('DUPLICATE_REGISTRATION');
    }

    const agentRef = this.db.collection(`tenants/${tenantId}/agents`).doc(telegramUserId);
    await agentRef.set({
      telegramUserId,
      chatId,
      status: 'active',
      registeredAt: FieldValue.serverTimestamp(),
      messageCount: 0,
    });

    this.cache.clear();
    return { id: tenantId, name: tenantDoc.data().name };
  }

  getCache(key) {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.cacheTTL) {
      return entry.value;
    }
    return null;
  }

  setCache(key, value) {
    this.cache.set(key, { value, timestamp: Date.now() });
  }
}

const tenantResolver = new TenantResolver();
module.exports = { tenantResolver };