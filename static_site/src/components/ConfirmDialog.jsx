import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Dialog from './Dialog';

const ConfirmDialog = ({ open, title, message, confirmLabel, onConfirm, onCancel }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const confirm = async () => {
        setBusy(true);
        setError(null);
        try {
            await onConfirm();
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const cancel = () => {
        if (busy) return;
        setError(null);
        onCancel();
    };

    return (
        <Dialog open={open} onClose={cancel} size="sm" labelledBy="confirm-title" role="alertdialog" initialFocus=".confirm-cancel">
            <div className="confirm">
                <span className="icon-tile icon-tile-lg icon-tile-danger">
                    <AlertTriangle size={22} aria-hidden="true" />
                </span>
                <h2 id="confirm-title" className="text-h3">
                    {title}
                </h2>
                <p className="text-secondary">{message}</p>
                {error && (
                    <p className="field-error" role="alert">
                        {error}
                    </p>
                )}
                <div className="confirm-actions">
                    <button type="button" className="btn btn-secondary btn-md confirm-cancel" onClick={cancel} disabled={busy}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn-danger btn-md" onClick={confirm} disabled={busy}>
                        {busy && <Loader2 size={16} className="spin" aria-hidden="true" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Dialog>
    );
};

export default ConfirmDialog;
