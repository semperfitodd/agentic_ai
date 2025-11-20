# Agentic AI - Intelligent GitHub Repository Analyzer

An AI-powered application designed to intelligently analyze GitHub repositories, pull requests, and code changes to provide comprehensive insights about what applications do and how they've evolved.

## What This Application Will Do

This application is being built as an intelligent code analysis agent that will:

1. Read and understand repository README files to learn what an application is supposed to do
2. Analyze pull request descriptions and notes to understand changes being made
3. Examine actual code changes when PR notes are sparse or unclear
4. Provide AI-powered summaries and insights about repositories and their evolution

The system will act as an intelligent assistant that can understand the purpose and architecture of any GitHub repository, track how applications change over time through PR analysis, and provide context-aware summaries by combining README documentation with actual code changes.

## Why We're Building This

### The Problem
Developers often need to understand unfamiliar codebases quickly. PR descriptions are frequently incomplete or lack context. Understanding what changed and why requires manually reading through code diffs. Onboarding to new projects takes significant time and effort.

### The Solution
By combining AI capabilities with GitHub API integration, we can automatically extract and summarize repository information, intelligently analyze code changes beyond simple diffs, provide natural language explanations of technical changes, and scale knowledge sharing across development teams.

## Current Architecture

### Infrastructure Components

**API Gateway (HTTP API)**
- Custom domain configured at api.brewsentry.com
- Lambda authorizer for API key authentication
- CORS configuration for cross-origin requests
- Throttling limits set at 100 requests per second with burst of 100
- CloudWatch logging enabled with 7-day retention
- ACM certificate for TLS/SSL
- Route 53 DNS configuration

**Lambda Functions**
All Lambda functions are written in TypeScript and deployed with Node.js 20.x runtime:

- **Authorizer**: Validates incoming API requests against API keys stored in AWS Secrets Manager
- **Temp**: Basic hello world function that returns a JSON response with timestamp and environment information
- **Workflow Proxy**: Accepts requests and invokes the Step Functions state machine synchronously, returning the workflow results

**Step Functions State Machine**
- Type: STANDARD workflow
- Current workflow chain: Temp Lambda function followed by Success state
- CloudWatch logging enabled at ALL level
- 7-day log retention
- IAM role with policies for Lambda invocation

**Authentication and Security**
- API keys stored in AWS Secrets Manager
- Lambda authorizer checks x-api-key header against stored secrets
- IAM roles configured with least-privilege access
- CloudWatch logs for audit trail

**Static Website Hosting**
- S3 bucket for static content
- CloudFront distribution for CDN
- Custom domain configuration
- Origin access control for S3 security

### Technology Stack

- **Infrastructure as Code**: Terraform with official AWS modules
- **Cloud Provider**: AWS
- **API Layer**: API Gateway HTTP API v2
- **Compute**: AWS Lambda
- **Orchestration**: AWS Step Functions
- **Secrets Management**: AWS Secrets Manager
- **Programming Language**: TypeScript
- **Runtime**: Node.js 20.x
- **Logging**: CloudWatch Logs
- **DNS**: Route 53
- **CDN**: CloudFront
- **Storage**: S3

### Terraform Modules Used

- terraform-aws-modules/apigateway-v2/aws version 5.3
- terraform-aws-modules/lambda/aws version 8.1
- terraform-aws-modules/step-functions/aws version 5.0.2
- terraform-aws-modules/s3-bucket/aws version 5.8.2
- terraform-aws-modules/cloudfront/aws version 5.0.1

## Deployment

The infrastructure is fully automated using Terraform. The backend state is stored in S3 with encryption enabled. All resources are tagged with Environment, Owner, Project, and Provisioner metadata.

### Prerequisites
- AWS CLI configured with appropriate profile
- Terraform installed
- Node.js 20.x or higher
- Valid domain configured in Route 53

### Deploy Commands
```
cd terraform
terraform init
terraform plan
terraform apply
```

### Outputs
The Terraform configuration provides outputs for:
- API URL
- Frontend URL  
- Step Function ARN
- Step Function name
- Lambda temp function name

## API Endpoints

**POST /temp**
- Authorization: Custom Lambda authorizer with x-api-key header
- Returns: JSON response with hello world message, timestamp, and environment
- Payload format: 1.0

**POST /workflow**  
- Authorization: Custom Lambda authorizer with x-api-key header
- Invokes: Step Functions workflow via Lambda proxy
- Returns: Workflow execution results
- Payload format: 1.0

## Project Structure

```
.
├── README.md
├── .gitignore
├── terraform/
│   ├── apigw.tf
│   ├── backend.tf
│   ├── cloudfront.tf
│   ├── data.tf
│   ├── lambda_authorizer/
│   │   └── app.py
│   ├── lambda_authorizer.tf
│   ├── lambda_temp/
│   │   ├── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .gitignore
│   ├── lambda_temp.tf
│   ├── lambda_workflow/
│   │   ├── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .gitignore
│   ├── lambda_workflow.tf
│   ├── local.tf
│   ├── main.tf
│   ├── outputs.tf
│   ├── s3_website.tf
│   ├── step_functions.tf
│   ├── terraform.tfvars
│   ├── variables.tf
│   ├── versions.tf
│   └── vpc.tf
└── static_site/
    └── index.html
```

## Configuration Variables

The infrastructure accepts the following variables:

- **domain**: Base domain for the website and API
- **environment**: Environment name
- **region**: AWS region for all resources
- **vpc_cidr**: VPC CIDR block (optional)
- **vpc_redundancy**: Enable redundancy for VPC NAT gateways (default: false)
- **tags**: Additional tags to apply to resources (default: empty map)

## Security Considerations

All API requests require authentication via API key passed in the x-api-key header. The Lambda authorizer validates these keys against values stored in AWS Secrets Manager. All communication occurs over HTTPS using ACM-managed certificates. CloudWatch logging is enabled for all components to maintain an audit trail. IAM roles follow the principle of least privilege.

## Cost Estimation

Based on current architecture:
- API Gateway: Charged per million requests
- Lambda: Charges based on requests and compute time
- Step Functions: Charged per state transition  
- CloudWatch Logs: Charged per GB ingested and stored
- CloudFront: Charged per GB data transfer
- S3: Charged per GB storage and requests

The infrastructure is designed to be cost-effective and scales based on usage.

## GitHub Integration Approach

The application will use the GitHub REST API rather than cloning repositories locally. This approach provides access to README content, pull request metadata including titles and descriptions, individual file changes with diff information, and PR comments and reviews. The API does not require local storage and provides real-time access to current repository state. Cloning locally would not provide access to PR metadata since pull request information is not stored in git history.
