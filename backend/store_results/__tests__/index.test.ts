import { handler } from '../index';

describe('lambda_store_results handler', () => {
  const validEvent = {
    statusCode: 200,
    body: {
      sprintName: 'Test Sprint',
      since: '2024-01-01T00:00:00Z',
      until: '2024-01-14T00:00:00Z',
      repos: [{ owner: 'acme', repo: 'app' }],
      totalPRs: 5,
      markdownS3Key: 'reports/test-sprint/2024-01.md',
      s3Bucket: 'test-bucket',
      generatedAt: new Date().toISOString(),
    },
  };

  it('returns 200 with s3Location on valid input', async () => {
    const result = await handler(validEvent);
    expect(result.statusCode).toBe(200);
    const body = result.body as any;
    expect(body.s3Location.bucket).toBe('test-bucket');
    expect(body.s3Location.markdownKey).toBe('reports/test-sprint/2024-01.md');
  });

  it('returns 500 when markdownS3Key is missing', async () => {
    const event = { ...validEvent, body: { ...validEvent.body, markdownS3Key: undefined } };
    const result = await handler(event as any);
    expect(result.statusCode).toBe(500);
  });

  it('returns 500 when s3Bucket is missing', async () => {
    const event = { ...validEvent, body: { ...validEvent.body, s3Bucket: undefined } };
    const result = await handler(event as any);
    expect(result.statusCode).toBe(500);
  });
});
