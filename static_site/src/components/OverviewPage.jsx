const OverviewPage = () => (
    <section className="page overview-page">
        <div className="container">
            <h1 className="page-title">Agentic AI Demo</h1>
            <p className="page-subtitle">
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
        </div>
    </section>
);

export default OverviewPage;
