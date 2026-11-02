import { render, screen, fireEvent } from '@testing-library/react';
import SettingsModal from '../components/SettingsModal';

describe('SettingsModal', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('renders nothing when show is false', () => {
        render(<SettingsModal show={false} onClose={vi.fn()} />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders labelled inputs for every setting', () => {
        render(<SettingsModal show={true} onClose={vi.fn()} />);
        expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.getByLabelText('GitHub token')).toHaveAttribute('type', 'password');
        expect(screen.getByLabelText('Sprint name')).toBeInTheDocument();
        expect(screen.getByLabelText('Start date')).toBeInTheDocument();
        expect(screen.getByLabelText('End date')).toBeInTheDocument();
        expect(screen.getByLabelText('Repositories')).toBeInTheDocument();
    });

    it('calls onClose when Cancel is clicked', () => {
        const onClose = vi.fn();
        render(<SettingsModal show={true} onClose={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('saves the GitHub token to sessionStorage only', () => {
        render(<SettingsModal show={true} onClose={vi.fn()} />);
        fireEvent.change(screen.getByPlaceholderText(/leave blank for public repos/i), { target: { value: 'ghp_newtoken' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
        expect(sessionStorage.getItem('arc_github_token')).toBe('ghp_newtoken');
        expect(localStorage.getItem('arc_github_token')).toBeNull();
    });

    it('previews parsed repositories as chips', () => {
        render(<SettingsModal show={true} onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Repositories'), { target: { value: 'acme/api, acme/web' } });
        expect(screen.getByText('acme/api')).toHaveClass('chip');
        expect(screen.getByText('acme/web')).toHaveClass('chip');
    });

    it('blocks saving when the start date is after the end date', () => {
        render(<SettingsModal show={true} onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-10-14' } });
        fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-10-01' } });
        expect(screen.getByRole('alert')).toHaveTextContent(/start date must be on or before/i);
        expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
    });

    it('clears storage when Reset to defaults is clicked', () => {
        sessionStorage.setItem('arc_github_token', 'old_token');
        localStorage.setItem('arc_repos', 'owner/repo');
        render(<SettingsModal show={true} onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
        expect(sessionStorage.getItem('arc_github_token')).toBeNull();
        expect(localStorage.getItem('arc_repos')).toBeNull();
    });
});

describe('SettingsModal account deletion', () => {
    it('hides Delete account when signed out', () => {
        render(<SettingsModal show={true} onClose={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'Delete account' })).toBeNull();
    });

    it('calls onDeleteAccount when Delete account is clicked', () => {
        const onDeleteAccount = vi.fn();
        render(<SettingsModal show={true} onClose={vi.fn()} onDeleteAccount={onDeleteAccount} />);
        fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
        expect(onDeleteAccount).toHaveBeenCalledTimes(1);
    });
});
