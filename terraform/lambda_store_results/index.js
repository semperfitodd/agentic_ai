"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3Client = new client_s3_1.S3Client({});
const handler = async (event) => {
    console.log('Preparing final response with markdown S3 location');
    try {
        if (!event.body.markdownS3Key || !event.body.s3Bucket) {
            throw new Error('Markdown S3 key and bucket are required');
        }
        console.log(`Markdown report stored at: s3://${event.body.s3Bucket}/${event.body.markdownS3Key}`);
        return {
            statusCode: 200,
            body: {
                sprintName: event.body.sprintName,
                since: event.body.since,
                until: event.body.until,
                totalPRs: event.body.totalPRs,
                s3Location: {
                    bucket: event.body.s3Bucket,
                    markdownKey: event.body.markdownS3Key,
                },
            },
        };
    }
    catch (error) {
        console.error('Error preparing final response:', error);
        return {
            statusCode: 500,
            body: {
                error: error.message,
                sprintName: event.body.sprintName,
                since: event.body.since,
                until: event.body.until,
                totalPRs: event.body.totalPRs,
            },
        };
    }
};
exports.handler = handler;
