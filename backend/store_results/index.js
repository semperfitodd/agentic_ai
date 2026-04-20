"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const shared_1 = require("@sprint/shared");
const handler = async (event) => {
    shared_1.logger.info('Preparing final response with markdown S3 location');
    try {
        if (!event.body.markdownS3Key || !event.body.s3Bucket) {
            throw new Error('Markdown S3 key and bucket are required');
        }
        shared_1.logger.info('Markdown report location', { bucket: event.body.s3Bucket, key: event.body.markdownS3Key });
        return (0, shared_1.stepResponse)(200, {
            sprintName: event.body.sprintName,
            since: event.body.since,
            until: event.body.until,
            totalPRs: event.body.totalPRs,
            s3Location: {
                bucket: event.body.s3Bucket,
                markdownKey: event.body.markdownS3Key,
            },
        });
    }
    catch (error) {
        shared_1.logger.error('Error preparing final response', (0, shared_1.toPublicError)(error));
        return (0, shared_1.stepResponse)(500, {
            ...(0, shared_1.toPublicError)(error),
            sprintName: event.body.sprintName,
            since: event.body.since,
            until: event.body.until,
            totalPRs: event.body.totalPRs,
        });
    }
};
exports.handler = handler;
