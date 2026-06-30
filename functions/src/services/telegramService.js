const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');

class TelegramService {
  constructor() {
    this._bot = null;
  }

  get bot() {
    if (!this._bot) {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN not set');
      }
      this._bot = new TelegramBot(token, { polling: false });
    }
    return this._bot;
  }

  async sendMessage(chatId, text) {
    try {
      if (process.env.FUNCTIONS_EMULATOR === 'true') {
        logger.info(`[EMULATOR] Simulating Telegram message to chat ${chatId}: ${text}`);
        return;
      }
      const botClient = this.bot;
      await botClient.sendMessage(chatId, text, { parse_mode: 'Markdown' });
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