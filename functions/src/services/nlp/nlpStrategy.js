const { huggingfaceNLP } = require('./huggingfaceNLP');
const { geminiNLP } = require('./geminiNLP');
const { preprocessor } = require('./preprocessor');
const { confidenceScorer } = require('./confidenceScorer');
const logger = require('../../utils/logger');

class NLPStrategy {
  async extract(text) {
    const cleaned = preprocessor.clean(text);
    const tokens = preprocessor.tokenize(cleaned);

    if (tokens.length < 2) {
      return this.fallbackExtract(text);
    }

    let result;
    let method = 'huggingface';

    try {
      result = await huggingfaceNLP.extract(cleaned);
      const confidence = confidenceScorer.score(result);
      result.confidence = confidence;
      result.method = 'huggingface';

      if (confidence === 'LOW') {
        logger.info('Low confidence extraction, falling back to Gemini', { text: text.substring(0, 50) });
        result = await this.fallbackExtract(text);
        method = 'gemini';
      }
    } catch (error) {
      logger.warn('HuggingFace failed, falling back to Gemini:', error.message);
      result = await this.fallbackExtract(text);
      method = 'gemini';
    }

    const finalResult = this.normalizeResult(result, method);
    logger.info('Extraction complete', { method, confidence: finalResult.confidence });
    return finalResult;
  }

  async fallbackExtract(text) {
    const result = await geminiNLP.extract(text);
    result.confidence = confidenceScorer.score(result);
    result.method = 'gemini';
    return result;
  }

  normalizeResult(result, method) {
    return {
      product: result.product || 'unknown',
      quantity: Math.max(1, parseFloat(result.quantity) || 1),
      price: Math.max(0.01, parseFloat(result.price) || 0.01),
      confidence: result.confidence || 'LOW',
      method: method || 'gemini',
    };
  }
}

const nlpStrategy = new NLPStrategy();
module.exports = { nlpStrategy };