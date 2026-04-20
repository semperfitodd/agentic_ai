import { requireEnv, logger, stepResponse, getJson, putJson, listLatestKey, invokeClaude } from '@sprint/shared';

interface PRDetails {
  owner: string;
  repo: string;
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
    issueComments: Array<{ user: string; body: string; created_at: string }>;
    reviewComments: Array<{ user: string; body: string; path?: string; created_at: string }>;
  };
  reviews: Array<{ user: string; state: string; body: string; submitted_at: string }>;
  files: Array<{ filename: string; status: string; additions: number; deletions: number; changes: number; patch?: string }>;
  statistics: {
    totalComments: number;
    totalReviews: number;
    totalFiles: number;
    topFilesByChanges: Array<{ filename: string; changes: number }>;
    participantCount: number;
    discussionIntensity: 'low' | 'medium' | 'high';
  };
}

interface PRAnalysisInput {
  owner: string;
  repo: string;
  prNumber: number;
  readmeS3Key?: string;
  s3Bucket?: string;
}

function buildAnalysisPrompt(details: PRDetails, readme: string): string {
  const { pr, comments, reviews, files, statistics } = details;
  const readmePreview = readme.substring(0, parseInt(process.env.README_PREVIEW_LENGTH ?? '500', 10));

  const filesSummary = files.map((f) => `  - ${f.filename} (${f.status}): +${f.additions}/-${f.deletions}`).join('\n');
  const issueCommentsSummary = comments.issueComments.map((c) => `  - ${c.user} (${c.created_at}): ${c.body}`).join('\n');
  const reviewCommentsSummary = comments.reviewComments.map((c) => `  - ${c.user} on ${c.path} (${c.created_at}): ${c.body}`).join('\n');
  const reviewsSummary = reviews.map((r) => `  - ${r.user} (${r.state}) at ${r.submitted_at}: ${r.body}`).join('\n');

  return `You are an expert software engineering analyst. Analyze the following GitHub Pull Request and provide a comprehensive, insightful summary.

Repository: ${details.owner}/${details.repo}
Repository Description: ${readmePreview}${readme.length > (parseInt(process.env.README_PREVIEW_LENGTH ?? '500', 10)) ? '...' : ''}

Pull Request Details:
- Number: #${pr.number}
- Title: ${pr.title}
- Author: ${pr.user?.login ?? 'Unknown'}
- State: ${pr.state}
- Merged: ${pr.merged_at ? new Date(pr.merged_at).toLocaleDateString() : 'Not merged'}
- Labels: ${pr.labels.length > 0 ? pr.labels.join(', ') : 'none'}
- Link: ${pr.html_url}

PR Description:
${pr.body || 'No description provided'}

Statistics:
- Files Changed: ${pr.changed_files} (showing ${files.length})
- Additions: ${pr.additions}
- Deletions: ${pr.deletions}
- Total Comments: ${statistics.totalComments} (showing ${comments.issueComments.length + comments.reviewComments.length})
- Total Reviews: ${statistics.totalReviews} (showing ${reviews.length})
- Participants: ${statistics.participantCount}
- Discussion Intensity: ${statistics.discussionIntensity}

Most Impacted Files:
${statistics.topFilesByChanges.slice(0, 5).map((f) => `  - ${f.filename} (${f.changes} changes)`).join('\n')}

Files Modified (sample):
${filesSummary}

${comments.issueComments.length > 0 ? `Issue Comments:\n${issueCommentsSummary}` : ''}

${comments.reviewComments.length > 0 ? `Review Comments:\n${reviewCommentsSummary}` : ''}

${reviews.length > 0 ? `Reviews:\n${reviewsSummary}` : ''}

Please analyze this PR and provide:
1. A clear category/type (e.g., Feature, Bug Fix, Refactoring, Documentation, Configuration, Testing, etc.)
2. An impact assessment (Low/Medium/High) based on scope and complexity
3. A summary of what changed and why
4. Technical insights about the implementation
5. Assessment of the review process and team collaboration
6. Any notable patterns, risks, or highlights

Format your response in clear markdown with appropriate sections and bullet points.`;
}

export const handler = async (event: PRAnalysisInput) => {
  const { owner, repo, prNumber } = event;
  logger.info('Analyzing PR', { owner, repo, prNumber });

  const bucketName = event.s3Bucket ?? requireEnv('RESULTS_BUCKET');

  try {
    if (!owner || !repo || !prNumber) throw new Error('owner, repo, and prNumber are required');

    let readme = '';
    if (event.readmeS3Key) {
      const readmeMap = await getJson<Record<string, string>>(bucketName, event.readmeS3Key);
      readme = readmeMap[`${owner}/${repo}`] ?? '';
      logger.info('Loaded README map', { owner, repo, bytes: readme.length });
    }

    const s3Prefix = `pr-details/${owner}/${repo}/${prNumber}/`;
    const detailsKey = await listLatestKey(bucketName, s3Prefix);
    if (!detailsKey) throw new Error(`No PR details found in S3 at prefix: ${s3Prefix}`);

    const prDetails = await getJson<PRDetails>(bucketName, detailsKey);
    if (!prDetails.pr) throw new Error('PR data is missing from S3');

    const prompt = buildAnalysisPrompt({ ...prDetails, owner, repo }, readme);

    const analysis = await invokeClaude({
      user: prompt,
      maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS ?? '4096', 10),
      temperature: parseFloat(process.env.BEDROCK_TEMPERATURE ?? '0.7'),
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const analysisS3Key = `pr-analyses/${owner}/${repo}/${prDetails.pr.number}/${timestamp}.json`;

    const fullAnalysis = {
      owner,
      repo,
      prNumber: prDetails.pr.number,
      prTitle: prDetails.pr.title ?? 'Untitled',
      analysis,
      metadata: {
        additions: prDetails.pr.additions ?? 0,
        deletions: prDetails.pr.deletions ?? 0,
        changed_files: prDetails.pr.changed_files ?? 0,
        merged_at: prDetails.pr.merged_at ?? null,
        author: prDetails.pr.user?.login ?? 'Unknown',
        labels: prDetails.pr.labels ?? [],
      },
      analyzedAt: new Date().toISOString(),
      statistics: prDetails.statistics,
    };

    await putJson(bucketName, analysisS3Key, fullAnalysis, {
      owner,
      repo,
      prNumber: prDetails.pr.number.toString(),
    });

    logger.info('Analysis stored', { owner, repo, prNumber, key: analysisS3Key, bytes: Buffer.byteLength(analysis) });

    return stepResponse(200, { owner, repo, prNumber: prDetails.pr.number });
  } catch (error) {
    logger.error('Error analyzing PR', { owner, repo, prNumber, message: error instanceof Error ? error.message : String(error) });
    return stepResponse(500, { error: error instanceof Error ? error.message : 'Failed to analyze PR', owner, repo, prNumber });
  }
};
