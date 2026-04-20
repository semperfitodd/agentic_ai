import { handler } from '../index';

describe('lambda_parse_repos handler', () => {
  const baseEvent = {
    repos: ['owner/repo1', 'https://github.com/owner/repo2'],
    since: '2024-01-01T00:00:00Z',
    until: '2024-01-14T00:00:00Z',
    githubToken: 'ghp_test',
    sprintName: 'Test Sprint',
  };

  it('parses owner/repo format', async () => {
    const result = await handler({ ...baseEvent, repos: ['acme/my-app'] });
    expect(result.statusCode).toBe(200);
    expect((result.body as any).repos).toEqual([{ owner: 'acme', repo: 'my-app' }]);
  });

  it('parses full GitHub URL', async () => {
    const result = await handler({ ...baseEvent, repos: ['https://github.com/acme/my-app'] });
    expect(result.statusCode).toBe(200);
    expect((result.body as any).repos[0]).toEqual({ owner: 'acme', repo: 'my-app' });
  });

  it('parses SSH URL', async () => {
    const result = await handler({ ...baseEvent, repos: ['git@github.com:acme/my-app'] });
    expect(result.statusCode).toBe(200);
    expect((result.body as any).repos[0]).toEqual({ owner: 'acme', repo: 'my-app' });
  });

  it('passes through githubToken and dateRange', async () => {
    const result = await handler(baseEvent);
    const body = result.body as any;
    expect(body.githubToken).toBe('ghp_test');
    expect(body.since).toBe('2024-01-01T00:00:00Z');
    expect(body.until).toBe('2024-01-14T00:00:00Z');
    expect(body.sprintName).toBe('Test Sprint');
  });

  it('returns 200 with partial errors for mixed valid/invalid repos', async () => {
    const result = await handler({ ...baseEvent, repos: ['owner/repo1', 'not-a-valid-repo-no-slash!'] });
    expect(result.statusCode).toBe(200);
    const body = result.body as any;
    expect(body.repos.length).toBe(1);
    expect(body.parseErrors?.length).toBeGreaterThan(0);
  });

  it('returns 500 when all repos are invalid', async () => {
    const result = await handler({ ...baseEvent, repos: ['this is definitely invalid !!'] });
    expect(result.statusCode).toBe(500);
  });
});
