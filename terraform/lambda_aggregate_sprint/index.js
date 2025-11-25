"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const client_s3_1 = require("@aws-sdk/client-s3");
const bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({});
const s3Client = new client_s3_1.S3Client({});
async function loadAnalysisFromS3(bucket, owner, repo, prNumber) {
    try {
        const s3Prefix = `pr-analyses/${owner}/${repo}/${prNumber}/`;
        const listCommand = new client_s3_1.ListObjectsV2Command({
            Bucket: bucket,
            Prefix: s3Prefix,
            MaxKeys: 1,
        });
        const listResponse = await s3Client.send(listCommand);
        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            console.warn(`No analysis found for PR ${owner}/${repo}#${prNumber}`);
            return null;
        }
        const s3Key = listResponse.Contents[0].Key;
        const response = await s3Client.send(new client_s3_1.GetObjectCommand({
            Bucket: bucket,
            Key: s3Key,
        }));
        const body = await response.Body?.transformToString();
        if (!body) {
            console.error(`Empty response from S3: ${s3Key}`);
            return null;
        }
        return JSON.parse(body);
    }
    catch (error) {
        console.error(`Error loading analysis for PR ${owner}/${repo}#${prNumber}:`, error);
        return null;
    }
}
async function aggregateSprintWithClaude(input) {
    const { sprintName, since, until, repos, analyses } = input;
    const totalPRs = analyses.length;
    const totalAdditions = analyses.reduce((sum, a) => sum + (a.metadata?.additions || 0), 0);
    const totalDeletions = analyses.reduce((sum, a) => sum + (a.metadata?.deletions || 0), 0);
    const totalFiles = analyses.reduce((sum, a) => sum + (a.metadata?.changed_files || 0), 0);
    const byRepo = {};
    analyses.forEach(analysis => {
        const repoKey = `${analysis.owner}/${analysis.repo}`;
        if (!byRepo[repoKey]) {
            byRepo[repoKey] = [];
        }
        byRepo[repoKey].push(analysis);
    });
    const contributors = {};
    analyses.forEach(analysis => {
        const author = analysis.metadata?.author || 'Unknown';
        contributors[author] = (contributors[author] || 0) + 1;
    });
    const repoBreakdown = Object.entries(byRepo)
        .map(([repo, prs]) => {
        const repoAdditions = prs.reduce((s, p) => s + (p.metadata?.additions || 0), 0);
        const repoDeletions = prs.reduce((s, p) => s + (p.metadata?.deletions || 0), 0);
        return `${repo}: ${prs.length} PR(s), +${repoAdditions}/-${repoDeletions}`;
    })
        .join('\n  - ');
    const contributorList = Object.entries(contributors)
        .sort((a, b) => b[1] - a[1])
        .map(([author, count]) => `${author} (${count} PRs)`)
        .join(', ');
    const allAnalyses = analyses
        .map(a => {
        return `
---
Repository: ${a.owner}/${a.repo}
PR #${a.prNumber}: ${a.prTitle}
Author: ${a.metadata?.author || 'Unknown'}
Stats: +${a.metadata?.additions || 0}/-${a.metadata?.deletions || 0}, ${a.metadata?.changed_files || 0} files

${a.analysis}
`;
    })
        .join('\n');
    const prompt = `You are an expert engineering manager and technical writer. Generate a comprehensive, executive-level sprint report from the following Pull Request analyses.

Sprint Information:
- Sprint Name: ${sprintName || 'Unnamed Sprint'}
- Sprint Period: ${new Date(since).toLocaleDateString()} to ${new Date(until).toLocaleDateString()}
- Repositories: ${repos.length}
  - ${repoBreakdown}

Summary Statistics:
- Total PRs Merged: ${totalPRs}
- Total Lines Added: ${totalAdditions}
- Total Lines Deleted: ${totalDeletions}
- Total Files Changed: ${totalFiles}
- Contributors: ${contributorList}

Individual PR Analyses:
${allAnalyses}

Please generate a comprehensive sprint report that includes:

1. **Executive Summary**: High-level overview of sprint accomplishments, key themes, and overall impact

2. **Key Metrics Dashboard**: Present the statistics in a clear, scannable format

3. **Work Breakdown**: 
   - Categorize PRs by type (features, bug fixes, refactoring, documentation, etc.)
   - Highlight major themes and initiatives
   - Group related work items

4. **Technical Highlights**:
   - Most impactful changes
   - Notable technical decisions or patterns
   - Quality improvements or technical debt addressed

5. **Repository Insights**: Analysis by repository with highlights from each

6. **Team Collaboration**:
   - Contribution patterns
   - Code review effectiveness
   - Cross-functional collaboration

7. **Sprint Retrospective**:
   - What went well
   - Areas for improvement
   - Patterns observed

8. **Recommendations**: 
   - Actionable suggestions for next sprint
   - Technical debt to address
   - Process improvements

Format the report in clear, professional markdown with appropriate headers, bullet points, and emphasis. Make it suitable for both technical and non-technical stakeholders.`;
    try {
        const modelId = process.env.BEDROCK_MODEL_ID;
        if (!modelId) {
            throw new Error('BEDROCK_MODEL_ID environment variable is not set');
        }
        const maxTokens = parseInt(process.env.BEDROCK_MAX_TOKENS || '8192', 10);
        const temperature = parseFloat(process.env.BEDROCK_TEMPERATURE || '0.7');
        const anthropicVersion = process.env.BEDROCK_ANTHROPIC_VERSION || 'bedrock-2023-05-31';
        const command = new client_bedrock_runtime_1.InvokeModelCommand({
            modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: anthropicVersion,
                max_tokens: maxTokens,
                temperature: temperature,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            }),
        });
        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        return responseBody.content[0].text;
    }
    catch (error) {
        console.error('Error calling Bedrock:', error);
        throw new Error(`Failed to aggregate sprint report with Claude: ${error.message}`);
    }
}
const handler = async (event) => {
    console.log('Aggregating sprint report:', JSON.stringify({
        sprintName: event.sprintName,
        since: event.since,
        until: event.until,
        repoCount: event.repos?.length || 0,
        analysisCount: event.analyses?.length || 0,
    }, null, 2));
    const bucketName = process.env.RESULTS_BUCKET;
    if (!bucketName) {
        throw new Error('RESULTS_BUCKET environment variable is not set');
    }
    try {
        if (!event.analyses || !Array.isArray(event.analyses)) {
            throw new Error('Analyses array is missing or invalid');
        }
        console.log(`Loading ${event.analyses.length} PR analyses from S3...`);
        const loadPromises = event.analyses.map(async (ref) => {
            const analysis = await loadAnalysisFromS3(bucketName, ref.owner, ref.repo, ref.prNumber);
            if (analysis) {
                console.log(`Loaded analysis for PR ${ref.owner}/${ref.repo}#${ref.prNumber} from S3`);
                return analysis;
            }
            else {
                console.warn(`Failed to load analysis for PR ${ref.owner}/${ref.repo}#${ref.prNumber}`);
                return null;
            }
        });
        const loadedAnalyses = await Promise.all(loadPromises);
        const validAnalyses = loadedAnalyses.filter((analysis) => {
            return analysis !== null && analysis.metadata !== undefined;
        });
        console.log(`Processing ${validAnalyses.length} valid analyses out of ${event.analyses.length} total`);
        if (validAnalyses.length === 0) {
            return {
                statusCode: 200,
                body: {
                    sprintName: event.sprintName,
                    since: event.since,
                    until: event.until,
                    repos: event.repos || [],
                    totalPRs: 0,
                    report: 'No valid PR analyses were available to generate a sprint report.',
                    generatedAt: new Date().toISOString(),
                    warning: 'All PR analyses failed validation',
                },
            };
        }
        const markdownReport = await aggregateSprintWithClaude({
            sprintName: event.sprintName,
            since: event.since,
            until: event.until,
            repos: event.repos,
            analyses: validAnalyses,
        });
        console.log('Sprint report aggregation complete');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const sprintName = event.sprintName || process.env.DEFAULT_SPRINT_NAME || 'sprint';
        const sanitizedName = sprintName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
        const markdownS3Key = `reports/${sanitizedName}/${timestamp}.md`;
        const reportSize = Buffer.byteLength(markdownReport, 'utf8');
        console.log(`Markdown report size: ${reportSize} bytes (${(reportSize / 1024).toFixed(2)} KB)`);
        await s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: markdownS3Key,
            Body: markdownReport,
            ContentType: 'text/markdown',
            Metadata: {
                sprintName: sanitizedName,
                since: event.since,
                until: event.until,
                totalPRs: validAnalyses.length.toString(),
            },
        }));
        console.log(`Stored markdown report to S3: ${markdownS3Key}`);
        return {
            statusCode: 200,
            body: {
                sprintName: event.sprintName,
                since: event.since,
                until: event.until,
                repos: event.repos || [],
                totalPRs: validAnalyses.length,
                markdownS3Key: markdownS3Key,
                s3Bucket: bucketName,
                generatedAt: new Date().toISOString(),
                skippedAnalyses: event.analyses.length - validAnalyses.length,
            },
        };
    }
    catch (error) {
        console.error('Error aggregating sprint report:', error);
        console.error('Event data:', JSON.stringify(event, null, 2));
        return {
            statusCode: 500,
            body: {
                error: error.message || 'Failed to aggregate sprint report',
                sprintName: event.sprintName,
                totalPRs: 0,
            },
        };
    }
};
exports.handler = handler;
