const { GoogleGenerativeAI } = require('@google/generative-ai');
const { preprocessor } = require('./preprocessor');
const logger = require('../../utils/logger');

class GeminiNLP {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY not set, Gemini extraction will fail');
    }
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.model = 'gemini-1.5-flash';
  }

  async extract(text) {
    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }

    const cleaned = preprocessor.clean(text);
    const genModel = this.client.getGenerativeModel({ model: this.model });

    const prompt = `Extract sales information from this text. Return ONLY valid JSON with product, quantity, and price fields.

Text: "${cleaned}"

Rules:
- product: the item sold (string)
- quantity: the number of items (number, default 1 if not specified)
- price: the unit price per item or total price (number)
- If price is total, infer unit price
- Only use numbers mentioned in the text

JSON response only, no explanations:`;

    try {
      const result = await genModel.generateContent(prompt);
      const response = await result.response;
      const rawText = response.text();
      
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        product: parsed.product || 'unknown',
        quantity: Math.max(1, parseFloat(parsed.quantity) || 1),
        price: Math.max(0.01, parseFloat(parsed.price) || 0.01),
      };
    } catch (error) {
      logger.error('Gemini extraction failed:', error.message);
      throw new Error(`Gemini extraction failed: ${error.message}`);
    }
  }
}

const geminiNLP = new GeminiNLP();
module.exports = { geminiNLP };