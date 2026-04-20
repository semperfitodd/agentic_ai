jest.mock('@sprint/shared', () => ({
  ...jest.requireActual('@sprint/shared'),
  listLatestKey: jest.fn(),
  getJson: jest.fn(),
  putMarkdown: jest.fn(),
  invokeClaude: jest.fn(),
  parseJsonFromClaude: jest.fn(),
}));

import { listLatestKey, getJson, putMarkdown, invokeClaude, parseJsonFromClaude } from '@sprint/shared';

const listLatestKeyMock = listLatestKey as jest.Mock;
const getJsonMock = getJson as jest.Mock;
const putMarkdownMock = putMarkdown as jest.Mock;
const invokeClaudeMock = invokeClaude as jest.Mock;
const parseJsonFromClaudeMock = parseJsonFromClaude as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.RESULTS_BUCKET = 'test-bucket';
});

const baseEvent = {
  sprintName: 'Test Sprint',
  since: '2024-01-01T00:00:00Z',
  until: '2024-01-14T00:00:00Z',
  repos: [{ owner: 'acme', repo: 'app' }],
  analyses: [{ owner: 'acme', repo: 'app', prNumber: 1 }],
};

describe('lambda_aggregate_sprint handler', () => {
  it('throws when analyses array is missing', async () => {
    const { handler } = await import('../index');
    await expect(handler({ ...baseEvent, analyses: undefined } as any)).rejects.toThrow(/Analyses array/);
  });

  it('returns warning body without markdownS3Key when no valid analyses load', async () => {
    listLatestKeyMock.mockResolvedValue(null);

    const { handler } = await import('../index');
    const result = await handler(baseEvent);

    expect(result.statusCode).toBe(200);
    const body = result.body as any;
    expect(body.totalPRs).toBe(0);
    expect(body.markdownS3Key).toBeUndefined();
    expect(body.s3Bucket).toBeUndefined();
    expect(body.warning).toMatch(/failed validation/i);
    expect(invokeClaudeMock).not.toHaveBeenCalled();
    expect(putMarkdownMock).not.toHaveBeenCalled();
  });

  it('returns warning body when loaded analyses lack metadata', async () => {
    listLatestKeyMock.mockResolvedValue('pr-analyses/acme/app/1/foo.json');
    getJsonMock.mockResolvedValue({ owner: 'acme', repo: 'app', prNumber: 1, prTitle: 'x', analysis: 'y' });

    const { handler } = await import('../index');
    const result = await handler(baseEvent);

    expect(result.statusCode).toBe(200);
    const body = result.body as any;
    expect(body.totalPRs).toBe(0);
    expect(body.markdownS3Key).toBeUndefined();
    expect(body.warning).toBeDefined();
  });

  it('returns markdownS3Key and s3Bucket on success', async () => {
    listLatestKeyMock.mockResolvedValue('pr-analyses/acme/app/1/foo.json');
    getJsonMock.mockResolvedValue({
      owner: 'acme',
      repo: 'app',
      prNumber: 1,
      prTitle: 'Feature',
      analysis: 'Good work',
      metadata: { additions: 10, deletions: 2, changed_files: 3, merged_at: null, author: 'alice', labels: [] },
    });
    invokeClaudeMock.mockResolvedValue('{}');
    parseJsonFromClaudeMock.mockReturnValue({
      executiveSummary: { overview: 'o', keyOutcomes: [], risks: [] },
      keyMetricsDashboard: { summary: 's', metrics: [] },
      workBreakdown: { categories: [] },
      technicalHighlights: { highlights: [], decisions: [], qualityImprovements: [] },
      repositoryInsights: { repos: [] },
      teamCollaboration: { summary: 'c', details: [] },
      sprintRetrospective: { wentWell: [], toImprove: [], lessonsLearned: [] },
      recommendations: { nextSprintFocus: [], technicalDebt: [], processImprovements: [] },
    });

    const { handler } = await import('../index');
    const result = await handler(baseEvent);

    expect(result.statusCode).toBe(200);
    const body = result.body as any;
    expect(body.totalPRs).toBe(1);
    expect(body.markdownS3Key).toMatch(/^reports\/test-sprint\/.*\.md$/);
    expect(body.s3Bucket).toBe('test-bucket');
    expect(putMarkdownMock).toHaveBeenCalledTimes(1);
  });
});
