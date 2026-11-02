import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { requireEnv, logger, apiResponse, toPublicError } from '@sprint/shared';

const cognitoClient = new CognitoIdentityProviderClient({});

interface DeleteAccountEvent {
  requestContext?: {
    authorizer?: {
      jwt?: { claims?: Record<string, string> };
    };
  };
}

export const handler = async (event: DeleteAccountEvent) => {
  const username = event.requestContext?.authorizer?.jwt?.claims?.username;
  if (!username) return apiResponse(401, { error: 'Missing authenticated user' });

  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({ UserPoolId: requireEnv('USER_POOL_ID'), Username: username })
    );
    logger.info('Account deleted');
    return apiResponse(200, { deleted: true });
  } catch (error) {
    logger.error('Failed to delete account', { message: error instanceof Error ? error.message : 'unknown' });
    return apiResponse(500, toPublicError(error));
  }
};
