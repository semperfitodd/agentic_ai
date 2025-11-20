import { useState, useEffect } from 'react';
import './App.css';
import bscLogo from './bsc-logo.svg';

const WORKFLOW_STEPS = [
  { name: 'Initializing Step Functions Workflow', type: 'APPLICATION', duration: 2 },
  { name: 'Parsing Repository URLs and Validating Format', type: 'APPLICATION', duration: 2 },
  { name: 'Fetching Repository Metadata from GitHub API', type: 'APPLICATION', duration: 3 },
  { name: 'Mapping Repositories for Parallel Processing', type: 'APPLICATION', duration: 2 },
  { name: 'Preparing Pull Request Dataset and Filtering', type: 'APPLICATION', duration: 3 },
  { name: 'Validating PR Count and Date Ranges', type: 'APPLICATION', duration: 2 },
  { name: 'Fetching Detailed PR Information (Comments, Reviews, Files)', type: 'APPLICATION', duration: 4 },
  { name: 'Intelligent Data Summarization for Payload Optimization', type: 'APPLICATION', duration: 3 },
  { name: 'AI Analysis: Reading Code Changes and Diffs', type: 'AI', duration: 5 },
  { name: 'AI Analysis: Evaluating Code Quality and Best Practices', type: 'AI', duration: 5 },
  { name: 'AI Analysis: Assessing Impact and Risk Level', type: 'AI', duration: 4 },
  { name: 'AI Analysis: Categorizing PR Type (Feature/Bug/Refactor)', type: 'AI', duration: 4 },
  { name: 'Writing Individual PR Analyses to S3', type: 'APPLICATION', duration: 3 },
  { name: 'Collecting All PR Analysis References', type: 'APPLICATION', duration: 2 },
  { name: 'AI Aggregation: Loading PR Analyses from S3', type: 'APPLICATION', duration: 3 },
  { name: 'AI Aggregation: Synthesizing Cross-PR Insights', type: 'AI', duration: 5 },
  { name: 'AI Aggregation: Calculating Sprint Metrics and Trends', type: 'AI', duration: 5 },
  { name: 'AI Aggregation: Generating Executive Summary', type: 'AI', duration: 5 },
  { name: 'Writing Final Sprint Report to S3', type: 'APPLICATION', duration: 3 },
  { name: 'Generating Report Metadata and Keys', type: 'APPLICATION', duration: 2 },
];

const TOTAL_DURATION = 50000;

// Convert markdown to HTML for report display
function parseMarkdown(markdown) {
  if (!markdown) return '';
  
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  html = '<p>' + html + '</p>';
  html = html.replace(/(<li>.*?<\/li>)/gis, (match) => '<ul>' + match + '</ul>');
  
  return html;
}

function App() {
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

  const fetchReport = async (executionArn) => {
    setFetchingReport(true);
    const maxAttempts = 30;
    let attempts = 0;

    const pollReport = async () => {
      try {
        const resultsUrl = `${process.env.REACT_APP_API_URL}/results?executionArn=${encodeURIComponent(executionArn)}`;
        const response = await fetch(resultsUrl, {
          headers: {
            'x-api-key': process.env.REACT_APP_API_KEY,
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        if (data.status === 'SUCCEEDED' && data.output) {
          const output = data.output;
          
          let markdownKey = null;
          if (output.storedResults?.body?.s3Location?.markdownKey) {
            markdownKey = output.storedResults.body.s3Location.markdownKey;
          } else if (output.body?.s3Location?.markdownKey) {
            markdownKey = output.body.s3Location.markdownKey;
          }
          
          if (markdownKey) {
            const markdownUrl = `${process.env.REACT_APP_API_URL}/markdown?key=${encodeURIComponent(markdownKey)}`;
            const markdownResponse = await fetch(markdownUrl, {
              headers: {
                'x-api-key': process.env.REACT_APP_API_KEY,
              },
            });
            
            if (!markdownResponse.ok) {
              const errorText = await markdownResponse.text();
              throw new Error(`Markdown API returned ${markdownResponse.status}: ${errorText}`);
            }

            const markdownText = await markdownResponse.text();
            setMarkdownReport(markdownText);
            setShowReportModal(true);
            setFetchingReport(false);
            return;
          }
          
          setError('Report structure unexpected.');
          setFetchingReport(false);
          return;
        } else if (data.status === 'FAILED') {
          setError('Workflow execution failed: ' + (data.cause || data.error || 'Unknown error'));
          setFetchingReport(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollReport, 10000);
        } else {
          setError('Report generation timed out after ' + maxAttempts + ' attempts');
          setFetchingReport(false);
        }
      } catch (err) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollReport, 10000);
        } else {
          setError('Failed to fetch report: ' + err.message);
          setFetchingReport(false);
        }
      }
    };

    pollReport();
  };

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
      const reposList = process.env.REACT_APP_DEFAULT_REPOS.split(',');
      const since = process.env.REACT_APP_DEFAULT_SINCE;
      const until = process.env.REACT_APP_DEFAULT_UNTIL;
      
      setRepos(reposList);
      setDateRange({ since, until });
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/sprint-intelligence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.REACT_APP_API_KEY,
        },
        body: JSON.stringify({
          sprintName: 'Test Sprint',
          since,
          until,
          githubToken: process.env.REACT_APP_GITHUB_TOKEN,
          repos: reposList,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, TOTAL_DURATION - elapsed);
        
        setTimeout(() => {
          setLoading(false);
          fetchReport(data.executionArn);
        }, remaining);
      } else {
        setError(data.error || 'Failed to start analysis');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Network error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <div className="container">
          <img src={bscLogo} alt="BSC Analytics" className="logo" />
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <div className="container">
            <h1 className="title">Agentic AI Demo</h1>
            <p className="subtitle">
              Advanced AI-powered sprint analysis platform leveraging autonomous agents
              for intelligent code review and development insights
            </p>
            <div className="cta-buttons">
              <button 
                className="btn btn-primary" 
                onClick={runSprintAnalysis}
                disabled={loading || fetchingReport}
              >
                {loading ? 'Analysis in Progress...' : fetchingReport ? 'Fetching Report...' : 'Run Sprint Analysis'}
              </button>
            </div>

            {(loading || completedSteps.length > 0) && repos.length > 0 && (
              <div className="analysis-info">
                <div className="info-section">
                  <h3>Repositories</h3>
                  <ul className="repo-list">
                    {repos.map((repo, index) => (
                      <li key={index}>
                        <a href={repo} target="_blank" rel="noopener noreferrer">
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
                    style={{ width: `${progress}%` }}
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
          </div>
        </section>

        <section className="features">
          <div className="container">
            <h2>Powered by Agentic AI</h2>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">🤖</div>
                <h3>Autonomous Analysis</h3>
                <p>AI agents independently analyze pull requests and generate comprehensive insights</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Real-Time Intelligence</h3>
                <p>Instant sprint reports with actionable recommendations powered by Claude 3.5</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>Executive Summaries</h3>
                <p>Clear, concise reports suitable for both technical and non-technical stakeholders</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>BSC Analytics | Todd Bernson, CTO & CAIO</p>
          <p className="footer-note">Powered by AWS Bedrock and Claude 3.5 Sonnet</p>
        </div>
      </footer>

      {showReportModal && markdownReport && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowReportModal(false)}>
              ×
            </button>
            <div className="markdown-report">
              <div className="report-header">
                <h2>Sprint Intelligence Report</h2>
                <p className="report-timestamp">Generated: {new Date().toLocaleString()}</p>
              </div>
              <div className="report-content" dangerouslySetInnerHTML={{ __html: parseMarkdown(markdownReport) }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
