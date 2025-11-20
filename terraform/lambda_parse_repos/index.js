"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
/**
 * Parse various GitHub repository URL formats into owner/repo
 * Supports:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 * - github.com/owner/repo
 * - owner/repo
 * - {owner: "owner", repo: "repo"}
 */
function parseGitHubRepo(input) {
    // If it's already an object with owner and repo, return it
    if (typeof input === 'object' && input.owner && input.repo) {
        return {
            owner: input.owner,
            repo: input.repo,
        };
    }
    // Get the URL string
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
    // Remove trailing .git if present
    urlString = urlString.replace(/\.git$/, '');
    // Try different patterns
    let match;
    // Pattern 1: https://github.com/owner/repo
    match = urlString.match(/https?:\/\/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (match) {
        return { owner: match[1], repo: match[2] };
    }
    // Pattern 2: git@github.com:owner/repo
    match = urlString.match(/git@github\.com:([^\/]+)\/(.+)/);
    if (match) {
        return { owner: match[1], repo: match[2] };
    }
    // Pattern 3: github.com/owner/repo
    match = urlString.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (match) {
        return { owner: match[1], repo: match[2] };
    }
    // Pattern 4: owner/repo
    match = urlString.match(/^([^\/]+)\/([^\/]+)$/);
    if (match) {
        return { owner: match[1], repo: match[2] };
    }
    throw new Error(`Unable to parse GitHub repository from: ${urlString}`);
}
const handler = async (event) => {
    console.log('Parsing repository inputs');
    try {
        const parsedRepos = [];
        const errors = [];
        for (let i = 0; i < event.repos.length; i++) {
            try {
                const parsed = parseGitHubRepo(event.repos[i]);
                parsedRepos.push(parsed);
                console.log(`Parsed repo ${i + 1}: ${parsed.owner}/${parsed.repo}`);
            }
            catch (error) {
                const errorMsg = `Failed to parse repo at index ${i}: ${error.message}`;
                console.error(errorMsg);
                errors.push(errorMsg);
            }
        }
        if (parsedRepos.length === 0) {
            throw new Error('No valid repositories could be parsed. Errors: ' + errors.join('; '));
        }
        console.log(`Successfully parsed ${parsedRepos.length} repositories`);
        return {
            statusCode: 200,
            body: {
                repos: parsedRepos,
                since: event.since,
                until: event.until,
                githubToken: event.githubToken,
                sprintName: event.sprintName,
                parseErrors: errors.length > 0 ? errors : undefined,
            },
        };
    }
    catch (error) {
        console.error('Error parsing repositories:', error);
        return {
            statusCode: 500,
            body: {
                error: error.message || 'Failed to parse repositories',
            },
        };
    }
};
exports.handler = handler;
