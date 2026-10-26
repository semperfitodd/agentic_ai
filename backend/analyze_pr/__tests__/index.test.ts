jest.mock('@sprint/shared', () => ({
  ...jest.requireActual('@sprint/shared'),
  listLatestKey: jest.fn(),
  getJson: jest.fn(),
  putJson: jest.fn(),
  invokeClaude: jest.fn(),
}));

import { listLatestKey, getJson, putJson, invokeClaude } from '@sprint/shared';

const listLatestKeyMock = listLatestKey as jest.Mock;
const getJsonMock = getJson as jest.Mock;
const putJsonMock = putJson as jest.Mock;
const invokeClaudeMock = invokeClaude as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.RESULTS_BUCKET = 'test-bucket';
});

describe('lambda_analyze_pr handler', () => {
  const baseEvent = {
    owner: 'acme',
    repo: 'app',
    prNumber: 42,
    readmeS3Key: 'readmes/2024.json',
    s3Bucket: 'test-bucket',
  };

  it('returns 500 when PR details are missing in S3', async () => {
    getJsonMock.mockResolvedValueOnce({ 'acme/app': '# App' });
    listLatestKeyMock.mockResolvedValue(null);

    const { handler } = await import('../index');
    const result = await handler(baseEvent);

    expect(result.statusCode).toBe(500);
    expect(invokeClaudeMock).not.toHaveBeenCalled();
  });

  it('stores analysis and returns success', async () => {
    getJsonMock
      .mockResolvedValueOnce({ 'acme/app': '# App' })
      .mockResolvedValueOnce({
        owner: 'acme',
        repo: 'app',
        pr: {
          number: 42,
          title: 'Feature',
          body: 'Desc',
          state: 'closed',
          merged_at: '2024-01-05T00:00:00Z',
          user: { login: 'dev' },
          labels: [],
          html_url: 'https://github.com/acme/app/pull/42',
          additions: 10,
          deletions: 2,
          changed_files: 3,
        },
        comments: { issueComments: [], reviewComments: [] },
        reviews: [],
        files: [],
        statistics: {
          totalComments: 0,
          totalReviews: 0,
          totalFiles: 0,
          topFilesByChanges: [],
          participantCount: 0,
          discussionIntensity: 'low' as const,
        },
      });
    listLatestKeyMock.mockResolvedValue('pr-details/acme/app/42/foo.json');
    invokeClaudeMock.mockResolvedValue('## Analysis');
    putJsonMock.mockResolvedValue(undefined);

    const { handler } = await import('../index');
    const result = await handler(baseEvent);

    expect(result.statusCode).toBe(200);
    expect(invokeClaudeMock).toHaveBeenCalled();
    expect(putJsonMock).toHaveBeenCalled();
  });
});
