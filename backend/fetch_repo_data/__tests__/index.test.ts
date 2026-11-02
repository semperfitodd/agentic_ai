import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@sprint/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sprint/shared')>()),
  createOctokit: vi.fn(),
  decryptGithubToken: vi.fn(),
}));

import { decryptGithubToken, createOctokit } from '@sprint/shared';

const createOctokitMock = createOctokit as Mock;
const decryptGithubTokenMock = decryptGithubToken as Mock;

beforeEach(() => {
  createOctokitMock.mockReset();
  decryptGithubTokenMock.mockReset();
  decryptGithubTokenMock.mockResolvedValue('ghp_test');
});

describe('lambda_fetch_repo_data handler', () => {
  const baseEvent = {
    owner: 'acme',
    repo: 'app',
    since: '2024-01-01T00:00:00Z',
    until: '2024-01-31T00:00:00Z',
    encryptedGithubToken: 'Y2lwaGVy',
    executionName: 'exec-1',
  };

  it('returns merged PRs in date range', async () => {
    createOctokitMock.mockReturnValue({
      repos: {
        getReadme: vi.fn().mockResolvedValue({
          data: { content: Buffer.from('# Readme').toString('base64') },
        }),
      },
      pulls: {
        list: vi.fn().mockResolvedValue({
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

describe('lambda_fetch_repo_data token handling', () => {
  it('decrypts the token with the execution name before creating the client', async () => {
    createOctokitMock.mockReturnValue({
      repos: { getReadme: vi.fn().mockRejectedValue(new Error('none')) },
      pulls: { list: vi.fn().mockResolvedValue({ data: [] }) },
    });

    const { handler } = await import('../index');
    await handler({
      owner: 'acme',
      repo: 'app',
      since: '2024-01-01T00:00:00Z',
      until: '2024-01-31T00:00:00Z',
      encryptedGithubToken: 'Y2lwaGVy',
      executionName: 'exec-1',
    });

    expect(decryptGithubTokenMock).toHaveBeenCalledWith('Y2lwaGVy', 'exec-1');
    expect(createOctokitMock).toHaveBeenCalledWith('ghp_test');
  });

  it('returns 500 when the token cannot be decrypted', async () => {
    decryptGithubTokenMock.mockRejectedValue(new Error('InvalidCiphertextException'));
    const { handler } = await import('../index');
    const result = await handler({
      owner: 'acme',
      repo: 'app',
      since: '2024-01-01T00:00:00Z',
      until: '2024-01-31T00:00:00Z',
      encryptedGithubToken: 'Y2lwaGVy',
      executionName: 'other',
    });
    expect(result.statusCode).toBe(500);
    expect(createOctokitMock).not.toHaveBeenCalled();
  });
});
