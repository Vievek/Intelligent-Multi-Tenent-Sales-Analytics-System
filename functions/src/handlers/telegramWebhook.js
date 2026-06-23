const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const { PubSub } = require('@google-cloud/pubsub');
const { tenantResolver } = require('../services/tenantResolver');
const { telegramService } = require('../services/telegramService');
const logger = require('../utils/logger');
const { dateParser } = require('../utils/dateParser');

const pubsub = new PubSub();
const TOPIC = 'sales-messages';

async function telegramWebhook(req, res) {
  const { body } = req;
  
  if (!body || !body.message) {
    return res.status(200).json({ status: 'no message' });
  }

  const message = body.message;
  const chatId = message.chat.id;
  const telegramUserId = String(message.from.id);
  const text = message.text || '';

  logger.info('Received message', { chatId, telegramUserId, text: text.substring(0, 50) });

  if (text.startsWith('/register')) {
    await handleRegistration(chatId, telegramUserId, text);
    return res.status(200).json({ status: 'registration processed' });
  }

  if (text.startsWith('/start')) {
    await telegramService.sendMessage(
      chatId,
      'Welcome to RMET Sales Analytics! Use /register TENANT_CODE to register, or send sales messages like "sold 5 apples for $10"'
    );
    return res.status(200).json({ status: 'welcome sent' });
  }

  await handleSalesMessage(chatId, telegramUserId, text, message.date);
  
  res.status(200).json({ status: 'message queued' });
}

async function handleRegistration(chatId, telegramUserId, text) {
  const parts = text.split(' ');
  if (parts.length < 2) {
    await telegramService.sendMessage(chatId, 'Please provide tenant code: /register TENANT_CODE');
    return;
  }

  const tenantCode = parts[1].trim().toUpperCase();
  
  try {
    const tenant = await tenantResolver.registerAgent(telegramUserId, tenantCode, chatId);
    await telegramService.sendMessage(
      chatId,
      `✅ Registration successful! You are now registered with ${tenant.name}. Send sales messages like "sold 5 apples for $10" to record sales.`
    );
    logger.info('Agent registered', { telegramUserId, tenantId: tenant.id });
  } catch (error) {
    logger.error('Registration error:', error);
    await telegramService.sendMessage(chatId, `❌ Registration failed: ${error.message}`);
  }
}

async function handleSalesMessage(chatId, telegramUserId, text, timestamp) {
  try {
    const resolution = await tenantResolver.resolveAgent(telegramUserId);

    const messageData = {
      telegramUserId,
      tenantId: resolution.tenantId,
      agentId: resolution.agentId,
      text,
      timestamp,
      receivedAt: new Date().toISOString(),
    };

    const dataBuffer = Buffer.from(JSON.stringify(messageData));
    const messageId = await pubsub.topic(TOPIC).publish(dataBuffer);

    await logMessage(telegramUserId, resolution.tenantId, text, 'queued', messageId);

    await telegramService.sendMessage(
      chatId,
      '✅ Message received and queued for processing.'
    );

    logger.info('Message queued', { telegramUserId, tenantId: resolution.tenantId, messageId });
  } catch (error) {
    logger.error('Error handling sales message:', error);
    if (error.message === 'UNREGISTERED_AGENT') {
      await telegramService.sendMessage(
        chatId,
        '❌ You are not registered. Please use /register TENANT_CODE to register first.'
      );
    } else if (error.message === 'TENANT_INACTIVE') {
      await telegramService.sendMessage(
        chatId,
        '❌ Your business account is inactive. Please contact your administrator.'
      );
    } else {
      await telegramService.sendMessage(chatId, '❌ Failed to process your message. Please try again.');
    }
  }
}

async function logMessage(telegramUserId, tenantId, text, status, messageId) {
  const db = admin.firestore();
  await db.collection('messageLog').add({
    telegramUserId,
    tenantId: tenantId || null,
    rawMessage: text,
    status,
    messageId: messageId || null,
    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

module.exports = { telegramWebhook };