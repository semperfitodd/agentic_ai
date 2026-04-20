"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const shared_1 = require("@sprint/shared");
function summarizeComments(comments) {
    const limit = parseInt(process.env.MAX_COMMENTS_PER_PR ?? '15', 10);
    const patchLength = parseInt(process.env.PATCH_PREVIEW_LENGTH ?? '300', 10);
    void patchLength;
    if (comments.length <= limit) {
        return comments.map((c) => ({
            user: c.user?.login ?? 'unknown',
            body: c.body ?? '',
            created_at: c.created_at ?? '',
            path: c.path,
        }));
    }
    const sorted = [...comments].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
    });
    const recent = sorted.slice(0, Math.floor(limit * 0.7));
    const substantial = sorted.filter((c) => c.body && c.body.length > 100).slice(0, Math.floor(limit * 0.3));
    const unique = Array.from(new Map([...recent, ...substantial].map((c) => [c.id ?? c.body, c])).values());
    return unique.slice(0, limit).map((c) => ({
        user: c.user?.login ?? 'unknown',
        body: c.body ?? '',
        created_at: c.created_at ?? '',
        path: c.path,
    }));
}
function prioritizeFiles(files) {
    const limit = parseInt(process.env.MAX_FILES_PER_PR ?? '25', 10);
    const patchLength = parseInt(process.env.PATCH_PREVIEW_LENGTH ?? '300', 10);
    const toFile = (f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch ? f.patch.substring(0, patchLength) : undefined,
    });
    if (files.length <= limit)
        return files.map(toFile);
    const sorted = [...files].sort((a, b) => b.changes - a.changes);
    const top = sorted.slice(0, Math.floor(limit * 0.6));
    const tests = sorted.filter((f) => f.filename.includes('test') || f.filename.includes('spec')).slice(0, Math.floor(limit * 0.2));
    const configs = sorted.filter((f) => /config|\.md$|\.ya?ml$/.test(f.filename)).slice(0, Math.floor(limit * 0.2));
    const unique = Array.from(new Map([...top, ...tests, ...configs].map((f) => [f.filename, f])).values());
    return unique.slice(0, limit).map(toFile);
}
function calculateDiscussionIntensity(commentCount, reviewCount) {
    const total = commentCount + reviewCount;
    if (total > parseInt(process.env.DISCUSSION_HIGH_THRESHOLD ?? '20', 10))
        return 'high';
    if (total > parseInt(process.env.DISCUSSION_MEDIUM_THRESHOLD ?? '5', 10))
        return 'medium';
    return 'low';
}
const handler = async (event) => {
    const { owner, repo, prNumber, githubToken } = event;
    shared_1.logger.info('Fetching PR details', { owner, repo, prNumber });
    try {
        const bucketName = (0, shared_1.requireEnv)('RESULTS_BUCKET');
        const octokit = (0, shared_1.createOctokit)(githubToken);
        const perPage = parseInt(process.env.GITHUB_PER_PAGE ?? '100', 10);
        const [{ data: pr }, { data: issueComments }, { data: reviewComments }, { data: reviews }, { data: files }] = await Promise.all([
            octokit.pulls.get({ owner, repo, pull_number: prNumber }),
            octokit.issues.listComments({ owner, repo, issue_number: prNumber, per_page: perPage }),
            octokit.pulls.listReviewComments({ owner, repo, pull_number: prNumber, per_page: perPage }),
            octokit.pulls.listReviews({ owner, repo, pull_number: prNumber, per_page: perPage }),
            octokit.pulls.listFiles({ owner, repo, pull_number: prNumber, per_page: perPage }),
        ]);
        const participants = new Set();
        issueComments.forEach((c) => c.user && participants.add(c.user.login));
        reviewComments.forEach((c) => c.user && participants.add(c.user.login));
        reviews.forEach((r) => r.user && participants.add(r.user.login));
        const relevantReviews = reviews
            .filter((r) => ['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED'].includes(r.state))
            .sort((a, b) => {
            const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
            const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
            return dateB - dateA;
        })
            .slice(0, parseInt(process.env.MAX_REVIEWS_PER_PR ?? '15', 10))
            .map((r) => ({
            user: r.user?.login ?? 'unknown',
            state: r.state,
            body: r.body ?? '',
            submitted_at: r.submitted_at ?? '',
        }));
        const topFiles = [...files]
            .sort((a, b) => b.changes - a.changes)
            .slice(0, 10)
            .map((f) => ({ filename: f.filename, changes: f.changes }));
        const summary = {
            owner,
            repo,
            pr: {
                number: pr.number,
                title: pr.title,
                body: pr.body ?? '',
                state: pr.state,
                merged_at: pr.merged_at,
                created_at: pr.created_at,
                updated_at: pr.updated_at,
                user: pr.user ? { login: pr.user.login } : null,
                labels: pr.labels.map((l) => l.name),
                html_url: pr.html_url,
                additions: pr.additions,
                deletions: pr.deletions,
                changed_files: pr.changed_files,
            },
            comments: {
                issueComments: summarizeComments(issueComments),
                reviewComments: summarizeComments(reviewComments),
            },
            reviews: relevantReviews,
            files: prioritizeFiles(files),
            statistics: {
                totalComments: issueComments.length + reviewComments.length,
                totalReviews: reviews.length,
                totalFiles: files.length,
                topFilesByChanges: topFiles,
                participantCount: participants.size,
                discussionIntensity: calculateDiscussionIntensity(issueComments.length, reviews.length),
            },
        };
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const s3Key = `pr-details/${owner}/${repo}/${prNumber}/${timestamp}.json`;
        await (0, shared_1.putJson)(bucketName, s3Key, summary);
        shared_1.logger.info(`Stored PR details to S3`, { owner, repo, prNumber, key: s3Key, bytes: Buffer.byteLength(JSON.stringify(summary)) });
        return (0, shared_1.stepResponse)(200, { owner, repo, prNumber });
    }
    catch (error) {
        shared_1.logger.error('Error fetching PR details', { owner, repo, prNumber, message: error instanceof Error ? error.message : String(error) });
        return (0, shared_1.stepResponse)(500, { error: error instanceof Error ? error.message : 'Failed to fetch PR details', owner, repo, prNumber });
    }
};
exports.handler = handler;
