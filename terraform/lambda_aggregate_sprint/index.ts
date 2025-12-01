import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const bedrockClient = new BedrockRuntimeClient({});
const s3Client = new S3Client({});

interface PRAnalysisReference {
  owner: string;
  repo: string;
  prNumber: number;
}

interface PRAnalysis {
  owner: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  analysis: string;
  metadata: {
    additions: number;
    deletions: number;
    changed_files: number;
    merged_at: string | null;
    author?: string;
    labels: string[];
  };
}

interface AggregateInput {
  sprintName?: string;
  since: string;
  until: string;
  repos: Array<{
    owner: string;
    repo: string;
  }>;
  analyses: PRAnalysisReference[];
}

interface SprintReportData {
  executiveSummary: {
    overview: string;
    keyOutcomes: string[];
    risks: string[];
  };
  keyMetricsDashboard: {
    summary: string;
    metrics: Array<{
      label: string;
      value: string;
      context?: string;
    }>;
  };
  workBreakdown: {
    categories: Array<{
      name: string;
      description: string;
      items: string[];
    }>;
  };
  technicalHighlights: {
    highlights: string[];
    decisions: string[];
    qualityImprovements: string[];
  };
  repositoryInsights: {
    repos: Array<{
      name: string;
      summary: string;
      highlights: string[];
    }>;
  };
  teamCollaboration: {
    summary: string;
    details: string[];
  };
  sprintRetrospective: {
    wentWell: string[];
    toImprove: string[];
    lessonsLearned: string[];
  };
  recommendations: {
    nextSprintFocus: string[];
    technicalDebt: string[];
    processImprovements: string[];
  };
  appendix?: string;
}

async function loadAnalysisFromS3(bucket: string, owner: string, repo: string, prNumber: number): Promise<PRAnalysis | null> {
  try {
    const listResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `pr-analyses/${owner}/${repo}/${prNumber}/`,
        MaxKeys: 1,
      })
    );

    if (!listResponse.Contents?.length) return null;

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: listResponse.Contents[0].Key!,
      })
    );

    const body = await response.Body?.transformToString();
    return body ? JSON.parse(body) : null;
  } catch (error) {
    return null;
  }
}

const safeArray = <T,>(value: T[] | undefined | null): T[] => Array.isArray(value) ? value : [];

function addSection(lines: string[], title: string, items: string[], fallback = 'Not specified.') {
  lines.push(`- **${title}**:`);
  if (items.length > 0) {
    items.forEach(item => lines.push(`  - ${item}`));
  } else {
    lines.push(`  - ${fallback}`);
  }
}

function buildSprintReportMarkdown(
  data: SprintReportData,
  meta: {
    sprintName: string;
    since: string;
    until: string;
    totalPRs: number;
    totalAdditions: number;
    totalDeletions: number;
    totalFiles: number;
    repoBreakdown: string;
    contributorList: string;
  }
): string {
  const lines: string[] = [
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
  if (data.keyMetricsDashboard?.summary) {
    lines.push(data.keyMetricsDashboard.summary, '');
  }
  const metrics = safeArray(data.keyMetricsDashboard?.metrics);
  if (metrics.length > 0) {
    metrics.forEach(m => lines.push(`- **${m.label}**: ${m.value}${m.context ? ` — ${m.context}` : ''}`));
  } else {
    lines.push(`- **Note**: No additional metrics provided.`);
  }
  lines.push('');

  lines.push(`## Work Breakdown`, '');
  const categories = safeArray(data.workBreakdown?.categories);
  if (categories.length > 0) {
    categories.forEach(cat => {
      lines.push(`- **${cat.name}**: ${cat.description || 'No description provided.'}`);
      const items = safeArray(cat.items);
      if (items.length > 0) {
        items.forEach(item => lines.push(`  - ${item}`));
      } else {
        lines.push(`  - No specific items noted.`);
      }
    });
  } else {
    lines.push(`- **Note**: No categorized work breakdown was provided.`);
  }
  lines.push('');

  lines.push(`## Technical Highlights`, '');
  addSection(lines, 'Most Impactful Changes', safeArray(data.technicalHighlights?.highlights), 'None specifically highlighted.');
  addSection(lines, 'Notable Technical Decisions', safeArray(data.technicalHighlights?.decisions), 'None specifically highlighted.');
  addSection(lines, 'Quality Improvements / Technical Debt', safeArray(data.technicalHighlights?.qualityImprovements), 'None specifically highlighted.');
  lines.push('');

  lines.push(`## Repository Insights`, '', `- **Repositories Summary**:`, `  - ${meta.repoBreakdown || 'No repository breakdown available.'}`);
  safeArray(data.repositoryInsights?.repos).forEach(repo => {
    lines.push(`- **${repo.name}**: ${repo.summary || 'No summary provided.'}`);
    const repoHighlights = safeArray(repo.highlights);
    if (repoHighlights.length > 0) {
      repoHighlights.forEach(item => lines.push(`  - ${item}`));
    } else {
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

async function aggregateSprintWithClaude(input: {
  sprintName?: string;
  since: string;
  until: string;
  repos: Array<{ owner: string; repo: string }>;
  analyses: PRAnalysis[];
}): Promise<string> {
  const { sprintName, since, until, repos, analyses } = input;

  const totalPRs = analyses.length;
  const totalAdditions = analyses.reduce((sum, a) => sum + (a.metadata?.additions || 0), 0);
  const totalDeletions = analyses.reduce((sum, a) => sum + (a.metadata?.deletions || 0), 0);
  const totalFiles = analyses.reduce((sum, a) => sum + (a.metadata?.changed_files || 0), 0);

  const byRepo: { [key: string]: PRAnalysis[] } = {};
  analyses.forEach(analysis => {
    const repoKey = `${analysis.owner}/${analysis.repo}`;
    byRepo[repoKey] = byRepo[repoKey] || [];
    byRepo[repoKey].push(analysis);
  });

  const contributors: { [key: string]: number } = {};
  analyses.forEach(analysis => {
    const author = analysis.metadata?.author || 'Unknown';
    contributors[author] = (contributors[author] || 0) + 1;
  });

  const repoBreakdown = Object.entries(byRepo)
    .map(([repo, prs]) => {
      const additions = prs.reduce((s, p) => s + (p.metadata?.additions || 0), 0);
      const deletions = prs.reduce((s, p) => s + (p.metadata?.deletions || 0), 0);
      return `${repo}: ${prs.length} PR(s), +${additions}/-${deletions}`;
    })
    .join('\n  - ');

  const contributorList = Object.entries(contributors)
    .sort((a, b) => b[1] - a[1])
    .map(([author, count]) => `${author} (${count} PRs)`)
    .join(', ');

  const allAnalyses = analyses
    .map(a => `---\nRepository: ${a.owner}/${a.repo}\nPR #${a.prNumber}: ${a.prTitle}\nAuthor: ${a.metadata?.author || 'Unknown'}\nStats: +${a.metadata?.additions || 0}/-${a.metadata?.deletions || 0}, ${a.metadata?.changed_files || 0} files\n\n${a.analysis}`)
    .join('\n');

  const prompt = `You are an expert engineering manager and technical writer. Generate a comprehensive, executive-level sprint report from the following Pull Request analyses.

Sprint Information:
- Sprint Name: ${sprintName || 'Unnamed Sprint'}
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

  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) throw new Error('BEDROCK_MODEL_ID environment variable is not set');

  const response = await bedrockClient.send(
    new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: process.env.BEDROCK_ANTHROPIC_VERSION || 'bedrock-2023-05-31',
        max_tokens: parseInt(process.env.BEDROCK_MAX_TOKENS || '8192', 10),
        temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.7'),
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  );

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const rawText: string = responseBody.content[0].text;

  let parsed: SprintReportData;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('No JSON object found in model response');
    }
    parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
  }

  return buildSprintReportMarkdown(parsed, {
    sprintName: sprintName || 'Unnamed Sprint',
    since: new Date(since).toLocaleDateString(),
    until: new Date(until).toLocaleDateString(),
    totalPRs,
    totalAdditions,
    totalDeletions,
    totalFiles,
    repoBreakdown,
    contributorList,
  });
}

export const handler = async (event: AggregateInput) => {
  const bucketName = process.env.RESULTS_BUCKET;
  if (!bucketName) throw new Error('RESULTS_BUCKET environment variable is not set');

  if (!event.analyses || !Array.isArray(event.analyses)) {
    throw new Error('Analyses array is missing or invalid');
  }

  const loadedAnalyses = await Promise.all(
    event.analyses.map(ref => loadAnalysisFromS3(bucketName, ref.owner, ref.repo, ref.prNumber))
  );

  const validAnalyses = loadedAnalyses.filter((analysis): analysis is PRAnalysis => 
    analysis !== null && analysis.metadata !== undefined
  );

  if (validAnalyses.length === 0) {
    return {
      statusCode: 200,
      body: {
        sprintName: event.sprintName,
        since: event.since,
        until: event.until,
        repos: event.repos || [],
        totalPRs: 0,
        report: 'No valid PR analyses were available to generate a sprint report.',
        generatedAt: new Date().toISOString(),
        warning: 'All PR analyses failed validation',
      },
    };
  }

  const markdownReport = await aggregateSprintWithClaude({
    sprintName: event.sprintName,
    since: event.since,
    until: event.until,
    repos: event.repos,
    analyses: validAnalyses,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sprintName = event.sprintName || process.env.DEFAULT_SPRINT_NAME || 'sprint';
  const sanitizedName = sprintName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  const markdownS3Key = `reports/${sanitizedName}/${timestamp}.md`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: markdownS3Key,
      Body: markdownReport,
      ContentType: 'text/markdown',
      Metadata: {
        sprintName: sanitizedName,
        since: event.since,
        until: event.until,
        totalPRs: validAnalyses.length.toString(),
      },
    })
  );

  return {
    statusCode: 200,
    body: {
      sprintName: event.sprintName,
      since: event.since,
      until: event.until,
      repos: event.repos || [],
      totalPRs: validAnalyses.length,
      markdownS3Key,
      s3Bucket: bucketName,
      generatedAt: new Date().toISOString(),
      skippedAnalyses: event.analyses.length - validAnalyses.length,
    },
  };
};
