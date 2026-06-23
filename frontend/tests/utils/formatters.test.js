import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatCompactNumber,
  getConfidenceColor,
  getConfidenceLabel,
  getExtractionMethodLabel,
  truncateText,
  getStatusColor,
} from '../../src/utils/formatters';

describe('Formatters', () => {
  describe('formatCurrency', () => {
    it('formats currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1000)).toBe('$1,000');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('handles invalid values', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
    });

    it('uses custom currency', () => {
      expect(formatCurrency(100, 'EUR')).toBe('€100');
    });
  });

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('Jan 15, 2024');
    });

    it('handles Firestore timestamp objects', () => {
      const timestamp = { toDate: () => new Date('2024-01-15') };
      expect(formatDate(timestamp)).toBe('Jan 15, 2024');
    });

    it('handles null and undefined', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('handles invalid date strings', () => {
      expect(formatDate('invalid')).toBe('N/A');
    });

    it('uses custom format', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'yyyy-MM-dd')).toBe('2024-01-15');
    });
  });

  describe('formatDateTime', () => {
    it('formats date time correctly', () => {
      const date = new Date('2024-01-15T14:30:00');
      expect(formatDateTime(date)).toBe('Jan 15, 2024 14:30');
    });

    it('handles null', () => {
      expect(formatDateTime(null)).toBe('N/A');
    });
  });

  describe('formatNumber', () => {
    it('formats number with commas', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(1000)).toBe('1,000');
    });

    it('handles invalid values', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
      expect(formatNumber(NaN)).toBe('0');
    });
  });

  describe('formatCompactNumber', () => {
    it('formats compact numbers', () => {
      expect(formatCompactNumber(1000)).toBe('1K');
      expect(formatCompactNumber(1000000)).toBe('1M');
      expect(formatCompactNumber(1500)).toBe('1.5K');
    });

    it('handles invalid values', () => {
      expect(formatCompactNumber(null)).toBe('0');
      expect(formatCompactNumber(undefined)).toBe('0');
    });
  });

  describe('getConfidenceColor', () => {
    it('returns correct colors', () => {
      expect(getConfidenceColor('HIGH')).toContain('text-green-600');
      expect(getConfidenceColor('MEDIUM')).toContain('text-yellow-600');
      expect(getConfidenceColor('LOW')).toContain('text-red-600');
    });

    it('returns default for unknown', () => {
      expect(getConfidenceColor('UNKNOWN')).toContain('text-gray-600');
    });
  });

  describe('getConfidenceLabel', () => {
    it('returns correct labels', () => {
      expect(getConfidenceLabel('HIGH')).toBe('High');
      expect(getConfidenceLabel('MEDIUM')).toBe('Medium');
      expect(getConfidenceLabel('LOW')).toBe('Low');
    });

    it('returns input for unknown', () => {
      expect(getConfidenceLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getExtractionMethodLabel', () => {
    it('returns correct labels', () => {
      expect(getExtractionMethodLabel('huggingface')).toBe('HuggingFace BERT');
      expect(getExtractionMethodLabel('gemini')).toBe('Gemini 1.5 Flash');
    });

    it('returns input for unknown', () => {
      expect(getExtractionMethodLabel('unknown')).toBe('unknown');
    });
  });

  describe('truncateText', () => {
    it('truncates long text', () => {
      expect(truncateText('This is a very long text that should be truncated', 20)).toBe('This is a very long...');
    });

    it('does not truncate short text', () => {
      expect(truncateText('Short text', 20)).toBe('Short text');
    });

    it('handles empty text', () => {
      expect(truncateText('')).toBe('');
      expect(truncateText(null)).toBe('');
    });
  });

  describe('getStatusColor', () => {
    it('returns correct colors', () => {
      expect(getStatusColor('active')).toContain('text-green-600');
      expect(getStatusColor('inactive')).toContain('text-red-600');
      expect(getStatusColor('blocked')).toContain('text-red-600');
      expect(getStatusColor('pending')).toContain('text-yellow-600');
    });

    it('returns default for unknown', () => {
      expect(getStatusColor('UNKNOWN')).toContain('text-gray-600');
    });
  });
});
