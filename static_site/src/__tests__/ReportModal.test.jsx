import { render, screen, fireEvent } from '@testing-library/react';
import ReportModal from '../components/ReportModal';

vi.mock('../utils/pdfExport', () => ({ downloadPDF: vi.fn() }));
vi.mock('react-markdown', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('remark-gfm', () => ({ default: () => {} }));
vi.mock('rehype-raw', () => ({ default: () => {} }));

describe('ReportModal', () => {
    it('renders nothing when show is false', () => {
        const { container } = render(
            <ReportModal show={false} markdownReport="# Report" onClose={vi.fn()} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when markdownReport is null', () => {
        const { container } = render(
            <ReportModal show={true} markdownReport={null} onClose={vi.fn()} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders report content when shown with content', () => {
        render(
            <ReportModal show={true} markdownReport="# Sprint Report\nSome content" onClose={vi.fn()} />
        );
        expect(screen.getByText('Sprint Intelligence Report')).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
        const onClose = vi.fn();
        render(
            <ReportModal show={true} markdownReport="# Report" onClose={onClose} />
        );
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', () => {
        const onClose = vi.fn();
        const { container } = render(
            <ReportModal show={true} markdownReport="# Report" onClose={onClose} />
        );
        fireEvent.click(container.querySelector('.modal-overlay'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
