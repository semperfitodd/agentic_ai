import {
    startSprintAnalysis,
    fetchReport,
    extractMarkdownKey,
    extractEmptyReportBody,
    buildEmptyReportMarkdown,
} from '../utils/api';

global.fetch = jest.fn();

jest.mock('../config/settings', () => {
    const actual = jest.requireActual('../config/settings');
    return { ...actual, POLL_INTERVAL_MS: 0, MAX_POLL_ATTEMPTS: 3 };
});

beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
    process.env.REACT_APP_API_URL = 'https://api.example.com';
    process.env.REACT_APP_API_KEY = 'test-api-key';
    localStorage.setItem('arc_github_token', 'ghp_test_token');
    localStorage.setItem('arc_repos', 'owner/repo1');
    localStorage.setItem('arc_sprint_name', 'Test Sprint');
    localStorage.setItem('arc_since', '2024-01-01T00:00:00Z');
    localStorage.setItem('arc_until', '2024-01-14T00:00:00Z');
});

describe('startSprintAnalysis', () => {
    it('sends x-api-key header on every request', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ executionArn: 'arn:aws:states:us-east-1:123:execution:test:run-1' }),
        });

        await startSprintAnalysis();

        expect(fetch).toHaveBeenCalledTimes(1);
        const [, options] = fetch.mock.calls[0];
        expect(options.headers['x-api-key']).toBe('test-api-key');
    });

    it('POSTs to /sprint-intelligence with correct body', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ executionArn: 'arn:test' }),
        });

        await startSprintAnalysis();

        const [url, options] = fetch.mock.calls[0];
        expect(url).toContain('/sprint-intelligence');
        const body = JSON.parse(options.body);
        expect(body.githubToken).toBe('ghp_test_token');
        expect(body.repos).toEqual(['owner/repo1']);
        expect(body.sprintName).toBe('Test Sprint');
    });

    it('returns success with executionArn on 200', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ executionArn: 'arn:test:123' }),
        });

        const result = await startSprintAnalysis();
        expect(result.success).toBe(true);
        expect(result.executionArn).toBe('arn:test:123');
    });

    it('returns error when API responds with non-ok status', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 403,
            json: async () => ({ error: 'Forbidden' }),
        });

        const result = await startSprintAnalysis();
        expect(result.success).toBe(false);
        expect(result.error).toContain('Forbidden');
    });

    it('succeeds without a githubToken for public repos', async () => {
        localStorage.removeItem('arc_github_token');
        delete process.env.REACT_APP_GITHUB_TOKEN;
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ executionArn: 'arn:test:public' }),
        });

        const result = await startSprintAnalysis();
        expect(result.success).toBe(true);
        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body.githubToken).toBeFalsy();
    });

    it('returns error when repos list is empty', async () => {
        localStorage.setItem('arc_repos', '   ');

        const result = await startSprintAnalysis();
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/repositor/i);
    });

    it('returns network error on fetch failure', async () => {
        fetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await startSprintAnalysis();
        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
    });
});

describe('extractMarkdownKey', () => {
    it('returns top-level s3Location.markdownKey', () => {
        expect(extractMarkdownKey({ s3Location: { markdownKey: 'a.md' } })).toBe('a.md');
    });

    it('returns body.s3Location.markdownKey', () => {
        expect(extractMarkdownKey({ body: { s3Location: { markdownKey: 'c.md' } } })).toBe('c.md');
    });

    it('returns undefined when no key is present', () => {
        expect(extractMarkdownKey({ body: { totalPRs: 0 } })).toBeUndefined();
    });
});

describe('extractEmptyReportBody', () => {
    it('returns top-level body when present', () => {
        expect(extractEmptyReportBody({ body: { report: 'x' } })).toEqual({ report: 'x' });
    });

    it('returns null when body is absent', () => {
        expect(extractEmptyReportBody({})).toBeNull();
    });
});

describe('buildEmptyReportMarkdown', () => {
    it('returns null for missing or empty report text', () => {
        expect(buildEmptyReportMarkdown(null)).toBeNull();
        expect(buildEmptyReportMarkdown({ report: '' })).toBeNull();
        expect(buildEmptyReportMarkdown({ report: '   ' })).toBeNull();
    });

    it('builds a markdown doc with sprint metadata, period, and report text', () => {
        const md = buildEmptyReportMarkdown({
            sprintName: 'Test Sprint',
            since: '2024-01-01T00:00:00Z',
            until: '2024-01-14T00:00:00Z',
            report: 'No pull requests were merged during this sprint period.',
        });
        expect(md).toContain('# Sprint Report');
        expect(md).toContain('**Sprint:** Test Sprint');
        expect(md).toContain('**Period:** 2024-01-01T00:00:00Z → 2024-01-14T00:00:00Z');
        expect(md).toContain('No pull requests were merged');
    });

    it('includes a warning callout when warning is present', () => {
        const md = buildEmptyReportMarkdown({
            report: 'No valid PR analyses were available.',
            warning: 'All PR analyses failed validation',
        });
        expect(md).toContain('> ⚠️ All PR analyses failed validation');
    });
});

describe('fetchReport', () => {
    const setMarkdown = jest.fn();
    const setShowModal = jest.fn();
    const setFetchingReport = jest.fn();
    const setError = jest.fn();

    beforeEach(() => {
        setMarkdown.mockClear();
        setShowModal.mockClear();
        setFetchingReport.mockClear();
        setError.mockClear();
    });

    const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 10));

    it('opens the report modal with synthesized markdown when no markdownKey but report text is present', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                status: 'SUCCEEDED',
                output: {
                    body: {
                        sprintName: 'Current sprint',
                        since: '2025-11-20T00:00:00Z',
                        until: '2026-04-20T00:00:00Z',
                        totalPRs: 0,
                        report: 'No valid PR analyses were available to generate a sprint report.',
                        warning: 'All PR analyses failed validation',
                    },
                },
            }),
        });

        fetchReport('arn:test', setMarkdown, setShowModal, setFetchingReport, setError);
        await flushAsync();

        expect(setError).not.toHaveBeenCalled();
        expect(setShowModal).toHaveBeenCalledWith(true);
        const md = setMarkdown.mock.calls[0][0];
        expect(md).toContain('No valid PR analyses');
        expect(md).toContain('All PR analyses failed validation');
        expect(setFetchingReport).toHaveBeenLastCalledWith(false);
    });

    it('fetches markdown from /markdown when markdownKey is present', async () => {
        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'SUCCEEDED',
                    output: { s3Location: { markdownKey: 'reports/sprint/x.md' } },
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                text: async () => '# Real Report',
            });

        fetchReport('arn:test', setMarkdown, setShowModal, setFetchingReport, setError);
        await flushAsync();

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch.mock.calls[1][0]).toContain('/markdown?key=reports%2Fsprint%2Fx.md');
        expect(setMarkdown).toHaveBeenCalledWith('# Real Report');
        expect(setShowModal).toHaveBeenCalledWith(true);
        expect(setError).not.toHaveBeenCalled();
    });

    it('surfaces error when SUCCEEDED but no markdown key and no report text', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                status: 'SUCCEEDED',
                output: { body: { totalPRs: 5 } },
            }),
        });

        fetchReport('arn:test', setMarkdown, setShowModal, setFetchingReport, setError);
        await flushAsync();

        expect(setShowModal).not.toHaveBeenCalled();
        expect(setError).toHaveBeenCalledWith(expect.stringMatching(/no markdown key/i));
    });
});
