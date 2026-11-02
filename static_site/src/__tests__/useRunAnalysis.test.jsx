import { act, renderHook } from '@testing-library/react';
import { useRunAnalysis } from '../hooks/useRunAnalysis';
import { fetchReport, startSprintAnalysis } from '../utils/api';
import { TOTAL_DURATION, WORKFLOW_STEPS, stepIndexAt } from '../constants/workflowSteps';

vi.mock('../utils/api', () => ({ startSprintAnalysis: vi.fn(), fetchReport: vi.fn() }));

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
});

afterEach(() => vi.useRealTimers());

describe('useRunAnalysis', () => {
    it('moves from running to retrieving to ready and opens the report', async () => {
        startSprintAnalysis.mockResolvedValue({ success: true, executionArn: 'arn:1' });
        fetchReport.mockImplementation((_token, _arn, setReport, setShow) => {
            setReport('# Report');
            setShow(true);
        });
        const { result } = renderHook(() => useRunAnalysis());

        await act(() => result.current.start('token'));
        expect(result.current.status).toBe('running');

        await act(async () => vi.advanceTimersByTime(TOTAL_DURATION / 2));
        expect(result.current.progress).toBeGreaterThan(40);
        expect(result.current.currentStep).toBeGreaterThan(0);

        await act(async () => vi.advanceTimersByTime(TOTAL_DURATION));
        expect(fetchReport).toHaveBeenCalledWith(
            'token',
            'arn:1',
            expect.any(Function),
            expect.any(Function),
            expect.any(Function),
            expect.any(Function),
            expect.any(Function)
        );
        expect(result.current.status).toBe('ready');
        expect(result.current.report).toBe('# Report');
        expect(result.current.reportOpen).toBe(true);
    });

    it('surfaces a start failure as an error', async () => {
        startSprintAnalysis.mockResolvedValue({ success: false, error: 'At least one repository is required.' });
        const { result } = renderHook(() => useRunAnalysis());
        await act(() => result.current.start('token'));
        expect(result.current.status).toBe('error');
        expect(result.current.error).toMatch(/repository/);
    });

    it('surfaces a polling failure as an error', async () => {
        startSprintAnalysis.mockResolvedValue({ success: true, executionArn: 'arn:1' });
        fetchReport.mockImplementation((...args) => args[5]('Workflow execution failed: boom'));
        const { result } = renderHook(() => useRunAnalysis());
        await act(() => result.current.start('token'));
        await act(async () => vi.advanceTimersByTime(TOTAL_DURATION));
        expect(result.current.status).toBe('error');
        expect(result.current.error).toBe('Workflow execution failed: boom');
    });
});

describe('stepIndexAt', () => {
    it('walks through every step in order across the run duration', () => {
        expect(stepIndexAt(0, 1000)).toBe(0);
        expect(stepIndexAt(999, 1000)).toBe(WORKFLOW_STEPS.length - 1);
        expect(stepIndexAt(5000, 1000)).toBe(WORKFLOW_STEPS.length - 1);
        const seen = new Set(Array.from({ length: 1000 }, (_, ms) => stepIndexAt(ms, 1000)));
        expect(seen.size).toBe(WORKFLOW_STEPS.length);
    });
});
