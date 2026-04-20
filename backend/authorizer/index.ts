import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { requireEnv, logger } from '@sprint/shared';

interface AuthorizerEvent {
  headers?: Record<string, string>;
}

interface AuthorizerResponse {
  isAuthorized: boolean;
  context?: { user?: string };
}

const secretsManager = new SecretsManagerClient({});

async function resolveApiKey(secretName: string): Promise<string> {
  const response = await secretsManager.send(new GetSecretValueCommand({ SecretId: secretName }));
  if (!response.SecretString) throw new Error('Secret string is empty');
  const secret = JSON.parse(response.SecretString);
  return secret.API_KEY;
}

export const handler = async (event: AuthorizerEvent): Promise<AuthorizerResponse> => {
  try {
    const secretName = requireEnv('API_KEY_SECRET');
    const apiKey = await resolveApiKey(secretName);
    const headers = event.headers ?? {};
    const clientKey = headers['x-api-key'] ?? headers['X-Api-Key'];

    if (clientKey && clientKey.trim() === apiKey.trim()) {
      logger.info('Authorization succeeded');
      const user = headers['x-user-email'] ?? headers['X-User-Email'] ?? '';
      return { isAuthorized: true, context: { user } };
    }

    logger.info('Authorization failed');
    return { isAuthorized: false };
  } catch (error) {
    logger.error('Authorizer error', { message: error instanceof Error ? error.message : 'unknown' });
    return { isAuthorized: false };
  }
};
