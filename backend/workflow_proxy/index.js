"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sfn_1 = require("@aws-sdk/client-sfn");
const shared_1 = require("@sprint/shared");
const sfnClient = new client_sfn_1.SFNClient({});
const handler = async (event) => {
    try {
        const stateMachineArn = (0, shared_1.requireEnv)('STATE_MACHINE_ARN');
        const input = typeof event.body === 'string' ? event.body : JSON.stringify(event.body ?? {});
        const executionName = `execution-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const response = await sfnClient.send(new client_sfn_1.StartExecutionCommand({ stateMachineArn, input, name: executionName }));
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
