"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const shared_1 = require("@sprint/shared");
const secretsManager = new client_secrets_manager_1.SecretsManagerClient({});
async function resolveApiKey(secretName) {
    const response = await secretsManager.send(new client_secrets_manager_1.GetSecretValueCommand({ SecretId: secretName }));
    if (!response.SecretString)
        throw new Error('Secret string is empty');
    const secret = JSON.parse(response.SecretString);
    return secret.API_KEY;
}
const handler = async (event) => {
    try {
        const secretName = (0, shared_1.requireEnv)('API_KEY_SECRET');
        const apiKey = await resolveApiKey(secretName);
        const headers = event.headers ?? {};
        const clientKey = headers['x-api-key'] ?? headers['X-Api-Key'];
        if (clientKey && clientKey.trim() === apiKey.trim()) {
            shared_1.logger.info('Authorization succeeded');
            const user = headers['x-user-email'] ?? headers['X-User-Email'] ?? '';
            return { isAuthorized: true, context: { user } };
        }
        shared_1.logger.info('Authorization failed');
        return { isAuthorized: false };
    }
    catch (error) {
        shared_1.logger.error('Authorizer error', { message: error instanceof Error ? error.message : 'unknown' });
        return { isAuthorized: false };
    }
};
exports.handler = handler;
