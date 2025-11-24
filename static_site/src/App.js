import {useEffect, useState} from 'react';
import './App.css';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Footer from './components/Footer';
import ProgressTracker from './components/ProgressTracker';
import ReportModal from './components/ReportModal';
import {TOTAL_DURATION, WORKFLOW_STEPS} from './constants/workflowSteps';
import {fetchReport, startSprintAnalysis} from './utils/api';

function App() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [markdownReport, setMarkdownReport] = useState(null);
    const [fetchingReport, setFetchingReport] = useState(false);
    const [repos, setRepos] = useState([]);
    const [dateRange, setDateRange] = useState({since: '', until: ''});
    const [showReportModal, setShowReportModal] = useState(false);
    const [workflowComplete, setWorkflowComplete] = useState(false);

    useEffect(() => {
        if (!loading) return;

        const startTime = Date.now();
        let stepIndex = 0;
        let accumulatedTime = 0;

        const stepTimings = WORKFLOW_STEPS.map(step => {
            const start = accumulatedTime;
            accumulatedTime += (step.duration / 65) * TOTAL_DURATION;
            return {start, end: accumulatedTime};
        });

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progressPercent = Math.min((elapsed / TOTAL_DURATION) * 100, 100);

            setProgress(progressPercent);

            for (let i = 0; i < stepTimings.length; i++) {
                if (elapsed >= stepTimings[i].start && elapsed < stepTimings[i].end) {
                    if (stepIndex !== i) {
                        stepIndex = i;
                        setCurrentStep(i);
                        setCompletedSteps(Array.from({length: i}, (_, idx) => idx));
                    }
                    break;
                }
            }

            if (progressPercent >= 100) {
                setCompletedSteps(WORKFLOW_STEPS.map((_, idx) => idx));
                setWorkflowComplete(true);
                clearInterval(interval);
            }
        }, 50);

        return () => clearInterval(interval);
    }, [loading]);

    const runSprintAnalysis = async () => {
        setLoading(true);
        setError(null);
        setProgress(0);
        setCurrentStep(0);
        setCompletedSteps([]);
        setMarkdownReport(null);
        setWorkflowComplete(false);
        setShowReportModal(false);

        const startTime = Date.now();

        try {
            const result = await startSprintAnalysis();

            if (result.success) {
                setRepos(result.repos);
                setDateRange(result.dateRange);

                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, TOTAL_DURATION - elapsed);

                setTimeout(() => {
                    setLoading(false);
                    fetchReport(
                        result.executionArn,
                        setMarkdownReport,
                        setShowReportModal,
                        setFetchingReport,
                        setError
                    );
                }, remaining);
            } else {
                setError(result.error);
                setLoading(false);
            }
        } catch (err) {
            setError(err.message || 'Network error occurred');
            setLoading(false);
        }
    };

    return (
        <div className="App">
            <Header/>

            <main className="main">
                <Hero
                    loading={loading}
                    fetchingReport={fetchingReport}
                    onRunAnalysis={runSprintAnalysis}
                    repos={repos}
                    dateRange={dateRange}
                    completedSteps={completedSteps}
                />

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
                                {WORKFLOW_STEPS.map((step, index) => (
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
                                ))}
                            </div>
                        </div>

                        {fetchingReport && (
                            <div className="fetching-report">
                                <div className="spinner-large"></div>
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

                <Features/>
            </main>

            <Footer/>

            <ReportModal
                show={showReportModal}
                markdownReport={markdownReport}
                onClose={() => setShowReportModal(false)}
            />
        </div>
    );
}

export default App;
