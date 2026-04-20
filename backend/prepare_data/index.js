"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const shared_1 = require("@sprint/shared");
const handler = async (event) => {
    shared_1.logger.info('Preparing data structure for analysis');
    const bucketName = (0, shared_1.requireEnv)('RESULTS_BUCKET');
    const { since, until, sprintName, repos, repoDataResults } = event;
    const repoReadmeMap = {};
    for (const result of repoDataResults) {
        if (result.statusCode === 200 && result.body.readme) {
            repoReadmeMap[`${result.body.owner}/${result.body.repo}`] = result.body.readme;
        }
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const readmeS3Key = `readmes/${timestamp}.json`;
    await (0, shared_1.putJson)(bucketName, readmeS3Key, repoReadmeMap);
    shared_1.logger.info(`Stored README map to S3`, { key: readmeS3Key });
    const prDetailsInputs = [];
    for (const result of repoDataResults) {
        if (result.statusCode === 200 && result.body.prs) {
            for (const pr of result.body.prs) {
                prDetailsInputs.push({ owner: result.body.owner, repo: result.body.repo, prNumber: pr.number });
            }
        }
    }
    shared_1.logger.info(`Prepared ${prDetailsInputs.length} PRs for processing`);
    return (0, shared_1.stepResponse)(200, {
        since,
        until,
        sprintName,
        repos,
        readmeS3Key,
        s3Bucket: bucketName,
        prDetailsInputs,
        totalPRs: prDetailsInputs.length,
    });
};
exports.handler = handler;
