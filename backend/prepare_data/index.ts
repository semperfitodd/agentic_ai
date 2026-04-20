import { requireEnv, logger, stepResponse, putJson } from '@sprint/shared';

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
  sprintName?: string;
  repos: Array<{ owner: string; repo: string }>;
  repoDataResults: RepoDataResult[];
}

export const handler = async (event: PrepareInput) => {
  logger.info('Preparing data structure for analysis');

  const bucketName = requireEnv('RESULTS_BUCKET');
  const { since, until, sprintName, repos, repoDataResults } = event;

  const repoReadmeMap: Record<string, string> = {};
  for (const result of repoDataResults) {
    if (result.statusCode === 200 && result.body.readme) {
      repoReadmeMap[`${result.body.owner}/${result.body.repo}`] = result.body.readme;
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const readmeS3Key = `readmes/${timestamp}.json`;

  await putJson(bucketName, readmeS3Key, repoReadmeMap);
  logger.info(`Stored README map to S3`, { key: readmeS3Key });

  const prDetailsInputs: Array<{ owner: string; repo: string; prNumber: number }> = [];
  for (const result of repoDataResults) {
    if (result.statusCode === 200 && result.body.prs) {
      for (const pr of result.body.prs) {
        prDetailsInputs.push({ owner: result.body.owner, repo: result.body.repo, prNumber: pr.number });
      }
    }
  }

  logger.info(`Prepared ${prDetailsInputs.length} PRs for processing`);

  return stepResponse(200, {
    since,
    until,
    sprintName,
    repos,
    readmeS3Key,
    s3Bucket: bucketName,
    prDetailsInputs,
    totalPRs: prDetailsInputs.length,
  });
};
