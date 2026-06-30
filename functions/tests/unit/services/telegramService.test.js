const { telegramService } = require('../../../src/services/telegramService');
const TelegramBot = require('node-telegram-bot-api');

jest.mock('node-telegram-bot-api');

describe('TelegramService', () => {
  let originalToken;

  beforeAll(() => {
    originalToken = process.env.TELEGRAM_BOT_TOKEN;
  });

  afterAll(() => {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    telegramService._bot = null;
    process.env.TELEGRAM_BOT_TOKEN = 'mock-token';
  });

  test('bot getter initializes bot with correct token', () => {
    const bot = telegramService.bot;
    expect(bot).toBeDefined();
    expect(TelegramBot).toHaveBeenCalledWith('mock-token', { polling: false });
  });

  test('bot getter throws if token is missing', () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    expect(() => telegramService.bot).toThrow('TELEGRAM_BOT_TOKEN not set');
  });

  test('sendMessage passes correct arguments to bot client', async () => {
    const mockSendMessage = jest.fn().mockResolvedValue();
    telegramService._bot = { sendMessage: mockSendMessage };

    await telegramService.sendMessage(12345, 'Hello test');
    expect(mockSendMessage).toHaveBeenCalledWith(12345, 'Hello test', { parse_mode: 'Markdown' });
  });

  test('sendMessage throws and logs if bot call fails', async () => {
    const mockSendMessage = jest.fn().mockRejectedValue(new Error('API Error'));
    telegramService._bot = { sendMessage: mockSendMessage };

    await expect(telegramService.sendMessage(12345, 'Hello test')).rejects.toThrow('API Error');
  });

  test('sendMarkdown delegates to sendMessage', async () => {
    const mockSendMessage = jest.fn().mockResolvedValue();
    telegramService._bot = { sendMessage: mockSendMessage };

    await telegramService.sendMarkdown(12345, '*bold text*');
    expect(mockSendMessage).toHaveBeenCalledWith(12345, '*bold text*', { parse_mode: 'Markdown' });
  });
});
