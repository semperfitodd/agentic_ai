import { WORKFLOW_STEPS } from '../constants/workflowSteps';
import ProgressTracker from './ProgressTracker';

const RunAgentPage = ({
    loading,
    fetchingReport,
    onRunAnalysis,
    repos,
    dateRange,
    progress,
    currentStep,
    completedSteps,
    workflowComplete,
    error
}) => {
    const getButtonText = () => {
        if (loading) return 'Analysis in Progress...';
        if (fetchingReport) return 'Fetching Report...';
        return 'Run Sprint Analysis';
    };

    return (
        <section className="page run-page">
            <div className="container">
                <h1 className="page-title">Run Sprint Analysis</h1>
                <p className="page-subtitle">Start the AI-powered analysis of your repositories</p>

                <div className="run-card">
                    <div className="run-card-content">
                        <div className="run-icon">🚀</div>
                        <h2>Ready to Analyze</h2>
                        <p>
                            Click the button below to start the autonomous sprint analysis.
                            The AI agents will analyze your repositories and generate a comprehensive report.
                        </p>
                        <button
                            className="btn btn-primary btn-large"
                            onClick={onRunAnalysis}
                            disabled={loading || fetchingReport}
                        >
                            {getButtonText()}
                        </button>
                    </div>
                </div>

                {(loading || completedSteps.length > 0) && repos.length > 0 && (
                    <div className="analysis-info">
                        <div className="info-section">
                            <h3>Repositories</h3>
                            <ul className="repo-list">
                                {repos.map((repo, index) => (
                                    <li key={index}>
                                        <a href={`https://github.com/${repo}`} target="_blank" rel="noopener noreferrer">
                                            {repo}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="info-section">
                            <h3>Date Range</h3>
                            <p><strong>From:</strong> {new Date(dateRange.since).toLocaleDateString()}</p>
                            <p><strong>To:</strong> {new Date(dateRange.until).toLocaleDateString()}</p>
                        </div>
                    </div>
                )}

                {loading && (
                    <ProgressTracker
                        progress={progress}
                        currentStep={currentStep}
                        completedSteps={completedSteps}
                        loading={loading}
                    />
                )}

                {workflowComplete && (
                    <>
                        <div className="steps-completed">
                            <div className="steps-container">
                                {[...WORKFLOW_STEPS].reverse().map((step, reversedIndex) => {
                                    const index = WORKFLOW_STEPS.length - 1 - reversedIndex;
                                    return (
                                        <div key={index} className="step-item completed">
                                            <div className="step-indicator">
                                                <span className="step-check">✓</span>
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
                        {fetchingReport && (
                            <div className="fetching-report">
                                <div className="spinner-large" />
                                <p>Retrieving your sprint report...</p>
                            </div>
                        )}
                    </>
                )}

                {error && (
                    <div className="result-card error">
                        <h3>Error</h3>
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default RunAgentPage;
