import { render, screen, fireEvent } from '@testing-library/react';
import SettingsModal from '../components/SettingsModal';

describe('SettingsModal', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('renders nothing when show is false', () => {
        const { container } = render(<SettingsModal show={false} onClose={vi.fn()} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders all input fields when shown', () => {
        render(<SettingsModal show={true} onClose={vi.fn()} />);
        expect(screen.getByText('GitHub Token')).toBeInTheDocument();
        expect(screen.getByText('Sprint Name')).toBeInTheDocument();
        expect(screen.getByText('Repositories')).toBeInTheDocument();
        expect(screen.getByText('Date Range')).toBeInTheDocument();
    });

    it('calls onClose when Cancel is clicked', () => {
        const onClose = vi.fn();
        render(<SettingsModal show={true} onClose={onClose} />);
        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('saves the GitHub token to sessionStorage only', () => {
        render(<SettingsModal show={true} onClose={vi.fn()} />);
        const tokenInput = screen.getByPlaceholderText(/leave blank for public repos/i);
        fireEvent.change(tokenInput, { target: { value: 'ghp_newtoken' } });
        fireEvent.click(screen.getByText('Save Settings'));
        expect(sessionStorage.getItem('arc_github_token')).toBe('ghp_newtoken');
        expect(localStorage.getItem('arc_github_token')).toBeNull();
    });

    it('clears localStorage when Reset to Defaults is clicked', () => {
        sessionStorage.setItem('arc_github_token', 'old_token');
        localStorage.setItem('arc_repos', 'owner/repo');
        render(<SettingsModal show={true} onClose={vi.fn()} />);
        fireEvent.click(screen.getByText('Reset to Defaults'));
        expect(sessionStorage.getItem('arc_github_token')).toBeNull();
        expect(localStorage.getItem('arc_repos')).toBeNull();
    });
});

describe('SettingsModal account deletion', () => {
    it('hides Delete Account when signed out', () => {
        render(<SettingsModal show={true} onClose={vi.fn()} />);
        expect(screen.queryByText('Delete Account')).toBeNull();
    });

    it('calls onDeleteAccount when Delete Account is clicked', () => {
        const onDeleteAccount = vi.fn();
        render(<SettingsModal show={true} onClose={vi.fn()} onDeleteAccount={onDeleteAccount} />);
        fireEvent.click(screen.getByText('Delete Account'));
        expect(onDeleteAccount).toHaveBeenCalledTimes(1);
    });
});
