import { Check } from 'lucide-react';

const StepRow = ({ step, status }) => {
    const isAI = step.type === 'AI';
    return (
        <li className={`step-row step-${status}`}>
            <span className={`step-indicator ${isAI ? 'step-ai' : ''}`} aria-hidden="true">
                {status === 'completed' && <Check size={14} strokeWidth={2.5} />}
                {status === 'active' && <span className="spinner spinner-sm" />}
            </span>
            <span className="step-name">{step.name}</span>
            <span className={`badge ${isAI ? 'badge-ai' : 'badge-neutral'}`}>{isAI ? 'AI' : 'System'}</span>
            <span className="sr-only">{status === 'completed' ? 'Completed' : status === 'active' ? 'In progress' : 'Pending'}</span>
        </li>
    );
};

export default StepRow;
