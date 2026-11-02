import { render, screen, fireEvent } from '@testing-library/react';
import RunAgentPage, { formatPeriod } from '../components/RunAgentPage';

const settings = {
    githubToken: '',
    repos: 'acme/api, acme/web',
    sprintName: 'Sprint 42',
    since: '2026-10-01T00:00:00Z',
    until: '2026-10-14T00:00:00Z',
};

const renderPage = (props = {}) =>
    render(
        <RunAgentPage
            settings={settings}
            onEditSettings={vi.fn()}
            status="idle"
            progress={0}
            currentStep={0}
            elapsed={0}
            error={null}
            isAuthenticated={true}
            onRun={vi.fn()}
            onOpenReport={vi.fn()}
            {...props}
        />
    );

describe('RunAgentPage', () => {
    it('summarizes the configuration', () => {
        renderPage();
        expect(screen.getByText('Sprint 42')).toBeInTheDocument();
        expect(screen.getByText('Oct 1, 2026 – Oct 14, 2026')).toBeInTheDocument();
        expect(screen.getByText('acme/api')).toBeInTheDocument();
        expect(screen.getByText('Public repos only')).toBeInTheDocument();
    });

    it('starts a run from the idle state', () => {
        const onRun = vi.fn();
        renderPage({ onRun });
        fireEvent.click(screen.getByRole('button', { name: 'Run sprint analysis' }));
        expect(onRun).toHaveBeenCalledTimes(1);
    });

    it('asks signed-out users to sign in', () => {
        renderPage({ isAuthenticated: false });
        expect(screen.getByRole('button', { name: 'Sign in to run' })).toBeInTheDocument();
    });

    it('shows progress and disables settings while running', () => {
        renderPage({ status: 'running', progress: 30, currentStep: 4 });
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Edit settings' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Run sprint analysis' })).toBeNull();
    });

    it('offers to reopen the report when ready', () => {
        const onOpenReport = vi.fn();
        renderPage({ status: 'ready', onOpenReport });
        fireEvent.click(screen.getByRole('button', { name: 'Open report' }));
        expect(onOpenReport).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Run again' })).toBeInTheDocument();
    });

    it('shows the error with a retry action', () => {
        renderPage({ status: 'error', error: 'Workflow execution failed: boom' });
        expect(screen.getByRole('alert')).toHaveTextContent('Workflow execution failed: boom');
        expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });
});

describe('formatPeriod', () => {
    it('falls back when dates are missing', () => {
        expect(formatPeriod('', '2026-10-14T00:00:00Z')).toBe('Not set');
    });
});
