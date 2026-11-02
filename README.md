# Sprint Intelligence

An agentic AI reference system that analyzes GitHub sprint activity and generates executive-quality reports: deterministic orchestration in Step Functions, with Claude on Amazon Bedrock analyzing each PR and writing the sprint summary.

![architecture.png](architecture/exports/architecture.png)

![workflow.png](architecture/exports/workflow.png)

## Services

| Component | Role |
|---|---|
| Cognito user pool (managed login, PKCE) | Open sign-up through Google and Sign in with Apple; no password accounts |
| API Gateway HTTP API + JWT authorizer | Every route requires a Cognito access token (`authorization_type = "JWT"`, enforced by a `terraform check`) |
| `lambda_workflow` | Validates the request, KMS-encrypts the GitHub token, starts Step Functions |
| `lambda_delete_account` | `DELETE /account`: deletes the caller's Cognito user (App Store guideline 5.1.1(v)); exposed in web Settings and iOS Settings |
| Step Functions workflow | Parse repos → fetch PRs → fetch PR details → analyze PRs → aggregate → store; `NoPRsFound` / `NoValidAnalyses` terminal paths |
| `analyze_pr`, `aggregate_sprint` | Claude on Bedrock (`us.anthropic.claude-haiku-5-5` by default, `var.bedrock_model_id`) |
| `fetch_repo_data`, `fetch_pr_details` | Only Lambdas allowed to decrypt the GitHub token |
| KMS key (`alias/<env>_github_token`) | Per-execution encryption context; only ciphertext appears in execution history and logs |
| S3 results bucket | Reports and intermediate JSON; SSE-S3, versioned |
| React app (`static_site/`) | Vite + Vitest, `react-oidc-context`; served by CloudFront + S3 (OAC) |
| iOS app (`mobile/Arc Agent/`) | SwiftUI; `WebAuthenticationSession` PKCE sign-in, tokens and GitHub PAT in the Keychain |

### Security model

- **No shared client secrets.** Clients hold only a public Cognito app client ID; each user signs in with Google or Apple and calls the API with a short-lived (1h) access token.
- **Self-service deletion.** Signed-in users can delete their account from web or iOS Settings; the Lambda deletes only the user named in the caller's own token.
- **GitHub token never in plaintext at rest.** The web app keeps it in `sessionStorage` (per tab), the iOS app in the Keychain. `lambda_workflow` encrypts it with KMS (context: `purpose`, `executionName`) before `StartExecution`; ciphertext from one execution cannot be decrypted under another.
- CORS restricted to `https://<env>.<domain>`; the shared logger redacts `githubToken`, `authorization`, `token`, `secret`, `password`.

## Project Status

**Verification environment (2026-11-02):** macOS; Node v26.13.0; npm 11.20.0; Terraform v1.16.6 (CI: 1.17.1); Xcode 27.2. Record only commands actually run (see [AGENTS.md](AGENTS.md)).

### Verification log

| Date | Area | Command | Result |
|---|---|---|---|
| 2026-11-02 | `@sprint/shared` | `cd backend/shared && npm test` | **Pass** — 6 suites, 27 tests |
| 2026-11-02 | All Lambdas | `npm test -- --passWithNoTests` per package | **Pass** — 11 suites, 37 tests |
| 2026-11-02 | Backend deps | `npm audit --omit=dev` per package | **Pass** — 0 vulnerabilities in all 12 packages |
| 2026-11-02 | React frontend | `cd static_site && npm test` (Vitest) | **Pass** — 6 files, 48 tests |
| 2026-11-02 | React frontend | `npm run build` (Vite) | **Pass** |
| 2026-11-02 | React frontend | `npm audit` | **Pass** — 0 vulnerabilities (was 57 under Create React App) |
| 2026-11-02 | iOS | `xcodebuild test -only-testing:"Arc AgentTests"` on iPhone 17 Pro simulator, with `Secrets.swift` copied from the example | **Pass** — 13 tests |
| 2026-11-02 | Terraform | `terraform fmt -check -recursive` + `terraform validate` | **Pass** |
| 2026-11-02 | Terraform | `terraform plan` against remote state (`AWS_PROFILE=bscsandbox`) | **Pass** — 22 add, 15 change, 12 destroy (Cognito, KMS, JWT authorizer, `delete_account` added; API key authorizer and secret removed; Bedrock model updated; Google/Apple providers not yet configured) |
| 2026-11-02 | Architecture export | `cd architecture/scripts && npm run export` | **Pass** |

### Not yet verified

- Google and Apple sign-in (providers are created once their credentials are set; see Setup → Identity providers)
- End-to-end sprint report with a signed-in user against live GitHub and Bedrock
- Account deletion against the live user pool
- Load, penetration, or accessibility testing

### Known limitations

- Any signed-in user can list and read every report; there is no per-user report ownership yet, so account deletion removes the sign-in but not reports.
- Apple's Sign in with Apple token revocation on deletion is handled by Cognito's brokered session only; the app does not call Apple's revoke endpoint.
- The Step Functions alarm has no SNS/PagerDuty action or dashboard yet.

## Prerequisites

| Tool | Version |
|---|---|
| AWS CLI | ≥ 2 |
| Node.js | 24.x |
| Terraform | ≥ 1.10.5 |
| Xcode | ≥ 16 (iOS 18 target) |

## Setup

### 1. Infrastructure

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan -out=plan.out
terraform apply plan.out
```

| Output | Use |
|---|---|
| `api_url` | `API_URL` repo variable |
| `cognito_authority` | `COGNITO_AUTHORITY` repo variable |
| `cognito_client_id` | `COGNITO_CLIENT_ID` repo variable, `Secrets.cognitoClientId` |
| `cognito_domain` | `COGNITO_DOMAIN` repo variable, `Secrets.cognitoDomain` |
| `cognito_user_pool_id` | Inviting users |
| `github_actions_role_arn` | `AWS_ROLE_ARN` repo variable |
| `cloudfront_distribution_id` | `CLOUDFRONT_DISTRIBUTION_ID` repo variable |
| `site_bucket_name` | `SITE_BUCKET` repo variable |
| `frontend_url`, `results_bucket`, `github_token_kms_key_arn` | Reference |

### 2. Identity providers

Register `terraform output -raw cognito_idp_response_url` as the redirect URI on a Google OAuth web client and on an Apple Services ID (Sign in with Apple, with a `.p8` key). Then:

```bash
gh variable set GOOGLE_CLIENT_ID  --body "<google client id>"
gh variable set APPLE_SERVICES_ID --body "<apple services id>"
gh variable set APPLE_TEAM_ID     --body "<apple team id>"
gh variable set APPLE_KEY_ID      --body "<apple key id>"
gh secret set GOOGLE_CLIENT_SECRET
gh secret set APPLE_PRIVATE_KEY < AuthKey_XXXXXXXXXX.p8
gh workflow run terraform.yml
```

Until a provider is configured the app client falls back to admin-created Cognito users only.

### 3. Local config

```bash
cp static_site/.env.example static_site/.env.local
cp "mobile/Arc Agent/Arc Agent/Secrets.swift.example" "mobile/Arc Agent/Arc Agent/Secrets.swift"
```

Local web development needs `auth_dev_callback_urls = ["http://localhost:5173/"]` in `terraform.tfvars`.

### 4. Build and run

```bash
cd static_site && npm install && npm run dev
```

```bash
cd architecture/scripts && npm install && npm run export
```

## Testing

```bash
cd backend/shared && npm install && npm test
```

```bash
for dir in backend/*/; do [ "$dir" = "backend/shared/" ] && continue; (cd "$dir" && npm install && npm test -- --passWithNoTests); done
```

```bash
cd static_site && npm test
```

```bash
xcodebuild test -project "mobile/Arc Agent/Arc Agent.xcodeproj" -scheme "Arc Agent" -destination "platform=iOS Simulator,name=iPhone 17 Pro"
```

```bash
cd terraform && terraform fmt -check -recursive && terraform validate
```

## CI/CD

Path-filtered GitHub Actions workflows; each also supports `workflow_dispatch`. `mobile/` is not built in CI. Dependabot ([`.github/dependabot.yml`](.github/dependabot.yml)) opens grouped weekly updates for npm, Terraform, and Actions.

| Workflow | Triggers on | PR | Push to `main` |
|---|---|---|---|
| `backend.yml` | `backend/**` | build shared → test changed Lambdas | test → `aws lambda update-function-code` |
| `frontend.yml` | `static_site/**` | test + build | test + build + S3 sync + CloudFront invalidation |
| `terraform.yml` | `terraform/**` | plan (PR comment) | plan → apply (`production` environment) |

### Repository variables

```bash
cd terraform
gh variable set AWS_REGION                 --body "us-east-1"
gh variable set TF_DOMAIN                  --body "example.com"
gh variable set TF_ENVIRONMENT             --body "agentic_ai_demo"
gh variable set AWS_ROLE_ARN               --body "$(terraform output -raw github_actions_role_arn)"
gh variable set CLOUDFRONT_DISTRIBUTION_ID --body "$(terraform output -raw cloudfront_distribution_id)"
gh variable set SITE_BUCKET                --body "$(terraform output -raw site_bucket_name)"
gh variable set API_URL                    --body "$(terraform output -raw api_url)"
gh variable set COGNITO_AUTHORITY          --body "$(terraform output -raw cognito_authority)"
gh variable set COGNITO_CLIENT_ID          --body "$(terraform output -raw cognito_client_id)"
gh variable set COGNITO_DOMAIN             --body "$(terraform output -raw cognito_domain)"
```

Secrets: `GOOGLE_CLIENT_SECRET`, `APPLE_PRIVATE_KEY` (see Setup → Identity providers). AWS access uses GitHub OIDC.

## Monitoring

- CloudWatch alarm on Step Functions `ExecutionsFailed` ([`terraform/cloudwatch_alarms.tf`](terraform/cloudwatch_alarms.tf))
- Lambda logs retained 30 days; Step Functions and API Gateway access logs 7 days

For repository structure, Lambda inventory, the authorization audit, and agent conventions, see [AGENTS.md](AGENTS.md).
