const { HfInference } = require('@huggingface/inference');
const { preprocessor } = require('./preprocessor');
const logger = require('../../utils/logger');

class HuggingFaceNLP {
  constructor() {
    this.client = null;
    this.model = 'dslim/bert-base-NER';
  }

  getClient() {
    if (!this.client) {
      const token = process.env.HUGGINGFACE_TOKEN;
      if (!token) {
        throw new Error('HuggingFace client not initialized');
      }
      this.client = new HfInference(token);
    }
    return this.client;
  }

  async extract(text) {
    if (!text || text.trim() === '') {
      throw new Error('Text is required');
    }
    const client = this.getClient();

    const cleaned = preprocessor.clean(text);
    
    const result = await client.tokenClassification({
      model: this.model,
      inputs: cleaned,
      parameters: {
        aggregation_strategy: 'simple',
      },
    });

    const entities = this.mapEntities(result);
    const product = this.extractProduct(entities, text);
    const quantity = this.extractQuantity(entities, text);
    const price = this.extractPrice(entities, text);

    logger.debug('HF extraction result', { product, quantity, price, entities: result.length });

    return { product, quantity, price };
  }

  mapEntities(result) {
    const entities = { PER: [], LOC: [], ORG: [], MISC: [], O: [] };
    for (const entity of result) {
      const key = entity.entity_group || 'O';
      if (!entities[key]) entities[key] = [];
      entities[key].push(entity.word);
    }
    return entities;
  }

  extractProduct(entities, text) {
    const keywords = ['sold', 'bought', 'purchased', 'ordered', 'for', 'of'];
    const words = text.toLowerCase().split(' ');
    let productIndex = -1;

    for (const keyword of keywords) {
      const idx = words.indexOf(keyword);
      if (idx !== -1 && idx + 1 < words.length) {
        productIndex = idx + 1;
        break;
      }
    }

    if (productIndex !== -1) {
      const candidates = [];
      const stopWords = ['for', 'at', 'each', 'to', 'with', 'from', 'in', 'on', 'by'];
      for (let i = productIndex; i < Math.min(productIndex + 4, words.length); i++) {
        const word = words[i];
        if (!this.isNumber(word) && !this.isPrice(word)) {
          if (stopWords.includes(word)) {
            break;
          }
          candidates.push(word);
        }
      }
      if (candidates.length > 0) {
        return candidates.join(' ');
      }
    }

    const misc = entities.MISC || [];
    if (misc.length > 0) {
      return misc[0];
    }

    const lastPriceIndex = this.findLastPriceIndex(words);
    if (lastPriceIndex > 0) {
      const before = words.slice(0, lastPriceIndex).join(' ');
      const productMatch = before.match(/(\w+)\s*(?:for|at|@|\s+)?$/);
      if (productMatch) {
        return productMatch[1];
      }
    }

    return 'unknown';
  }

  extractQuantity(entities, text) {
    // Find all words and extract the first pure number (which is not part of currency/price)
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      const match = word.match(/^(\d+(\.\d+)?)$/);
      if (match) {
        const num = parseFloat(match[1]);
        if (num >= 0.1 && num <= 1000000) {
          return num;
        }
      }
    }

    const qtyWords = ['a', 'an'];
    for (const word of qtyWords) {
      const idx = words.indexOf(word);
      if (idx !== -1 && idx + 1 < words.length) {
        return 1;
      }
    }
    return 1;
  }

  extractPrice(entities, text) {
    const pricePatterns = [
      /(\d+(\.\d+)?)\s*(?:rs|inr|rupees?|r|\$|dollars?)/i,
      /(?:rs|inr|rupees?|r|\$|dollars?)\s*(\d+(\.\d+)?)/i,
      /\s(\d+(\.\d+)?)\s*(?:rs|inr|rupees?|r|\$|dollars?)/i,
    ];

    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        const price = parseFloat(match[1] || match[0]);
        if (price > 0 && price < 100000000) {
          return price;
        }
      }
    }

    const numbers = text.match(/\b(\d+(\.\d+)?)\b/g);
    if (numbers && numbers.length > 1) {
      const lastNum = parseFloat(numbers[numbers.length - 1]);
      if (lastNum > 0.1 && lastNum < 100000000) {
        return lastNum;
      }
    }

    return null;
  }

  isNumber(word) {
    return /^\d+(\.\d+)?$/.test(word);
  }

  isPrice(word) {
    return /^(\d+(\.\d+)?)(rs|inr|rupees?|r|\$|dollars?)$/i.test(word);
  }

  findLastPriceIndex(words) {
    for (let i = words.length - 1; i >= 0; i--) {
      if (this.isPrice(words[i]) || this.isNumber(words[i]) && i + 1 < words.length && this.isPriceIndicator(words[i + 1])) {
        return i;
      }
    }
    return -1;
  }

  isPriceIndicator(word) {
    return /^(rs|inr|rupees?|r|\$|dollars?)$/i.test(word);
  }
}

const huggingfaceNLP = new HuggingFaceNLP();
module.exports = { huggingfaceNLP };