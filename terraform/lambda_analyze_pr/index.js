"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const client_s3_1 = require("@aws-sdk/client-s3");
const bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({});
const s3Client = new client_s3_1.S3Client({});
/**
 * Analyze PR using AWS Bedrock Claude
 */
async function analyzePRWithClaude(input) {
    const { owner, repo, readme } = input;
    const pr = input.pr;
    const comments = input.comments || { issueComments: [], reviewComments: [] };
    const reviews = input.reviews || [];
    const files = input.files || [];
    const filesSummary = files
        .map(f => `  - ${f.filename} (${f.status}): +${f.additions}/-${f.deletions} (${f.changes} changes)`)
        .join('\n');
    const issueCommentsSummary = comments.issueComments
        .map(c => `  - ${c.user} (${c.created_at}): ${c.body}`)
        .join('\n');
    const reviewCommentsSummary = comments.reviewComments
        .map(c => `  - ${c.user} on ${c.path} (${c.created_at}): ${c.body}`)
        .join('\n');
    const reviewsSummary = reviews
        .map(r => `  - ${r.user} (${r.state}) at ${r.submitted_at}: ${r.body}`)
        .join('\n');
    const statisticsContext = input.statistics ? `

Summary Statistics:
- Total Files in PR: ${input.statistics.totalFiles} (showing top ${files.length})
- Total Comments: ${input.statistics.totalComments} (showing ${comments.issueComments.length + comments.reviewComments.length})
- Total Reviews: ${input.statistics.totalReviews} (showing ${reviews.length})
- Participants: ${input.statistics.participantCount} team members
- Discussion Intensity: ${input.statistics.discussionIntensity}

Most Impacted Files:
${input.statistics.topFilesByChanges.slice(0, 5).map(f => `  - ${f.filename} (${f.changes} changes)`).join('\n')}` : '';
    const readmeText = readme || '';
    const prompt = `You are an expert software engineering analyst. Analyze the following GitHub Pull Request and provide a comprehensive, insightful summary.

Repository: ${owner}/${repo}
Repository Description: ${readmeText.substring(0, 500)}${readmeText.length > 500 ? '...' : ''}

Pull Request Details:
- Number: #${pr.number}
- Title: ${pr.title}
- Author: ${pr.user?.login || 'Unknown'}
- State: ${pr.state}
- Merged: ${pr.merged_at ? new Date(pr.merged_at).toLocaleDateString() : 'Not merged'}
- Labels: ${pr.labels.length > 0 ? pr.labels.join(', ') : 'none'}
- Link: ${pr.html_url}

PR Description:
${pr.body || 'No description provided'}

Statistics:
- Files Changed: ${pr.changed_files}
- Additions: ${pr.additions}
- Deletions: ${pr.deletions}
- Total Changes: ${pr.additions + pr.deletions}${statisticsContext}

Files Modified (sample):
${filesSummary}

${comments.issueComments.length > 0 ? `Issue Comments (${comments.issueComments.length}):\n${issueCommentsSummary}` : ''}

${comments.reviewComments.length > 0 ? `Review Comments (${comments.reviewComments.length}):\n${reviewCommentsSummary}` : ''}

${reviews.length > 0 ? `Reviews (${reviews.length}):\n${reviewsSummary}` : ''}

Please analyze this PR and provide:
1. A clear category/type (e.g., Feature, Bug Fix, Refactoring, Documentation, Configuration, Testing, etc.)
2. An impact assessment (Low/Medium/High) based on scope and complexity
3. A summary of what changed and why
4. Technical insights about the implementation
5. Assessment of the review process and team collaboration
6. Any notable patterns, risks, or highlights

Format your response in clear markdown with appropriate sections and bullet points. DO NOT USE EMOJIS.`;
    try {
        const modelId = process.env.BEDROCK_MODEL_ID;
        if (!modelId) {
            throw new Error('BEDROCK_MODEL_ID environment variable is not set');
        }
        const maxTokens = parseInt(process.env.BEDROCK_MAX_TOKENS || '4096', 10);
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
        throw new Error(`Failed to analyze PR with Claude: ${error.message}`);
    }
}
const handler = async (event) => {
    console.log('Analyzing PR:', JSON.stringify({
        owner: event.owner,
        repo: event.repo,
        prNumber: event.prNumber
    }, null, 2));
    const bucketName = event.s3Bucket || process.env.RESULTS_BUCKET;
    if (!bucketName) {
        throw new Error('RESULTS_BUCKET environment variable is not set');
    }
    try {
        if (!event.owner || !event.repo || !event.prNumber) {
            throw new Error('Owner, repo, and prNumber are required');
        }
        // Load README from S3 if provided
        let readme = '';
        if (event.readmeS3Key) {
            console.log(`Loading README map from S3: ${event.readmeS3Key}`);
            const readmeResponse = await s3Client.send(new client_s3_1.GetObjectCommand({
                Bucket: bucketName,
                Key: event.readmeS3Key,
            }));
            const readmeBody = await readmeResponse.Body?.transformToString();
            const readmeMap = JSON.parse(readmeBody || '{}');
            const repoKey = `${event.owner}/${event.repo}`;
            readme = readmeMap[repoKey] || '';
            console.log(`Loaded README for ${repoKey}: ${readme.length} bytes`);
        }
        else if (event.readme) {
            readme = event.readme;
        }
        const s3Prefix = `pr-details/${event.owner}/${event.repo}/${event.prNumber}/`;
        console.log(`Looking for PR details in S3 prefix: ${s3Prefix}`);
        const listCommand = new client_s3_1.ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: s3Prefix,
            MaxKeys: 1,
        });
        const listResponse = await s3Client.send(listCommand);
        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            throw new Error(`No PR details found in S3 for ${s3Prefix}`);
        }
        const prDetailsS3Key = listResponse.Contents[0].Key;
        console.log(`Loading PR details from S3: ${prDetailsS3Key}`);
        const getObjectCommand = new client_s3_1.GetObjectCommand({
            Bucket: bucketName,
            Key: prDetailsS3Key,
        });
        const s3Response = await s3Client.send(getObjectCommand);
        const s3Body = await s3Response.Body?.transformToString();
        const prDetailsFromS3 = JSON.parse(s3Body || '{}');
        const prDetails = {
            owner: event.owner,
            repo: event.repo,
            prNumber: event.prNumber,
            readme,
            pr: prDetailsFromS3.pr,
            comments: prDetailsFromS3.comments,
            reviews: prDetailsFromS3.reviews,
            files: prDetailsFromS3.files,
            statistics: prDetailsFromS3.statistics,
        };
        if (!prDetails.pr) {
            throw new Error('PR data is missing from S3');
        }
        const analysis = await analyzePRWithClaude(prDetails);
        const analysisSize = Buffer.byteLength(analysis, 'utf8');
        console.log(`Analysis complete for PR #${prDetails.pr.number}, size: ${analysisSize} bytes`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const analysisS3Key = `pr-analyses/${prDetails.owner}/${prDetails.repo}/${prDetails.pr.number}/${timestamp}.json`;
        const fullAnalysis = {
            owner: prDetails.owner,
            repo: prDetails.repo,
            prNumber: prDetails.pr.number,
            prTitle: prDetails.pr.title || 'Untitled',
            analysis,
            metadata: {
                additions: prDetails.pr.additions || 0,
                deletions: prDetails.pr.deletions || 0,
                changed_files: prDetails.pr.changed_files || 0,
                merged_at: prDetails.pr.merged_at || null,
                author: prDetails.pr.user?.login || 'Unknown',
                labels: prDetails.pr.labels || [],
            },
            analyzedAt: new Date().toISOString(),
            statistics: prDetails.statistics,
        };
        await s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: analysisS3Key,
            Body: JSON.stringify(fullAnalysis, null, 2),
            ContentType: 'application/json',
            Metadata: {
                owner: prDetails.owner,
                repo: prDetails.repo,
                prNumber: prDetails.pr.number.toString(),
            },
        }));
        console.log(`Stored analysis (${Buffer.byteLength(analysis, 'utf8')} bytes) to S3: ${analysisS3Key}`);
        const fullResponse = {
            statusCode: 200,
            body: {
                owner: prDetails.owner,
                repo: prDetails.repo,
                prNumber: prDetails.pr.number,
            },
        };
        const responseSize = Buffer.byteLength(JSON.stringify(fullResponse), 'utf8');
        console.log(`RETURN TO STEP FUNCTIONS: ${JSON.stringify(fullResponse)}`);
        console.log(`RESPONSE SIZE: ${responseSize} bytes (${(responseSize / 1024).toFixed(2)} KB)`);
        return fullResponse;
    }
    catch (error) {
        console.error('Error analyzing PR:', error);
        console.error('Event data:', JSON.stringify(event, null, 2));
        return {
            statusCode: 500,
            body: {
                error: error.message || 'Failed to analyze PR',
                owner: event.owner || 'unknown',
                repo: event.repo || 'unknown',
                prNumber: event.prNumber || 0,
            },
        };
    }
};
exports.handler = handler;
