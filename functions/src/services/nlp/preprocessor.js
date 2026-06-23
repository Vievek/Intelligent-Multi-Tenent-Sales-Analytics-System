class Preprocessor {
  clean(text) {
    let cleaned = text.toLowerCase().trim();
    cleaned = cleaned.replace(/[^\w\s$.,-]/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = this.normalizeCurrency(cleaned);
    cleaned = this.normalizeQuantity(cleaned);
    return cleaned;
  }

  tokenize(text) {
    return text.split(' ').filter(word => word.length > 0);
  }

  normalizeCurrency(text) {
    const patterns = [
      { regex: /(\d+)\s*(?:rs|inr|rupees?|r)\b/gi, replace: '$1 rupees' },
      { regex: /(\d+)\s*\$\s*/g, replace: '$1 dollars' },
      { regex: /\$\s*(\d+)/g, replace: '$1 dollars' },
      { regex: /(\d+)\s*\/\s*-\.?/g, replace: '$1 rupees' },
    ];

    for (const pattern of patterns) {
      text = text.replace(pattern.regex, pattern.replace);
    }
    return text;
  }

  normalizeQuantity(text) {
    const units = ['kg', 'gm', 'g', 'litre', 'l', 'ml', 'dozen', 'piece', 'pcs', 'pack'];
    for (const unit of units) {
      text = text.replace(new RegExp(`\\s*${unit}\\b`, 'gi'), '');
    }
    return text;
  }

  extractNumber(text) {
    const matches = text.match(/\d+(\.\d+)?/);
    return matches ? parseFloat(matches[0]) : null;
  }
}

const preprocessor = new Preprocessor();
module.exports = { preprocessor };