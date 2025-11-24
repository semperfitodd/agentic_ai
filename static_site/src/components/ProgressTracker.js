import React from 'react';
import {WORKFLOW_STEPS} from '../constants/workflowSteps';

const ProgressTracker = ({progress, currentStep, completedSteps, loading}) => {
    if (!loading && completedSteps.length === 0) return null;

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
                <div
                    className="progress-bar-fill"
                    style={{width: `${progress}%`}}
                >
                    <div className="progress-bar-glow"></div>
                </div>
            </div>

            <div className="steps-container">
                {WORKFLOW_STEPS.map((step, index) => (
                    <div
                        key={index}
                        className={`step-item ${
                            completedSteps.includes(index) ? 'completed' :
                                currentStep === index ? 'active' :
                                    'pending'
                        }`}
                    >
                        <div className="step-indicator">
                            {completedSteps.includes(index) ? (
                                <span className="step-check">✓</span>
                            ) : currentStep === index ? (
                                <span className="step-spinner"></span>
                            ) : (
                                <span className="step-dot"></span>
                            )}
                        </div>
                        <div className="step-content">
                            <div className="step-name">{step.name}</div>
                            <div className={`step-type ${step.type.toLowerCase()}`}>
                                {step.type === 'AI' ? '🤖 AI Processing' : '⚙️ System Process'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProgressTracker;

