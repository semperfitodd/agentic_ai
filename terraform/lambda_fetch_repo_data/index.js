"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const rest_1 = require("@octokit/rest");
const handler = async (event) => {
    console.log('Fetching repo data:', JSON.stringify(event, null, 2));
    const { owner, repo, since, until, githubToken } = event;
    try {
        const octokit = new rest_1.Octokit({
            auth: githubToken,
        });
        let readme = '';
        let readmeError = null;
        try {
            const readmeResponse = await octokit.repos.getReadme({
                owner,
                repo,
            });
            readme = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');
        }
        catch (error) {
            console.warn(`Could not fetch README for ${owner}/${repo}:`, error.message);
            readmeError = error.message;
        }
        const sinceDate = new Date(since);
        const untilDate = new Date(until);
        const perPage = parseInt(process.env.GITHUB_PER_PAGE || '100', 10);
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
        console.log(`Found ${mergedPRs.length} merged PRs for ${owner}/${repo}`);
        return {
            statusCode: 200,
            body: {
                owner,
                repo,
                readme,
                readmeError,
                prs: mergedPRs,
                prCount: mergedPRs.length,
            },
        };
    }
    catch (error) {
        console.error('Error fetching repo data:', error);
        return {
            statusCode: 500,
            body: {
                error: error.message || 'Failed to fetch repo data',
                owner,
                repo,
            },
        };
    }
};
exports.handler = handler;
