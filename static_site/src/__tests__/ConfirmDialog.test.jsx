import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfirmDialog from '../components/ConfirmDialog';

const renderDialog = (props = {}) =>
    render(
        <ConfirmDialog
            open={true}
            title="Delete your account?"
            message="This cannot be undone."
            confirmLabel="Delete account"
            onConfirm={vi.fn()}
            onCancel={vi.fn()}
            {...props}
        />
    );

describe('ConfirmDialog', () => {
    it('is an alert dialog that focuses Cancel first', () => {
        renderDialog();
        expect(screen.getByRole('alertdialog', { name: 'Delete your account?' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });

    it('traps focus within the dialog', () => {
        renderDialog();
        const cancel = screen.getByRole('button', { name: 'Cancel' });
        const confirm = screen.getByRole('button', { name: 'Delete account' });
        confirm.focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(cancel).toHaveFocus();
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
        expect(confirm).toHaveFocus();
    });

    it('shows the error when confirming fails', async () => {
        renderDialog({ onConfirm: vi.fn().mockRejectedValue(new Error('Account deletion failed (500)')) });
        fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Account deletion failed (500)'));
    });

    it('cancels with Escape', () => {
        const onCancel = vi.fn();
        renderDialog({ onCancel });
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});

describe('Dialog focus', () => {
    it('keeps focus where the user put it when the parent re-renders', () => {
        const { rerender } = renderDialog();
        const confirm = screen.getByRole('button', { name: 'Delete account' });
        confirm.focus();
        rerender(
            <ConfirmDialog open={true} title="Delete your account?" message="Changed" confirmLabel="Delete account" onConfirm={vi.fn()} onCancel={vi.fn()} />
        );
        expect(confirm).toHaveFocus();
    });
});
