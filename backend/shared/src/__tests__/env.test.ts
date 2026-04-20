import { requireEnv } from '../env';

describe('requireEnv', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('returns the value when the environment variable is set', () => {
    process.env.MY_VAR = 'hello';
    expect(requireEnv('MY_VAR')).toBe('hello');
  });

  it('throws when the environment variable is missing', () => {
    delete process.env.MY_VAR;
    expect(() => requireEnv('MY_VAR')).toThrow('Missing required environment variable: MY_VAR');
  });

  it('throws when the environment variable is an empty string', () => {
    process.env.MY_VAR = '';
    expect(() => requireEnv('MY_VAR')).toThrow('Missing required environment variable: MY_VAR');
  });
});
