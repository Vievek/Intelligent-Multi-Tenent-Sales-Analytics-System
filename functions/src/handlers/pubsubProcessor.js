const admin = require('firebase-admin');
const crypto = require('crypto');
const { FieldValue } = require('firebase-admin/firestore');
const { nlpStrategy } = require('../services/nlp/nlpStrategy');
const { saleRepository } = require('../repositories/saleRepository');
const { pendingReviewRepository } = require('../repositories/pendingReviewRepository');
const { agentRepository } = require('../repositories/agentRepository');
const { saleSchema } = require('../validators/saleSchema');
const { dateParser } = require('../utils/dateParser');
const { productNormalizer } = require('../services/productNormalizer');
const logger = require('../utils/logger');

/**
 * Derives a short deterministic document ID from a dedup key.
 * Using the first 20 hex chars of SHA-256 gives us 80 bits of entropy —
 * enough to make collisions effectively impossible for this use case.
 */
function dedupKeyToDocId(dedupKey) {
  return crypto.createHash('sha256').update(dedupKey).digest('hex').slice(0, 20);
}

async function pubsubProcessor(event) {
  const message = event.data?.message;
  const messageId = message?.messageId || event.attributes?.messageId || null;

  let data = null;
  if (message) {
    try {
      data = message.json || (message.data ? JSON.parse(Buffer.from(message.data, 'base64').toString()) : null);
    } catch (err) {
      logger.error('Failed to parse PubSub message payload:', err);
    }
  } else {
    // Fallback for direct data object in unit tests
    data = event.data;
  }
  
  if (!data || !data.text) {
    logger.warn('Invalid message data', { data });
    await updateMessageLog(messageId, 'failed', 'Invalid message data');
    return;
  }

  const { telegramUserId, tenantId, agentId, text, timestamp, dedupKey } = data;

  logger.info('Processing message', { telegramUserId, tenantId, text: text.substring(0, 50) });

  let partialExtraction = null;

  try {
    const rawDate = timestamp || Date.now() / 1000;
    const saleDate = dateParser.extractDate(text, rawDate);

    const extraction = await nlpStrategy.extract(text);
    partialExtraction = extraction;

    // Normalize the product name against the tenant's catalog (handles typos, case, abbreviations)
    const canonicalProduct = await productNormalizer.normalize(tenantId, extraction.product);

    const saleData = {
      product: canonicalProduct,
      quantity: extraction.quantity,
      price: extraction.price,
      date: saleDate,
      rawMessage: text,
      agentId,
      tenantId,
      confidence: extraction.confidence,
      extractionMethod: extraction.method,
      processedAt: new Date().toISOString(),
      pubsubMessageId: messageId,
      dedupKey: dedupKey || null,
    };

    const validated = saleSchema.parse(saleData);
    validated.totalValue = validated.quantity * validated.price;

    // --- Deduplication ---
    // If a dedupKey is present, use a deterministic Firestore doc ID derived from it.
    // The createWithId transaction will silently skip writing if the doc already exists.
    let saleId;
    if (dedupKey) {
      const docId = dedupKeyToDocId(dedupKey);
      const result = await saleRepository.createWithId(tenantId, docId, validated);
      if (result.isDuplicate) {
        logger.warn('Duplicate message ignored', { telegramUserId, tenantId, dedupKey });
        await updateMessageLog(messageId, 'duplicate');
        return;
      }
      saleId = result.id;
    } else {
      saleId = await saleRepository.create(tenantId, validated);
    }

    await agentRepository.incrementMessageCount(tenantId, agentId);

    await updateMessageLog(messageId, 'processed', null, saleId);

    logger.info('Message processed successfully', {
      telegramUserId,
      tenantId,
      saleId,
      method: extraction.method,
      confidence: extraction.confidence,
    });
  } catch (error) {
    logger.error('Processing error:', error);

    // Write to pendingReviews so admins/tenants can manually correct and approve
    if (tenantId) {
      try {
        await pendingReviewRepository.create(tenantId, {
          rawMessage: text,
          telegramUserId: telegramUserId || null,
          agentId: agentId || null,
          tenantId,
          errorReason: error.message,
          partialExtraction: partialExtraction
            ? {
                product: partialExtraction.product || null,
                quantity: partialExtraction.quantity || null,
                price: partialExtraction.price || null,
                confidence: partialExtraction.confidence || null,
                method: partialExtraction.method || null,
              }
            : null,
          pubsubMessageId: messageId || null,
          dedupKey: dedupKey || null,
        });
        logger.info('Written to pendingReviews for manual correction', { tenantId });
      } catch (reviewErr) {
        logger.error('Failed to write pendingReview:', reviewErr);
      }
    }

    await updateMessageLog(messageId, 'failed', error.message);
    throw error;
  }
}

async function updateMessageLog(messageId, status, errorReason, saleId) {
  if (!messageId) return;
  
  const db = admin.firestore();
  try {
    const snapshot = await db.collection('messageLog')
      .where('messageId', '==', messageId)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      await doc.ref.update({
        status,
        errorReason: errorReason || null,
        saleId: saleId || null,
        processedAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    logger.error('Failed to update message log:', error);
  }
}

module.exports = { pubsubProcessor };