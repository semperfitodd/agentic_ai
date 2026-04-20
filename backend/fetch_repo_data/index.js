"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const shared_1 = require("@sprint/shared");
const handler = async (event) => {
    const { owner, repo, since, until, githubToken } = event;
    shared_1.logger.info('Fetching repo data', { owner, repo });
    try {
        const octokit = (0, shared_1.createOctokit)(githubToken);
        const perPage = parseInt(process.env.GITHUB_PER_PAGE ?? '100', 10);
        let readme = '';
        let readmeError = null;
        try {
            const readmeResponse = await octokit.repos.getReadme({ owner, repo });
            readme = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            shared_1.logger.warn(`Could not fetch README for ${owner}/${repo}`, { error: msg });
            readmeError = msg;
        }
        const sinceDate = new Date(since);
        const untilDate = new Date(until);
        const { data: pullRequests } = await octokit.pulls.list({
            owner,
            repo,
            state: 'closed',
            sort: 'updated',
            direction: 'desc',
            per_page: perPage,
        });
        const mergedPRs = pullRequests
            .filter((pr) => {
            if (!pr.merged_at)
                return false;
            const mergedDate = new Date(pr.merged_at);
            return mergedDate >= sinceDate && mergedDate <= untilDate;
        })
            .map((pr) => ({
            number: pr.number,
            title: pr.title,
            html_url: pr.html_url,
            merged_at: pr.merged_at,
            user: pr.user ? { login: pr.user.login } : null,
        }));
        shared_1.logger.info(`Found ${mergedPRs.length} merged PRs`, { owner, repo });
        return (0, shared_1.stepResponse)(200, { owner, repo, readme, readmeError, prs: mergedPRs, prCount: mergedPRs.length });
    }
    catch (error) {
        shared_1.logger.error('Error fetching repo data', { owner, repo, message: error instanceof Error ? error.message : String(error) });
        return (0, shared_1.stepResponse)(500, { error: error instanceof Error ? error.message : 'Failed to fetch repo data', owner, repo });
    }
};
exports.handler = handler;
