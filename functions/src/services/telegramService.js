const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');

class TelegramService {
  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not set');
    }
    this.bot = new TelegramBot(token, { polling: false });
  }

  async sendMessage(chatId, text) {
    try {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Failed to send Telegram message:', error);
      throw error;
    }
  }

  async sendMarkdown(chatId, text) {
    return this.sendMessage(chatId, text);
  }
}

const telegramService = new TelegramService();
module.exports = { telegramService };