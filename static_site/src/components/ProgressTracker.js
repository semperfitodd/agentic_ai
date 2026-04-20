import { WORKFLOW_STEPS } from '../constants/workflowSteps';
import StepRow from './StepRow';

const getStepStatus = (index, currentStep, completedSteps) => {
    if (completedSteps.includes(index)) return 'completed';
    if (currentStep === index) return 'active';
    return 'pending';
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
                    return (
                        <StepRow
                            key={index}
                            step={step}
                            status={getStepStatus(index, currentStep, completedSteps)}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default ProgressTracker;
