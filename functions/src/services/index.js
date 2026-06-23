const { tenantResolver } = require('./tenantResolver');
const { telegramService } = require('./telegramService');
const { pubsubService } = require('./pubsubService');
const { nlpStrategy } = require('./nlp/nlpStrategy');

module.exports = {
  tenantResolver,
  telegramService,
  pubsubService,
  nlpStrategy,
};
