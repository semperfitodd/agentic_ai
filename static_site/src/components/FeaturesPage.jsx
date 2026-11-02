const FEATURES = [
    { icon: '🤖', title: 'Autonomous Analysis', description: 'AI agents independently analyze pull requests and generate comprehensive insights without human intervention.' },
    { icon: '⚡', title: 'Real-Time Intelligence', description: 'Instant sprint reports with actionable recommendations powered by Amazon Nova on Bedrock.' },
    { icon: '📊', title: 'Executive Summaries', description: 'Clear, concise reports suitable for both technical and non-technical stakeholders.' },
    { icon: '🔗', title: 'Multi-Repo Support', description: 'Analyze multiple repositories simultaneously and get unified insights across your entire codebase.' },
    { icon: '📈', title: 'Trend Analysis', description: 'Track development patterns, identify bottlenecks, and measure team velocity over time.' },
    { icon: '🎯', title: 'Smart Categorization', description: 'Automatically categorize changes as features, bugs, refactors, or documentation updates.' },
];

const FeaturesPage = () => (
    <section className="page features-page">
        <div className="container">
            <h1 className="page-title">Powered by Agentic AI</h1>
            <p className="page-subtitle">
                Discover how autonomous AI agents transform your development workflow
            </p>
            <div className="feature-grid">
                {FEATURES.map((feature, index) => (
                    <div key={index} className="feature-card">
                        <div className="feature-icon">{feature.icon}</div>
                        <h3>{feature.title}</h3>
                        <p>{feature.description}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

export default FeaturesPage;
