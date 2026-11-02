import { mockClient } from 'aws-sdk-client-mock';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { encryptGithubToken, decryptGithubToken } from '../kms';

const kmsMock = mockClient(KMSClient);

beforeEach(() => {
  kmsMock.reset();
  process.env.GITHUB_TOKEN_KMS_KEY_ARN = 'arn:aws:kms:us-east-1:123:key/test';
});

describe('encryptGithubToken', () => {
  it('returns empty string without calling KMS when token is absent', async () => {
    await expect(encryptGithubToken('', 'exec-1')).resolves.toBe('');
    expect(kmsMock.calls()).toHaveLength(0);
  });

  it('encrypts with the execution-scoped context and returns base64', async () => {
    kmsMock.on(EncryptCommand).resolves({ CiphertextBlob: Buffer.from('cipher') });
    const result = await encryptGithubToken('ghp_secret', 'exec-1');
    expect(result).toBe(Buffer.from('cipher').toString('base64'));
    const input = kmsMock.commandCalls(EncryptCommand)[0].args[0].input;
    expect(input.KeyId).toBe('arn:aws:kms:us-east-1:123:key/test');
    expect(input.EncryptionContext).toEqual({ purpose: 'github-token', executionName: 'exec-1' });
  });
});

describe('decryptGithubToken', () => {
  it('returns undefined when ciphertext is absent', async () => {
    await expect(decryptGithubToken('', 'exec-1')).resolves.toBeUndefined();
    expect(kmsMock.calls()).toHaveLength(0);
  });

  it('decrypts with the execution-scoped context', async () => {
    kmsMock.on(DecryptCommand).resolves({ Plaintext: Buffer.from('ghp_secret') });
    const result = await decryptGithubToken(Buffer.from('cipher').toString('base64'), 'exec-1');
    expect(result).toBe('ghp_secret');
    const input = kmsMock.commandCalls(DecryptCommand)[0].args[0].input;
    expect(input.EncryptionContext).toEqual({ purpose: 'github-token', executionName: 'exec-1' });
  });

  it('propagates KMS errors', async () => {
    kmsMock.on(DecryptCommand).rejects(new Error('InvalidCiphertextException'));
    await expect(decryptGithubToken('YQ==', 'other-exec')).rejects.toThrow('InvalidCiphertextException');
  });
});
