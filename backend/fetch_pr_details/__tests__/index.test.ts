jest.mock('@sprint/shared', () => ({
  ...jest.requireActual('@sprint/shared'),
  createOctokit: jest.fn(),
  putJson: jest.fn(),
}));

import { createOctokit, putJson } from '@sprint/shared';

const createOctokitMock = createOctokit as jest.Mock;
const putJsonMock = putJson as jest.Mock;

beforeEach(() => {
  createOctokitMock.mockReset();
  putJsonMock.mockReset();
  putJsonMock.mockResolvedValue(undefined);
  process.env.RESULTS_BUCKET = 'test-bucket';
});

describe('lambda_fetch_pr_details handler', () => {
  const baseEvent = {
    owner: 'acme',
    repo: 'app',
    prNumber: 7,
    githubToken: 'ghp_test',
  };

  it('fetches PR data and writes summary to S3', async () => {
    const prData = {
      number: 7,
      title: 'Fix bug',
      body: 'Details',
      state: 'closed',
      merged_at: '2024-01-10T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z',
      user: { login: 'dev' },
      labels: [{ name: 'bug' }],
      html_url: 'https://github.com/acme/app/pull/7',
      additions: 5,
      deletions: 1,
      changed_files: 2,
    };

    createOctokitMock.mockReturnValue({
      pulls: {
        get: jest.fn().mockResolvedValue({ data: prData }),
        listReviewComments: jest.fn().mockResolvedValue({ data: [] }),
        listReviews: jest.fn().mockResolvedValue({
          data: [{ user: { login: 'rev' }, state: 'APPROVED', body: 'LGTM', submitted_at: '2024-01-09T00:00:00Z' }],
        }),
        listFiles: jest.fn().mockResolvedValue({
          data: [{ filename: 'src/a.ts', status: 'modified', additions: 5, deletions: 1, changes: 6 }],
        }),
      },
      issues: {
        listComments: jest.fn().mockResolvedValue({ data: [] }),
      },
    });

    const { handler } = await import('../index');
    const result = await handler(baseEvent);

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ owner: 'acme', repo: 'app', prNumber: 7 });
    expect(putJsonMock).toHaveBeenCalledTimes(1);
  });
});
