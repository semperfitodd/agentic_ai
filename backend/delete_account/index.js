"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const shared_1 = require("@sprint/shared");
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({});
const handler = async (event) => {
    const username = event.requestContext?.authorizer?.jwt?.claims?.username;
    if (!username)
        return (0, shared_1.apiResponse)(401, { error: 'Missing authenticated user' });
    try {
        await cognitoClient.send(new client_cognito_identity_provider_1.AdminDeleteUserCommand({ UserPoolId: (0, shared_1.requireEnv)('USER_POOL_ID'), Username: username }));
        shared_1.logger.info('Account deleted');
        return (0, shared_1.apiResponse)(200, { deleted: true });
    }
    catch (error) {
        shared_1.logger.error('Failed to delete account', { message: error instanceof Error ? error.message : 'unknown' });
        return (0, shared_1.apiResponse)(500, (0, shared_1.toPublicError)(error));
    }
};
exports.handler = handler;
