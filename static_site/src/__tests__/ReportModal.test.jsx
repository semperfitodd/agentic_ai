import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportModal from '../components/ReportModal';
import { downloadPDF } from '../utils/pdfExport';
import sampleReport from './fixtures/sampleReport.md?raw';

vi.mock('../utils/pdfExport', () => ({ downloadPDF: vi.fn() }));

describe('ReportModal', () => {
    it('renders nothing when show is false', () => {
        render(<ReportModal show={false} markdownReport="# Report" onClose={vi.fn()} />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders nothing when markdownReport is null', () => {
        render(<ReportModal show={true} markdownReport={null} onClose={vi.fn()} />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders the cover, KPIs, contents, and body', () => {
        render(<ReportModal show={true} markdownReport={sampleReport} onClose={vi.fn()} />);
        const dialog = screen.getByRole('dialog', { name: 'Sprint 42 — Platform Hardening' });
        expect(dialog).toBeInTheDocument();
        expect(screen.getByText('Sprint Intelligence Report')).toBeInTheDocument();
        expect(screen.getByText('PRs merged').nextSibling).toHaveTextContent('18');
        expect(screen.getByRole('navigation', { name: 'Report contents' })).toHaveTextContent('Executive Summary');
        expect(screen.getByRole('heading', { level: 2, name: 'Executive Summary' })).toHaveAttribute('id', 'executive-summary');
        expect(screen.queryByRole('heading', { name: 'At a Glance' })).toBeNull();
    });

    it('calls onClose from the close button and Escape', () => {
        const onClose = vi.fn();
        render(<ReportModal show={true} markdownReport="# Report" onClose={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: 'Close report' }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('calls onClose when the overlay is pressed', () => {
        const onClose = vi.fn();
        render(<ReportModal show={true} markdownReport="# Report" onClose={onClose} />);
        fireEvent.mouseDown(document.querySelector('.dialog-overlay'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('exports the markdown as a PDF', async () => {
        render(<ReportModal show={true} markdownReport={sampleReport} onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));
        await waitFor(() => expect(downloadPDF).toHaveBeenCalledWith(sampleReport));
    });

    it('blocks hostile HTML and unsafe links in the report body', () => {
        const hostile = `# Hostile Report

<script>alert('x')</script>

<iframe src="https://evil.test"></iframe>

[javascript link](javascript:alert(1))

[safe link](https://example.com/safe)
`;
        render(<ReportModal show={true} markdownReport={hostile} onClose={vi.fn()} />);
        expect(document.querySelector('iframe')).toBeNull();
        expect(document.querySelector('script')).toBeNull();
        expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
        expect(document.querySelector('a[href="https://example.com/safe"]')).toBeInTheDocument();
    });

    it('copies the markdown to the clipboard', async () => {
        const writeText = vi.fn().mockResolvedValue();
        Object.assign(navigator, { clipboard: { writeText } });
        render(<ReportModal show={true} markdownReport="# Report" onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /copy markdown/i }));
        await waitFor(() => expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument());
        expect(writeText).toHaveBeenCalledWith('# Report');
    });
});
