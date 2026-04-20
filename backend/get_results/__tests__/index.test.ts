import { mockClient } from 'aws-sdk-client-mock';
import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn';

const sfnMock = mockClient(SFNClient);

jest.mock('@sprint/shared', () => {
  const actual = jest.requireActual('@sprint/shared');
  return {
    ...actual,
    listObjects: jest.fn(),
    getText: jest.fn(),
    getJson: jest.fn(),
  };
});

import { listObjects } from '@sprint/shared';
const listObjectsMock = listObjects as jest.Mock;

beforeEach(() => {
  sfnMock.reset();
  jest.clearAllMocks();
  process.env.RESULTS_BUCKET = 'test-bucket';
  process.env.API_URL = 'https://api.example.com';
});

describe('lambda_get_results handler', () => {
  it('returns 400 when no query parameter provided', async () => {
    const { handler } = await import('../index');
    const result = await handler({ queryStringParameters: {} });
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toMatch(/missing/i);
  });

  it('returns execution status for executionArn query', async () => {
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'arn:test',
      status: 'RUNNING',
      startDate: new Date('2024-01-01'),
    });

    const { handler } = await import('../index');
    const result = await handler({
      queryStringParameters: { executionArn: 'arn:test' },
    });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('RUNNING');
  });

  it('filters .md files in list mode', async () => {
    listObjectsMock.mockResolvedValue([
      { key: 'reports/sprint/2024-01-01.md', size: 1000, lastModified: new Date() },
      { key: 'reports/sprint/2024-01-01.json', size: 500, lastModified: new Date() },
    ]);

    const { handler } = await import('../index');
    const result = await handler({ queryStringParameters: { list: 'true' } });
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.reports.every((r: { key: string }) => r.key.endsWith('.md'))).toBe(true);
    expect(body.count).toBe(1);
  });

  it('returns 500 when listObjects throws', async () => {
    listObjectsMock.mockRejectedValue(new Error('S3 error'));
    const { handler } = await import('../index');
    const result = await handler({ queryStringParameters: { list: 'true' } });
    expect(result.statusCode).toBe(500);
  });
});
