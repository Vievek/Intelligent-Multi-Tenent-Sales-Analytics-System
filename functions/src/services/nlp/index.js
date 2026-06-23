const { nlpStrategy } = require('./nlpStrategy');
const { huggingfaceNLP } = require('./huggingfaceNLP');
const { geminiNLP } = require('./geminiNLP');
const { preprocessor } = require('./preprocessor');
const { confidenceScorer } = require('./confidenceScorer');

module.exports = {
  nlpStrategy,
  huggingfaceNLP,
  geminiNLP,
  preprocessor,
  confidenceScorer,
};
