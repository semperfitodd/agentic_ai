import { render, screen } from '@testing-library/react';
import ProgressTracker, { formatElapsed } from '../components/ProgressTracker';
import { WORKFLOW_STEPS } from '../constants/workflowSteps';

const aiStep = WORKFLOW_STEPS.findIndex((step) => step.type === 'AI');

describe('ProgressTracker', () => {
    it('shows percent, elapsed time, and the current step', () => {
        render(<ProgressTracker status="running" progress={45.4} currentStep={2} elapsed={23_000} />);
        expect(screen.getByText('45%')).toBeInTheDocument();
        expect(screen.getByText('0:23')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45');
        expect(screen.getAllByText(WORKFLOW_STEPS[2].name)).toHaveLength(2);
    });

    it('labels system and AI steps', () => {
        const { rerender } = render(<ProgressTracker status="running" progress={10} currentStep={0} elapsed={0} />);
        expect(screen.getByText('System process')).toBeInTheDocument();
        rerender(<ProgressTracker status="running" progress={60} currentStep={aiStep} elapsed={0} />);
        expect(screen.getByText('AI processing')).toBeInTheDocument();
    });

    it('lists only reached steps, newest first', () => {
        render(<ProgressTracker status="running" progress={20} currentStep={3} elapsed={0} />);
        const rows = screen.getByRole('list', { name: 'Workflow activity' }).querySelectorAll('li');
        expect(rows).toHaveLength(4);
        expect(rows[0]).toHaveClass('step-active');
        expect(rows[3]).toHaveClass('step-completed');
    });

    it('marks every step complete while retrieving the report', () => {
        render(<ProgressTracker status="retrieving" progress={100} currentStep={0} elapsed={61_000} />);
        expect(screen.getByText('Retrieving your report…')).toBeInTheDocument();
        const rows = screen.getByRole('list', { name: 'Workflow activity' }).querySelectorAll('li.step-completed');
        expect(rows).toHaveLength(WORKFLOW_STEPS.length);
    });
});

describe('formatElapsed', () => {
    it('formats minutes and zero-padded seconds', () => {
        expect(formatElapsed(0)).toBe('0:00');
        expect(formatElapsed(65_400)).toBe('1:05');
    });
});
