const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { saleRepository } = require('./saleRepository');
const logger = require('../utils/logger');

class PendingReviewRepository {
  constructor() {
    this._db = null;
  }

  get db() {
    if (!this._db) {
      this._db = admin.firestore();
    }
    return this._db;
  }

  /**
   * Writes a new pending review entry for a failed message.
   */
  async create(tenantId, reviewData) {
    const docRef = this.db.collection(`tenants/${tenantId}/pendingReviews`).doc();
    const now = FieldValue.serverTimestamp();

    const docData = {
      ...reviewData,
      tenantId,
      status: 'pending',
      receivedAt: now,
      updatedAt: now,
    };

    await docRef.set(docData);
    logger.debug('Pending review created', { tenantId, reviewId: docRef.id });
    return docRef.id;
  }

  /**
   * Lists pending reviews for a tenant, optionally filtered by status.
   * @param {string} tenantId
   * @param {string} [statusFilter] - 'pending' | 'approved' | 'rejected'
   */
  async findByTenant(tenantId, statusFilter = 'pending') {
    let query = this.db.collection(`tenants/${tenantId}/pendingReviews`);

    if (statusFilter) {
      query = query.where('status', '==', statusFilter);
    }

    query = query.orderBy('receivedAt', 'desc');

    const snapshot = await query.get();
    const results = [];
    snapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return results;
  }

  /**
   * Approves a pending review: creates a sale from corrected data and marks the review approved.
   * @param {string} tenantId
   * @param {string} reviewId
   * @param {object} correctedData - { product, quantity, price, agentId, date? }
   */
  async approve(tenantId, reviewId, correctedData) {
    const reviewRef = this.db.collection(`tenants/${tenantId}/pendingReviews`).doc(reviewId);
    const reviewSnap = await reviewRef.get();

    if (!reviewSnap.exists) {
      throw new Error('Pending review not found');
    }

    const review = reviewSnap.data();
    if (review.status !== 'pending') {
      throw new Error(`Review is already ${review.status}`);
    }

    const { Timestamp } = require('firebase-admin/firestore');

    const saleData = {
      product: correctedData.product,
      quantity: Number(correctedData.quantity) || 1,
      price: Number(correctedData.price) || 0,
      agentId: correctedData.agentId || review.agentId || 'manual',
      date: correctedData.date
        ? Timestamp.fromDate(new Date(correctedData.date))
        : FieldValue.serverTimestamp(),
      rawMessage: review.rawMessage || '',
      confidence: 'HIGH',
      extractionMethod: 'manual_review',
      processedAt: new Date().toISOString(),
      pubsubMessageId: review.pubsubMessageId || null,
      dedupKey: review.dedupKey || null,
    };
    saleData.totalValue = saleData.quantity * saleData.price;

    const saleId = await saleRepository.create(tenantId, saleData);

    await reviewRef.update({
      status: 'approved',
      approvedSaleId: saleId,
      approvedAt: FieldValue.serverTimestamp(),
      correctedData,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('Pending review approved', { tenantId, reviewId, saleId });
    return { saleId };
  }

  /**
   * Rejects a pending review, archiving it with status 'rejected'.
   */
  async reject(tenantId, reviewId, reason) {
    const reviewRef = this.db.collection(`tenants/${tenantId}/pendingReviews`).doc(reviewId);
    const reviewSnap = await reviewRef.get();

    if (!reviewSnap.exists) {
      throw new Error('Pending review not found');
    }

    const review = reviewSnap.data();
    if (review.status !== 'pending') {
      throw new Error(`Review is already ${review.status}`);
    }

    await reviewRef.update({
      status: 'rejected',
      rejectionReason: reason || null,
      rejectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('Pending review rejected', { tenantId, reviewId });
  }
}

const pendingReviewRepository = new PendingReviewRepository();
module.exports = { pendingReviewRepository };
