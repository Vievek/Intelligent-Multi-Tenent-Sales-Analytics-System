const { preprocessor } = require('../../../src/services/nlp/preprocessor');

describe('Preprocessor', () => {
  test('UT-08: cleans text and handles currency formats', () => {
    const input = 'sold 5 apples for $10';
    const result = preprocessor.clean(input);
    expect(result).toContain('apples');
    expect(result).toContain('5');
    expect(result).toContain('dollars');
  });

  test('normalizes rupee formats', () => {
    const input = 'sold 3 mango 150rs';
    const result = preprocessor.clean(input);
    expect(result).toContain('rupees');
    expect(result).toContain('3');
    expect(result).toContain('150');
  });

  test('normalizes INR formats', () => {
    const input = '5 items 500 rupees';
    const result = preprocessor.clean(input);
    expect(result).toContain('rupees');
  });

  test('tokenizes text correctly', () => {
    const input = 'sold 5 apples for $10';
    const tokens = preprocessor.tokenize(input);
    expect(tokens).toEqual(['sold', '5', 'apples', 'for', '$10']);
  });

  test('removes unit suffixes from quantity', () => {
    const input = '5kg apples';
    const result = preprocessor.clean(input);
    expect(result).toBe('5 apples');
  });

  test('extracts number from text', () => {
    const result = preprocessor.extractNumber('price is 150 rupees');
    expect(result).toBe(150);
  });

  test('handles decimal numbers', () => {
    const result = preprocessor.extractNumber('2.5 kg rice');
    expect(result).toBe(2.5);
  });

  test('removes special characters', () => {
    const input = 'sold 5 @apples!!! for $10';
    const result = preprocessor.clean(input);
    expect(result).not.toContain('@');
    expect(result).not.toContain('!!!');
  });
});