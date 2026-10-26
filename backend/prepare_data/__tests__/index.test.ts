jest.mock('@sprint/shared', () => ({
  ...jest.requireActual('@sprint/shared'),
  putJson: jest.fn(),
}));

import { putJson } from '@sprint/shared';

const putJsonMock = putJson as jest.Mock;

beforeEach(() => {
  putJsonMock.mockReset();
  putJsonMock.mockResolvedValue(undefined);
  process.env.RESULTS_BUCKET = 'test-bucket';
});

describe('lambda_prepare_data handler', () => {
  const baseEvent = {
    since: '2024-01-01T00:00:00Z',
    until: '2024-01-14T00:00:00Z',
    sprintName: 'Test Sprint',
    repos: [{ owner: 'acme', repo: 'app' }],
    repoDataResults: [
      {
        statusCode: 200,
        body: {
          owner: 'acme',
          repo: 'app',
          readme: '# App',
          prs: [
            {
              number: 42,
              title: 'Fix',
              html_url: 'https://github.com/acme/app/pull/42',
              merged_at: '2024-01-05T00:00:00Z',
              user: { login: 'dev' },
            },
          ],
        },
      },
    ],
  };

  it('writes readme map to S3 and returns prDetailsInputs', async () => {
    const { handler } = await import('../index');
    const result = await handler(baseEvent);
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body.totalPRs).toBe(1);
    expect(body.readmeS3Key).toMatch(/^readmes\//);
    expect(body.s3Bucket).toBe('test-bucket');
    expect(body.prDetailsInputs).toEqual([{ owner: 'acme', repo: 'app', prNumber: 42 }]);
    expect(putJsonMock).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when RESULTS_BUCKET is missing', async () => {
    delete process.env.RESULTS_BUCKET;
    const { handler } = await import('../index');
    await expect(handler(baseEvent)).rejects.toThrow(/RESULTS_BUCKET/);
  });
});
