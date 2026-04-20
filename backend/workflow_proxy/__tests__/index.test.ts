import { mockClient } from 'aws-sdk-client-mock';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const sfnMock = mockClient(SFNClient);

beforeEach(() => {
  sfnMock.reset();
  process.env.STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:123:stateMachine:test';
});

describe('lambda_workflow handler', () => {
  it('returns 202 with executionArn on success', async () => {
    sfnMock.on(StartExecutionCommand).resolves({
      executionArn: 'arn:aws:states:us-east-1:123:execution:test:run-1',
      startDate: new Date(),
    });

    const { handler } = await import('../index');
    const result = await handler({ body: '{"repos":["acme/app"],"since":"2024-01-01T00:00:00Z","until":"2024-01-14T00:00:00Z","githubToken":"ghp_test"}' });
    expect(result.statusCode).toBe(202);
    const body = JSON.parse(result.body);
    expect(body.executionArn).toBe('arn:aws:states:us-east-1:123:execution:test:run-1');
    expect(body.status).toBe('RUNNING');
  });

  it('returns 500 when STATE_MACHINE_ARN is missing', async () => {
    delete process.env.STATE_MACHINE_ARN;
    const { handler } = await import('../index');
    const result = await handler({ body: '{}' });
    expect(result.statusCode).toBe(500);
  });

  it('returns 500 when SFN throws', async () => {
    sfnMock.on(StartExecutionCommand).rejects(new Error('SFN error'));
    const { handler } = await import('../index');
    const result = await handler({ body: '{}' });
    expect(result.statusCode).toBe(500);
  });
});
