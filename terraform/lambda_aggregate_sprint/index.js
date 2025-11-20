"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
/**
 * Mock LLM Aggregation Function
 * In production, this would call OpenAI/Anthropic/etc. API to generate
 * a comprehensive sprint summary from all PR analyses
 */
async function mockLLMAggregate(input) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    const { sprintName, since, until, repos, analyses } = input;
    // Calculate statistics
    const totalPRs = analyses.length;
    const totalAdditions = analyses.reduce((sum, a) => sum + a.metadata.additions, 0);
    const totalDeletions = analyses.reduce((sum, a) => sum + a.metadata.deletions, 0);
    const totalFiles = analyses.reduce((sum, a) => sum + a.metadata.changed_files, 0);
    // Group by repository
    const byRepo = {};
    analyses.forEach(analysis => {
        const repoKey = `${analysis.owner}/${analysis.repo}`;
        if (!byRepo[repoKey]) {
            byRepo[repoKey] = [];
        }
        byRepo[repoKey].push(analysis);
    });
    // Extract categories from analyses
    const categories = {};
    analyses.forEach(analysis => {
        const match = analysis.analysis.match(/\*\*Category:\*\* (.+)/);
        if (match) {
            const category = match[1];
            categories[category] = (categories[category] || 0) + 1;
        }
    });
    // Get top contributors
    const contributors = {};
    analyses.forEach(analysis => {
        const author = analysis.metadata.author || 'Unknown';
        contributors[author] = (contributors[author] || 0) + 1;
    });
    const topContributors = Object.entries(contributors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([author, count]) => `${author} (${count} PRs)`)
        .join(', ');
    // Generate executive summary
    const executiveSummary = `
# Sprint Report${sprintName ? `: ${sprintName}` : ''}

**Sprint Period:** ${new Date(since).toLocaleDateString()} - ${new Date(until).toLocaleDateString()}

## Executive Summary

This sprint saw **${totalPRs} pull requests** merged across **${repos.length} repositories**, with a total of **${totalAdditions} additions** and **${totalDeletions} deletions** affecting **${totalFiles} files**.

### Key Metrics
- Total PRs Merged: ${totalPRs}
- Repositories: ${repos.length}
- Lines Added: ${totalAdditions}
- Lines Deleted: ${totalDeletions}
- Files Changed: ${totalFiles}
- Top Contributors: ${topContributors || 'None'}

### Work Breakdown by Category
${Object.entries(categories).map(([cat, count]) => `- ${cat}: ${count} PRs`).join('\n')}

### Activity by Repository
${Object.entries(byRepo).map(([repo, prs]) => `- **${repo}**: ${prs.length} PR(s), ${prs.reduce((s, p) => s + p.metadata.additions, 0)} additions, ${prs.reduce((s, p) => s + p.metadata.deletions, 0)} deletions`).join('\n')}

---

## Detailed PR Analyses

${Object.entries(byRepo).map(([repo, prs]) => `
### Repository: ${repo}

${prs.map(pr => pr.analysis).join('\n\n---\n\n')}
`).join('\n')}

---

## Sprint Highlights

${totalPRs > 10 ? '- High productivity sprint with significant development activity!' : ''}
${Object.keys(categories).includes('Bug Fix') ? '- Bug fixes were addressed this sprint' : ''}
${Object.keys(categories).includes('Feature') ? '- New features were delivered' : ''}
${Object.keys(categories).includes('Documentation') ? '- Documentation improvements were made' : ''}

## Recommendations for Next Sprint

1. ${totalPRs > 15 ? 'Consider breaking down larger features to maintain PR quality' : 'Continue current development pace'}
2. ${totalAdditions > totalDeletions * 3 ? 'Review opportunities for code refactoring and cleanup' : 'Good balance of additions and deletions'}
3. ${repos.length > 5 ? 'Focus efforts on fewer repositories for deeper impact' : 'Good repository focus'}

---

*Report generated on ${new Date().toLocaleString()}*
`.trim();
    return executiveSummary;
}
const handler = async (event) => {
    console.log('Aggregating sprint report:', JSON.stringify({
        sprintName: event.sprintName,
        since: event.since,
        until: event.until,
        repoCount: event.repos.length,
        analysisCount: event.analyses.length,
    }, null, 2));
    try {
        // In production, this would call an actual LLM API:
        // const report = await callOpenAI(event);
        // or
        // const report = await callAnthropic(event);
        const report = await mockLLMAggregate(event);
        console.log('Sprint report aggregation complete');
        return {
            statusCode: 200,
            body: {
                sprintName: event.sprintName,
                since: event.since,
                until: event.until,
                repos: event.repos,
                totalPRs: event.analyses.length,
                report,
                generatedAt: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        console.error('Error aggregating sprint report:', error);
        return {
            statusCode: 500,
            body: {
                error: error.message || 'Failed to aggregate sprint report',
            },
        };
    }
};
exports.handler = handler;
