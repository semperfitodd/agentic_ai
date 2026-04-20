import { mockClient } from 'aws-sdk-client-mock';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const smMock = mockClient(SecretsManagerClient);

beforeEach(() => {
  smMock.reset();
  process.env.API_KEY_SECRET = 'test-secret';
});

describe('lambda_authorizer handler', () => {
  it('returns isAuthorized: true for matching key', async () => {
    smMock.on(GetSecretValueCommand).resolves({
      SecretString: JSON.stringify({ API_KEY: 'valid-key-123' }),
    });
    const { handler } = await import('../index');
    const result = await handler({ headers: { 'x-api-key': 'valid-key-123' } });
    expect(result.isAuthorized).toBe(true);
  });

  it('returns isAuthorized: false for wrong key', async () => {
    smMock.on(GetSecretValueCommand).resolves({
      SecretString: JSON.stringify({ API_KEY: 'valid-key-123' }),
    });
    const { handler } = await import('../index');
    const result = await handler({ headers: { 'x-api-key': 'wrong-key' } });
    expect(result.isAuthorized).toBe(false);
  });

  it('returns isAuthorized: false when no x-api-key header', async () => {
    smMock.on(GetSecretValueCommand).resolves({
      SecretString: JSON.stringify({ API_KEY: 'valid-key-123' }),
    });
    const { handler } = await import('../index');
    const result = await handler({ headers: {} });
    expect(result.isAuthorized).toBe(false);
  });

  it('returns isAuthorized: false when secret fetch fails', async () => {
    smMock.on(GetSecretValueCommand).rejects(new Error('Secrets Manager error'));
    const { handler } = await import('../index');
    const result = await handler({ headers: { 'x-api-key': 'any-key' } });
    expect(result.isAuthorized).toBe(false);
  });

  it('captures x-user-email in context on success', async () => {
    smMock.on(GetSecretValueCommand).resolves({
      SecretString: JSON.stringify({ API_KEY: 'valid-key' }),
    });
    const { handler } = await import('../index');
    const result = await handler({
      headers: { 'x-api-key': 'valid-key', 'x-user-email': 'user@example.com' },
    });
    expect(result.isAuthorized).toBe(true);
    expect(result.context?.user).toBe('user@example.com');
  });
});
