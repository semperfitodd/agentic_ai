import { render, screen } from '@testing-library/react';
import ProgressTracker from '../components/ProgressTracker';

describe('ProgressTracker', () => {
    it('renders nothing when not loading and no completed steps', () => {
        const { container } = render(
            <ProgressTracker progress={0} currentStep={0} completedSteps={[]} loading={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders progress bar when loading', () => {
        render(
            <ProgressTracker progress={45} currentStep={2} completedSteps={[0, 1]} loading={true} />
        );
        expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('shows the current step type badge', () => {
        render(
            <ProgressTracker progress={20} currentStep={0} completedSteps={[]} loading={true} />
        );
        expect(screen.getByText('APPLICATION')).toBeInTheDocument();
    });
});
