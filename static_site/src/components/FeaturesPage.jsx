import { Bot, FileText, GitMerge, Tags, TrendingUp, Zap } from 'lucide-react';

const FEATURES = [
    { Icon: Bot, tone: 'ai', title: 'Autonomous analysis', description: 'AI agents independently analyze pull requests and generate comprehensive insights without human intervention.' },
    { Icon: Zap, tone: 'accent', title: 'Real-time intelligence', description: 'Sprint reports with actionable recommendations, powered by Amazon Nova on Bedrock.' },
    { Icon: FileText, tone: 'accent', title: 'Executive summaries', description: 'Clear, concise reports suitable for both technical and non-technical stakeholders.' },
    { Icon: GitMerge, tone: 'accent', title: 'Multi-repo support', description: 'Analyze multiple repositories at once and get unified insights across your codebase.' },
    { Icon: TrendingUp, tone: 'ai', title: 'Trend analysis', description: 'Track development patterns, identify bottlenecks, and measure team velocity over time.' },
    { Icon: Tags, tone: 'ai', title: 'Smart categorization', description: 'Automatically categorize changes as features, bug fixes, refactors, or documentation.' },
];

const STACK = ['AWS Step Functions', 'AWS Lambda', 'Amazon Bedrock · Nova 2 Lite', 'Amazon S3', 'Amazon Cognito', 'AWS KMS'];

const FeaturesPage = () => (
    <div className="page">
        <section className="container page-header">
            <span className="overline">Features</span>
            <h1 className="text-h1">Powered by agentic AI</h1>
            <p className="text-body-lg text-secondary">
                Autonomous agents read every change in your sprint so you can focus on decisions, not data gathering.
            </p>
        </section>

        <section className="container">
            <ul className="feature-grid">
                {FEATURES.map(({ Icon, tone, title, description }, index) => (
                    <li key={title} className="card card-interactive feature-card" style={{ '--i': index }}>
                        <span className={`icon-tile icon-tile-lg icon-tile-${tone}`}>
                            <Icon size={22} aria-hidden="true" />
                        </span>
                        <h2 className="text-h3">{title}</h2>
                        <p className="text-secondary">{description}</p>
                    </li>
                ))}
            </ul>
        </section>

        <section className="container section stack-strip" aria-labelledby="built-on">
            <h2 id="built-on" className="overline">
                Built on AWS
            </h2>
            <ul className="chip-list">
                {STACK.map((item) => (
                    <li key={item} className="chip">
                        {item}
                    </li>
                ))}
            </ul>
        </section>
    </div>
);

export default FeaturesPage;
