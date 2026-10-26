jest.mock('@sprint/shared', () => ({
  ...jest.requireActual('@sprint/shared'),
  createOctokit: jest.fn(),
}));

import { createOctokit } from '@sprint/shared';

const createOctokitMock = createOctokit as jest.Mock;

beforeEach(() => {
  createOctokitMock.mockReset();
});

describe('lambda_fetch_repo_data handler', () => {
  const baseEvent = {
    owner: 'acme',
    repo: 'app',
    since: '2024-01-01T00:00:00Z',
    until: '2024-01-31T00:00:00Z',
    githubToken: 'ghp_test',
  };

  it('returns merged PRs in date range', async () => {
    createOctokitMock.mockReturnValue({
      repos: {
        getReadme: jest.fn().mockResolvedValue({
          data: { content: Buffer.from('# Readme').toString('base64') },
        }),
      },
      pulls: {
        list: jest.fn().mockResolvedValue({
          data: [
            {
              number: 1,
              title: 'Merged PR',
              html_url: 'https://github.com/acme/app/pull/1',
              merged_at: '2024-01-15T12:00:00Z',
              user: { login: 'dev' },
            },
            {
              number: 2,
              title: 'Outside range',
              html_url: 'https://github.com/acme/app/pull/2',
              merged_at: '2023-12-01T12:00:00Z',
              user: { login: 'dev' },
            },
          ],
        }),
      },
    });

    const { handler } = await import('../index');
    const result = await handler(baseEvent);
    expect(result.statusCode).toBe(200);
    const body = result.body as { prs: Array<{ number: number }>; readme: string };
    expect(body.readme).toContain('# Readme');
    expect(body.prs).toHaveLength(1);
    expect(body.prs[0].number).toBe(1);
  });
});
