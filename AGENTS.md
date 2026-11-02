# AGENTS.md — Sprint Intelligence

Guidance for AI coding agents working in this repository.

## Repository Structure

| Directory | Purpose |
|---|---|
| `backend/` | All Lambda source code |
| `backend/shared/` | `@sprint/shared` — shared TypeScript utilities for all Lambdas |
| `backend/<name>/` | Individual Lambda handlers (folder name = `function_name` suffix) |
| `terraform/` | All AWS infrastructure (Terraform) |
| `static_site/` | React web frontend (Vite + Vitest) |
| `mobile/Arc Agent/` | SwiftUI iOS/iPadOS app |
| `architecture/diagrams/` | Excalidraw diagram sources (`.excalidraw`) |
| `architecture/exports/` | Generated PNG/SVG diagram outputs |
| `architecture/scripts/` | Excalidraw export script (`npm run export`) |

## Lambda Functions

| Function | Route | Purpose |
|---|---|---|
| `lambda_aggregate_sprint` | Step | Invokes the Bedrock model across PR analyses to produce markdown sprint report |
| `lambda_analyze_pr` | Step | Invokes the Bedrock model per PR to produce structured analysis JSON |
| `lambda_delete_account` | `DELETE /account` | Deletes the caller's Cognito user (from the JWT `username` claim) |
| `lambda_fetch_pr_details` | Step | Decrypts the GitHub token; fetches diffs, comments, reviews per PR (parallel Map) |
| `lambda_fetch_repo_data` | Step | Decrypts the GitHub token; fetches PR metadata per repo via GitHub API (parallel Map) |
| `lambda_get_markdown` | `GET /markdown` | Retrieves a specific markdown report from S3 by `?key=` |
| `lambda_get_results` | `GET /results` | Polls execution status by `executionArn`; lists reports (`?list=true`) |
| `lambda_parse_repos` | Step | Normalizes GitHub URLs into structured list |
| `lambda_prepare_data` | Step | Aggregates raw PR data, writes consolidated JSON to S3 |
| `lambda_store_results` | Step | Validates and surfaces final S3 locations as execution output |
| `lambda_workflow` | `POST /workflow` | Validates request, KMS-encrypts the GitHub token, starts Step Functions execution, returns `executionArn` |

All API routes are protected by the Cognito JWT authorizer (`authorization_type = "JWT"`). The GitHub token only travels through Step Functions as KMS ciphertext (`encryptedGithubToken`) bound to the execution name.

## API Gateway Authorization Audit

Every route must use `authorization_type = "JWT"`. Values are sourced from `local.api_route_auth` in `apigw.tf` and a `terraform check` block will fail `terraform plan` if any route deviates from this policy.

| Route | Lambda | authorization_type |
|---|---|---|
| `POST /workflow` | `workflow_proxy` | `JWT` |
| `POST /sprint-intelligence` | `workflow_proxy` | `JWT` |
| `GET /results` | `get_results` | `JWT` |
| `GET /markdown` | `get_markdown` | `JWT` |
| `DELETE /account` | `delete_account` | `JWT` |

## Shared Library

`@sprint/shared` (`backend/shared/`) exports:

- `requireEnv` — mandatory env var helper
- `logger` — structured logger with automatic secret redaction
- `AppError`, `toPublicError` — error handling primitives
- `apiResponse`, `apiTextResponse`, `stepResponse` — response builders
- `s3Client`, `putJson`, `putMarkdown`, `getJson`, `getText`, `listLatestKey`, `listObjects`
- `bedrockClient`, `invokeModel` (Bedrock Converse API), `parseModelJson`
- `kmsClient`, `encryptGithubToken`, `decryptGithubToken`
- `createOctokit`, `DEFAULT_PER_PAGE`

**Never** duplicate these in individual Lambda handlers. When adding a new shared utility, add it to `backend/shared/src/` and re-export it from `src/index.ts`.

## Adding a New Lambda

1. Create `backend/<name>/` with `index.ts`, `tsconfig.json`, `package.json` (referencing `"@sprint/shared": "file:../shared"`, test script `vitest run --config ../vitest.config.mjs`)
2. Create `terraform/lambda_<name>.tf` — use existing `.tf` files as the template; set `path = "${path.module}/../backend/<name>"`, inherit `local.lambda_defaults`, `local.lambda_common_env`, `local.lambda_build_commands`
3. If the Lambda is an API Gateway target, add its route to `apigw.tf` and add a corresponding `"JWT"` entry to `local.api_route_auth`
4. Add it to the authorization audit table in this file
5. Write Vitest unit tests in `__tests__/index.test.ts` using `aws-sdk-client-mock`, and `vi.mock('@sprint/shared', ...)` where needed

## Testing Commands

All backend packages share [`backend/vitest.config.mjs`](backend/vitest.config.mjs), which resolves `.ts` before the committed `index.js` so `vi.mock` applies to the source. `npm run build` (TypeScript 7 `tsc`) is the type check.

```bash
# Shared library
cd backend/shared && npm test

# Single lambda
cd backend/workflow_proxy && npm test

# All lambdas
for dir in backend/*/; do
  [[ "$dir" == "backend/shared/" ]] && continue
  (cd "$dir" && npm test --passWithNoTests) 2>&1 | grep -E "PASS|FAIL|Tests:"
done

# React frontend
cd static_site && npm test

# iOS
xcodebuild test \
  -project "mobile/Arc Agent/Arc Agent.xcodeproj" \
  -scheme "Arc Agent" \
  -destination "platform=iOS Simulator,name=iPhone 17 Pro,OS=27.2"

# Terraform
cd terraform && terraform fmt -check -recursive && terraform validate
```

## Step Functions Terminal States

When a workflow branch can exit gracefully without reaching the main success path, use a `Choice` state that checks for the key required by the next `Task`. Route the absent-key branch to a terminal `Pass` state.

```
CheckXxxSuccess (Choice)
  → key present  → NextTask
  → key absent   → NoXxx (Pass, End: true)
```

| Choice state | Terminal Pass state | Condition |
|---|---|---|
| `NoPRsFound` | `NoPRsFound` | No PRs returned by `FetchRepoData` |
| `CheckAggregateSuccess` | `NoValidAnalyses` | `AggregateSprint` returns 0 valid analyses |

## Cursor Rules

Rules in `.cursor/rules/` provide file-scoped guidance:

| Rule file | Applies to |
|---|---|
| `architecture-diagrams.mdc` | Excalidraw diagrams and exports |
| `core-principles.mdc`, `security.mdc`, and other shared rules | Repository-wide conventions |
| `react-frontend.mdc` | `static_site/src/**/*.{js,jsx,ts,tsx}` |
| `swiftui-ios.mdc` | `mobile/**/*.swift` |
| `terraform.mdc` | `terraform/**/*.tf` |
| `typescript-lambda.mdc` | `backend/**/*.ts` |
