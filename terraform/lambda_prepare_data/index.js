"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event) => {
    console.log('Preparing data structure for analysis');
    const { since, until, githubToken, sprintName, repos, repoDataResults } = event;
    // Create a map of repo -> readme for easy lookup
    const repoReadmeMap = {};
    repoDataResults.forEach(result => {
        if (result.statusCode === 200) {
            const key = `${result.body.owner}/${result.body.repo}`;
            repoReadmeMap[key] = result.body.readme || '';
        }
    });
    // Flatten all PRs with their repo info and readme
    const prDetailsInputs = [];
    repoDataResults.forEach(result => {
        if (result.statusCode === 200 && result.body.prs) {
            result.body.prs.forEach(pr => {
                prDetailsInputs.push({
                    owner: result.body.owner,
                    repo: result.body.repo,
                    prNumber: pr.number,
                    readme: repoReadmeMap[`${result.body.owner}/${result.body.repo}`] || '',
                    githubToken,
                });
            });
        }
    });
    console.log(`Prepared ${prDetailsInputs.length} PRs for processing`);
    return {
        statusCode: 200,
        body: {
            since,
            until,
            sprintName,
            repos,
            githubToken,
            repoReadmeMap,
            prDetailsInputs,
            totalPRs: prDetailsInputs.length,
        },
    };
};
exports.handler = handler;
