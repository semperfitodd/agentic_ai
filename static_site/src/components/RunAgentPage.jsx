import { AlertTriangle, CalendarRange, CheckCircle2, FileText, FolderGit2, KeyRound, LogIn, Play, RotateCcw, SlidersHorizontal, Tag } from 'lucide-react';
import { parseRepos } from '../config/settings';
import ProgressTracker from './ProgressTracker';

const formatDate = (iso) =>
    iso
        ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
        : null;

export const formatPeriod = (since, until) => {
    const [from, to] = [formatDate(since), formatDate(until)];
    return from && to ? `${from} – ${to}` : 'Not set';
};

const ConfigRow = ({ Icon, label, children }) => (
    <div className="config-row">
        <dt className="overline">
            <Icon size={14} aria-hidden="true" />
            {label}
        </dt>
        <dd>{children}</dd>
    </div>
);

const ConfigCard = ({ settings, onEditSettings, disabled }) => {
    const repos = parseRepos(settings.repos);
    return (
        <section className="card config-card" aria-labelledby="config-title">
            <h2 id="config-title" className="text-title">
                Configuration
            </h2>
            <dl className="config-list">
                <ConfigRow Icon={Tag} label="Sprint">
                    {settings.sprintName}
                </ConfigRow>
                <ConfigRow Icon={CalendarRange} label="Period">
                    {formatPeriod(settings.since, settings.until)}
                </ConfigRow>
                <ConfigRow Icon={FolderGit2} label="Repositories">
                    {repos.length ? (
                        <ul className="chip-list">
                            {repos.map((repo) => (
                                <li key={repo} className="chip chip-mono">
                                    {repo}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <span className="text-tertiary">None configured</span>
                    )}
                </ConfigRow>
                <ConfigRow Icon={KeyRound} label="GitHub token">
                    {settings.githubToken ? (
                        <span className="badge badge-success">Session token set</span>
                    ) : (
                        <span className="badge badge-neutral">Public repos only</span>
                    )}
                </ConfigRow>
            </dl>
            <button type="button" className="btn btn-secondary btn-md btn-block" onClick={onEditSettings} disabled={disabled}>
                <SlidersHorizontal size={16} aria-hidden="true" />
                Edit settings
            </button>
        </section>
    );
};

const RunPanel = ({ status, progress, currentStep, elapsed, error, isAuthenticated, onRun, onOpenReport }) => {
    if (status === 'running' || status === 'retrieving') {
        return <ProgressTracker status={status} progress={progress} currentStep={currentStep} elapsed={elapsed} />;
    }

    if (status === 'ready') {
        return (
            <div className="run-state">
                <span className="icon-tile icon-tile-xl icon-tile-success">
                    <CheckCircle2 size={28} aria-hidden="true" />
                </span>
                <h2 className="text-h3">Your report is ready</h2>
                <p className="text-secondary">Open it to read the analysis, copy the markdown, or download a PDF.</p>
                <div className="run-actions">
                    <button type="button" className="btn btn-primary btn-lg" onClick={onOpenReport}>
                        <FileText size={18} aria-hidden="true" />
                        Open report
                    </button>
                    <button type="button" className="btn btn-secondary btn-lg" onClick={onRun}>
                        <RotateCcw size={18} aria-hidden="true" />
                        Run again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="run-state">
            {status === 'error' ? (
                <div className="alert alert-danger" role="alert">
                    <AlertTriangle size={20} aria-hidden="true" />
                    <div>
                        <p className="alert-title">Analysis failed</p>
                        <p>{error}</p>
                    </div>
                </div>
            ) : (
                <span className="icon-tile icon-tile-xl">
                    <Play size={26} aria-hidden="true" />
                </span>
            )}
            <h2 className="text-h3">{status === 'error' ? 'Ready to try again' : 'Ready when you are'}</h2>
            <p className="text-secondary">
                The agents will fetch every merged pull request in your period, analyze each change, and assemble a sprint report.
            </p>
            <button type="button" className="btn btn-primary btn-lg" onClick={onRun}>
                {isAuthenticated ? <Play size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
                {isAuthenticated ? (status === 'error' ? 'Try again' : 'Run sprint analysis') : 'Sign in to run'}
            </button>
            <p className="text-caption text-tertiary">Typically takes about a minute.</p>
        </div>
    );
};

const RunAgentPage = ({ settings, onEditSettings, ...panel }) => {
    const busy = panel.status === 'running' || panel.status === 'retrieving';
    return (
        <div className="page">
            <section className="container page-header">
                <span className="overline">Run agent</span>
                <h1 className="text-h1">Run sprint analysis</h1>
                <p className="text-body-lg text-secondary">Configure your sprint, then let the agents work.</p>
            </section>
            <div className="container run-layout">
                <ConfigCard settings={settings} onEditSettings={onEditSettings} disabled={busy} />
                <section className="card run-panel" aria-label="Run status" aria-busy={busy}>
                    <RunPanel {...panel} />
                </section>
            </div>
        </div>
    );
};

export default RunAgentPage;
