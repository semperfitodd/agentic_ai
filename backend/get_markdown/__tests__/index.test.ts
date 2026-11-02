import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@sprint/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sprint/shared')>();
  return {
    ...actual,
    getText: vi.fn(),
  };
});

import { getText } from '@sprint/shared';
const getTextMock = getText as Mock;

const caller = 'todd@bernsonfamily.com';
const ownKey = `users/${caller}/reports/test/2024-01.md`;

const authEvent = (queryStringParameters: Record<string, string>) => ({
  queryStringParameters,
  requestContext: {
    authorizer: {
      jwt: { claims: { username: caller } },
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESULTS_BUCKET = 'test-bucket';
});

describe('lambda_get_markdown handler', () => {
  it('returns 401 without a username claim', async () => {
    const { handler } = await import('../index');
    const result = await handler({ queryStringParameters: { key: ownKey } });
    expect(result.statusCode).toBe(401);
  });

  it('returns 400 when key is missing', async () => {
    const { handler } = await import('../index');
    const result = await handler(authEvent({}));
    expect(result.statusCode).toBe(400);
  });

  it('returns markdown content with text/markdown content-type', async () => {
    getTextMock.mockResolvedValue('# Sprint Report\nContent here');

    const { handler } = await import('../index');
    const result = await handler(authEvent({ key: ownKey }));
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Content-Type']).toBe('text/markdown');
    expect(result.body).toContain('# Sprint Report');
  });

  it('returns 403 for another user key', async () => {
    const { handler } = await import('../index');
    const result = await handler(authEvent({ key: 'users/other@example.com/reports/x.md' }));
    expect(result.statusCode).toBe(403);
    expect(getTextMock).not.toHaveBeenCalled();
  });

  it('returns 500 on S3 error', async () => {
    getTextMock.mockRejectedValue(new Error('Access denied'));
    const { handler } = await import('../index');
    const result = await handler(authEvent({ key: ownKey }));
    expect(result.statusCode).toBe(500);
  });
});
