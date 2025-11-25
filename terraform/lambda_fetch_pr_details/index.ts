import { Octokit } from '@octokit/rest';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});

interface PRDetailsInput {
  owner: string;
  repo: string;
  prNumber: number;
  githubToken: string;
}

interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

interface CommentThread {
  user: string;
  body: string;
  created_at: string;
  path?: string;
}

interface PRSummary {
  owner: string;
  repo: string;
  pr: {
    number: number;
    title: string;
    body: string;
    state: string;
    merged_at: string | null;
    created_at: string;
    updated_at: string;
    user: { login: string } | null;
    labels: string[];
    html_url: string;
    additions: number;
    deletions: number;
    changed_files: number;
  };
  comments: {
    issueComments: CommentThread[];
    reviewComments: CommentThread[];
  };
  reviews: Array<{
    user: string;
    state: string;
    body: string;
    submitted_at: string;
  }>;
  files: PRFile[];
  statistics: {
    totalComments: number;
    totalReviews: number;
    totalFiles: number;
    topFilesByChanges: Array<{ filename: string; changes: number }>;
    participantCount: number;
    discussionIntensity: 'low' | 'medium' | 'high';
  };
}

function summarizeComments(comments: any[], maxComments?: number): CommentThread[] {
  const limit = maxComments || parseInt(process.env.MAX_COMMENTS_PER_PR || '15', 10);
  if (comments.length <= limit) {
    return comments.map(c => ({
      user: c.user?.login || 'unknown',
      body: c.body || '',
      created_at: c.created_at,
      path: c.path,
    }));
  }

  const sorted = [...comments].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  const recentComments = sorted.slice(0, Math.floor(limit * 0.7));
  const substantialComments = sorted
    .filter(c => c.body && c.body.length > 100)
    .slice(0, Math.floor(limit * 0.3));

  const combined = [...recentComments, ...substantialComments];
  const unique = Array.from(new Map(combined.map(c => [c.id, c])).values());

  return unique.slice(0, limit).map(c => ({
    user: c.user?.login || 'unknown',
    body: c.body || '',
    created_at: c.created_at,
    path: c.path,
  }));
}

function prioritizeFiles(files: any[], maxFiles?: number): PRFile[] {
  const limit = maxFiles || parseInt(process.env.MAX_FILES_PER_PR || '25', 10);
  if (files.length <= limit) {
    return files.map(f => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch ? f.patch.substring(0, parseInt(process.env.PATCH_PREVIEW_LENGTH || '300', 10)) : undefined,
    }));
  }

  const sorted = [...files].sort((a, b) => b.changes - a.changes);
  const topFiles = sorted.slice(0, Math.floor(limit * 0.6));
  const testFiles = sorted
    .filter(f => f.filename.includes('test') || f.filename.includes('spec'))
    .slice(0, Math.floor(limit * 0.2));

  const configFiles = sorted
    .filter(f => f.filename.includes('config') || f.filename.includes('.md') || 
                 f.filename.includes('.yml') || f.filename.includes('.yaml'))
    .slice(0, Math.floor(limit * 0.2));

  const combined = [...topFiles, ...testFiles, ...configFiles];
  const unique = Array.from(new Map(combined.map(f => [f.filename, f])).values());

  return unique.slice(0, limit).map(f => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes,
    patch: f.patch ? f.patch.substring(0, parseInt(process.env.PATCH_PREVIEW_LENGTH || '300', 10)) : undefined,
  }));
}

function calculateDiscussionIntensity(
  commentCount: number, 
  reviewCount: number
): 'low' | 'medium' | 'high' {
  const highThreshold = parseInt(process.env.DISCUSSION_HIGH_THRESHOLD || '20', 10);
  const mediumThreshold = parseInt(process.env.DISCUSSION_MEDIUM_THRESHOLD || '5', 10);
  const total = commentCount + reviewCount;
  if (total > highThreshold) return 'high';
  if (total > mediumThreshold) return 'medium';
  return 'low';
}

export const handler = async (event: PRDetailsInput) => {
  console.log('Fetching PR details:', JSON.stringify(event, null, 2));

  const { owner, repo, prNumber, githubToken } = event;

  try {
    const octokit = new Octokit({
      auth: githubToken,
    });

    // Fetch PR metadata
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    const perPage = parseInt(process.env.GITHUB_PER_PAGE || '100', 10);

    // Fetch PR comments (issue comments)
    const { data: issueComments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: perPage,
    });

    // Fetch PR review comments (code review comments)
    const { data: reviewComments } = await octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number: prNumber,
      per_page: perPage,
    });

    // Fetch PR reviews
    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: prNumber,
      per_page: perPage,
    });

    // Fetch PR files (diffs)
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: perPage,
    });

    const summarizedIssueComments = summarizeComments(issueComments);
    const summarizedReviewComments = summarizeComments(reviewComments);
    const prioritizedFiles = prioritizeFiles(files);

    // Get unique participants
    const participants = new Set<string>();
    issueComments.forEach(c => c.user && participants.add(c.user.login));
    reviewComments.forEach(c => c.user && participants.add(c.user.login));
    reviews.forEach(r => r.user && participants.add(r.user.login));

    // Get top files by changes for statistics
    const topFiles = [...files]
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 10)
      .map(f => ({ filename: f.filename, changes: f.changes }));

    // Calculate discussion intensity
    const discussionIntensity = calculateDiscussionIntensity(
      issueComments.length,
      reviews.length
    );

    // Keep only most relevant reviews (approved, changes requested, and most recent)
    const relevantReviews = reviews
      .filter(r => r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED' || r.state === 'COMMENTED')
      .sort((a, b) => {
        const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, parseInt(process.env.MAX_REVIEWS_PER_PR || '15', 10))
      .map((review: any) => ({
        user: review.user ? review.user.login : 'unknown',
        state: review.state,
        body: review.body || '',
        submitted_at: review.submitted_at,
      }));

    const summary: PRSummary = {
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
        labels: pr.labels.map((label: any) => label.name),
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

    console.log(
      `Summarized PR #${prNumber} in ${owner}/${repo}: ` +
      `${summary.statistics.totalFiles} files (showing ${summary.files.length}), ` +
      `${summary.statistics.totalComments} comments (showing ${summary.comments.issueComments.length + summary.comments.reviewComments.length}), ` +
      `${summary.statistics.totalReviews} reviews (showing ${summary.reviews.length}), ` +
      `${summary.statistics.participantCount} participants, ` +
      `intensity: ${summary.statistics.discussionIntensity}`
    );

    const bucketName = process.env.RESULTS_BUCKET;
    if (!bucketName) {
      throw new Error('RESULTS_BUCKET environment variable is not set');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `pr-details/${owner}/${repo}/${prNumber}/${timestamp}.json`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: JSON.stringify(summary, null, 2),
        ContentType: 'application/json',
      })
    );

    console.log(`Stored PR details to S3: ${s3Key}`);

    const responseBody = {
      owner,
      repo,
      prNumber,
    };

    console.log(`Stored PR #${prNumber} details (${Buffer.byteLength(JSON.stringify(summary), 'utf8')} bytes) to S3: ${s3Key}`);

    const fullResponse = {
      statusCode: 200,
      body: responseBody,
    };

    const responseSize = Buffer.byteLength(JSON.stringify(fullResponse), 'utf8');
    console.log(`RETURN TO STEP FUNCTIONS: ${JSON.stringify(fullResponse)}`);
    console.log(`RESPONSE SIZE: ${responseSize} bytes (${(responseSize / 1024).toFixed(2)} KB)`);

    return fullResponse;
  } catch (error: any) {
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

