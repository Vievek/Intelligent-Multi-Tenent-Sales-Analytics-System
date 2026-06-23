const { PubSub } = require('@google-cloud/pubsub');
const logger = require('../utils/logger');

class PubSubService {
  constructor() {
    this.client = new PubSub();
    this.topicName = process.env.PUBSUB_TOPIC || 'sales-messages';
    this.deadLetterTopic = process.env.PUBSUB_DEAD_LETTER || 'sales-messages-dlq';
  }

  async publish(messageData) {
    try {
      const dataBuffer = Buffer.from(JSON.stringify(messageData));
      const messageId = await this.client.topic(this.topicName).publish(dataBuffer);
      logger.debug('Message published', { messageId });
      return messageId;
    } catch (error) {
      logger.error('Failed to publish message:', error);
      throw error;
    }
  }

  async publishWithRetry(messageData, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.publish(messageData);
      } catch (error) {
        lastError = error;
        logger.warn(`Publish attempt ${attempt} failed`, { error: error.message });
        if (attempt < maxRetries) {
          await this.sleep(1000 * attempt);
        }
      }
    }
    throw new Error(`Failed to publish after ${maxRetries} attempts: ${lastError.message}`);
  }

  async createTopic() {
    try {
      const [topic] = await this.client.topic(this.topicName).get();
      logger.info('Topic exists', { topicName: this.topicName });
      return topic;
    } catch (error) {
      if (error.code === 5) {
        const [topic] = await this.client.createTopic(this.topicName);
        logger.info('Topic created', { topicName: this.topicName });
        return topic;
      }
      throw error;
    }
  }

  async createDeadLetterTopic() {
    try {
      const [topic] = await this.client.topic(this.deadLetterTopic).get();
      return topic;
    } catch (error) {
      if (error.code === 5) {
        const [topic] = await this.client.createTopic(this.deadLetterTopic);
        logger.info('Dead letter topic created', { topicName: this.deadLetterTopic });
        return topic;
      }
      throw error;
    }
  }

  async subscribe(topicName, subscriptionName, callback) {
    const topic = this.client.topic(topicName);
    const [subscription] = await topic.subscription(subscriptionName).get();
    
    subscription.on('message', (message) => {
      try {
        const data = JSON.parse(message.data.toString());
        callback(data, message);
        message.ack();
      } catch (error) {
        logger.error('Subscription error:', error);
        message.nack();
      }
    });

    subscription.on('error', (error) => {
      logger.error('Subscription error:', error);
    });

    return subscription;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const pubsubService = new PubSubService();
module.exports = { pubsubService };