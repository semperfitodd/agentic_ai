import { Bot, FileText, GitMerge, GitPullRequest, Tags, TrendingUp, Zap } from 'lucide-react';
import { useCountUp, useReveal } from '../hooks/useReveal';

const FEATURES = [
    { Icon: Bot, tone: 'ai', title: 'Autonomous analysis', description: 'AI agents independently analyze pull requests and generate comprehensive insights without human intervention.' },
    { Icon: Zap, tone: 'accent', title: 'Real-time intelligence', description: 'Sprint reports with actionable recommendations, powered by Amazon Nova on Bedrock.' },
    { Icon: FileText, tone: 'accent', title: 'Executive summaries', description: 'Clear, concise reports suitable for both technical and non-technical stakeholders.' },
    { Icon: GitMerge, tone: 'accent', title: 'Multi-repo support', description: 'Analyze multiple repositories at once and get unified insights across your codebase.' },
    { Icon: TrendingUp, tone: 'ai', title: 'Trend analysis', description: 'Track development patterns, identify bottlenecks, and measure team velocity over time.' },
    { Icon: Tags, tone: 'ai', title: 'Smart categorization', description: 'Automatically categorize changes as features, bug fixes, refactors, or documentation.' },
];

const FLOW = [
    { Icon: GitPullRequest, tone: 'accent', title: 'Merged PRs', caption: 'Every repo in your period' },
    { Icon: Bot, tone: 'ai', title: 'Nova analysis', caption: 'Intent, impact, and risk per PR' },
    { Icon: FileText, tone: 'success', title: 'Sprint report', caption: 'Summary, metrics, next steps' },
];

const STATS = [
    { value: 20, label: 'Workflow steps' },
    { value: 4, label: 'Phases' },
    { value: 2, label: 'AI agents' },
    { value: 1, suffix: ' min', label: 'Typical run' },
];

const STACK = ['AWS Step Functions', 'AWS Lambda', 'Amazon Bedrock · Nova 2 Lite', 'Amazon S3', 'Amazon Cognito', 'AWS KMS'];

const AgentFlow = () => (
    <figure className="card agent-flow" aria-label="How a sprint flows through the agents">
        <div className="agent-flow-glow" aria-hidden="true" />
        <ol className="agent-flow-track">
            {FLOW.map(({ Icon, tone, title, caption }, index) => (
                <li key={title} className="agent-flow-step">
                    {index > 0 && (
                        <span className={`flow-connector flow-connector-${FLOW[index - 1].tone}`} aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </span>
                    )}
                    <div className="agent-node">
                        {index === 0 && (
                            <span className="pr-stack" aria-hidden="true">
                                <span>#412</span>
                                <span>#418</span>
                                <span>#423</span>
                            </span>
                        )}
                        <span className={`icon-tile icon-tile-xl icon-tile-${tone} ${tone === 'ai' ? 'pulse' : ''}`}>
                            <Icon size={26} aria-hidden="true" />
                        </span>
                        <span className="text-title">{title}</span>
                        <span className="text-small text-tertiary">{caption}</span>
                    </div>
                </li>
            ))}
        </ol>
    </figure>
);

const Stat = ({ value, suffix = '', label, active }) => {
    const shown = useCountUp(value, active);
    return (
        <div className="kpi stat">
            <dt className="kpi-label">{label}</dt>
            <dd className="kpi-value" aria-label={`${value}${suffix}`}>
                {shown}
                {suffix}
            </dd>
        </div>
    );
};

const trackPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--x', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--y', `${event.clientY - rect.top}px`);
};

const FeaturesPage = () => {
    const [statsRef, statsVisible] = useReveal();
    const [gridRef, gridVisible] = useReveal(0.1);

    return (
        <div className="page">
            <section className="container page-header">
                <span className="overline">Features</span>
                <h1 className="text-h1">Powered by agentic AI</h1>
                <p className="text-body-lg text-secondary">
                    Autonomous agents read every change in your sprint so you can focus on decisions, not data gathering.
                </p>
            </section>

            <section className="container">
                <AgentFlow />
                <dl ref={statsRef} className="stats">
                    {STATS.map((stat) => (
                        <Stat key={stat.label} {...stat} active={statsVisible} />
                    ))}
                </dl>
            </section>

            <section className="container section section-tight">
                <ul ref={gridRef} className={`feature-grid ${gridVisible ? 'is-visible' : ''}`}>
                    {FEATURES.map(({ Icon, tone, title, description }, index) => (
                        <li key={title} className="card card-interactive feature-card" style={{ '--i': index }} onPointerMove={trackPointer}>
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
};

export default FeaturesPage;
