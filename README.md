# Sprint PR Intelligence - Serverless GitHub Analysis Platform

An AI-powered serverless application that analyzes GitHub pull requests across multiple repositories to generate comprehensive sprint reports.

## Overview

Sprint PR Intelligence is a fully serverless solution that connects to GitHub via API to analyze merged pull requests across multiple repositories during a sprint period. It generates detailed, AI-powered insights about what changed, why it changed, and the overall impact of the sprint's development work.

## Features

### Automated PR Analysis
- **Flexible Input**: Accept GitHub repo URLs directly - just paste the URL from your browser!
- **README Integration**: Reads repository README files to understand the context and purpose of each application
- **Comprehensive PR Data**: Fetches PR metadata, descriptions, labels, comments, reviews, and actual code changes
- **Intelligent Summarization**: Uses LLM analysis to generate meaningful summaries even when PR descriptions are sparse
- **Parallel Processing**: Leverages AWS Step Functions Map states for concurrent processing of multiple repos and PRs
- **Sprint Aggregation**: Combines all PR analyses into a single, executive-ready sprint report

### What Gets Analyzed
For each pull request in the specified date range:
- PR metadata (title, description, labels, author, merge date)
- All comments and code review feedback
- Actual code changes (diffs) from the GitHub API
- File modifications with additions/deletions counts
- Review approvals and change requests

### Sprint Report Contents
The final report includes:
- Executive summary with key metrics
- Work breakdown by category (features, bug fixes, documentation, etc.)
- Activity by repository
- Individual PR analyses with context
- Top contributors
- Sprint highlights and recommendations

## Architecture

### Serverless Components

**API Gateway (HTTP API)**
- Custom domain configured with Lambda authorizer for API key authentication
- `/sprint-intelligence` endpoint for triggering sprint analysis
- CORS enabled for web client integration
- Throttling and rate limiting configured

**Lambda Functions**

1. **Parse Repos** (`lambda_parse_repos`)
   - Parses various GitHub URL formats into owner/repo
   - Supports HTTPS, Git, and short formats
   - Runtime: Node.js 20.x, Timeout: 30s, Memory: 256MB

2. **Fetch Repo Data** (`lambda_fetch_repo_data`)
   - Fetches README and list of merged PRs for a repository
   - Filters PRs by date range
   - Runtime: Node.js 20.x, Timeout: 60s, Memory: 512MB

3. **Prepare Data** (`lambda_prepare_data`)
   - Flattens data structures from multiple repos
   - Creates lookup maps for efficient processing
   - Runtime: Node.js 20.x, Timeout: 30s, Memory: 256MB

4. **Fetch PR Details** (`lambda_fetch_pr_details`)
   - Retrieves detailed PR information including comments, reviews, and file diffs
   - Handles GitHub API pagination
   - Runtime: Node.js 20.x, Timeout: 60s, Memory: 512MB

5. **Analyze PR** (`lambda_analyze_pr`)
   - Analyzes individual PRs using AWS Bedrock Claude 3.5 Sonnet
   - Generates comprehensive per-PR summaries with technical insights
   - Categorizes changes and assesses impact
   - Runtime: Node.js 20.x, Timeout: 180s, Memory: 1024MB

6. **Aggregate Sprint** (`lambda_aggregate_sprint`)
   - Combines all PR analyses into final sprint report using Claude
   - Generates executive-level sprint summaries and recommendations
   - Produces markdown-formatted comprehensive reports
   - Runtime: Node.js 20.x, Timeout: 300s, Memory: 1024MB

7. **Workflow Proxy** (`lambda_workflow`)
   - Accepts API requests and invokes Step Functions workflow asynchronously
   - Returns execution ARN for tracking
   - Runtime: Node.js 20.x, Timeout: 30s, Memory: 256MB

8. **Store Results** (`lambda_store_results`)
   - Stores completed sprint reports to S3
   - Saves both JSON and Markdown formats
   - Runtime: Node.js 20.x, Timeout: 30s, Memory: 256MB

9. **Authorizer** (`lambda_authorizer`)
   - Validates API keys from Secrets Manager
   - Returns authorization decision for API Gateway
   - Runtime: Node.js 20.x, Timeout: 30s, Memory: 256MB

**Step Functions Workflow**

The `sprint_pr_intelligence` state machine orchestrates the entire process:

```
0. ParseRepos (Task)
   └─> Parse GitHub URLs into owner/repo format
   
1. FetchRepoData (Map State)
   └─> Parallel: Fetch README + PRs for each repo
   
2. PrepareData (Task)
   └─> Flatten and organize data structures
   
3. CheckIfPRsExist (Choice)
   ├─> NoPRsFound → Return empty report
   └─> FetchPRDetails (Map State)
   
4. FetchPRDetails (Map State)
   └─> Parallel: Fetch detailed info for each PR
   
5. AnalyzePRs (Map State)
   └─> Parallel: Analyze each PR with LLM
   
6. AggregateSprint (Task)
   └─> Generate final sprint report
   
7. StoreResults (Task)
   └─> Store report to S3
   
8. Success
   └─> Return complete report with S3 location
```

**GitHub Integration**
- Uses Octokit REST API client (@octokit/rest)
- No repository cloning required
- Supports GitHub personal access tokens or GitHub App authentication
- Rate limiting awareness (recommended: use GitHub App for higher limits)

### Technology Stack

- **Infrastructure as Code**: Terraform with official AWS modules
- **Cloud Provider**: AWS (fully serverless)
- **API Layer**: API Gateway HTTP API v2
- **Compute**: AWS Lambda (TypeScript/Node.js 20.x)
- **Orchestration**: AWS Step Functions (Express workflow)
- **Secrets Management**: AWS Secrets Manager
- **GitHub Integration**: Octokit REST API
- **AI/LLM**: AWS Bedrock with Claude 3.5 Sonnet
- **Logging**: CloudWatch Logs

## GitHub Token Permissions Quick Reference

| Repository Type | Required Scope | What It Allows |
|----------------|----------------|----------------|
| **Public repos only** | `public_repo` | Read public repository data, PRs, comments |
| **Private repos** | `repo` (full) | Read private repository data, PRs, comments |
| **Fine-grained (recommended)** | Contents: Read, Pull requests: Read | More granular access control |

**The token is only used for READ operations and is never stored.**

---

## Testing the API

### Step 1: Get Your API Endpoint

After deploying with Terraform, get the API URL:

```bash
cd terraform
terraform output api_url
```

This will output something like: `https://api.yourdomain.com`

### Step 2: Get Your API Key

Retrieve the API key from AWS Secrets Manager:

```bash
# List all secrets
aws secretsmanager list-secrets --query "SecretList[?contains(Name, 'api')].Name" --output table

# Get the API key value
aws secretsmanager get-secret-value \
  --secret-id <your-secret-name> \
  --query SecretString \
  --output text
```

### Step 3: Create a GitHub Personal Access Token

#### For Public Repositories Only:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Sprint PR Intelligence")
4. Select **only** the `public_repo` scope:
   - `public_repo` - Access public repositories
5. Click "Generate token"
6. Copy the token (starts with `ghp_`)

#### For Private Repositories:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Sprint PR Intelligence")
4. Select the full `repo` scope:
   - `repo` - Full control of private repositories
     - This includes: repo:status, repo_deployment, public_repo, repo:invite, security_events
5. Click "Generate token"
6. Copy the token (starts with `ghp_`)

#### What the Token is Used For:
The application makes **read-only** API calls to:
- Read repository README files
- List merged pull requests in date range
- Read PR metadata (title, description, labels, author)
- Read PR comments and reviews
- Read code diffs (file changes)

**The token is NEVER stored** - it's only used during the execution and passed in your API request.

#### Recommended: Use Fine-Grained Tokens (Better Security)
For more control, use Fine-grained personal access tokens:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Select repository access:
   - **Public Repositories (read-only)** or
   - **All repositories** or **Only select repositories**
4. Under "Repository permissions", set:
   - **Contents**: Read-only (for README)
   - **Pull requests**: Read-only (for PR data)
   - **Metadata**: Read-only (automatically included)
5. Generate token

### Step 4: Test with cURL

**Basic Test** (using repo URLs - easiest!):

```bash
curl -X POST https://api.yourdomain.com/sprint-intelligence \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your-api-key>" \
  -d '{
    "sprintName": "Test Sprint",
    "since": "2024-01-01T00:00:00Z",
    "until": "2024-01-31T23:59:59Z",
    "githubToken": "<your-github-token>",
    "repos": [
      "https://github.com/octocat/Hello-World"
    ]
  }'
```

**Multi-Repo Test** (mix of formats):

```bash
curl -X POST https://api.yourdomain.com/sprint-intelligence \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your-api-key>" \
  -d '{
    "sprintName": "Sprint 2024-Q4",
    "since": "2024-10-01T00:00:00Z",
    "until": "2024-10-15T23:59:59Z",
    "githubToken": "<your-github-token>",
    "repos": [
      "https://github.com/facebook/react",
      "microsoft/vscode",
      "https://github.com/torvalds/linux.git",
      {"owner": "golang", "repo": "go"}
    ]
  }'
```

**Alternative Formats** (all work!):

```bash
# Full HTTPS URL
"repos": ["https://github.com/owner/repo"]

# Git URL
"repos": ["git@github.com:owner/repo.git"]

# Short format
"repos": ["owner/repo"]

# Object format
"repos": [{"owner": "owner", "repo": "repo"}]

# Mix and match
"repos": [
  "https://github.com/owner/repo1",
  "owner/repo2",
  {"owner": "owner", "repo": "repo3"}
]
```

**Pretty Print Response** (with jq):

```bash
curl -X POST https://api.yourdomain.com/sprint-intelligence \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your-api-key>" \
  -d '{
    "sprintName": "Test Sprint",
    "since": "2024-01-01T00:00:00Z",
    "until": "2024-01-31T23:59:59Z",
    "githubToken": "<your-github-token>",
    "repos": [{"owner": "octocat", "repo": "Hello-World"}]
  }' | jq '.'
```

**Save Report to File**:

```bash
curl -X POST https://api.yourdomain.com/sprint-intelligence \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your-api-key>" \
  -d '{
    "sprintName": "Sprint 2024-Q4",
    "since": "2024-10-01T00:00:00Z",
    "until": "2024-10-15T23:59:59Z",
    "githubToken": "<your-github-token>",
    "repos": [{"owner": "octocat", "repo": "Hello-World"}]
  }' | jq -r '.body.report' > sprint_report.md
```

### Step 5: Using the Test Script

A convenience script is provided:

```bash
cd terraform

# Make it executable (if not already)
chmod +x test_sprint_intelligence.sh

# Run with your values
./test_sprint_intelligence.sh \
  $(terraform output -raw api_url) \
  <your-api-key> \
  <your-github-token>
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sprintName` | string | No | Name of the sprint for the report header |
| `since` | string | Yes | ISO 8601 timestamp for start of date range |
| `until` | string | Yes | ISO 8601 timestamp for end of date range |
| `githubToken` | string | Yes | GitHub personal access token with `repo` scope |
| `repos` | array | Yes | Array of repositories - accepts URLs, short format, or objects (see examples above) |

### Response Format

**Success Response** (HTTP 202 - Accepted):
```json
{
  "message": "Sprint analysis started",
  "executionArn": "arn:aws:states:us-east-1:123456789012:execution:sprint_pr_intelligence:execution-1234567890",
  "executionName": "execution-1234567890-abc123",
  "startDate": "2024-10-16T10:30:00.000Z",
  "status": "RUNNING",
  "statusUrl": "https://console.aws.amazon.com/states/home?region=us-east-1#/executions/details/...",
  "note": "This is an asynchronous operation. The analysis may take several minutes to complete. Check CloudWatch Logs or Step Functions console for results."
}
```

The report will be stored in S3 when complete. You can:
- Monitor execution in Step Functions console using the statusUrl
- Check CloudWatch Logs for progress
- Retrieve results from S3 bucket after completion

**Error Response** (HTTP 500):
```json
{
  "statusCode": 500,
  "body": {
    "error": "Error message here",
    "message": "Error executing workflow"
  }
}
```

The `report` field contains a markdown-formatted comprehensive analysis that you can save to a file or render in your application.

### Troubleshooting Tests

**"Unauthorized" or 403 error**:
- Check that x-api-key header is correct
- Verify API key exists in Secrets Manager
- Ensure API key matches what the authorizer expects

**"Rate limit exceeded"**:
- GitHub API has limits (5,000 requests/hour for authenticated users)
- Reduce number of repos or PRs in date range
- Consider using a GitHub App for higher limits

**Empty report or no PRs found**:
- Verify date range includes merged PRs
- Check that repos are public or token has access
- Confirm GitHub token has `repo` scope

**Timeout errors**:
- Reduce number of repositories per request
- Shorten date range to reduce PRs analyzed
- Check CloudWatch logs for specific failures

## Deployment

### Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.0
- Node.js >= 20.x
- Valid domain configured in Route 53 (for custom domain)
- GitHub account with access to repositories to analyze

### Initial Setup

1. **Configure Terraform Variables**

Create or edit `terraform/terraform.tfvars`:
```hcl
domain      = "example.com"
environment = "dev"
region      = "us-east-1"
tags = {
  Project = "sprint-intelligence"
  Owner   = "your-team"
}
```

2. **Initialize Terraform**

```bash
cd terraform
terraform init
```

3. **Deploy Infrastructure**

```bash
terraform plan
terraform apply
```

4. **Note the Outputs**

After deployment, Terraform will output:
- API Gateway URL
- Step Functions ARN
- Lambda function names

### AWS Bedrock Configuration

The application uses AWS Bedrock with Claude 3.5 Sonnet for AI-powered analysis.

**Prerequisites:**
1. Ensure AWS Bedrock is available in your region (us-east-1 recommended)
2. Request access to Claude 3.5 Sonnet model in AWS Bedrock console
3. Verify model access is granted before deployment

**IAM Permissions:**
The Lambda functions have been configured with the following Bedrock permissions:
- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`

**Model Configuration:**
- Model ID: `anthropic.claude-3-5-sonnet-20241022-v2:0`
- Max Tokens: 4096 (PR analysis), 8192 (sprint aggregation)
- Temperature: 0.7

## Project Structure

```
.
├── README.md
├── terraform/
│   ├── apigw.tf                          # API Gateway configuration
│   ├── backend.tf                        # Terraform backend config
│   ├── step_functions.tf                 # Step Functions workflow
│   ├── lambda_fetch_repo_data.tf         # Lambda: Fetch repo data
│   ├── lambda_fetch_repo_data/
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── lambda_fetch_pr_details.tf        # Lambda: Fetch PR details
│   ├── lambda_fetch_pr_details/
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── lambda_prepare_data.tf            # Lambda: Prepare data
│   ├── lambda_prepare_data/
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── lambda_analyze_pr.tf              # Lambda: Analyze PR
│   ├── lambda_analyze_pr/
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── lambda_aggregate_sprint.tf        # Lambda: Aggregate report
│   ├── lambda_aggregate_sprint/
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── lambda_workflow.tf                # Lambda: Workflow proxy
│   ├── lambda_workflow/
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── lambda_authorizer.tf              # Lambda: API authorizer
│   ├── lambda_authorizer/
│   │   └── app.py
│   ├── sample_input.json                 # Example request payload
│   ├── test_sprint_intelligence.sh       # Test script
│   ├── local.tf                          # Local variables
│   ├── main.tf                           # Main Terraform config
│   ├── outputs.tf                        # Output values
│   ├── variables.tf                      # Input variables
│   └── versions.tf                       # Provider versions
└── static_site/
    └── index.html                        # Static website (if needed)
```

## Configuration Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `domain` | Base domain for API | Yes | - |
| `environment` | Environment name (dev, staging, prod) | Yes | - |
| `region` | AWS region | Yes | - |
| `tags` | Additional resource tags | No | {} |

## Security Considerations

### Authentication & Authorization
- All API requests require API key validation via Lambda authorizer
- GitHub tokens are passed in request payload (never stored)
- API keys stored securely in AWS Secrets Manager

### Network Security
- All communication over HTTPS using ACM-managed certificates
- CloudFront CDN for static content delivery
- No public S3 bucket access (Origin Access Control)

### IAM & Permissions
- Least-privilege IAM roles for all Lambda functions
- Step Functions has specific Lambda invoke permissions only
- CloudWatch Logs for complete audit trail

### Data Protection
- No persistent storage of GitHub data or tokens
- Logs retain data for only 3-7 days
- GitHub tokens used in-memory only during execution

## Cost Optimization

### Pricing Factors
- **API Gateway**: $1.00 per million requests
- **Lambda**: Based on requests and GB-seconds
  - Fetch functions: 512MB, 60s timeout
  - Analyze function: 1024MB, 120s timeout
- **Step Functions**: $0.025 per 1,000 state transitions
- **CloudWatch Logs**: $0.50 per GB ingested

### Estimated Costs (Monthly)
For 100 sprint reports analyzing 20 repos with 50 PRs each:
- API Gateway: ~$0.10
- Lambda: ~$5-10 (depends on execution time)
- Step Functions: ~$0.25
- CloudWatch Logs: ~$1-2
- **Total: ~$7-15/month**

### Cost Savings Tips
1. Adjust Lambda memory sizes based on actual usage
2. Reduce CloudWatch log retention if not needed
3. Use reserved concurrency for predictable workloads
4. Consider provisioned concurrency only if needed

## Monitoring & Observability

### CloudWatch Logs
All Lambda functions and Step Functions log to CloudWatch:
- Request/response payloads
- Execution timing
- Error messages and stack traces
- GitHub API rate limit status

### Metrics to Monitor
- Step Functions execution count and duration
- Lambda concurrent executions
- API Gateway 4xx/5xx errors
- Lambda errors and throttles
- GitHub API rate limit remaining

### Alarms (Recommended)
```hcl
# Example CloudWatch alarm for Lambda errors
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "sprint-intelligence-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Alert on Lambda errors"
}
```

## Troubleshooting

### Common Issues

**"No pull requests found"**
- Verify date range includes merged PRs
- Check GitHub token permissions (needs `repo` scope)
- Ensure repos are accessible to the token owner

**"Rate limit exceeded"**
- GitHub API has rate limits (5,000/hour for authenticated requests)
- Use GitHub App authentication for higher limits
- Reduce number of repos or PRs per request

**"Lambda timeout"**
- Increase timeout in Lambda Terraform configuration
- Check if GitHub API is responding slowly
- Consider processing fewer PRs per execution

**"Invalid API key"**
- Verify x-api-key header is included
- Check API key in AWS Secrets Manager
- Ensure authorizer Lambda is deployed correctly

### Debug Mode

Enable detailed logging:
```bash
# In Lambda function code
console.log('Debug:', JSON.stringify(event, null, 2));
```

View logs:
```bash
aws logs tail /aws/lambda/dev_analyze_pr --follow
```

## Future Enhancements

### Planned Features
- [x] Real LLM integration (AWS Bedrock with Claude 3.5 Sonnet)
- [ ] React frontend for report visualization
- [ ] S3 storage for historical reports
- [ ] Slack/Teams integration for report delivery
- [ ] Comparison reports between sprints
- [ ] Custom report templates
- [ ] GitHub App for better rate limits
- [ ] DynamoDB for caching GitHub data

### Integration Ideas
- JIRA sprint integration
- Linear milestone integration
- GitLab support
- Bitbucket support
- Multi-team aggregation reports

## Contributing

This is a demonstration project. For production use:
1. Implement real LLM integration
2. Add comprehensive error handling
3. Implement retry logic for GitHub API
4. Add input validation and sanitization
5. Set up CI/CD pipeline
6. Add integration tests
7. Implement caching for frequently accessed data

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- Check CloudWatch logs for error details
- Review GitHub API documentation
- Verify AWS service limits
- Contact your AWS support team for infrastructure issues
