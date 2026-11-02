import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@sprint/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sprint/shared')>()),
  encryptGithubToken: vi.fn(),
}));

import { mockClient } from 'aws-sdk-client-mock';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { encryptGithubToken } from '@sprint/shared';

const sfnMock = mockClient(SFNClient);
const encryptGithubTokenMock = encryptGithubToken as Mock;

const caller = 'todd@bernsonfamily.com';

const authEvent = (body: string) => ({
  body,
  requestContext: {
    authorizer: {
      jwt: { claims: { username: caller } },
    },
  },
});

beforeEach(() => {
  sfnMock.reset();
  encryptGithubTokenMock.mockReset();
  encryptGithubTokenMock.mockImplementation(async (token?: string) => (token ? 'Y2lwaGVy' : ''));
  process.env.STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:123:stateMachine:test';
});

describe('lambda_workflow handler', () => {
  const requestBody = '{"repos":["acme/app"],"since":"2024-01-01T00:00:00Z","until":"2024-01-14T00:00:00Z","githubToken":"ghp_test"}';

  it('returns 401 without a username claim', async () => {
    const { handler } = await import('../index');
    const result = await handler({ body: requestBody });
    expect(result.statusCode).toBe(401);
  });

  it('returns 202 with executionArn on success', async () => {
    sfnMock.on(StartExecutionCommand).resolves({
      executionArn: 'arn:aws:states:us-east-1:123:execution:test:run-1',
      startDate: new Date(),
    });

    const { handler } = await import('../index');
    const result = await handler(authEvent(requestBody));
    expect(result.statusCode).toBe(202);
    const body = JSON.parse(result.body);
    expect(body.executionArn).toBe('arn:aws:states:us-east-1:123:execution:test:run-1');
    expect(body.status).toBe('RUNNING');
  });

  it('never passes the plaintext GitHub token to Step Functions', async () => {
    sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'arn' });
    const { handler } = await import('../index');
    await handler(authEvent(requestBody));

    const call = sfnMock.commandCalls(StartExecutionCommand)[0].args[0].input;
    expect(call.input).not.toContain('ghp_test');
    const input = JSON.parse(call.input ?? '{}');
    expect(input.githubToken).toBeUndefined();
    expect(input.ownerId).toBe(caller);
    expect(input.encryptedGithubToken).toBe('Y2lwaGVy');
    expect(encryptGithubTokenMock).toHaveBeenCalledWith('ghp_test', call.name);
  });

  it('passes an empty encryptedGithubToken when no token is supplied', async () => {
    sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'arn' });
    const { handler } = await import('../index');
    await handler(authEvent('{"repos":["acme/app"]}'));

    const input = JSON.parse(sfnMock.commandCalls(StartExecutionCommand)[0].args[0].input.input ?? '{}');
    expect(input.encryptedGithubToken).toBe('');
    expect(encryptGithubTokenMock).toHaveBeenCalledWith(undefined, expect.any(String));
  });

  it('ignores ownerId in the request body', async () => {
    sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'arn' });
    const { handler } = await import('../index');
    await handler(
      authEvent('{"repos":["acme/app"],"ownerId":"attacker@evil.com"}')
    );
    const input = JSON.parse(sfnMock.commandCalls(StartExecutionCommand)[0].args[0].input.input ?? '{}');
    expect(input.ownerId).toBe(caller);
  });

  it('returns 400 for a non-JSON body', async () => {
    const { handler } = await import('../index');
    const result = await handler(authEvent('not json'));
    expect(result.statusCode).toBe(400);
  });

  it('returns 500 when STATE_MACHINE_ARN is missing', async () => {
    delete process.env.STATE_MACHINE_ARN;
    const { handler } = await import('../index');
    const result = await handler(authEvent('{}'));
    expect(result.statusCode).toBe(500);
  });

  it('returns 500 when SFN throws', async () => {
    sfnMock.on(StartExecutionCommand).rejects(new Error('SFN error'));
    const { handler } = await import('../index');
    const result = await handler(authEvent('{}'));
    expect(result.statusCode).toBe(500);
  });
});
