import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@sprint/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sprint/shared')>()),
  listLatestKey: vi.fn(),
  getJson: vi.fn(),
  putMarkdown: vi.fn(),
  invokeModel: vi.fn(),
  parseModelJson: vi.fn(),
}));

import { listLatestKey, getJson, putMarkdown, invokeModel, parseModelJson } from '@sprint/shared';

const listLatestKeyMock = listLatestKey as Mock;
const getJsonMock = getJson as Mock;
const putMarkdownMock = putMarkdown as Mock;
const invokeModelMock = invokeModel as Mock;
const parseModelJsonMock = parseModelJson as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESULTS_BUCKET = 'test-bucket';
});

const ownerId = 'todd@bernsonfamily.com';

const baseEvent = {
  sprintName: 'Test Sprint',
  since: '2024-01-01T00:00:00Z',
  until: '2024-01-14T00:00:00Z',
  ownerId,
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
    expect(invokeModelMock).not.toHaveBeenCalled();
    expect(putMarkdownMock).not.toHaveBeenCalled();
  });

  it('returns warning body when loaded analyses lack metadata', async () => {
    listLatestKeyMock.mockResolvedValue(`users/${ownerId}/pr-analyses/acme/app/1/foo.json`);
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
    listLatestKeyMock.mockResolvedValue(`users/${ownerId}/pr-analyses/acme/app/1/foo.json`);
    getJsonMock.mockResolvedValue({
      owner: 'acme',
      repo: 'app',
      prNumber: 1,
      prTitle: 'Feature',
      analysis: 'Good work',
      metadata: { additions: 10, deletions: 2, changed_files: 3, merged_at: null, author: 'alice', labels: [] },
    });
    invokeModelMock.mockResolvedValue('{}');
    parseModelJsonMock.mockReturnValue({
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
    expect(body.markdownS3Key).toMatch(new RegExp(`^users/${ownerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/reports/test-sprint/.*\\.md$`));
    expect(body.s3Bucket).toBe('test-bucket');
    expect(putMarkdownMock).toHaveBeenCalledTimes(1);
  });
});

describe('buildMarkdownReport', () => {
  const data = {
    executiveSummary: { overview: 'Shipped billing.', keyOutcomes: ['Billing live'], risks: [] },
    keyMetricsDashboard: { summary: 'Steady.', metrics: [{ label: 'Median merge time', value: '19 h', context: 'a | b' }] },
    workBreakdown: { categories: [{ name: 'Features', description: 'New things.', items: ['Invoices'] }] },
    technicalHighlights: { highlights: ['Converse API'], decisions: [], qualityImprovements: [] },
    repositoryInsights: { repos: [{ name: 'acme/api', summary: 'Busy.', highlights: ['Billing'] }] },
    teamCollaboration: { summary: 'Shared load.', details: ['Pairing'] },
    sprintRetrospective: { wentWell: ['Scope'], toImprove: [], lessonsLearned: [] },
    recommendations: { nextSprintFocus: ['Alerts'], technicalDebt: [], processImprovements: [] },
  };
  const meta = {
    sprintName: 'Sprint 42',
    since: '10/1/2026',
    until: '10/14/2026',
    totalPRs: 18,
    totalAdditions: 4812,
    totalDeletions: 1276,
    totalFiles: 143,
    repoStats: [{ repo: 'acme/api', prs: 9, additions: 2904, deletions: 712 }],
    contributors: [['alex', 6], ['priya', 5]] as Array<[string, number]>,
  };

  it('leads with an At a Glance table that clients read for cover KPIs', async () => {
    const { buildMarkdownReport } = await import('../index');
    const md = buildMarkdownReport(data, meta);
    expect(md.startsWith('# Sprint Report: Sprint 42\n\n## At a Glance\n\n| Metric | Value |\n| --- | --- |\n')).toBe(true);
    expect(md).toContain('| Sprint period | 10/1/2026 – 10/14/2026 |');
    expect(md).toContain('| Lines added | +4,812 |');
    expect(md).toContain('| Lines deleted | -1,276 |');
    expect(md).toContain('| Contributors | 2 |');
  });

  it('uses headings and tables instead of nested bold bullets', async () => {
    const { buildMarkdownReport } = await import('../index');
    const md = buildMarkdownReport(data, meta);
    expect(md).toContain('### Key Outcomes\n\n- Billing live');
    expect(md).toContain('### Key Risks\n\n- None highlighted.');
    expect(md).toContain('### Features\n\nNew things.\n\n- Invoices');
    expect(md).toContain('| Repository | PRs | Added | Deleted |\n| --- | ---: | ---: | ---: |\n| acme/api | 9 | +2,904 | -712 |');
    expect(md).toContain('| Contributor | PRs |\n| --- | ---: |\n| alex | 6 |');
    expect(md).not.toMatch(/^- \*\*/m);
    expect(md).not.toMatch(/\n{3,}/);
  });

  it('escapes pipes inside table cells', async () => {
    const { buildMarkdownReport } = await import('../index');
    expect(buildMarkdownReport(data, meta)).toContain('| Median merge time | 19 h | a \\| b |');
  });
});
