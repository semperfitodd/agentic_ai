export const PHASES = [
    { id: 'prepare', label: 'Prepare' },
    { id: 'collect', label: 'Collect' },
    { id: 'analyze', label: 'Analyze' },
    { id: 'synthesize', label: 'Synthesize' },
];

export const WORKFLOW_STEPS = [
    { name: 'Initializing Step Functions Workflow', type: 'APPLICATION', duration: 2, phase: 'prepare' },
    { name: 'Parsing Repository URLs and Validating Format', type: 'APPLICATION', duration: 2, phase: 'prepare' },
    { name: 'Fetching Repository Metadata from GitHub API', type: 'APPLICATION', duration: 3, phase: 'prepare' },
    { name: 'Mapping Repositories for Parallel Processing', type: 'APPLICATION', duration: 2, phase: 'prepare' },
    { name: 'Preparing Pull Request Dataset and Filtering', type: 'APPLICATION', duration: 3, phase: 'collect' },
    { name: 'Validating PR Count and Date Ranges', type: 'APPLICATION', duration: 2, phase: 'collect' },
    { name: 'Fetching Detailed PR Information (Comments, Reviews, Files)', type: 'APPLICATION', duration: 4, phase: 'collect' },
    { name: 'Intelligent Data Summarization for Payload Optimization', type: 'APPLICATION', duration: 3, phase: 'collect' },
    { name: 'AI Analysis: Reading Code Changes and Diffs', type: 'AI', duration: 5, phase: 'analyze' },
    { name: 'AI Analysis: Evaluating Code Quality and Best Practices', type: 'AI', duration: 5, phase: 'analyze' },
    { name: 'AI Analysis: Assessing Impact and Risk Level', type: 'AI', duration: 4, phase: 'analyze' },
    { name: 'AI Analysis: Categorizing PR Type (Feature/Bug/Refactor)', type: 'AI', duration: 4, phase: 'analyze' },
    { name: 'Writing Individual PR Analyses to S3', type: 'APPLICATION', duration: 3, phase: 'analyze' },
    { name: 'Collecting All PR Analysis References', type: 'APPLICATION', duration: 2, phase: 'analyze' },
    { name: 'AI Aggregation: Loading PR Analyses from S3', type: 'APPLICATION', duration: 3, phase: 'synthesize' },
    { name: 'AI Aggregation: Synthesizing Cross-PR Insights', type: 'AI', duration: 5, phase: 'synthesize' },
    { name: 'AI Aggregation: Calculating Sprint Metrics and Trends', type: 'AI', duration: 5, phase: 'synthesize' },
    { name: 'AI Aggregation: Generating Executive Summary', type: 'AI', duration: 5, phase: 'synthesize' },
    { name: 'Writing Final Sprint Report to S3', type: 'APPLICATION', duration: 3, phase: 'synthesize' },
    { name: 'Generating Report Metadata and Keys', type: 'APPLICATION', duration: 2, phase: 'synthesize' },
];

export const TOTAL_DURATION = parseInt(import.meta.env.VITE_WORKFLOW_DURATION || '50000', 10);

const STEP_WEIGHT_TOTAL = WORKFLOW_STEPS.reduce((sum, step) => sum + step.duration, 0);

export const stepIndexAt = (elapsedMs, totalMs = TOTAL_DURATION) => {
    let boundary = 0;
    for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
        boundary += (WORKFLOW_STEPS[i].duration / STEP_WEIGHT_TOTAL) * totalMs;
        if (elapsedMs < boundary) return i;
    }
    return WORKFLOW_STEPS.length - 1;
};

export const phaseProgress = (phaseId, currentStep, complete) => {
    const indices = WORKFLOW_STEPS.flatMap((step, i) => (step.phase === phaseId ? [i] : []));
    if (complete) return 1;
    const done = indices.filter((i) => i < currentStep).length + (indices.includes(currentStep) ? 0.5 : 0);
    return done / indices.length;
};
