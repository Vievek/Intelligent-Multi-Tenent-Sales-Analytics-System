const { parse, isValid, format } = require('date-fns');

class DateParser {
  extractDate(text, fallbackTimestamp) {
    const datePatterns = [
      { regex: /(today|tod)/i, handler: () => new Date() },
      { regex: /(yesterday|yday)/i, handler: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d;
      } },
      { regex: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, handler: (match) => {
        // Treat as DD/MM/YYYY (day first, then month — international format)
        const day = parseInt(match[1]);
        const month = parseInt(match[2]);
        let year = parseInt(match[3]);
        if (year < 100) year += 2000;
        const d = new Date(year, month - 1, day);
        return isValid(d) ? d : null;
      } },
      { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/, handler: (match) => {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        const d = new Date(year, month - 1, day);
        return isValid(d) ? d : null;
      } },
      { regex: /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{2,4})/i, handler: (match) => {
        const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
        const day = parseInt(match[1]);
        const month = months[match[2].toLowerCase()];
        let year = parseInt(match[3]);
        if (year < 100) year += 2000;
        const d = new Date(year, month, day);
        return isValid(d) ? d : null;
      } },
      { regex: /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{2,4})?/i, handler: (match) => {
        const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
        const month = months[match[1].toLowerCase()];
        const day = parseInt(match[2]);
        const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
        const d = new Date(year, month, day);
        return isValid(d) ? d : null;
      } },
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const result = pattern.handler(match);
        if (result && isValid(result)) {
          return result;
        }
      }
    }

    if (fallbackTimestamp) {
      const d = new Date(fallbackTimestamp * 1000);
      if (isValid(d)) return d;
    }

    return new Date();
  }

  parseDateString(dateStr) {
    const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'dd-MM-yyyy', 'MM-dd-yyyy'];
    for (const fmt of formats) {
      const d = parse(dateStr, fmt, new Date());
      if (isValid(d)) return d;
    }
    return null;
  }

  formatDate(date, formatStr = 'yyyy-MM-dd') {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    if (!isValid(d)) return null;
    return format(d, formatStr);
  }
}

const dateParser = new DateParser();
module.exports = { dateParser };