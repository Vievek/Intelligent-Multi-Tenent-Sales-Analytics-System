const admin = require('firebase-admin');
const { nlpStrategy } = require('../services/nlp/nlpStrategy');
const { saleRepository } = require('../repositories/saleRepository');
const { agentRepository } = require('../repositories/agentRepository');
const { saleSchema } = require('../validators/saleSchema');
const { dateParser } = require('../utils/dateParser');
const logger = require('../utils/logger');

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

  const { telegramUserId, tenantId, agentId, text, timestamp } = data;

  logger.info('Processing message', { telegramUserId, tenantId, text: text.substring(0, 50) });

  try {
    const rawDate = timestamp || Date.now() / 1000;
    const saleDate = dateParser.extractDate(text, rawDate);

    const extraction = await nlpStrategy.extract(text);

    const saleData = {
      product: extraction.product,
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
    };

    const validated = saleSchema.parse(saleData);

    const saleId = await saleRepository.create(tenantId, validated);

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
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    logger.error('Failed to update message log:', error);
  }
}

module.exports = { pubsubProcessor };