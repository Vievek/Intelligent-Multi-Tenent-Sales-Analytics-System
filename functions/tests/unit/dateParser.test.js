const { dateParser } = require('../../../src/utils/dateParser');

describe('DateParser', () => {
  test('extracts today date from message', () => {
    const result = dateParser.extractDate('sold 5 apples today', 1234567890);
    const now = new Date();
    expect(result.getDate()).toBe(now.getDate());
    expect(result.getMonth()).toBe(now.getMonth());
    expect(result.getFullYear()).toBe(now.getFullYear());
  });

  test('extracts yesterday date from message', () => {
    const result = dateParser.extractDate('sold 5 apples yesterday', 1234567890);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(result.getDate()).toBe(yesterday.getDate());
    expect(result.getMonth()).toBe(yesterday.getMonth());
    expect(result.getFullYear()).toBe(yesterday.getFullYear());
  });

  test('extracts date from DD/MM/YYYY format', () => {
    const result = dateParser.extractDate('sold 5 apples on 15/12/2024', 1234567890);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(11);
    expect(result.getFullYear()).toBe(2024);
  });

  test('extracts date from YYYY-MM-DD format', () => {
    const result = dateParser.extractDate('sold 5 apples on 2024-12-15', 1234567890);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(11);
    expect(result.getFullYear()).toBe(2024);
  });

  test('extracts date from DD Mon YYYY format', () => {
    const result = dateParser.extractDate('sold 5 apples on 15 Dec 2024', 1234567890);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(11);
    expect(result.getFullYear()).toBe(2024);
  });

  test('extracts date from Mon DD, YYYY format', () => {
    const result = dateParser.extractDate('sold 5 apples on Dec 15, 2024', 1234567890);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(11);
    expect(result.getFullYear()).toBe(2024);
  });

  test('extracts date from Mon DD format without year', () => {
    const result = dateParser.extractDate('sold 5 apples on Dec 15', 1234567890);
    const expectedYear = new Date().getFullYear();
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(11);
    expect(result.getFullYear()).toBe(expectedYear);
  });

  test('uses fallback timestamp when no date found', () => {
    const result = dateParser.extractDate('sold 5 apples for $10', 1734567890);
    const expected = new Date(1734567890 * 1000);
    expect(result.getTime()).toBe(expected.getTime());
  });

  test('uses current date when no date and no timestamp', () => {
    const result = dateParser.extractDate('sold 5 apples for $10', null);
    const now = new Date();
    expect(result.getDate()).toBe(now.getDate());
    expect(result.getMonth()).toBe(now.getMonth());
    expect(result.getFullYear()).toBe(now.getFullYear());
  });

  test('parses date string correctly', () => {
    const result = dateParser.parseDateString('2024-12-15');
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(11);
    expect(result.getFullYear()).toBe(2024);
  });

  test('returns null for invalid date string', () => {
    const result = dateParser.parseDateString('invalid-date');
    expect(result).toBeNull();
  });

  test('formats date correctly', () => {
    const date = new Date(2024, 11, 15);
    const result = dateParser.formatDate(date, 'yyyy-MM-dd');
    expect(result).toBe('2024-12-15');
  });

  test('handles different date formats', () => {
    const formats = ['2024-12-15', '15/12/2024', '12/15/2024', '15-12-2024'];
    for (const format of formats) {
      const result = dateParser.parseDateString(format);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.getFullYear()).toBe(2024);
      }
    }
  });
});