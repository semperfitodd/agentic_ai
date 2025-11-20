"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sfn_1 = require("@aws-sdk/client-sfn");
const sfnClient = new client_sfn_1.SFNClient({});
const handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    try {
        const stateMachineArn = process.env.STATE_MACHINE_ARN;
        if (!stateMachineArn) {
            throw new Error('STATE_MACHINE_ARN environment variable is not set');
        }
        // Parse the body if it's a string
        const input = typeof event.body === 'string' ? event.body : JSON.stringify(event.body || {});
        // Generate unique execution name
        const executionName = `execution-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const command = new client_sfn_1.StartExecutionCommand({
            stateMachineArn,
            input,
            name: executionName,
        });
        const response = await sfnClient.send(command);
        // Return immediately with execution details
        return {
            statusCode: 202,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'Sprint analysis started',
                executionArn: response.executionArn,
                executionName: executionName,
                startDate: response.startDate?.toISOString(),
                status: 'RUNNING',
                statusUrl: process.env.CONSOLE_URL,
                note: 'This is an asynchronous operation. The analysis may take several minutes to complete. Check CloudWatch Logs or Step Functions console for results.',
            }),
        };
    }
    catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Error executing workflow',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
exports.handler = handler;
