import { buildReportPdf, reportFileName, sanitizePdfText } from '../utils/pdfExport';
import sampleReport from './fixtures/sampleReport.md?raw';

const pdfText = (doc) => doc.output();

describe('buildReportPdf', () => {
    it('builds a paginated letter document with a cover, headers, and page numbers', async () => {
        const doc = await buildReportPdf(sampleReport, { generatedAt: new Date('2026-11-02T12:00:00Z') });
        const pages = doc.getNumberOfPages();
        const text = pdfText(doc);

        expect(pages).toBeGreaterThanOrEqual(3);
        expect(doc.internal.pageSize.getWidth()).toBeCloseTo(612);
        expect(doc.internal.pageSize.getHeight()).toBeCloseTo(792);
        expect(text).toContain('(SPRINT INTELLIGENCE REPORT)');
        expect(text).toContain('(IN THIS REPORT)');
        expect(text).toContain(`(Page 2 of ${pages})`);
        expect(text).toContain(`(Page ${pages} of ${pages})`);
        expect(text).not.toContain('(Page 1 of');
        expect(text).toContain('(Executive Summary)');
        expect(text).toContain('(Recommendations)');
    });

    it('paginates long reports without dropping content', async () => {
        const longReport = `${sampleReport}\n\n## Appendix\n\n${Array.from({ length: 120 }, (_, i) => `- Item ${i} with enough words to wrap across the page width when rendered in the PDF body text.`).join('\n')}`;
        const doc = await buildReportPdf(longReport);
        expect(doc.getNumberOfPages()).toBeGreaterThan(5);
        expect(pdfText(doc)).toMatch(/\(Item 119 with enough words/);
    });
});

describe('PDF helpers', () => {
    it('maps symbols outside WinAnsi and drops emoji', () => {
        expect(sanitizePdfText('a → b − c ⚠️ ok — “q”')).toBe('a -> b - c ok — “q”');
    });

    it('builds a dated, slugged file name', () => {
        expect(reportFileName('Sprint 42 — Platform Hardening', new Date('2026-11-02T00:00:00Z'))).toBe(
            'sprint-report-sprint-42-platform-hardening-2026-11-02.pdf'
        );
    });
});
