import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

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
  analyses: PRAnalysis[];
}

/**
 * Aggregate PR analyses into comprehensive sprint report using Claude
 */
async function aggregateSprintWithClaude(input: AggregateInput): Promise<string> {
  const { sprintName, since, until, repos, analyses } = input;

  // Calculate statistics for context with safe defaults
  const totalPRs = analyses.length;
  const totalAdditions = analyses.reduce((sum, a) => sum + (a.metadata?.additions || 0), 0);
  const totalDeletions = analyses.reduce((sum, a) => sum + (a.metadata?.deletions || 0), 0);
  const totalFiles = analyses.reduce((sum, a) => sum + (a.metadata?.changed_files || 0), 0);

  // Group by repository
  const byRepo: { [key: string]: PRAnalysis[] } = {};
  analyses.forEach(analysis => {
    const repoKey = `${analysis.owner}/${analysis.repo}`;
    if (!byRepo[repoKey]) {
      byRepo[repoKey] = [];
    }
    byRepo[repoKey].push(analysis);
  });

  // Get top contributors
  const contributors: { [key: string]: number } = {};
  analyses.forEach(analysis => {
    const author = analysis.metadata?.author || 'Unknown';
    contributors[author] = (contributors[author] || 0) + 1;
  });

  // Build comprehensive context for Claude
  const repoBreakdown = Object.entries(byRepo)
    .map(([repo, prs]) => {
      const repoAdditions = prs.reduce((s, p) => s + (p.metadata?.additions || 0), 0);
      const repoDeletions = prs.reduce((s, p) => s + (p.metadata?.deletions || 0), 0);
      return `${repo}: ${prs.length} PR(s), +${repoAdditions}/-${repoDeletions}`;
    })
    .join('\n  - ');

  const contributorList = Object.entries(contributors)
    .sort((a, b) => b[1] - a[1])
    .map(([author, count]) => `${author} (${count} PRs)`)
    .join(', ');

  // Compile all PR analyses
  const allAnalyses = analyses
    .map(a => {
      return `
---
Repository: ${a.owner}/${a.repo}
PR #${a.prNumber}: ${a.prTitle}
Author: ${a.metadata?.author || 'Unknown'}
Stats: +${a.metadata?.additions || 0}/-${a.metadata?.deletions || 0}, ${a.metadata?.changed_files || 0} files

${a.analysis}
`;
    })
    .join('\n');

  // Build the prompt for Claude
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

Please generate a comprehensive sprint report that includes:

1. **Executive Summary**: High-level overview of sprint accomplishments, key themes, and overall impact

2. **Key Metrics Dashboard**: Present the statistics in a clear, scannable format

3. **Work Breakdown**: 
   - Categorize PRs by type (features, bug fixes, refactoring, documentation, etc.)
   - Highlight major themes and initiatives
   - Group related work items

4. **Technical Highlights**:
   - Most impactful changes
   - Notable technical decisions or patterns
   - Quality improvements or technical debt addressed

5. **Repository Insights**: Analysis by repository with highlights from each

6. **Team Collaboration**:
   - Contribution patterns
   - Code review effectiveness
   - Cross-functional collaboration

7. **Sprint Retrospective**:
   - What went well
   - Areas for improvement
   - Patterns observed

8. **Recommendations**: 
   - Actionable suggestions for next sprint
   - Technical debt to address
   - Process improvements

Format the report in clear, professional markdown with appropriate headers, bullet points, and emphasis. Make it suitable for both technical and non-technical stakeholders.`;

  try {
    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 8192,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return responseBody.content[0].text;
  } catch (error: any) {
    console.error('Error calling Bedrock:', error);
    throw new Error(`Failed to aggregate sprint report with Claude: ${error.message}`);
  }
}

export const handler = async (event: AggregateInput) => {
  console.log('Aggregating sprint report:', JSON.stringify({
    sprintName: event.sprintName,
    since: event.since,
    until: event.until,
    repoCount: event.repos?.length || 0,
    analysisCount: event.analyses?.length || 0,
  }, null, 2));

  try {
    // Validate input
    if (!event.analyses || !Array.isArray(event.analyses)) {
      throw new Error('Analyses array is missing or invalid');
    }

    // Filter out failed analyses and validate metadata
    const validAnalyses = event.analyses.filter(analysis => {
      if (!analysis || !analysis.metadata) {
        console.warn('Skipping analysis with missing metadata:', analysis);
        return false;
      }
      return true;
    });

    console.log(`Processing ${validAnalyses.length} valid analyses out of ${event.analyses.length} total`);

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

    // Use validated analyses
    const aggregateInput = {
      ...event,
      analyses: validAnalyses,
    };

    const report = await aggregateSprintWithClaude(aggregateInput);

    console.log('Sprint report aggregation complete');

    return {
      statusCode: 200,
      body: {
        sprintName: event.sprintName,
        since: event.since,
        until: event.until,
        repos: event.repos || [],
        totalPRs: validAnalyses.length,
        report,
        generatedAt: new Date().toISOString(),
        skippedAnalyses: event.analyses.length - validAnalyses.length,
      },
    };
  } catch (error: any) {
    console.error('Error aggregating sprint report:', error);
    console.error('Event data:', JSON.stringify(event, null, 2));
    return {
      statusCode: 500,
      body: {
        error: error.message || 'Failed to aggregate sprint report',
        sprintName: event.sprintName,
        totalPRs: 0,
      },
    };
  }
};

