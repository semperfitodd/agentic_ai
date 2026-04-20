export const WORKFLOW_STEPS = [
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

export const TOTAL_DURATION = parseInt(process.env.REACT_APP_WORKFLOW_DURATION || '50000', 10);
