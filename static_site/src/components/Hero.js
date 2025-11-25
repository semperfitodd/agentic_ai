const Hero = ({
                  loading,
                  fetchingReport,
                  onRunAnalysis,
                  repos,
                  dateRange,
                  completedSteps
              }) => {
    return (
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
                                <p>AI agents discover and fetch all merged pull requests, code changes, comments, and
                                    reviews within your date range.</p>
                            </div>

                            <div className="process-step">
                                <div className="process-icon">🤖</div>
                                <h3>Intelligent Analysis</h3>
                                <p>Each PR is analyzed by Claude 3.5 Sonnet, acting as an expert software engineer to
                                    understand context, impact, and quality.</p>
                            </div>

                            <div className="process-step">
                                <div className="process-icon">📊</div>
                                <h3>Executive Synthesis</h3>
                                <p>A master AI agent aggregates findings into a comprehensive sprint report with
                                    insights, metrics, and recommendations.</p>
                            </div>
                        </div>

                        <div className="result-preview">
                            <h3>What You'll Receive</h3>
                            <ul>
                                <li><strong>Sprint Summary:</strong> Executive overview with key metrics and
                                    achievements
                                </li>
                                <li><strong>Work Breakdown:</strong> Analysis by category (features, bugs, refactors,
                                    docs)
                                </li>
                                <li><strong>Repository Activity:</strong> Contributions and changes across all repos
                                </li>
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
                        onClick={onRunAnalysis}
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
            </div>
        </section>
    );
};

export default Hero;

