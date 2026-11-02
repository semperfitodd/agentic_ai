import {
    ArrowRight,
    BarChart3,
    Bot,
    FileText,
    FolderGit2,
    Lightbulb,
    ListChecks,
    Play,
    Search,
    Sparkles,
    Users,
} from 'lucide-react';

const PIPELINE = [
    {
        step: '01',
        title: 'Discover',
        Icon: Search,
        tone: 'accent',
        text: 'Fetches merged pull requests, diffs, reviews, and comments for every repository in your date range.',
    },
    {
        step: '02',
        title: 'Analyze',
        Icon: Bot,
        tone: 'ai',
        text: 'Amazon Nova on Bedrock reviews each PR like a senior engineer: intent, impact, risk, and quality.',
    },
    {
        step: '03',
        title: 'Synthesize',
        Icon: Sparkles,
        tone: 'ai',
        text: 'An aggregation agent turns individual analyses into an executive summary, metrics, and recommendations.',
    },
];

const DELIVERABLES = [
    { Icon: FileText, title: 'Executive summary', text: 'Outcomes and risks in plain language.' },
    { Icon: BarChart3, title: 'Key metrics', text: 'Throughput, review depth, and code churn.' },
    { Icon: ListChecks, title: 'Work breakdown', text: 'Features, fixes, and refactors by category.' },
    { Icon: FolderGit2, title: 'Repository insights', text: 'Per-repo activity and highlights.' },
    { Icon: Users, title: 'Team collaboration', text: 'Contributors and review patterns.' },
    { Icon: Lightbulb, title: 'Recommendations', text: 'Focus areas and debt for next sprint.' },
];

const PREVIEW_KPIS = [
    { label: 'PRs merged', value: '18' },
    { label: 'Lines added', value: '+4,812' },
    { label: 'Contributors', value: '6' },
];

const PREVIEW_SECTIONS = [
    { title: 'Executive Summary', fill: 0.92, items: 5 },
    { title: 'Work Breakdown', fill: 0.74, items: 7 },
    { title: 'Technical Highlights', fill: 0.58, items: 4 },
    { title: 'Recommendations', fill: 0.66, items: 3 },
];

const OverviewPage = ({ onNavigate }) => (
    <div className="page">
        <section className="hero container">
            <div className="hero-copy">
                <span className="badge badge-ai">
                    <Sparkles size={14} aria-hidden="true" />
                    Agentic sprint intelligence
                </span>
                <h1 className="text-display">Turn a sprint of pull requests into an executive-ready report.</h1>
                <p className="text-body-lg text-secondary">
                    Arc Agent fetches every merged PR, has Amazon Nova analyze each change, and synthesizes a structured
                    sprint report you can share as a polished PDF.
                </p>
                <div className="hero-actions">
                    <button type="button" className="btn btn-primary btn-lg" onClick={() => onNavigate('run')}>
                        <Play size={18} aria-hidden="true" />
                        Run an analysis
                    </button>
                    <button type="button" className="btn btn-secondary btn-lg" onClick={() => onNavigate('features')}>
                        See how it works
                        <ArrowRight size={18} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="hero-visual" aria-hidden="true">
                <div className="hero-glow" />
                <div className="preview-card">
                    <div className="preview-header">
                        <span className="icon-tile icon-tile-sm">
                            <FileText size={16} />
                        </span>
                        <div>
                            <div className="text-title">Sprint 42 — Platform Hardening</div>
                            <div className="text-caption text-tertiary">Oct 1 – Oct 14, 2026</div>
                        </div>
                    </div>
                    <div className="preview-kpis">
                        {PREVIEW_KPIS.map((kpi) => (
                            <div key={kpi.label} className="kpi kpi-compact">
                                <span className="kpi-label">{kpi.label}</span>
                                <span className="kpi-value">{kpi.value}</span>
                            </div>
                        ))}
                    </div>
                    <ul className="preview-sections">
                        {PREVIEW_SECTIONS.map(({ title, fill, items }, index) => (
                            <li key={title} style={{ '--i': index, '--fill': fill }}>
                                <span className="preview-dot" />
                                <span>{title}</span>
                                <span className="preview-bar">
                                    <span className="preview-fill" />
                                </span>
                                <span className="preview-count">{items}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>

        <section className="section container" aria-labelledby="how-it-works">
            <span className="overline">How it works</span>
            <h2 id="how-it-works" className="text-h1">
                Three agents, one report
            </h2>
            <ol className="pipeline">
                {PIPELINE.map(({ step, title, Icon, tone, text }) => (
                    <li key={step} className="card pipeline-card">
                        <div className="pipeline-head">
                            <span className={`icon-tile icon-tile-${tone}`}>
                                <Icon size={20} aria-hidden="true" />
                            </span>
                            <span className="pipeline-step">{step}</span>
                        </div>
                        <h3 className="text-h3">{title}</h3>
                        <p className="text-secondary">{text}</p>
                    </li>
                ))}
            </ol>
        </section>

        <section className="section container" aria-labelledby="deliverables">
            <span className="overline">Deliverables</span>
            <h2 id="deliverables" className="text-h1">
                What you&apos;ll receive
            </h2>
            <ul className="deliverables">
                {DELIVERABLES.map(({ Icon, title, text }) => (
                    <li key={title} className="deliverable">
                        <span className="icon-tile">
                            <Icon size={18} aria-hidden="true" />
                        </span>
                        <div>
                            <h3 className="text-title">{title}</h3>
                            <p className="text-small text-secondary">{text}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    </div>
);

export default OverviewPage;
