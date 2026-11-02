import { describe, it, expect, beforeEach } from 'vitest';

import { mockClient } from 'aws-sdk-client-mock';
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoMock = mockClient(CognitoIdentityProviderClient);

const eventFor = (claims: Record<string, string>) => ({
  requestContext: { authorizer: { claims } },
});

beforeEach(() => {
  cognitoMock.reset();
  process.env.USER_POOL_ID = 'us-east-1_test';
});

describe('lambda_delete_account handler', () => {
  it('deletes the Cognito username from payload 1.0 claims', async () => {
    cognitoMock.on(AdminDeleteUserCommand).resolves({});
    const { handler } = await import('../index');
    const result = await handler(
      eventFor({ sub: 'abc', username: 'google_12345', email: 'user@example.com' })
    );

    expect(result.statusCode).toBe(200);
    expect(cognitoMock.commandCalls(AdminDeleteUserCommand)[0].args[0].input).toEqual({
      UserPoolId: 'us-east-1_test',
      Username: 'google_12345',
    });
  });

  it('returns 401 without a username claim', async () => {
    const { handler } = await import('../index');
    const result = await handler(eventFor({ sub: 'abc', email: 'only-email@example.com' }));
    expect(result.statusCode).toBe(401);
    expect(cognitoMock.commandCalls(AdminDeleteUserCommand)).toHaveLength(0);
  });

  it('returns 500 when Cognito fails', async () => {
    cognitoMock.on(AdminDeleteUserCommand).rejects(new Error('UserNotFoundException'));
    const { handler } = await import('../index');
    const result = await handler(eventFor({ username: 'google_12345' }));
    expect(result.statusCode).toBe(500);
  });
});
