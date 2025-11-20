import { Octokit } from '@octokit/rest';

interface RepoInput {
  owner: string;
  repo: string;
  since: string; // ISO date string
  until: string; // ISO date string
  githubToken: string;
}

interface PRBasic {
  number: number;
  title: string;
  html_url: string;
  merged_at: string | null;
  user: {
    login: string;
  } | null;
}

export const handler = async (event: RepoInput) => {
  console.log('Fetching repo data:', JSON.stringify(event, null, 2));

  const { owner, repo, since, until, githubToken } = event;

  try {
    const octokit = new Octokit({
      auth: githubToken,
    });

    // Fetch README
    let readme = '';
    let readmeError = null;
    try {
      const readmeResponse = await octokit.repos.getReadme({
        owner,
        repo,
      });
      
      // Decode base64 content
      readme = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');
    } catch (error: any) {
      console.warn(`Could not fetch README for ${owner}/${repo}:`, error.message);
      readmeError = error.message;
    }

    // Fetch merged PRs in date range
    const sinceDate = new Date(since);
    const untilDate = new Date(until);

    // Get all merged PRs (closed + merged)
    const { data: pullRequests } = await octokit.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 100, // Max per page
    });

    // Filter for merged PRs in date range
    const mergedPRs = pullRequests
      .filter((pr: any) => {
        if (!pr.merged_at) return false;
        const mergedDate = new Date(pr.merged_at);
        return mergedDate >= sinceDate && mergedDate <= untilDate;
      })
      .map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        html_url: pr.html_url,
        merged_at: pr.merged_at,
        user: pr.user ? { login: pr.user.login } : null,
      }));

    console.log(`Found ${mergedPRs.length} merged PRs for ${owner}/${repo}`);

    return {
      statusCode: 200,
      body: {
        owner,
        repo,
        readme,
        readmeError,
        prs: mergedPRs,
        prCount: mergedPRs.length,
      },
    };
  } catch (error: any) {
    console.error('Error fetching repo data:', error);
    return {
      statusCode: 500,
      body: {
        error: error.message || 'Failed to fetch repo data',
        owner,
        repo,
      },
    };
  }
};

