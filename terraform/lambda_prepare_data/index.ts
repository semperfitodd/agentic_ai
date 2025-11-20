import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});

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
  
  const bucketName = process.env.RESULTS_BUCKET;
  if (!bucketName) {
    throw new Error('RESULTS_BUCKET environment variable is not set');
  }

  // Store READMEs in S3
  const repoReadmeMap: { [key: string]: string } = {};
  for (const result of repoDataResults) {
    if (result.statusCode === 200 && result.body.readme) {
      const key = `${result.body.owner}/${result.body.repo}`;
      repoReadmeMap[key] = result.body.readme;
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const readmeS3Key = `readmes/${timestamp}.json`;
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: readmeS3Key,
      Body: JSON.stringify(repoReadmeMap, null, 2),
      ContentType: 'application/json',
    })
  );

  console.log(`Stored README map to S3: ${readmeS3Key}`);

  // Flatten all PRs with ONLY identifiers (no README, no githubToken in state)
  const prDetailsInputs: any[] = [];
  repoDataResults.forEach(result => {
    if (result.statusCode === 200 && result.body.prs) {
      result.body.prs.forEach(pr => {
        prDetailsInputs.push({
          owner: result.body.owner,
          repo: result.body.repo,
          prNumber: pr.number,
        });
      });
    }
  });

  console.log(`Prepared ${prDetailsInputs.length} PRs for processing`);

  const responseBody = {
    since,
    until,
    sprintName,
    repos,
    readmeS3Key,
    s3Bucket: bucketName,
    prDetailsInputs,
    totalPRs: prDetailsInputs.length,
  };

  console.log('Response size:', Buffer.byteLength(JSON.stringify(responseBody), 'utf8'), 'bytes');

  return {
    statusCode: 200,
    body: responseBody,
  };
};

