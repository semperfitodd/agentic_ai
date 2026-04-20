"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const shared_1 = require("@sprint/shared");
async function loadAnalysis(bucket, owner, repo, prNumber) {
    try {
        const key = await (0, shared_1.listLatestKey)(bucket, `pr-analyses/${owner}/${repo}/${prNumber}/`);
        if (!key)
            return null;
        return await (0, shared_1.getJson)(bucket, key);
    }
    catch {
        return null;
    }
}
const safeArray = (value) => (Array.isArray(value) ? value : []);
function addSection(lines, title, items, fallback = 'Not specified.') {
    lines.push(`- **${title}**:`);
    if (items.length > 0) {
        items.forEach((item) => lines.push(`  - ${item}`));
    }
    else {
        lines.push(`  - ${fallback}`);
    }
}
function buildMarkdownReport(data, meta) {
    const lines = [
        `# Sprint Report: ${meta.sprintName}`,
        '',
        `- **Sprint Period**: ${meta.since} to ${meta.until}`,
        `- **Total PRs Merged**: ${meta.totalPRs}`,
        `- **Total Lines Added**: ${meta.totalAdditions}`,
        `- **Total Lines Deleted**: ${meta.totalDeletions}`,
        `- **Total Files Changed**: ${meta.totalFiles}`,
        `- **Contributors**: ${meta.contributorList || 'Not available'}`,
        '',
        `## Executive Summary`,
        '',
        `- **Overview**: ${data.executiveSummary.overview || 'No overview provided.'}`,
    ];
    addSection(lines, 'Key Outcomes', safeArray(data.executiveSummary.keyOutcomes));
    addSection(lines, 'Key Risks', safeArray(data.executiveSummary.risks), 'None highlighted.');
    lines.push('');
    lines.push(`## Key Metrics Dashboard`, '');
    if (data.keyMetricsDashboard?.summary)
        lines.push(data.keyMetricsDashboard.summary, '');
    const metrics = safeArray(data.keyMetricsDashboard?.metrics);
    if (metrics.length > 0) {
        metrics.forEach((m) => lines.push(`- **${m.label}**: ${m.value}${m.context ? ` — ${m.context}` : ''}`));
    }
    else {
        lines.push(`- **Note**: No additional metrics provided.`);
    }
    lines.push('');
    lines.push(`## Work Breakdown`, '');
    const categories = safeArray(data.workBreakdown?.categories);
    if (categories.length > 0) {
        categories.forEach((cat) => {
            lines.push(`- **${cat.name}**: ${cat.description || 'No description provided.'}`);
            const items = safeArray(cat.items);
            if (items.length > 0) {
                items.forEach((item) => lines.push(`  - ${item}`));
            }
            else {
                lines.push(`  - No specific items noted.`);
            }
        });
    }
    else {
        lines.push(`- **Note**: No categorized work breakdown was provided.`);
    }
    lines.push('');
    lines.push(`## Technical Highlights`, '');
    addSection(lines, 'Most Impactful Changes', safeArray(data.technicalHighlights?.highlights), 'None specifically highlighted.');
    addSection(lines, 'Notable Technical Decisions', safeArray(data.technicalHighlights?.decisions), 'None specifically highlighted.');
    addSection(lines, 'Quality Improvements / Technical Debt', safeArray(data.technicalHighlights?.qualityImprovements), 'None specifically highlighted.');
    lines.push('');
    lines.push(`## Repository Insights`, '', `- **Repositories Summary**:`, `  - ${meta.repoBreakdown || 'No repository breakdown available.'}`);
    safeArray(data.repositoryInsights?.repos).forEach((r) => {
        lines.push(`- **${r.name}**: ${r.summary || 'No summary provided.'}`);
        const repoHighlights = safeArray(r.highlights);
        if (repoHighlights.length > 0) {
            repoHighlights.forEach((item) => lines.push(`  - ${item}`));
        }
        else {
            lines.push(`  - No specific highlights noted.`);
        }
    });
    lines.push('');
    lines.push(`## Team Collaboration`, '', `- **Summary**: ${data.teamCollaboration?.summary || 'No collaboration summary provided.'}`);
    addSection(lines, 'Details', safeArray(data.teamCollaboration?.details), 'No additional collaboration details provided.');
    lines.push('');
    lines.push(`## Sprint Retrospective`, '');
    addSection(lines, 'What Went Well', safeArray(data.sprintRetrospective?.wentWell));
    addSection(lines, 'Areas for Improvement', safeArray(data.sprintRetrospective?.toImprove));
    addSection(lines, 'Lessons Learned', safeArray(data.sprintRetrospective?.lessonsLearned));
    lines.push('');
    lines.push(`## Recommendations`, '');
    addSection(lines, 'Next Sprint Focus', safeArray(data.recommendations?.nextSprintFocus));
    addSection(lines, 'Technical Debt to Address', safeArray(data.recommendations?.technicalDebt));
    addSection(lines, 'Process Improvements', safeArray(data.recommendations?.processImprovements));
    lines.push('');
    if (data.appendix?.trim()) {
        lines.push(`## Appendix: Detailed PR Analyses`, '', data.appendix.trim(), '');
    }
    return lines.join('\n');
}
function buildAggregationPrompt(sprintName, since, until, repos, analyses, repoBreakdown, contributorList) {
    const totalPRs = analyses.length;
    const totalAdditions = analyses.reduce((s, a) => s + (a.metadata?.additions ?? 0), 0);
    const totalDeletions = analyses.reduce((s, a) => s + (a.metadata?.deletions ?? 0), 0);
    const totalFiles = analyses.reduce((s, a) => s + (a.metadata?.changed_files ?? 0), 0);
    const allAnalyses = analyses
        .map((a) => `---\nRepository: ${a.owner}/${a.repo}\nPR #${a.prNumber}: ${a.prTitle}\nAuthor: ${a.metadata?.author ?? 'Unknown'}\nStats: +${a.metadata?.additions ?? 0}/-${a.metadata?.deletions ?? 0}, ${a.metadata?.changed_files ?? 0} files\n\n${a.analysis}`)
        .join('\n');
    return `You are an expert engineering manager and technical writer. Generate a comprehensive, executive-level sprint report from the following Pull Request analyses.

Sprint Information:
- Sprint Name: ${sprintName}
- Sprint Period: ${new Date(since).toLocaleDateString()} to ${new Date(until).toLocaleDateString()}
- Repositories: ${repos.length}
  - ${repoBreakdown}

Summary Statistics:
- Total PRs Merged: ${totalPRs}
- Total Lines Added: ${totalAdditions}
- Total Lines Deleted: ${totalDeletions}
- Total Files Changed: ${totalFiles}
- Contributors: ${contributorList}

Individual PR Analyses:
${allAnalyses}

Analyze the information above and return a SINGLE JSON object matching this TypeScript interface:

interface SprintReportData {
  executiveSummary: { overview: string; keyOutcomes: string[]; risks: string[]; };
  keyMetricsDashboard: { summary: string; metrics: Array<{ label: string; value: string; context?: string; }>; };
  workBreakdown: { categories: Array<{ name: string; description: string; items: string[]; }>; };
  technicalHighlights: { highlights: string[]; decisions: string[]; qualityImprovements: string[]; };
  repositoryInsights: { repos: Array<{ name: string; summary: string; highlights: string[]; }>; };
  teamCollaboration: { summary: string; details: string[]; };
  sprintRetrospective: { wentWell: string[]; toImprove: string[]; lessonsLearned: string[]; };
  recommendations: { nextSprintFocus: string[]; technicalDebt: string[]; processImprovements: string[]; };
  appendix?: string;
}

Guidelines:
- Fill every string field with a concise, informative sentence (no empty strings).
- Use bullet-sized phrases in the string arrays, not full paragraphs.
- Keep the "appendix" field for any longer-form commentary or detailed notes (you may omit it if not needed).
- Do NOT include markdown, headings, or bullet markers in the string values themselves.
- Respond with ONLY valid JSON for the SprintReportData object, with no surrounding backticks or extra commentary.`;
}
const handler = async (event) => {
    const bucketName = (0, shared_1.requireEnv)('RESULTS_BUCKET');
    if (!event.analyses || !Array.isArray(event.analyses)) {
        throw new Error('Analyses array is missing or invalid');
    }
    shared_1.logger.info('Aggregating sprint', { sprintName: event.sprintName, analysisCount: event.analyses.length });
    const loadedAnalyses = await Promise.all(event.analyses.map((ref) => loadAnalysis(bucketName, ref.owner, ref.repo, ref.prNumber)));
    const validAnalyses = loadedAnalyses.filter((a) => a !== null && a.metadata !== undefined);
    if (validAnalyses.length === 0) {
        return (0, shared_1.stepResponse)(200, {
            sprintName: event.sprintName,
            since: event.since,
            until: event.until,
            repos: event.repos ?? [],
            totalPRs: 0,
            report: 'No valid PR analyses were available to generate a sprint report.',
            generatedAt: new Date().toISOString(),
            warning: 'All PR analyses failed validation',
        });
    }
    const byRepo = {};
    validAnalyses.forEach((a) => {
        const key = `${a.owner}/${a.repo}`;
        byRepo[key] = byRepo[key] ?? [];
        byRepo[key].push(a);
    });
    const contributors = {};
    validAnalyses.forEach((a) => {
        const author = a.metadata?.author ?? 'Unknown';
        contributors[author] = (contributors[author] ?? 0) + 1;
    });
    const repoBreakdown = Object.entries(byRepo)
        .map(([repo, prs]) => {
        const add = prs.reduce((s, p) => s + (p.metadata?.additions ?? 0), 0);
        const del = prs.reduce((s, p) => s + (p.metadata?.deletions ?? 0), 0);
        return `${repo}: ${prs.length} PR(s), +${add}/-${del}`;
    })
        .join('\n  - ');
    const contributorList = Object.entries(contributors)
        .sort((a, b) => b[1] - a[1])
        .map(([author, count]) => `${author} (${count} PRs)`)
        .join(', ');
    const sprintName = event.sprintName ?? process.env.DEFAULT_SPRINT_NAME ?? 'sprint';
    const prompt = buildAggregationPrompt(sprintName, event.since, event.until, event.repos, validAnalyses, repoBreakdown, contributorList);
    const rawText = await (0, shared_1.invokeClaude)({
        user: prompt,
        maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS ?? '8192', 10),
        temperature: parseFloat(process.env.BEDROCK_TEMPERATURE ?? '0.7'),
    });
    const reportData = (0, shared_1.parseJsonFromClaude)(rawText);
    const totalAdditions = validAnalyses.reduce((s, a) => s + (a.metadata?.additions ?? 0), 0);
    const totalDeletions = validAnalyses.reduce((s, a) => s + (a.metadata?.deletions ?? 0), 0);
    const totalFiles = validAnalyses.reduce((s, a) => s + (a.metadata?.changed_files ?? 0), 0);
    const markdownReport = buildMarkdownReport(reportData, {
        sprintName,
        since: new Date(event.since).toLocaleDateString(),
        until: new Date(event.until).toLocaleDateString(),
        totalPRs: validAnalyses.length,
        totalAdditions,
        totalDeletions,
        totalFiles,
        repoBreakdown,
        contributorList,
    });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedName = sprintName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const markdownS3Key = `reports/${sanitizedName}/${timestamp}.md`;
    await (0, shared_1.putMarkdown)(bucketName, markdownS3Key, markdownReport, {
        sprintName: sanitizedName,
        since: event.since,
        until: event.until,
        totalPRs: validAnalyses.length.toString(),
    });
    shared_1.logger.info('Sprint report stored', { key: markdownS3Key, prCount: validAnalyses.length });
    return (0, shared_1.stepResponse)(200, {
        sprintName: event.sprintName,
        since: event.since,
        until: event.until,
        repos: event.repos ?? [],
        totalPRs: validAnalyses.length,
        markdownS3Key,
        s3Bucket: bucketName,
        generatedAt: new Date().toISOString(),
        skippedAnalyses: event.analyses.length - validAnalyses.length,
    });
};
exports.handler = handler;
