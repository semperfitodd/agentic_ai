import { useState, useEffect } from 'react';
import './App.css';
import bscLogo from './bsc-logo.svg';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

const TOTAL_DURATION = parseInt(process.env.REACT_APP_WORKFLOW_DURATION || '50000', 10);

function parseMarkdown(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Handle tables first (before other conversions)
  html = html.replace(/\n\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g, (match, header, rows) => {
    const headers = header.split('|').map(h => h.trim()).filter(h => h);
    const rowData = rows.trim().split('\n').map(row => 
      row.split('|').map(cell => cell.trim()).filter(cell => cell)
    );
    
    let table = '<table class="markdown-table"><thead><tr>';
    headers.forEach(h => {
      table += `<th>${h}</th>`;
    });
    table += '</tr></thead><tbody>';
    
    rowData.forEach(row => {
      table += '<tr>';
      row.forEach(cell => {
        table += `<td>${cell}</td>`;
      });
      table += '</tr>';
    });
    
    table += '</tbody></table>';
    return table;
  });
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
  
  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  html = '<p>' + html + '</p>';
  html = html.replace(/(<li>.*?<\/li>)/gis, (match) => '<ul>' + match + '</ul>');
  
  // Clean up empty paragraphs and extra breaks around tables/headers
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<table|<h[1-3]>)/g, '$1');
  html = html.replace(/(<\/table>|<\/h[1-3]>)<\/p>/g, '$1');
  html = html.replace(/<br><table/g, '<table');
  html = html.replace(/<\/table><br>/g, '</table>');
  
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
          if (output.s3Location?.markdownKey) {
            markdownKey = output.s3Location.markdownKey;
          } else if (output.storedResults?.body?.s3Location?.markdownKey) {
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

  const downloadPDF = async () => {
    const reportElement = document.querySelector('.markdown-report');
    if (!reportElement) return;

    try {
      // Create a clone of the report for PDF generation
      const clone = reportElement.cloneNode(true);
      clone.style.width = '1200px';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      document.body.appendChild(clone);

      // Generate canvas from the cloned element
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#1a1f36',
      });

      // Remove the clone
      document.body.removeChild(clone);

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `sprint-intelligence-report-${timestamp}.pdf`;

      // Save PDF
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
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

            <div className="explanation-section">
              <h2>What This Agent Does</h2>
              <div className="explanation-content">
                <p>
                  This agentic AI system autonomously analyzes your GitHub repositories to generate 
                  comprehensive sprint reports. Unlike traditional automation, these AI agents make 
                  intelligent decisions, adapt to your codebase, and collaborate to accomplish complex tasks.
                </p>
                
                <div className="process-overview">
                  <div className="process-step">
                    <div className="process-icon">🔍</div>
                    <h3>Autonomous Discovery</h3>
                    <p>AI agents discover and fetch all merged pull requests, code changes, comments, and reviews within your date range.</p>
                  </div>
                  
                  <div className="process-step">
                    <div className="process-icon">🤖</div>
                    <h3>Intelligent Analysis</h3>
                    <p>Each PR is analyzed by Claude 3.5 Sonnet, acting as an expert software engineer to understand context, impact, and quality.</p>
                  </div>
                  
                  <div className="process-step">
                    <div className="process-icon">📊</div>
                    <h3>Executive Synthesis</h3>
                    <p>A master AI agent aggregates findings into a comprehensive sprint report with insights, metrics, and recommendations.</p>
                  </div>
                </div>

                <div className="result-preview">
                  <h3>What You'll Receive</h3>
                  <ul>
                    <li><strong>Sprint Summary:</strong> Executive overview with key metrics and achievements</li>
                    <li><strong>Work Breakdown:</strong> Analysis by category (features, bugs, refactors, docs)</li>
                    <li><strong>Repository Activity:</strong> Contributions and changes across all repos</li>
                    <li><strong>Detailed PR Insights:</strong> Technical analysis of each pull request</li>
                    <li><strong>Team Collaboration:</strong> Top contributors and discussion patterns</li>
                    <li><strong>Recommendations:</strong> AI-generated suggestions for future sprints</li>
                  </ul>
                </div>
              </div>
            </div>

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
          <p>BSC Analytics | Todd Bernson, Chief AI Officer</p>
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
                <div className="report-header-actions">
                  <p className="report-timestamp">Generated: {new Date().toLocaleString()}</p>
                  <button className="btn btn-download" onClick={downloadPDF}>
                    📥 Download PDF
                  </button>
                </div>
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
