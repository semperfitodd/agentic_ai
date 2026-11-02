const StepRow = ({ step, status }) => (
    <div className={`step-item ${status}`}>
        <div className="step-indicator">
            {status === 'completed' && <span className="step-check">&#10003;</span>}
            {status === 'active' && <span className="step-spinner" />}
            {status === 'pending' && <span className="step-dot" />}
        </div>
        <div className="step-content">
            <div className="step-name">{step.name}</div>
            <div className={`step-type ${step.type.toLowerCase()}`}>
                {step.type === 'AI' ? 'AI Processing' : 'System Process'}
            </div>
        </div>
    </div>
);

export default StepRow;
