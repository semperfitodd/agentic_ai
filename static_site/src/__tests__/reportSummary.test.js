import { parseReport, parseTableRows, slugify } from '../utils/reportSummary';
import sampleReport from './fixtures/sampleReport.md?raw';

describe('parseReport', () => {
    it('extracts cover metadata from the At a Glance table', () => {
        const report = parseReport(sampleReport);
        expect(report.sprintName).toBe('Sprint 42 — Platform Hardening');
        expect(report.period).toBe('10/1/2026 – 10/14/2026');
        expect(report.kpis).toEqual([
            { label: 'PRs merged', value: '18' },
            { label: 'Lines added', value: '+4,812' },
            { label: 'Lines deleted', value: '-1,276' },
            { label: 'Files changed', value: '143' },
            { label: 'Contributors', value: '6' },
        ]);
    });

    it('removes the title and At a Glance section from the body', () => {
        const report = parseReport(sampleReport);
        expect(report.body.startsWith('## Executive Summary')).toBe(true);
        expect(report.body).not.toContain('At a Glance');
        expect(report.sections.map((s) => s.id)).toEqual([
            'executive-summary',
            'key-metrics',
            'work-breakdown',
            'technical-highlights',
            'repository-insights',
            'team-collaboration',
            'sprint-retrospective',
            'recommendations',
        ]);
    });

    it('reads the earlier bullet-list preamble format', () => {
        const legacy = [
            '# Sprint Report: Sprint 7',
            '',
            '- **Sprint Period**: 1/1/2024 to 1/14/2024',
            '- **Total PRs Merged**: 5',
            '- **Total Lines Added**: 120',
            '',
            '## Executive Summary',
            '',
            '- **Overview**: Steady sprint.',
        ].join('\n');
        const report = parseReport(legacy);
        expect(report.sprintName).toBe('Sprint 7');
        expect(report.period).toBe('1/1/2024 to 1/14/2024');
        expect(report.kpis).toEqual([
            { label: 'PRs Merged', value: '5' },
            { label: 'Lines Added', value: '120' },
        ]);
        expect(report.body).toBe('## Executive Summary\n\n- **Overview**: Steady sprint.');
    });

    it('keeps free text from reports without sections', () => {
        const empty = '# Sprint Report\n\n**Sprint:** Current sprint\n\n**Period:** a → b\n\nNo valid PR analyses.\n\n> ⚠️ All failed';
        const report = parseReport(empty);
        expect(report.sprintName).toBe('Current sprint');
        expect(report.period).toBe('a → b');
        expect(report.kpis).toEqual([]);
        expect(report.body).toBe('No valid PR analyses.\n\n> ⚠️ All failed');
    });
});

describe('helpers', () => {
    it('slugifies headings', () => {
        expect(slugify('Appendix: **Detailed** PR Analyses')).toBe('appendix-detailed-pr-analyses');
    });

    it('parses table rows and skips the divider, honoring escaped pipes', () => {
        expect(parseTableRows(['| A | B |', '| --- | ---: |', '| x \\| y | 2 |'])).toEqual([
            ['A', 'B'],
            ['x | y', '2'],
        ]);
    });
});
