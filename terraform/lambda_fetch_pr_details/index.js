"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const rest_1 = require("@octokit/rest");
/**
 * Intelligently summarize comments - keep most recent and most relevant
 */
function summarizeComments(comments, maxComments = 15) {
    if (comments.length <= maxComments) {
        return comments.map(c => ({
            user: c.user?.login || 'unknown',
            body: c.body || '',
            created_at: c.created_at,
            path: c.path,
        }));
    }
    // Sort by date (most recent first)
    const sorted = [...comments].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
    });
    // Take mix of recent comments and longer/substantial ones
    const recentComments = sorted.slice(0, Math.floor(maxComments * 0.7));
    const substantialComments = sorted
        .filter(c => c.body && c.body.length > 100)
        .slice(0, Math.floor(maxComments * 0.3));
    // Combine and deduplicate
    const combined = [...recentComments, ...substantialComments];
    const unique = Array.from(new Map(combined.map(c => [c.id, c])).values());
    return unique.slice(0, maxComments).map(c => ({
        user: c.user?.login || 'unknown',
        body: c.body || '',
        created_at: c.created_at,
        path: c.path,
    }));
}
/**
 * Prioritize files by changes and relevance
 */
function prioritizeFiles(files, maxFiles = 25) {
    if (files.length <= maxFiles) {
        return files.map(f => ({
            filename: f.filename,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
            changes: f.changes,
            patch: f.patch ? f.patch.substring(0, 300) : undefined,
        }));
    }
    // Sort by total changes (most impactful files first)
    const sorted = [...files].sort((a, b) => b.changes - a.changes);
    // Take top changed files
    const topFiles = sorted.slice(0, Math.floor(maxFiles * 0.6));
    // Add some test files if present
    const testFiles = sorted
        .filter(f => f.filename.includes('test') || f.filename.includes('spec'))
        .slice(0, Math.floor(maxFiles * 0.2));
    // Add some config/doc files
    const configFiles = sorted
        .filter(f => f.filename.includes('config') || f.filename.includes('.md') ||
        f.filename.includes('.yml') || f.filename.includes('.yaml'))
        .slice(0, Math.floor(maxFiles * 0.2));
    // Combine and deduplicate
    const combined = [...topFiles, ...testFiles, ...configFiles];
    const unique = Array.from(new Map(combined.map(f => [f.filename, f])).values());
    return unique.slice(0, maxFiles).map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch ? f.patch.substring(0, 300) : undefined,
    }));
}
/**
 * Calculate discussion intensity based on activity
 */
function calculateDiscussionIntensity(commentCount, reviewCount) {
    const total = commentCount + reviewCount;
    if (total > 20)
        return 'high';
    if (total > 5)
        return 'medium';
    return 'low';
}
const handler = async (event) => {
    console.log('Fetching PR details:', JSON.stringify(event, null, 2));
    const { owner, repo, prNumber, githubToken } = event;
    try {
        const octokit = new rest_1.Octokit({
            auth: githubToken,
        });
        // Fetch PR metadata
        const { data: pr } = await octokit.pulls.get({
            owner,
            repo,
            pull_number: prNumber,
        });
        // Fetch PR comments (issue comments)
        const { data: issueComments } = await octokit.issues.listComments({
            owner,
            repo,
            issue_number: prNumber,
            per_page: 100,
        });
        // Fetch PR review comments (code review comments)
        const { data: reviewComments } = await octokit.pulls.listReviewComments({
            owner,
            repo,
            pull_number: prNumber,
            per_page: 100,
        });
        // Fetch PR reviews
        const { data: reviews } = await octokit.pulls.listReviews({
            owner,
            repo,
            pull_number: prNumber,
            per_page: 100,
        });
        // Fetch PR files (diffs)
        const { data: files } = await octokit.pulls.listFiles({
            owner,
            repo,
            pull_number: prNumber,
            per_page: 100,
        });
        // Intelligently summarize all the data
        const summarizedIssueComments = summarizeComments(issueComments, 15);
        const summarizedReviewComments = summarizeComments(reviewComments, 15);
        const prioritizedFiles = prioritizeFiles(files, 25);
        // Get unique participants
        const participants = new Set();
        issueComments.forEach(c => c.user && participants.add(c.user.login));
        reviewComments.forEach(c => c.user && participants.add(c.user.login));
        reviews.forEach(r => r.user && participants.add(r.user.login));
        // Get top files by changes for statistics
        const topFiles = [...files]
            .sort((a, b) => b.changes - a.changes)
            .slice(0, 10)
            .map(f => ({ filename: f.filename, changes: f.changes }));
        // Calculate discussion intensity
        const discussionIntensity = calculateDiscussionIntensity(issueComments.length, reviews.length);
        // Keep only most relevant reviews (approved, changes requested, and most recent)
        const relevantReviews = reviews
            .filter(r => r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED' || r.state === 'COMMENTED')
            .sort((a, b) => {
            const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
            const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
            return dateB - dateA;
        })
            .slice(0, 15)
            .map((review) => ({
            user: review.user ? review.user.login : 'unknown',
            state: review.state,
            body: review.body || '',
            submitted_at: review.submitted_at,
        }));
        const summary = {
            owner,
            repo,
            pr: {
                number: pr.number,
                title: pr.title,
                body: pr.body || '',
                state: pr.state,
                merged_at: pr.merged_at,
                created_at: pr.created_at,
                updated_at: pr.updated_at,
                user: pr.user ? { login: pr.user.login } : null,
                labels: pr.labels.map((label) => label.name),
                html_url: pr.html_url,
                additions: pr.additions,
                deletions: pr.deletions,
                changed_files: pr.changed_files,
            },
            comments: {
                issueComments: summarizedIssueComments,
                reviewComments: summarizedReviewComments,
            },
            reviews: relevantReviews,
            files: prioritizedFiles,
            statistics: {
                totalComments: issueComments.length + reviewComments.length,
                totalReviews: reviews.length,
                totalFiles: files.length,
                topFilesByChanges: topFiles,
                participantCount: participants.size,
                discussionIntensity,
            },
        };
        console.log(`Summarized PR #${prNumber} in ${owner}/${repo}: ` +
            `${summary.statistics.totalFiles} files (showing ${summary.files.length}), ` +
            `${summary.statistics.totalComments} comments (showing ${summary.comments.issueComments.length + summary.comments.reviewComments.length}), ` +
            `${summary.statistics.totalReviews} reviews (showing ${summary.reviews.length}), ` +
            `${summary.statistics.participantCount} participants, ` +
            `intensity: ${summary.statistics.discussionIntensity}`);
        return {
            statusCode: 200,
            body: summary,
        };
    }
    catch (error) {
        console.error('Error fetching PR details:', error);
        return {
            statusCode: 500,
            body: {
                error: error.message || 'Failed to fetch PR details',
                owner,
                repo,
                prNumber,
            },
        };
    }
};
exports.handler = handler;
