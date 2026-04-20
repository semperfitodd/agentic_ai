# AGENTS.md — Sprint Intelligence

Guidance for AI coding agents working in this repository.

## Repository Structure

| Directory | Purpose |
|---|---|
| `backend/` | All Lambda source code |
| `backend/shared/` | `@sprint/shared` — shared TypeScript utilities for all Lambdas |
| `backend/<name>/` | Individual Lambda handlers (folder name = `function_name` suffix) |
| `terraform/` | All AWS infrastructure (Terraform) |
| `static_site/` | React web frontend |
| `mobile/Arc Agent/` | SwiftUI iOS/iPadOS app |
| `architecture/` | Draw.io source files |
| `img/` | Generated PNG architecture diagrams |

## API Gateway Authorization Audit

Every route must use `authorization_type = "CUSTOM"`. Values are sourced from `local.api_route_auth` in `apigw.tf` and a `terraform check` block will fail `terraform plan` if any route deviates from this policy.

| Route | Lambda | authorization_type |
|---|---|---|
| `POST /workflow` | `workflow_proxy` | `CUSTOM` |
| `POST /sprint-intelligence` | `workflow_proxy` | `CUSTOM` |
| `GET /results` | `get_results` | `CUSTOM` |
| `GET /markdown` | `get_markdown` | `CUSTOM` |

## Shared Library

`@sprint/shared` (`backend/shared/`) exports:

- `requireEnv` — mandatory env var helper
- `logger` — structured logger with automatic secret redaction
- `AppError`, `toPublicError` — error handling primitives
- `apiResponse`, `apiTextResponse`, `stepResponse` — response builders
- `s3Client`, `putJson`, `putMarkdown`, `getJson`, `getText`, `listLatestKey`, `listObjects`
- `bedrockClient`, `invokeClaude`, `parseJsonFromClaude`
- `createOctokit`, `DEFAULT_PER_PAGE`

**Never** duplicate these in individual Lambda handlers. When adding a new shared utility, add it to `backend/shared/src/` and re-export it from `src/index.ts`.

## Adding a New Lambda

1. Create `backend/<name>/` with `index.ts`, `tsconfig.json`, `jest.config.js`, `package.json` (referencing `"@sprint/shared": "file:../shared"`)
2. Create `terraform/lambda_<name>.tf` — use existing `.tf` files as the template; set `path = "${path.module}/../backend/<name>"`, inherit `local.lambda_defaults`, `local.lambda_common_env`, `local.lambda_build_commands`
3. If the Lambda is an API Gateway target, add its route to `apigw.tf` and add a corresponding `"CUSTOM"` entry to `local.api_route_auth`
4. Add it to the authorization audit table in this file
5. Write unit tests in `__tests__/index.test.ts` using `aws-sdk-client-mock` and mock `@sprint/shared` where needed

## Testing Commands

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
  -destination "platform=iOS Simulator,name=iPhone 17"

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
| `security.mdc` | Always — entire repo |
| `typescript-lambda.mdc` | `backend/**/*.ts` |
| `react-frontend.mdc` | `static_site/src/**/*.{js,jsx,ts,tsx}` |
| `swiftui-ios.mdc` | `mobile/**/*.swift` |
| `terraform.mdc` | `terraform/**/*.tf` |
