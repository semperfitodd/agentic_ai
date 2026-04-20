import { logger } from '../logger';

describe('logger', () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redacts githubToken from meta', () => {
    logger.info('test', { githubToken: 'ghp_secret' });
    const logged = JSON.parse(infoSpy.mock.calls[0][0]);
    expect(logged.meta.githubToken).toBe('[REDACTED]');
  });

  it('redacts x-api-key from meta', () => {
    logger.info('test', { 'x-api-key': 'my-key' });
    const logged = JSON.parse(infoSpy.mock.calls[0][0]);
    expect(logged.meta['x-api-key']).toBe('[REDACTED]');
  });

  it('redacts nested secret fields', () => {
    logger.info('test', { headers: { githubToken: 'ghp_secret', other: 'ok' } });
    const logged = JSON.parse(infoSpy.mock.calls[0][0]);
    expect(logged.meta.headers.githubToken).toBe('[REDACTED]');
    expect(logged.meta.headers.other).toBe('ok');
  });

  it('includes message and timestamp', () => {
    logger.info('hello world');
    const logged = JSON.parse(infoSpy.mock.calls[0][0]);
    expect(logged.message).toBe('hello world');
    expect(logged.level).toBe('info');
    expect(typeof logged.timestamp).toBe('string');
  });

  it('logs warn at warn level', () => {
    logger.warn('warning message');
    const logged = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(logged.level).toBe('warn');
  });

  it('logs error at error level', () => {
    logger.error('error message');
    const logged = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(logged.level).toBe('error');
  });
});
