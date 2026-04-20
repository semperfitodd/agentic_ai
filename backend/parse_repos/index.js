"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const shared_1 = require("@sprint/shared");
function parseGitHubRepo(input) {
    if (typeof input === 'object' && input.owner && input.repo) {
        return { owner: input.owner, repo: input.repo };
    }
    let urlString;
    if (typeof input === 'string') {
        urlString = input;
    }
    else if (input.url) {
        urlString = input.url;
    }
    else {
        throw new Error('Invalid repository input: must provide url or owner/repo');
    }
    urlString = urlString.replace(/\.git$/, '');
    let match;
    match = urlString.match(/https?:\/\/github\.com\/([^/]+)\/([^/?#]+)/);
    if (match)
        return { owner: match[1], repo: match[2] };
    match = urlString.match(/git@github\.com:([^/]+)\/(.+)/);
    if (match)
        return { owner: match[1], repo: match[2] };
    match = urlString.match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (match)
        return { owner: match[1], repo: match[2] };
    match = urlString.match(/^([^/]+)\/([^/]+)$/);
    if (match)
        return { owner: match[1], repo: match[2] };
    throw new Error(`Unable to parse GitHub repository from: ${urlString}`);
}
const handler = async (event) => {
    shared_1.logger.info('Parsing repository inputs', { count: event.repos?.length });
    try {
        const parsed = [];
        const errors = [];
        for (let i = 0; i < event.repos.length; i++) {
            try {
                const repo = parseGitHubRepo(event.repos[i]);
                parsed.push(repo);
                shared_1.logger.info(`Parsed repo ${i + 1}`, { owner: repo.owner, repo: repo.repo });
            }
            catch (err) {
                const msg = `Failed to parse repo at index ${i}: ${err instanceof Error ? err.message : String(err)}`;
                shared_1.logger.warn(msg);
                errors.push(msg);
            }
        }
        if (parsed.length === 0) {
            throw new Error('No valid repositories could be parsed. Errors: ' + errors.join('; '));
        }
        shared_1.logger.info(`Successfully parsed ${parsed.length} repositories`);
        return (0, shared_1.stepResponse)(200, {
            repos: parsed,
            since: event.since,
            until: event.until,
            githubToken: event.githubToken,
            sprintName: event.sprintName,
            parseErrors: errors.length > 0 ? errors : undefined,
        });
    }
    catch (error) {
        shared_1.logger.error('Error parsing repositories', { message: error instanceof Error ? error.message : String(error) });
        return (0, shared_1.stepResponse)(500, { error: error instanceof Error ? error.message : 'Failed to parse repositories' });
    }
};
exports.handler = handler;
