# Application-First Agentic AI: Sprint Intelligence

**A production-grade system demonstrating how to build enterprise AI that actually works.**

This project implements an application-first approach to agentic AI—where most behavior is deterministic application logic, and AI is used only to interpret grey areas: synthesizing, explaining, and contextualizing. The result is a repeatable, auditable, and business-ready AI capability.

![architecture.png](img/architecture.png)

---

## Table of Contents

- [The Problem with AI Today](#the-problem-with-ai-today)
- [Application-First Architecture](#application-first-architecture)
- [What This System Does](#what-this-system-does)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Infrastructure Deployment (Terraform)](#infrastructure-deployment-terraform)
  - [Frontend Deployment (React)](#frontend-deployment-react)
  - [Mobile App (iOS/iPadOS)](#mobile-app-iosipados)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Why This Approach Works](#why-this-approach-works)
- [Cost Considerations](#cost-considerations)
- [Troubleshooting](#troubleshooting)

---

## The Problem with AI Today

Enterprises have moved rapidly from experimenting with generative AI to embedding it into core workflows. Adoption is high—but impact is not. Many organizations have dozens of pilots, a handful of tactical wins, and very few production systems that consistently impact the bottom line.

**Three themes recur:**

| Challenge | Reality |
|-----------|---------|
| **Trust** | Experts don't fully trust AI outputs without human review |
| **Consistency** | The same prompt yields different answers, breaking downstream automation |
| **Compliance** | Risk, audit, and regulatory teams struggle to sign off on opaque systems |

**The root cause:** Most stalled AI efforts share a recognizable pattern—the model is the system. Business logic is encoded inside prompts, there's no deterministic backbone, and the model decides everything: how to interpret data, which steps to perform, and how to present results.

---

## Application-First Architecture

This project demonstrates a different design principle:

> **Treat AI as a component inside a well-engineered application, not as the application itself.**

### The 70/30 Principle

High-performing AI systems consistently follow this pattern:

| Component | Percentage | Examples |
|-----------|------------|----------|
| **Deterministic Logic** | ~70% | Data retrieval, workflow steps, policy enforcement, validation |
| **Agentic AI** | ~30% | Summaries, classifications, interpretations, narratives |

### Why Hallucinations Are Structurally Constrained

| Design Decision | Effect |
|-----------------|--------|
| AI never retrieves data | All data is fetched by application agents—AI can't fabricate sources |
| Questions are narrow and grounded | Specific questions about known artifacts, not open-ended queries |
| Output formats are tightly specified | Structured JSON/markdown with schema validation |
| No agent controls the workflow | Orchestration is performed by Step Functions, not by any model |
| Traceability is built-in | Every insight points back to underlying pull requests |

---

## What This System Does

Sprint Intelligence analyzes GitHub pull requests across multiple repositories and generates comprehensive sprint reports using AI-powered agents.

**Input:** Date range + list of GitHub repositories  
**Output:** Executive-ready sprint report with technical insights

The system:
1. **Discovers** and validates repositories from various URL formats
2. **Fetches** all merged PRs, code diffs, comments, and reviews
3. **Analyzes** each PR with Claude 3.5 Sonnet acting as a senior engineer
4. **Synthesizes** findings into a sprint-level narrative and metrics
5. **Delivers** results via web, mobile, or API

---

## How It Works

### Workflow Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Parse     │────▶│   Fetch     │────▶│   Fetch     │────▶│   Analyze   │
│   Repos     │     │  Repo Data  │     │ PR Details  │     │    PRs      │
│             │     │  (parallel) │     │  (parallel) │     │  (parallel) │
│ APPLICATION │     │ APPLICATION │     │ APPLICATION │     │     AI      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                    ┌─────────────┐     ┌─────────────┐            │
                    │   Store     │◀────│  Aggregate  │◀───────────┘
                    │   Results   │     │   Sprint    │
                    │             │     │             │
                    │ APPLICATION │     │     AI      │
                    └─────────────┘     └─────────────┘
```

### Step-by-Step

| Step | Agent Type | Function |
|------|------------|----------|
| 1. Parse Repos | Application | Normalize repository URLs into owner/repo format |
| 2. Fetch Repo Data | Application | Get READMEs and list merged PRs (parallel per repo) |
| 3. Fetch PR Details | Application | Retrieve diffs, comments, reviews (parallel per PR) |
| 4. Analyze PRs | **AI** | Claude analyzes each PR as a senior engineer (parallel) |
| 5. Aggregate Sprint | **AI** | Synthesize all analyses into executive narrative |
| 6. Store Results | Application | Persist report to S3 in JSON and Markdown |

**Key insight:** Steps 1-3 and 6 are completely deterministic. They work identically every time with the same inputs. AI is only used in steps 4-5 for interpretation—the grey areas where human-like reasoning adds value.

---

## Architecture

### Serverless Stack

| Service | Purpose |
|---------|---------|
| **AWS Lambda** (Node.js 20) | 11 specialized functions (7 application agents, 4 supporting) |
| **AWS Step Functions** | Orchestrates the deterministic workflow |
| **AWS Bedrock** | Claude 3.5 Sonnet v2 for AI analysis |
| **AWS S3** | Stores PR analyses and final reports |
| **AWS API Gateway** | HTTP API with custom domain |
| **AWS Secrets Manager** | Secure API key storage |
| **AWS CloudFront** | CDN for React frontend |
| **React** | Professional web interface |
| **SwiftUI** | Native iOS/iPadOS app |

### Key Design Principles

- **Stateless agents** — Each Lambda is a specialized, single-purpose function
- **Parallel execution** — Maximum throughput with Step Functions Map states
- **S3-based scalability** — Avoids Step Functions 256KB payload limits
- **Asynchronous operation** — No API Gateway timeout constraints
- **Channel independence** — Same backend serves web, mobile, CLI, and API
- **Model independence** — Swap AI providers without rewriting the system

---

## Getting Started

### Prerequisites

| Requirement | Details |
|-------------|---------|
| **AWS Account** | Lambda, Step Functions, API Gateway, S3, Secrets Manager, CloudFront, IAM |
| **AWS Bedrock Access** | Request Claude 3.5 Sonnet access in Bedrock console |
| **Terraform** | >= 1.0 |
| **Node.js** | >= 20.x |
| **Xcode** | 15.0+ (for iOS app) |
| **Domain** (optional) | Route 53 + ACM certificate for custom domain |

---

### Infrastructure Deployment (Terraform)

#### 1. Configure Variables

Create `terraform/terraform.tfvars`:

```hcl
# Required Configuration
environment = "prod"
domain      = "yourdomain.com"
region      = "us-east-1"

# Optional: Override default Bedrock model
# bedrock_model_id = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"

# Optional: Resource tags for cost tracking
# tags = {
#   Project     = "sprint-intelligence"
#   Owner       = "your-name"
#   Environment = "prod"
# }
```

**Available Variables:**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `environment` | Yes | — | Environment name (e.g., dev, prod) |
| `domain` | Yes | — | Base domain for API and website |
| `region` | Yes | — | AWS region (us-east-1 recommended for Bedrock) |
| `bedrock_model_id` | No | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` | Bedrock model ID |
| `tags` | No | `{}` | Additional resource tags |

#### 2. Deploy Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Deploy (type 'yes' when prompted)
terraform apply
```

#### 3. Retrieve Outputs

```bash
# Get API Gateway URL
terraform output api_url

# Get API Key from Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id $(terraform output -raw api_key_secret_name) \
  --query SecretString \
  --output text

# Get S3 bucket name
terraform output results_bucket_id
```

---

### Frontend Deployment (React)

#### 1. Configure Environment

Create `static_site/.env`:

```bash
# API Configuration (from Terraform outputs)
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_API_KEY=your-api-key-from-secrets-manager

# GitHub Configuration
REACT_APP_GITHUB_TOKEN=ghp_your_personal_access_token

# Default Analysis Settings
REACT_APP_DEFAULT_SINCE=2024-01-01T00:00:00Z
REACT_APP_DEFAULT_UNTIL=2025-12-31T23:59:59Z

# Default Repositories (comma-separated)
REACT_APP_DEFAULT_REPOS=owner/repo1,owner/repo2
```

**GitHub Token Setup:**

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate a **Fine-Grained Token** with:
   - **Contents**: Read-only
   - **Pull requests**: Read-only
   - **Metadata**: Read-only

#### 2. Build and Deploy

```bash
cd static_site

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

**Available npm Scripts:**

| Command | Description |
|---------|-------------|
| `npm start` | Start development server on localhost:3000 |
| `npm run build` | Create production build in `build/` directory |
| `npm test` | Run test suite |
| `npm run eject` | Eject from Create React App (irreversible) |

---

### Mobile App (iOS/iPadOS)

The native SwiftUI app provides on-the-go access to sprint intelligence reports. **The same backend serves both web and mobile**—no modifications required.

#### 1. Configure Secrets

Create `mobile/Arc Agent/Arc Agent/Secrets.swift`:

```swift
import Foundation

struct Secrets {
    // API Configuration (from Terraform outputs)
    static let apiURL = "https://api.yourdomain.com"
    static let apiKey = "your-api-key-from-secrets-manager"
    
    // GitHub Configuration
    static let githubToken = "ghp_your_personal_access_token"
    
    // Default Settings
    static let defaultRepos = ["owner/repo1", "owner/repo2"]
    static let defaultSince = "2024-01-01T00:00:00Z"
    static let defaultUntil = "2025-12-31T23:59:59Z"
    static let sprintName = "Sprint Analysis"
    static let workflowDuration = 50000  // milliseconds
}
```

> **Note:** `Secrets.swift` is gitignored. Never commit credentials to version control.

#### 2. Build in Xcode

```bash
cd mobile/Arc\ Agent
open Arc\ Agent.xcodeproj
```

**Build for Simulator:**
```bash
xcodebuild -project "Arc Agent.xcodeproj" \
  -scheme "Arc Agent" \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 16'
```

**Build for Device:**
```bash
xcodebuild -project "Arc Agent.xcodeproj" \
  -scheme "Arc Agent" \
  -sdk iphoneos \
  -configuration Release
```

#### 3. TestFlight Distribution

1. Archive in Xcode: **Product → Archive**
2. Upload to App Store Connect
3. Add testers in TestFlight
4. Single build supports both iPhone and iPad (`TARGETED_DEVICE_FAMILY = "1,2"`)

---

## Usage

### Web Interface

1. Open the deployed React application
2. Configure repositories and date range
3. Click "Run Sprint Analysis"
4. Watch real-time progress through each workflow step
5. View the professional report when complete

### Mobile App

1. Install via TestFlight
2. Configure API endpoint and credentials in Settings
3. Tap "Analyze Sprint" to start
4. View formatted reports with native iOS controls
5. Share or export via system share sheet

### API

```bash
curl -X POST https://api.yourdomain.com/sprint-intelligence \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "sprintName": "Sprint 2024-Q4",
    "since": "2024-10-01T00:00:00Z",
    "until": "2024-12-31T23:59:59Z",
    "githubToken": "ghp_your_token",
    "repos": [
      "owner/repo1",
      "https://github.com/owner/repo2"
    ]
  }'
```

**Supported Repository Formats:**
- `owner/repo`
- `https://github.com/owner/repo`
- `git@github.com:owner/repo.git`
- `{"owner": "owner", "repo": "repo"}`

---

## Project Structure

```
.
├── README.md
├── img/
│   └── architecture.png
│
├── terraform/                          # Infrastructure as Code
│   ├── *.tf                            # Terraform definitions
│   ├── terraform.tfvars                # Your configuration (gitignored)
│   │
│   ├── lambda_parse_repos/             # Application Agent
│   ├── lambda_fetch_repo_data/         # Application Agent
│   ├── lambda_prepare_data/            # Application Agent
│   ├── lambda_fetch_pr_details/        # Application Agent
│   ├── lambda_analyze_pr/              # AI Agent (Claude)
│   ├── lambda_aggregate_sprint/        # AI Agent (Claude)
│   ├── lambda_store_results/           # Application Agent
│   ├── lambda_get_results/             # API Handler
│   ├── lambda_get_markdown/            # API Handler
│   ├── lambda_workflow/                # API Handler
│   └── lambda_authorizer/              # Security
│
├── static_site/                        # React Web Frontend
│   ├── src/
│   │   ├── App.js                      # Main component
│   │   ├── components/                 # UI components
│   │   ├── constants/                  # Configuration
│   │   └── utils/                      # API & utilities
│   ├── .env                            # Your configuration (gitignored)
│   └── package.json
│
└── mobile/                             # Native Mobile Apps
    └── Arc Agent/
        ├── Arc Agent.xcodeproj
        └── Arc Agent/
            ├── Arc_AgentApp.swift      # App entry point
            ├── Models/                 # Data models
            ├── Services/               # API services
            ├── ViewModels/             # MVVM view models
            ├── Views/                  # SwiftUI views
            └── Secrets.swift           # Configuration (gitignored)
```

---

## Why This Approach Works

### For Technology Leaders

| Benefit | How It's Achieved |
|---------|-------------------|
| **Predictability** | Deterministic workflows ensure identical outputs for identical inputs |
| **Reduced Risk** | Failures are diagnosable: logic, data, or AI—not a black box |
| **Compliance Ready** | Explicit workflows, deterministic paths, auditable logs |
| **Model Independence** | Swap Claude for GPT-4 or Llama without rewriting the system |
| **Higher Velocity** | App devs build features, AI devs tune prompts—clean separation |

### For Enterprises

This architecture proves that AI can be:
- **Tested** like any other software
- **Versioned** and rolled back
- **Monitored** with standard observability tools
- **Governed** within existing security frameworks
- **Scaled** across any number of channels without backend changes

The same pattern applies to operations, compliance, risk, and customer experience—anywhere enterprises need insight, not spectacle.

---

## Cost Considerations

### Monthly Estimate (~20 reports, ~100 PRs)

| Service | Estimated Cost |
|---------|----------------|
| API Gateway | ~$0.10 |
| Lambda | ~$5-10 |
| Step Functions | ~$0.50 |
| Bedrock (Claude) | ~$5-15 |
| S3 + CloudFront | ~$1-2 |
| **Total** | **~$12-30/month** |

### Optimization Tips

- Adjust Lambda memory based on actual usage
- Set CloudWatch log retention to 7 days
- Monitor Bedrock token usage
- S3 lifecycle policy cleans reports after 90 days

---

## Further Reading

This project demonstrates the concepts from these articles by Todd Bernson, Chief AI Officer at BSC Analytics:

- [**Application-First Agentic AI: Turning Hype into Reliable Enterprise ROI**](https://bscanalytics.com/insights/application-first-agentic-ai)
- [**Why Enterprise AI Must Be Application-Led, Not Agent-Led**](https://bscanalytics.com/insights/why-enterprise-ai-must-be-application-led-not-agent-led)

The key insight: **The smartest AI systems are built like great software—with AI inside, not AI in charge.**
