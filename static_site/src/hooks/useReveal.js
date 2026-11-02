import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Returns a ref and whether the element has scrolled into view (true immediately without IntersectionObserver). */
export const useReveal = (threshold = 0.2) => {
    const ref = useRef(null);
    const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

    useEffect(() => {
        if (visible || !ref.current) return undefined;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold }
        );
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [visible, threshold]);

    return [ref, visible];
};

/** Counts from 0 to `target` once `active` turns true; jumps straight to the target under reduced motion. */
export const useCountUp = (target, active, durationMs = 900) => {
    const [value, setValue] = useState(() => (typeof window === 'undefined' ? target : 0));

    useEffect(() => {
        if (!active) return undefined;
        if (prefersReducedMotion() || typeof requestAnimationFrame === 'undefined') {
            setValue(target);
            return undefined;
        }
        let frame;
        const start = performance.now();
        const step = (now) => {
            const t = Math.min((now - start) / durationMs, 1);
            setValue(Math.round(target * (1 - (1 - t) ** 3)));
            if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [target, active, durationMs]);

    return value;
};
