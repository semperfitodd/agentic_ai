import React from 'react';

const Features = () => {
    return (
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
    );
};

export default Features;

