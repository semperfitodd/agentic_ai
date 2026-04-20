import { render, screen, fireEvent } from '@testing-library/react';
import SettingsModal from '../components/SettingsModal';

describe('SettingsModal', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('renders nothing when show is false', () => {
        const { container } = render(<SettingsModal show={false} onClose={jest.fn()} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders all input fields when shown', () => {
        render(<SettingsModal show={true} onClose={jest.fn()} />);
        expect(screen.getByText('GitHub Token')).toBeInTheDocument();
        expect(screen.getByText('Sprint Name')).toBeInTheDocument();
        expect(screen.getByText('Repositories')).toBeInTheDocument();
        expect(screen.getByText('Date Range')).toBeInTheDocument();
    });

    it('calls onClose when Cancel is clicked', () => {
        const onClose = jest.fn();
        render(<SettingsModal show={true} onClose={onClose} />);
        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('saves settings to localStorage when Save is clicked', () => {
        render(<SettingsModal show={true} onClose={jest.fn()} />);
        const tokenInput = screen.getByPlaceholderText(/leave blank for public repos/i);
        fireEvent.change(tokenInput, { target: { value: 'ghp_newtoken' } });
        fireEvent.click(screen.getByText('Save Settings'));
        expect(localStorage.getItem('arc_github_token')).toBe('ghp_newtoken');
    });

    it('clears localStorage when Reset to Defaults is clicked', () => {
        localStorage.setItem('arc_github_token', 'old_token');
        render(<SettingsModal show={true} onClose={jest.fn()} />);
        fireEvent.click(screen.getByText('Reset to Defaults'));
        expect(localStorage.getItem('arc_github_token')).toBeNull();
    });
});
