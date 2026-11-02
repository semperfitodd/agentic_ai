import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { requireEnv } from './env';

export const kmsClient = new KMSClient({});

const encryptionContext = (executionName: string) => ({ purpose: 'github-token', executionName });

export async function encryptGithubToken(token: string | undefined, executionName: string): Promise<string> {
  if (!token) return '';
  const response = await kmsClient.send(
    new EncryptCommand({
      KeyId: requireEnv('GITHUB_TOKEN_KMS_KEY_ARN'),
      Plaintext: Buffer.from(token, 'utf-8'),
      EncryptionContext: encryptionContext(executionName),
    })
  );
  if (!response.CiphertextBlob) throw new Error('KMS returned no ciphertext');
  return Buffer.from(response.CiphertextBlob).toString('base64');
}

export async function decryptGithubToken(ciphertext: string | undefined, executionName: string): Promise<string | undefined> {
  if (!ciphertext) return undefined;
  const response = await kmsClient.send(
    new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertext, 'base64'),
      EncryptionContext: encryptionContext(executionName),
    })
  );
  if (!response.Plaintext) throw new Error('KMS returned no plaintext');
  return Buffer.from(response.Plaintext).toString('utf-8');
}
