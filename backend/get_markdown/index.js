"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const shared_1 = require("@sprint/shared");
const handler = async (event) => {
    const bucketName = (0, shared_1.requireEnv)('RESULTS_BUCKET');
    const queryParams = event.queryStringParameters ?? {};
    shared_1.logger.info('Get markdown request', { key: queryParams.key });
    try {
        const { key } = queryParams;
        if (!key) {
            return (0, shared_1.apiResponse)(400, { error: 'Missing required parameter: key' });
        }
        const markdown = await (0, shared_1.getText)(bucketName, key);
        return (0, shared_1.apiTextResponse)(200, markdown);
    }
    catch (error) {
        shared_1.logger.error('Error fetching markdown', (0, shared_1.toPublicError)(error));
        return (0, shared_1.apiResponse)(500, (0, shared_1.toPublicError)(error));
    }
};
exports.handler = handler;
