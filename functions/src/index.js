const { onRequest } = require('firebase-functions/v2/https');
const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { telegramWebhook } = require('./handlers/telegramWebhook');
const { pubsubProcessor } = require('./handlers/pubsubProcessor');
const logger = require('./utils/logger');

setGlobalOptions({ maxInstances: 10, region: 'us-central1' });

admin.initializeApp();

exports.receiveTelegramMessage = onRequest(
  {
    cors: true,
    timeoutSeconds: 30,
    memory: '128MiB',
  },
  async (req, res) => {
    try {
      await telegramWebhook(req, res);
    } catch (error) {
      logger.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

exports.processSalesMessage = onMessagePublished(
  {
    topic: 'sales-messages',
    timeoutSeconds: 60,
    memory: '256MiB',
    retry: true,
  },
  async (event) => {
    try {
      await pubsubProcessor(event);
    } catch (error) {
      logger.error('Processor error:', error);
      throw error;
    }
  }
);

exports.healthCheck = onRequest(
  {
    cors: true,
  },
  (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  }
);