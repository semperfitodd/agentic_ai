import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog with focus trap, Escape to close, scroll lock, and focus restore.
 * `size` is one of "sm" | "md" | "full"; `labelledBy` is the id of the visible heading.
 */
const Dialog = ({ open, onClose, labelledBy, size = 'md', className = '', initialFocus, role = 'dialog', children }) => {
    const panel = useRef(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    useEffect(() => {
        if (!open) return undefined;
        const previous = document.activeElement;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';

        const target = (initialFocus && panel.current?.querySelector(initialFocus)) || panel.current?.querySelector(FOCUSABLE) || panel.current;
        target?.focus({ preventScroll: true });

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                closeRef.current();
                return;
            }
            if (event.key !== 'Tab' || !panel.current) return;
            const items = [...panel.current.querySelectorAll(FOCUSABLE)];
            if (!items.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = overflow;
            previous?.focus?.({ preventScroll: true });
        };
    }, [open, initialFocus]);

    if (!open) return null;

    return (
        <div className="dialog-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div
                ref={panel}
                className={`dialog dialog-${size} ${className}`}
                role={role}
                aria-modal="true"
                aria-labelledby={labelledBy}
                tabIndex={-1}
            >
                {children}
            </div>
        </div>
    );
};

export default Dialog;
