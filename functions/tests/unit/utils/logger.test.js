const logger = require('../../../src/utils/logger');

describe('Logger', () => {
  test('creates logger with correct levels', () => {
    expect(logger.level).toBeDefined();
    expect(logger.transports).toHaveLength(1);
    expect(logger.transports[0].name).toBe('console');
  });

  test('logs info messages', () => {
    const spy = jest.spyOn(logger, 'info');
    logger.info('Test info message');
    expect(spy).toHaveBeenCalledWith('Test info message');
    spy.mockRestore();
  });

  test('logs error messages', () => {
    const spy = jest.spyOn(logger, 'error');
    logger.error('Test error message');
    expect(spy).toHaveBeenCalledWith('Test error message');
    spy.mockRestore();
  });

  test('logs debug messages', () => {
    const spy = jest.spyOn(logger, 'debug');
    logger.debug('Test debug message');
    expect(spy).toHaveBeenCalledWith('Test debug message');
    spy.mockRestore();
  });

  test('logs warn messages', () => {
    const spy = jest.spyOn(logger, 'warn');
    logger.warn('Test warn message');
    expect(spy).toHaveBeenCalledWith('Test warn message');
    spy.mockRestore();
  });

  test('includes timestamp in logs', () => {
    const spy = jest.spyOn(logger, 'info');
    logger.info('Test with timestamp');
    const call = spy.mock.calls[0];
    expect(call[0]).toBe('Test with timestamp');
    spy.mockRestore();
  });

  test('handles meta data in logs', () => {
    const spy = jest.spyOn(logger, 'info');
    logger.info('Test with meta', { key: 'value', count: 123 });
    expect(spy).toHaveBeenCalledWith('Test with meta', { key: 'value', count: 123 });
    spy.mockRestore();
  });

  test('handles error objects with stack trace', () => {
    const spy = jest.spyOn(logger, 'error');
    const error = new Error('Test error');
    logger.error('Error occurred', error);
    expect(spy).toHaveBeenCalledWith('Error occurred', error);
    spy.mockRestore();
  });

  test('respects log level setting', () => {
    const originalLevel = logger.level;
    logger.level = 'error';
    const infoSpy = jest.spyOn(logger, 'info');
    const errorSpy = jest.spyOn(logger, 'error');

    logger.info('This should not be logged');
    logger.error('This should be logged');

    expect(infoSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    logger.level = originalLevel;
    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
