"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
exports.buildMarkdownReport = buildMarkdownReport;
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
const formatNumber = (value) => value.toLocaleString('en-US');
const cell = (value) => value.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();
function table(headers, rows, align = []) {
    const divider = headers.map((_, i) => (align[i] === 'right' ? '---:' : '---'));
    return [headers, divider, ...rows].map((row) => `| ${row.map(cell).join(' | ')} |`);
}
function bulletSection(lines, title, items, fallback) {
    lines.push(`### ${title}`, '');
    (items.length > 0 ? items : [fallback]).forEach((item) => lines.push(`- ${item}`));
    lines.push('');
}
/**
 * Renders the sprint report. Clients read the "At a Glance" table for cover KPIs,
 * so keep its heading and two-column shape stable.
 */
function buildMarkdownReport(data, meta) {
    const period = `${meta.since} – ${meta.until}`;
    const lines = [
        `# Sprint Report: ${meta.sprintName}`,
        '',
        '## At a Glance',
        '',
        ...table(['Metric', 'Value'], [
            ['Sprint period', period],
            ['PRs merged', formatNumber(meta.totalPRs)],
            ['Lines added', `+${formatNumber(meta.totalAdditions)}`],
            ['Lines deleted', `-${formatNumber(meta.totalDeletions)}`],
            ['Files changed', formatNumber(meta.totalFiles)],
            ['Contributors', formatNumber(meta.contributors.length)],
        ]),
        '',
        '## Executive Summary',
        '',
        data.executiveSummary?.overview || 'No overview provided.',
        '',
    ];
    bulletSection(lines, 'Key Outcomes', safeArray(data.executiveSummary?.keyOutcomes), 'Not specified.');
    bulletSection(lines, 'Key Risks', safeArray(data.executiveSummary?.risks), 'None highlighted.');
    lines.push('## Key Metrics', '');
    if (data.keyMetricsDashboard?.summary)
        lines.push(data.keyMetricsDashboard.summary, '');
    const metrics = safeArray(data.keyMetricsDashboard?.metrics);
    if (metrics.length > 0) {
        lines.push(...table(['Metric', 'Value', 'Context'], metrics.map((m) => [m.label, m.value, m.context ?? ''])), '');
    }
    else {
        lines.push('No additional metrics provided.', '');
    }
    lines.push('## Work Breakdown', '');
    const categories = safeArray(data.workBreakdown?.categories);
    if (categories.length === 0)
        lines.push('No categorized work breakdown was provided.', '');
    categories.forEach((category) => {
        lines.push(`### ${category.name}`, '');
        if (category.description)
            lines.push(category.description, '');
        safeArray(category.items).forEach((item) => lines.push(`- ${item}`));
        lines.push('');
    });
    lines.push('## Technical Highlights', '');
    bulletSection(lines, 'Most Impactful Changes', safeArray(data.technicalHighlights?.highlights), 'None specifically highlighted.');
    bulletSection(lines, 'Notable Technical Decisions', safeArray(data.technicalHighlights?.decisions), 'None specifically highlighted.');
    bulletSection(lines, 'Quality Improvements', safeArray(data.technicalHighlights?.qualityImprovements), 'None specifically highlighted.');
    lines.push('## Repository Insights', '');
    if (meta.repoStats.length > 0) {
        lines.push(...table(['Repository', 'PRs', 'Added', 'Deleted'], meta.repoStats.map((r) => [r.repo, formatNumber(r.prs), `+${formatNumber(r.additions)}`, `-${formatNumber(r.deletions)}`]), ['left', 'right', 'right', 'right']), '');
    }
    safeArray(data.repositoryInsights?.repos).forEach((repo) => {
        lines.push(`### ${repo.name}`, '');
        if (repo.summary)
            lines.push(repo.summary, '');
        safeArray(repo.highlights).forEach((item) => lines.push(`- ${item}`));
        lines.push('');
    });
    lines.push('## Team Collaboration', '', data.teamCollaboration?.summary || 'No collaboration summary provided.', '');
    if (meta.contributors.length > 0) {
        lines.push(...table(['Contributor', 'PRs'], meta.contributors.map(([author, count]) => [author, formatNumber(count)]), ['left', 'right']), '');
    }
    safeArray(data.teamCollaboration?.details).forEach((item) => lines.push(`- ${item}`));
    lines.push('');
    lines.push('## Sprint Retrospective', '');
    bulletSection(lines, 'What Went Well', safeArray(data.sprintRetrospective?.wentWell), 'Not specified.');
    bulletSection(lines, 'Areas for Improvement', safeArray(data.sprintRetrospective?.toImprove), 'Not specified.');
    bulletSection(lines, 'Lessons Learned', safeArray(data.sprintRetrospective?.lessonsLearned), 'Not specified.');
    lines.push('## Recommendations', '');
    bulletSection(lines, 'Next Sprint Focus', safeArray(data.recommendations?.nextSprintFocus), 'Not specified.');
    bulletSection(lines, 'Technical Debt to Address', safeArray(data.recommendations?.technicalDebt), 'Not specified.');
    bulletSection(lines, 'Process Improvements', safeArray(data.recommendations?.processImprovements), 'Not specified.');
    if (data.appendix?.trim()) {
        lines.push('## Appendix', '', data.appendix.trim(), '');
    }
    return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
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
    const counts = {};
    validAnalyses.forEach((a) => {
        const author = a.metadata?.author ?? 'Unknown';
        counts[author] = (counts[author] ?? 0) + 1;
    });
    const repoStats = Object.entries(byRepo).map(([repo, prs]) => ({
        repo,
        prs: prs.length,
        additions: prs.reduce((s, p) => s + (p.metadata?.additions ?? 0), 0),
        deletions: prs.reduce((s, p) => s + (p.metadata?.deletions ?? 0), 0),
    }));
    const repoBreakdown = repoStats.map((r) => `${r.repo}: ${r.prs} PR(s), +${r.additions}/-${r.deletions}`).join('\n  - ');
    const contributors = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const contributorList = contributors.map(([author, count]) => `${author} (${count} PRs)`).join(', ');
    const sprintName = event.sprintName ?? process.env.DEFAULT_SPRINT_NAME ?? 'sprint';
    const prompt = buildAggregationPrompt(sprintName, event.since, event.until, event.repos, validAnalyses, repoBreakdown, contributorList);
    const rawText = await (0, shared_1.invokeModel)({
        user: prompt,
        maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS ?? '16000', 10),
    });
    const reportData = (0, shared_1.parseModelJson)(rawText);
    const totalAdditions = validAnalyses.reduce((s, a) => s + (a.metadata?.additions ?? 0), 0);
    const totalDeletions = validAnalyses.reduce((s, a) => s + (a.metadata?.deletions ?? 0), 0);
    const totalFiles = validAnalyses.reduce((s, a) => s + (a.metadata?.changed_files ?? 0), 0);
    const markdownReport = buildMarkdownReport(reportData, {
        sprintName,
        since: new Date(event.since).toLocaleDateString('en-US', { timeZone: 'UTC' }),
        until: new Date(event.until).toLocaleDateString('en-US', { timeZone: 'UTC' }),
        totalPRs: validAnalyses.length,
        totalAdditions,
        totalDeletions,
        totalFiles,
        repoStats,
        contributors,
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
