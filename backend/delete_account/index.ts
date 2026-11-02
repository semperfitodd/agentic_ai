import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import {
  requireEnv,
  logger,
  apiResponse,
  toPublicError,
  requireCognitoUsername,
  JwtAuthorizerContext,
  AppError,
} from '@sprint/shared';

const cognitoClient = new CognitoIdentityProviderClient({});

export const handler = async (event: JwtAuthorizerContext) => {
  try {
    const username = requireCognitoUsername(event);
    await cognitoClient.send(
      new AdminDeleteUserCommand({ UserPoolId: requireEnv('USER_POOL_ID'), Username: username })
    );
    logger.info('Account deleted');
    return apiResponse(200, { deleted: true });
  } catch (error) {
    if (error instanceof AppError) {
      return apiResponse(error.statusCode, toPublicError(error));
    }
    logger.error('Failed to delete account', { message: error instanceof Error ? error.message : 'unknown' });
    return apiResponse(500, toPublicError(error));
  }
};
