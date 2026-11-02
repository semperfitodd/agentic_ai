import { APP_STORE_URL } from './appStore.js';

export const SITE_NAME = 'Arc Agent';
export const AUTHOR = { name: 'Todd Bernson', url: 'https://toddbernson.com', jobTitle: 'Chief AI Officer' };
export const ORGANIZATION = 'BSC Analytics';
export const OG_IMAGE_PATH = '/og-image.jpg';

export const PAGE_META = {
    overview: {
        path: '/',
        title: 'Arc Agent: AI Sprint Reports from GitHub Pull Requests',
        description:
            'Agentic AI that analyzes every merged GitHub pull request with Amazon Nova on Bedrock and writes an executive-ready sprint report with metrics, risks, and next steps.',
    },
    features: {
        path: '/features',
        title: 'Features: Agentic AI Pull Request Analysis | Arc Agent',
        description:
            'How Arc Agent fetches merged PRs across repositories, reviews each change for intent, impact, and risk, and synthesizes sprint metrics, trends, and categorized work.',
    },
    run: {
        path: '/run',
        title: 'Run a Sprint Analysis | Arc Agent',
        description: 'Sign in with Google or Apple, choose repositories and dates, and generate an AI sprint report from your GitHub pull requests.',
        noindex: true,
    },
};

export const INDEXED_PATHS = [...Object.values(PAGE_META).filter((page) => !page.noindex).map((page) => page.path), '/privacy.html', '/support.html'];

const FEATURE_LIST = [
    'Autonomous analysis of merged GitHub pull requests',
    'Executive sprint summaries with metrics and risks',
    'Multi-repository support',
    'Work categorized as features, fixes, and refactors',
    'Paginated PDF export',
];

export const structuredData = (siteUrl) => {
    const home = `${siteUrl}/`;
    const personId = `${AUTHOR.url}/#person`;
    const organizationId = `${home}#organization`;
    return {
        '@context': 'https://schema.org',
        '@graph': [
            { '@type': 'WebSite', '@id': `${home}#website`, url: home, name: SITE_NAME, description: PAGE_META.overview.description, author: { '@id': personId }, publisher: { '@id': organizationId } },
            {
                '@type': 'SoftwareApplication',
                '@id': `${home}#app`,
                name: SITE_NAME,
                url: home,
                description: PAGE_META.overview.description,
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web, iOS, iPadOS',
                image: `${siteUrl}${OG_IMAGE_PATH}`,
                featureList: FEATURE_LIST,
                sameAs: [APP_STORE_URL],
                author: { '@id': personId },
                publisher: { '@id': organizationId },
            },
            { '@type': 'Person', '@id': personId, name: AUTHOR.name, url: AUTHOR.url, jobTitle: AUTHOR.jobTitle, worksFor: { '@id': organizationId } },
            { '@type': 'Organization', '@id': organizationId, name: ORGANIZATION },
        ],
    };
};
