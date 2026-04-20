jest.mock('@sprint/shared', () => {
  const actual = jest.requireActual('@sprint/shared');
  return {
    ...actual,
    getText: jest.fn(),
  };
});

import { getText } from '@sprint/shared';
const getTextMock = getText as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.RESULTS_BUCKET = 'test-bucket';
});

describe('lambda_get_markdown handler', () => {
  it('returns 400 when key is missing', async () => {
    const { handler } = await import('../index');
    const result = await handler({ queryStringParameters: {} });
    expect(result.statusCode).toBe(400);
  });

  it('returns markdown content with text/markdown content-type', async () => {
    getTextMock.mockResolvedValue('# Sprint Report\nContent here');

    const { handler } = await import('../index');
    const result = await handler({ queryStringParameters: { key: 'reports/test/2024-01.md' } });
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Content-Type']).toBe('text/markdown');
    expect(result.body).toContain('# Sprint Report');
  });

  it('returns 500 on S3 error', async () => {
    getTextMock.mockRejectedValue(new Error('Access denied'));
    const { handler } = await import('../index');
    const result = await handler({ queryStringParameters: { key: 'reports/test/report.md' } });
    expect(result.statusCode).toBe(500);
  });
});
