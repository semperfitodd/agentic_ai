interface RepoDataResult {
  statusCode: number;
  body: {
    owner: string;
    repo: string;
    readme: string;
    prs: Array<{
      number: number;
      title: string;
      html_url: string;
      merged_at: string | null;
      user: { login: string } | null;
    }>;
  };
}

interface PrepareInput {
  since: string;
  until: string;
  githubToken: string;
  sprintName?: string;
  repos: Array<{ owner: string; repo: string }>;
  repoDataResults: RepoDataResult[];
}

export const handler = async (event: PrepareInput) => {
  console.log('Preparing data structure for analysis');

  const { since, until, githubToken, sprintName, repos, repoDataResults } = event;

  // Create a map of repo -> readme for easy lookup
  const repoReadmeMap: { [key: string]: string } = {};
  repoDataResults.forEach(result => {
    if (result.statusCode === 200) {
      const key = `${result.body.owner}/${result.body.repo}`;
      repoReadmeMap[key] = result.body.readme || '';
    }
  });

  // Flatten all PRs with their repo info and readme
  const prDetailsInputs: any[] = [];
  repoDataResults.forEach(result => {
    if (result.statusCode === 200 && result.body.prs) {
      result.body.prs.forEach(pr => {
        prDetailsInputs.push({
          owner: result.body.owner,
          repo: result.body.repo,
          prNumber: pr.number,
          readme: repoReadmeMap[`${result.body.owner}/${result.body.repo}`] || '',
          githubToken,
        });
      });
    }
  });

  console.log(`Prepared ${prDetailsInputs.length} PRs for processing`);

  return {
    statusCode: 200,
    body: {
      since,
      until,
      sprintName,
      repos,
      githubToken,
      repoReadmeMap,
      prDetailsInputs,
      totalPRs: prDetailsInputs.length,
    },
  };
};

