import { WORKFLOW_STEPS } from '../constants/workflowSteps';

const getStepStatus = (index, currentStep, completedSteps) => {
    if (completedSteps.includes(index)) return 'completed';
    if (currentStep === index) return 'active';
    return 'pending';
};

const StepIndicator = ({ status }) => {
    if (status === 'completed') return <span className="step-check">✓</span>;
    if (status === 'active') return <span className="step-spinner" />;
    return <span className="step-dot" />;
};

const ProgressTracker = ({ progress, currentStep, completedSteps, loading }) => {
    if (!loading && completedSteps.length === 0) return null;

    const visibleSteps = WORKFLOW_STEPS.slice(0, currentStep + 1).reverse();

    return (
        <div className="progress-container">
            <div className="progress-header">
                <div className="progress-type">
                    {WORKFLOW_STEPS[currentStep] && (
                        <span className={`type-badge ${WORKFLOW_STEPS[currentStep].type.toLowerCase()}`}>
                            {WORKFLOW_STEPS[currentStep].type}
                        </span>
                    )}
                </div>
                <div className="progress-percent">{Math.round(progress)}%</div>
            </div>

            <div className="progress-bar-wrapper">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
                    <div className="progress-bar-glow" />
                </div>
            </div>

            <div className="steps-container">
                {visibleSteps.map((step, reversedIndex) => {
                    const index = currentStep - reversedIndex;
                    const status = getStepStatus(index, currentStep, completedSteps);
                    return (
                        <div key={index} className={`step-item ${status}`}>
                            <div className="step-indicator">
                                <StepIndicator status={status} />
                            </div>
                            <div className="step-content">
                                <div className="step-name">{step.name}</div>
                                <div className={`step-type ${step.type.toLowerCase()}`}>
                                    {step.type === 'AI' ? '🤖 AI Processing' : '⚙️ System Process'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgressTracker;
