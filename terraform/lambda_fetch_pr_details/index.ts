import { Octokit } from '@octokit/rest';

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

    // Extract relevant data
    const prDetails = {
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      state: pr.state,
      merged_at: pr.merged_at,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      user: pr.user ? {
        login: pr.user.login,
      } : null,
      labels: pr.labels.map((label: any) => label.name),
      html_url: pr.html_url,
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: pr.changed_files,
    };

    const comments = {
      issueComments: issueComments.map((comment: any) => ({
        id: comment.id,
        user: comment.user ? comment.user.login : 'unknown',
        body: comment.body,
        created_at: comment.created_at,
      })),
      reviewComments: reviewComments.map((comment: any) => ({
        id: comment.id,
        user: comment.user ? comment.user.login : 'unknown',
        body: comment.body,
        path: comment.path,
        line: comment.line,
        created_at: comment.created_at,
      })),
    };

    const reviewsSummary = reviews.map((review: any) => ({
      id: review.id,
      user: review.user ? review.user.login : 'unknown',
      state: review.state,
      body: review.body || '',
      submitted_at: review.submitted_at,
    }));

    const fileChanges: PRFile[] = files.map((file: any) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch, // Contains the actual diff
    }));

    console.log(`Fetched details for PR #${prNumber} in ${owner}/${repo}`);

    return {
      statusCode: 200,
      body: {
        owner,
        repo,
        pr: prDetails,
        comments,
        reviews: reviewsSummary,
        files: fileChanges,
      },
    };
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

