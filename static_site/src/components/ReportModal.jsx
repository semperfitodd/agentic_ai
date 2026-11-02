import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CalendarRange, Check, Copy, Download, FileText, Loader2, X } from 'lucide-react';
import { MarkdownComponents } from '../constants/markdownComponents';
import { safeReportUrlTransform } from '../utils/safeReportUrl';
import { downloadPDF } from '../utils/pdfExport';
import { parseReport } from '../utils/reportSummary';
import Dialog from './Dialog';

const FEEDBACK_MS = 2200;

const useTransientState = (initial) => {
    const [value, setValue] = useState(initial);
    useEffect(() => {
        if (value === initial || value === 'busy') return undefined;
        const id = setTimeout(() => setValue(initial), FEEDBACK_MS);
        return () => clearTimeout(id);
    }, [value, initial]);
    return [value, setValue];
};

const useActiveSection = (container, sections, enabled) => {
    const [active, setActive] = useState(sections[0]?.id);
    useEffect(() => {
        if (!enabled || !container.current || typeof IntersectionObserver === 'undefined') return undefined;
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((entry) => entry.isIntersecting);
                if (visible.length) setActive(visible[0].target.id);
            },
            { root: container.current, rootMargin: '0px 0px -70% 0px' }
        );
        const root = container.current;
        root.querySelectorAll('.report-prose h2[id]').forEach((heading) => observer.observe(heading));
        const onScroll = () => {
            if (root.scrollTop < 8) setActive(sections[0]?.id);
        };
        root.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            observer.disconnect();
            root.removeEventListener('scroll', onScroll);
        };
    }, [container, sections, enabled]);
    return active;
};

const ReportModal = ({ show, markdownReport, onClose }) => {
    const report = useMemo(() => parseReport(markdownReport ?? ''), [markdownReport]);
    const generated = useMemo(
        () => new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        [markdownReport]
    );
    const scroller = useRef(null);
    const [copyState, setCopyState] = useTransientState('idle');
    const [pdfState, setPdfState] = useTransientState('idle');
    const open = Boolean(show && markdownReport);
    const activeSection = useActiveSection(scroller, report.sections, open);

    const copyMarkdown = async () => {
        try {
            await navigator.clipboard.writeText(markdownReport);
            setCopyState('done');
        } catch {
            setCopyState('failed');
        }
    };

    const exportPdf = async () => {
        setPdfState('busy');
        try {
            await downloadPDF(markdownReport);
            setPdfState('idle');
        } catch {
            setPdfState('failed');
        }
    };

    const jumpTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ block: 'start' });
    };

    return (
        <Dialog open={open} onClose={onClose} size="full" labelledBy="report-title" className="report" initialFocus=".report-close">
            <header className="report-toolbar">
                <div className="report-toolbar-title">
                    <span className="icon-tile icon-tile-sm">
                        <FileText size={16} aria-hidden="true" />
                    </span>
                    <div>
                        <span className="overline">Sprint report</span>
                        <p className="text-title truncate">{report.sprintName}</p>
                    </div>
                </div>
                <div className="report-toolbar-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={copyMarkdown}>
                        {copyState === 'done' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                        <span className="hide-sm">{copyState === 'done' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy markdown'}</span>
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={exportPdf}
                        disabled={pdfState === 'busy'}
                        aria-label={pdfState === 'idle' ? 'Download PDF' : undefined}
                    >
                        {pdfState === 'busy' ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                        {pdfState === 'busy' ? (
                            'Preparing…'
                        ) : pdfState === 'failed' ? (
                            'Retry PDF'
                        ) : (
                            <span>
                                <span className="hide-sm">Download </span>PDF
                            </span>
                        )}
                    </button>
                    <button type="button" className="icon-btn report-close" onClick={onClose} aria-label="Close report">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
                <span className="sr-only" aria-live="polite">
                    {copyState === 'done' ? 'Markdown copied' : ''}
                    {pdfState === 'failed' ? 'PDF export failed' : ''}
                </span>
            </header>

            <div className="report-scroll" ref={scroller}>
                <section className="report-cover">
                    <div className="report-cover-inner">
                        <span className="overline overline-inverse">
                            <span className="ember-dot" aria-hidden="true" />
                            Sprint Intelligence Report
                        </span>
                        <h1 id="report-title" className="text-h1">
                            {report.sprintName}
                        </h1>
                        <p className="report-cover-meta">
                            {report.period && (
                                <span>
                                    <CalendarRange size={16} aria-hidden="true" />
                                    {report.period}
                                </span>
                            )}
                            <span>Generated {generated}</span>
                        </p>
                        {report.kpis.length > 0 && (
                            <dl className="report-kpis">
                                {report.kpis.map((kpi) => (
                                    <div key={kpi.label} className="kpi kpi-inverse">
                                        <dt className="kpi-label">{kpi.label}</dt>
                                        <dd className="kpi-value">{kpi.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </div>
                </section>

                <div className="report-layout">
                    {report.sections.length > 1 && (
                        <nav className="report-toc" aria-label="Report contents">
                            <span className="overline">Contents</span>
                            <ol>
                                {report.sections.map((section) => (
                                    <li key={section.id}>
                                        <a
                                            href={`#${section.id}`}
                                            aria-current={activeSection === section.id ? 'true' : undefined}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                jumpTo(section.id);
                                            }}
                                        >
                                            {section.title}
                                        </a>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    )}
                    <article className="report-prose">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={MarkdownComponents}
                            urlTransform={safeReportUrlTransform}
                        >
                            {report.body}
                        </ReactMarkdown>
                    </article>
                </div>
            </div>
        </Dialog>
    );
};

export default ReportModal;
