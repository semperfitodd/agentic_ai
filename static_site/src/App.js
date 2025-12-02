import { useEffect, useState } from 'react';
import './App.css';
import Navigation from './components/Navigation';
import OverviewPage from './components/OverviewPage';
import FeaturesPage from './components/FeaturesPage';
import RunAgentPage from './components/RunAgentPage';
import Footer from './components/Footer';
import ReportModal from './components/ReportModal';
import SettingsModal from './components/SettingsModal';
import { TOTAL_DURATION, WORKFLOW_STEPS } from './constants/workflowSteps';
import { fetchReport, startSprintAnalysis } from './utils/api';

function App() {
    const [activePage, setActivePage] = useState('overview');
    const [showSettings, setShowSettings] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [markdownReport, setMarkdownReport] = useState(null);
    const [fetchingReport, setFetchingReport] = useState(false);
    const [repos, setRepos] = useState([]);
    const [dateRange, setDateRange] = useState({ since: '', until: '' });
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
            return { start, end: accumulatedTime };
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
                        setCompletedSteps(Array.from({ length: i }, (_, idx) => idx));
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
        setActivePage('run');
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

    const renderPage = () => {
        switch (activePage) {
            case 'overview':
                return <OverviewPage />;
            case 'features':
                return <FeaturesPage />;
            case 'run':
                return (
                    <RunAgentPage
                        loading={loading}
                        fetchingReport={fetchingReport}
                        onRunAnalysis={runSprintAnalysis}
                        repos={repos}
                        dateRange={dateRange}
                        progress={progress}
                        currentStep={currentStep}
                        completedSteps={completedSteps}
                        workflowComplete={workflowComplete}
                        error={error}
                    />
                );
            default:
                return <OverviewPage />;
        }
    };

    return (
        <div className="App">
            <Navigation
                activePage={activePage}
                onPageChange={setActivePage}
                onSettingsClick={() => setShowSettings(true)}
            />

            <main className="main">
                {renderPage()}
            </main>

            <Footer />

            <ReportModal
                show={showReportModal}
                markdownReport={markdownReport}
                onClose={() => setShowReportModal(false)}
            />
            
            <SettingsModal
                show={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </div>
    );
}

export default App;
