import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface PRAnalysisInput {
  owner: string;
  repo: string;
  readme: string;
  pr: {
    number: number;
    title: string;
    body: string;
    state: string;
    merged_at: string | null;
    user: { login: string } | null;
    labels: string[];
    html_url: string;
    additions: number;
    deletions: number;
    changed_files: number;
  };
  comments: {
    issueComments: Array<{
      user: string;
      body: string;
      created_at: string;
    }>;
    reviewComments: Array<{
      user: string;
      body: string;
      path: string;
      created_at: string;
    }>;
  };
  reviews: Array<{
    user: string;
    state: string;
    body: string;
    submitted_at: string;
  }>;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

/**
 * Analyze PR using AWS Bedrock Claude
 */
async function analyzePRWithClaude(input: PRAnalysisInput): Promise<string> {
  const { owner, repo, readme, pr, comments, reviews, files } = input;

  // Prepare comprehensive context for Claude
  const filesSummary = files
    .map(f => `  - ${f.filename} (${f.status}): +${f.additions}/-${f.deletions} (${f.changes} changes)`)
    .join('\n');

  const issueCommentsSummary = comments.issueComments
    .map(c => `  - ${c.user} (${c.created_at}): ${c.body}`)
    .join('\n');

  const reviewCommentsSummary = comments.reviewComments
    .map(c => `  - ${c.user} on ${c.path} (${c.created_at}): ${c.body}`)
    .join('\n');

  const reviewsSummary = reviews
    .map(r => `  - ${r.user} (${r.state}) at ${r.submitted_at}: ${r.body}`)
    .join('\n');

  // Build the prompt for Claude
  const prompt = `You are an expert software engineering analyst. Analyze the following GitHub Pull Request and provide a comprehensive, insightful summary.

Repository: ${owner}/${repo}
Repository Description: ${readme.substring(0, 500)}${readme.length > 500 ? '...' : ''}

Pull Request Details:
- Number: #${pr.number}
- Title: ${pr.title}
- Author: ${pr.user?.login || 'Unknown'}
- State: ${pr.state}
- Merged: ${pr.merged_at ? new Date(pr.merged_at).toLocaleDateString() : 'Not merged'}
- Labels: ${pr.labels.length > 0 ? pr.labels.join(', ') : 'none'}
- Link: ${pr.html_url}

PR Description:
${pr.body || 'No description provided'}

Statistics:
- Files Changed: ${pr.changed_files}
- Additions: ${pr.additions}
- Deletions: ${pr.deletions}
- Total Changes: ${pr.additions + pr.deletions}

Files Modified:
${filesSummary}

${comments.issueComments.length > 0 ? `Issue Comments (${comments.issueComments.length}):\n${issueCommentsSummary}` : ''}

${comments.reviewComments.length > 0 ? `Review Comments (${comments.reviewComments.length}):\n${reviewCommentsSummary}` : ''}

${reviews.length > 0 ? `Reviews (${reviews.length}):\n${reviewsSummary}` : ''}

Please analyze this PR and provide:
1. A clear category/type (e.g., Feature, Bug Fix, Refactoring, Documentation, Configuration, Testing, etc.)
2. An impact assessment (Low/Medium/High) based on scope and complexity
3. A summary of what changed and why
4. Technical insights about the implementation
5. Assessment of the review process and team collaboration
6. Any notable patterns, risks, or highlights

Format your response in clear markdown with appropriate sections and bullet points.`;

  try {
    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
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
    throw new Error(`Failed to analyze PR with Claude: ${error.message}`);
  }
}

export const handler = async (event: PRAnalysisInput) => {
  console.log('Analyzing PR:', JSON.stringify({ 
    owner: event.owner, 
    repo: event.repo, 
    prNumber: event.pr?.number 
  }, null, 2));

  try {
    // Validate input
    if (!event.pr) {
      throw new Error('PR data is missing');
    }
    if (!event.owner || !event.repo) {
      throw new Error('Owner and repo are required');
    }

    const analysis = await analyzePRWithClaude(event);

    console.log(`Analysis complete for PR #${event.pr.number}`);

    return {
      statusCode: 200,
      body: {
        owner: event.owner,
        repo: event.repo,
        prNumber: event.pr.number,
        prTitle: event.pr.title || 'Untitled',
        analysis,
        metadata: {
          additions: event.pr.additions || 0,
          deletions: event.pr.deletions || 0,
          changed_files: event.pr.changed_files || 0,
          merged_at: event.pr.merged_at || null,
          author: event.pr.user?.login || 'Unknown',
          labels: event.pr.labels || [],
        },
      },
    };
  } catch (error: any) {
    console.error('Error analyzing PR:', error);
    console.error('Event data:', JSON.stringify(event, null, 2));
    return {
      statusCode: 500,
      body: {
        error: error.message || 'Failed to analyze PR',
        owner: event.owner || 'unknown',
        repo: event.repo || 'unknown',
        prNumber: event.pr?.number || 0,
        metadata: {
          additions: 0,
          deletions: 0,
          changed_files: 0,
          merged_at: null,
          author: 'Unknown',
          labels: [],
        },
      },
    };
  }
};

