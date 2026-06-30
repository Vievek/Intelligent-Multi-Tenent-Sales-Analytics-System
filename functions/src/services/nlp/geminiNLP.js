const { GoogleGenAI } = require('@google/genai');
const { preprocessor } = require('./preprocessor');
const logger = require('../../utils/logger');

const MODEL = 'gemini-3.5-flash';

class GeminiNLP {
  constructor() {
    this.client = null;
  }

  getClient() {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini client not initialized: GEMINI_API_KEY is missing');
      }
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  async extract(text) {
    if (!text || text.trim() === '') {
      throw new Error('Text is required');
    }

    const ai = this.getClient();
    const cleaned = preprocessor.clean(text);

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
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      });

      const rawText = response.text;

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