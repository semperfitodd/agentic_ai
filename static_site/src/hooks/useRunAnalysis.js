import { useCallback, useEffect, useRef, useState } from 'react';
import { stepIndexAt, TOTAL_DURATION } from '../constants/workflowSteps';
import { fetchReport, startSprintAnalysis } from '../utils/api';

const TICK_MS = 100;

/**
 * Drives the run experience: idle → running → retrieving → ready, or error.
 * Step progress is time-based while the Step Functions execution runs; the
 * report is then polled from the API.
 */
export const useRunAnalysis = () => {
    const [status, setStatus] = useState('idle');
    const [elapsed, setElapsed] = useState(0);
    const [error, setError] = useState(null);
    const [report, setReport] = useState(null);
    const [reportOpen, setReportOpen] = useState(false);
    const handoff = useRef(null);
    const startedAt = useRef(0);
    const pollGeneration = useRef(0);

    const ticking = status === 'running' || status === 'retrieving';

    useEffect(() => {
        if (!ticking) return undefined;
        const id = setInterval(() => setElapsed(Date.now() - startedAt.current), TICK_MS);
        return () => clearInterval(id);
    }, [ticking]);

    useEffect(() => () => clearTimeout(handoff.current), []);

    const fail = useCallback((message) => {
        setError(message);
        setStatus('error');
    }, []);

    const reset = useCallback(() => {
        pollGeneration.current += 1;
        clearTimeout(handoff.current);
        handoff.current = null;
        setStatus('idle');
        setElapsed(0);
        setError(null);
        setReport(null);
        setReportOpen(false);
    }, []);

    const start = useCallback(
        async (accessToken) => {
            clearTimeout(handoff.current);
            const generation = pollGeneration.current + 1;
            pollGeneration.current = generation;
            startedAt.current = Date.now();
            setElapsed(0);
            setError(null);
            setReport(null);
            setReportOpen(false);
            setStatus('running');

            const shouldContinue = () => pollGeneration.current === generation;

            try {
                const result = await startSprintAnalysis(accessToken);
                if (!shouldContinue()) return;
                if (!result.success) {
                    fail(result.error);
                    return;
                }
                const remaining = Math.max(0, TOTAL_DURATION - (Date.now() - startedAt.current));
                handoff.current = setTimeout(() => {
                    if (!shouldContinue()) return;
                    setStatus('retrieving');
                    fetchReport(
                        accessToken,
                        result.executionArn,
                        (md) => {
                            if (shouldContinue()) setReport(md);
                        },
                        (open) => {
                            if (!shouldContinue() || !open) return;
                            setStatus('ready');
                            setReportOpen(true);
                        },
                        () => {},
                        (message) => {
                            if (shouldContinue()) fail(message);
                        },
                        shouldContinue
                    );
                }, remaining);
            } catch (err) {
                if (shouldContinue()) fail(err.message || 'Network error occurred');
            }
        },
        [fail]
    );

    const progress = status === 'running' ? Math.min((elapsed / TOTAL_DURATION) * 100, 100) : status === 'idle' ? 0 : 100;
    const currentStep = status === 'running' ? stepIndexAt(elapsed) : 0;

    return { status, elapsed, progress, currentStep, error, report, reportOpen, setReportOpen, start, reset };
};
