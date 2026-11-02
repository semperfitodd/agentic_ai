import { render, screen } from '@testing-library/react';
import FeaturesPage from '../components/FeaturesPage';

describe('FeaturesPage', () => {
    it('shows the agent flow in order', () => {
        render(<FeaturesPage />);
        const flow = screen.getByRole('figure', { name: /flows through the agents/i });
        expect([...flow.querySelectorAll('.text-title')].map((n) => n.textContent)).toEqual(['Merged PRs', 'Nova analysis', 'Sprint report']);
    });

    it('reveals stats and cards without IntersectionObserver', () => {
        render(<FeaturesPage />);
        expect(screen.getByText('Workflow steps').nextSibling).toHaveAttribute('aria-label', '20');
        expect(document.querySelector('.feature-grid')).toHaveClass('is-visible');
        expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toContain('Smart categorization');
    });
});
