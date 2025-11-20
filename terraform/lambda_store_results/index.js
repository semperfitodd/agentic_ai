"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3Client = new client_s3_1.S3Client({ region: process.env.AWS_REGION });
const handler = async (event) => {
    console.log('Storing results to S3');
    const bucketName = process.env.RESULTS_BUCKET;
    if (!bucketName) {
        throw new Error('RESULTS_BUCKET environment variable is not set');
    }
    try {
        // Generate a unique key for this report
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const sprintName = event.body.sprintName || 'unnamed-sprint';
        const sanitizedName = sprintName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
        const key = `reports/${sanitizedName}/${timestamp}.json`;
        // Store the full report
        await s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: JSON.stringify(event.body, null, 2),
            ContentType: 'application/json',
            Metadata: {
                sprintName: sprintName,
                since: event.body.since,
                until: event.body.until,
                totalPRs: event.body.totalPRs.toString(),
            },
        }));
        // Also store the markdown report separately
        const markdownKey = `reports/${sanitizedName}/${timestamp}.md`;
        await s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: markdownKey,
            Body: event.body.report,
            ContentType: 'text/markdown',
            Metadata: {
                sprintName: sprintName,
                since: event.body.since,
                until: event.body.until,
                totalPRs: event.body.totalPRs.toString(),
            },
        }));
        console.log(`Results stored to S3: ${key} and ${markdownKey}`);
        return {
            statusCode: 200,
            body: {
                ...event.body,
                s3Location: {
                    bucket: bucketName,
                    jsonKey: key,
                    markdownKey: markdownKey,
                },
            },
        };
    }
    catch (error) {
        console.error('Error storing results to S3:', error);
        // Don't fail the workflow if S3 storage fails
        return {
            statusCode: 200,
            body: {
                ...event.body,
                s3Error: error.message,
            },
        };
    }
};
exports.handler = handler;
