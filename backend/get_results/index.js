"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sfn_1 = require("@aws-sdk/client-sfn");
const shared_1 = require("@sprint/shared");
const sfnClient = new client_sfn_1.SFNClient({});
const handler = async (event) => {
    const bucketName = (0, shared_1.requireEnv)('RESULTS_BUCKET');
    const queryParams = event.queryStringParameters ?? {};
    shared_1.logger.info('Get results request', { query: Object.keys(queryParams) });
    try {
        if (queryParams.executionArn) {
            const execution = await sfnClient.send(new client_sfn_1.DescribeExecutionCommand({ executionArn: queryParams.executionArn }));
            const response = {
                executionArn: execution.executionArn,
                status: execution.status,
                startDate: execution.startDate?.toISOString(),
                stopDate: execution.stopDate?.toISOString(),
            };
            if (execution.status === 'SUCCEEDED' && execution.output) {
                try {
                    response.output = JSON.parse(execution.output);
                }
                catch {
                    response.rawOutput = execution.output;
                }
            }
            else if (execution.status === 'FAILED') {
                response.error = execution.error;
                response.cause = execution.cause;
            }
            return (0, shared_1.apiResponse)(200, response);
        }
        if (queryParams.list) {
            const maxKeys = parseInt(process.env.MAX_REPORTS_LIST ?? '50', 10);
            const apiUrl = (0, shared_1.requireEnv)('API_URL');
            const objects = await (0, shared_1.listObjects)(bucketName, 'reports/', maxKeys);
            const reports = objects
                .filter((obj) => obj.key?.endsWith('.md'))
                .sort((a, b) => (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0))
                .map((obj) => ({
                key: obj.key,
                size: obj.size,
                lastModified: obj.lastModified?.toISOString(),
                url: `${apiUrl}/results?key=${encodeURIComponent(obj.key ?? '')}`,
            }));
            return (0, shared_1.apiResponse)(200, { reports, count: reports.length });
        }
        if (queryParams.key) {
            const body = await (0, shared_1.getText)(bucketName, queryParams.key);
            return (0, shared_1.apiResponse)(200, JSON.parse(body || '{}'));
        }
        return (0, shared_1.apiResponse)(400, {
            error: 'Missing required parameter',
            usage: {
                byExecution: '?executionArn=arn:aws:states:...',
                listRecent: '?list=true',
                byKey: '?key=reports/sprint-name/timestamp.md',
            },
        });
    }
    catch (error) {
        shared_1.logger.error('Error retrieving results', (0, shared_1.toPublicError)(error));
        return (0, shared_1.apiResponse)(500, (0, shared_1.toPublicError)(error));
    }
};
exports.handler = handler;
