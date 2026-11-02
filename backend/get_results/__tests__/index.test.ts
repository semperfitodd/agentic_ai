import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

import { mockClient } from 'aws-sdk-client-mock';
import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn';

const sfnMock = mockClient(SFNClient);

vi.mock('@sprint/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sprint/shared')>();
  return {
    ...actual,
    listObjects: vi.fn(),
    getText: vi.fn(),
  };
});

import { listObjects, getText } from '@sprint/shared';
const listObjectsMock = listObjects as Mock;
const getTextMock = getText as Mock;

const caller = 'todd@bernsonfamily.com';

const authEvent = (queryStringParameters: Record<string, string>) => ({
  queryStringParameters,
  requestContext: {
    authorizer: {
      jwt: { claims: { username: caller } },
    },
  },
});

beforeEach(() => {
  sfnMock.reset();
  vi.clearAllMocks();
  process.env.RESULTS_BUCKET = 'test-bucket';
  process.env.API_URL = 'https://api.example.com';
});

describe('lambda_get_results handler', () => {
  it('returns 401 without a username claim', async () => {
    const { handler } = await import('../index');
    const result = await handler({ queryStringParameters: { list: 'true' } });
    expect(result.statusCode).toBe(401);
  });

  it('returns 400 when no query parameter provided', async () => {
    const { handler } = await import('../index');
    const result = await handler(authEvent({}));
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toMatch(/missing/i);
  });

  it('returns execution status when execution owner matches caller', async () => {
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'arn:test',
      status: 'RUNNING',
      startDate: new Date('2024-01-01'),
      input: JSON.stringify({ ownerId: caller }),
    });

    const { handler } = await import('../index');
    const result = await handler(authEvent({ executionArn: 'arn:test' }));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('RUNNING');
  });

  it('returns 404 for execution owned by another user', async () => {
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'arn:test',
      status: 'SUCCEEDED',
      input: JSON.stringify({ ownerId: 'other@example.com' }),
    });

    const { handler } = await import('../index');
    const result = await handler(authEvent({ executionArn: 'arn:test' }));
    expect(result.statusCode).toBe(404);
  });

  it('lists only under the caller reports prefix', async () => {
    listObjectsMock.mockResolvedValue([
      { key: `users/${caller}/reports/sprint/2024-01-01.md`, size: 1000, lastModified: new Date() },
      { key: `users/${caller}/reports/sprint/2024-01-01.json`, size: 500, lastModified: new Date() },
    ]);

    const { handler } = await import('../index');
    const result = await handler(authEvent({ list: 'true' }));
    expect(result.statusCode).toBe(200);
    expect(listObjectsMock).toHaveBeenCalledWith('test-bucket', `users/${caller}/reports/`, 50);
    const body = JSON.parse(result.body);
    expect(body.count).toBe(1);
  });

  it('returns 403 for a key outside the caller prefix', async () => {
    const { handler } = await import('../index');
    const result = await handler(
      authEvent({ key: 'users/other@example.com/reports/x.md' })
    );
    expect(result.statusCode).toBe(403);
    expect(getTextMock).not.toHaveBeenCalled();
  });

  it('returns 500 when listObjects throws', async () => {
    listObjectsMock.mockRejectedValue(new Error('S3 error'));
    const { handler } = await import('../index');
    const result = await handler(authEvent({ list: 'true' }));
    expect(result.statusCode).toBe(500);
  });
});
