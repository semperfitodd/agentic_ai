"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sfn_1 = require("@aws-sdk/client-sfn");
const shared_1 = require("@sprint/shared");
const sfnClient = new client_sfn_1.SFNClient({});
function parseBody(body) {
    if (body === undefined || body === null)
        return {};
    if (typeof body !== 'string')
        return body;
    try {
        const parsed = JSON.parse(body);
        return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
const handler = async (event) => {
    try {
        const stateMachineArn = (0, shared_1.requireEnv)('STATE_MACHINE_ARN');
        const body = parseBody(event.body);
        if (!body)
            return (0, shared_1.apiResponse)(400, { error: 'Request body must be a JSON object' });
        const { githubToken, ...rest } = body;
        const executionName = `execution-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const encryptedGithubToken = await (0, shared_1.encryptGithubToken)(typeof githubToken === 'string' ? githubToken : undefined, executionName);
        const response = await sfnClient.send(new client_sfn_1.StartExecutionCommand({
            stateMachineArn,
            input: JSON.stringify({ ...rest, encryptedGithubToken }),
            name: executionName,
        }));
        shared_1.logger.info('Execution started', { executionArn: response.executionArn });
        return (0, shared_1.apiResponse)(202, {
            message: 'Sprint analysis started',
            executionArn: response.executionArn,
            executionName,
            startDate: response.startDate?.toISOString(),
            status: 'RUNNING',
        });
    }
    catch (error) {
        shared_1.logger.error('Failed to start execution', { message: error instanceof Error ? error.message : 'unknown' });
        return (0, shared_1.apiResponse)(500, (0, shared_1.toPublicError)(error));
    }
};
exports.handler = handler;
