import { Bot, Cog } from 'lucide-react';
import { PHASES, phaseProgress, WORKFLOW_STEPS } from '../constants/workflowSteps';
import StepRow from './StepRow';

export const formatElapsed = (ms) => {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const ProgressTracker = ({ status, progress, currentStep, elapsed }) => {
    const retrieving = status === 'retrieving';
    const step = WORKFLOW_STEPS[currentStep];
    const isAI = !retrieving && step.type === 'AI';
    const visible = retrieving ? WORKFLOW_STEPS.map((_, i) => i).reverse() : Array.from({ length: currentStep + 1 }, (_, i) => currentStep - i);
    const percent = Math.round(progress);

    return (
        <div className="progress">
            <div className="progress-head">
                <span className={`badge ${isAI ? 'badge-ai' : 'badge-accent'}`}>
                    {isAI ? <Bot size={14} aria-hidden="true" /> : <Cog size={14} aria-hidden="true" />}
                    {retrieving ? 'Finishing up' : isAI ? 'AI processing' : 'System process'}
                </span>
                <span className="progress-elapsed" aria-label={`Elapsed ${formatElapsed(elapsed)}`}>
                    {formatElapsed(elapsed)}
                </span>
                <span className="progress-percent">{percent}%</span>
            </div>

            <div
                className="phases"
                role="progressbar"
                aria-label="Sprint analysis progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
            >
                {PHASES.map((phase) => {
                    const fill = phaseProgress(phase.id, currentStep, retrieving);
                    const active = fill > 0 && fill < 1;
                    return (
                        <div key={phase.id} className={`phase ${active ? 'phase-active' : ''} ${fill === 1 ? 'phase-done' : ''}`}>
                            <div className="phase-track">
                                <div className="phase-fill" style={{ '--fill': fill }} />
                            </div>
                            <span className="phase-label">{phase.label}</span>
                        </div>
                    );
                })}
            </div>

            <p className="progress-current" aria-live="polite">
                <span key={retrieving ? 'retrieving' : currentStep}>{retrieving ? 'Retrieving your report…' : step.name}</span>
            </p>

            {retrieving && (
                <div className="skeleton-group" aria-hidden="true">
                    <span className="skeleton" style={{ width: '92%' }} />
                    <span className="skeleton" style={{ width: '76%' }} />
                    <span className="skeleton" style={{ width: '84%' }} />
                </div>
            )}

            <ol className="activity" aria-label="Workflow activity">
                {visible.map((index) => (
                    <StepRow
                        key={index}
                        step={WORKFLOW_STEPS[index]}
                        status={!retrieving && index === currentStep ? 'active' : 'completed'}
                    />
                ))}
            </ol>
        </div>
    );
};

export default ProgressTracker;
