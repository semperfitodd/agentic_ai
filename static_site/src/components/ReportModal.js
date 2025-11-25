import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {MarkdownComponents} from '../constants/markdownComponents';
import {downloadPDF} from '../utils/pdfExport';

const ReportModal = ({show, markdownReport, onClose}) => {
    if (!show || !markdownReport) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    ×
                </button>
                <div className="markdown-report">
                    <div className="report-header">
                        <h2>Sprint Intelligence Report</h2>
                        <div className="report-header-actions">
                            <p className="report-timestamp">Generated: {new Date().toLocaleString()}</p>
                            <button className="btn btn-download" onClick={downloadPDF}>
                                📥 Download PDF
                            </button>
                        </div>
                    </div>
                    <div className="report-content">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={MarkdownComponents}
                        >
                            {markdownReport}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;

