# Sprint Report: Sprint 42 — Platform Hardening

## At a Glance

| Metric | Value |
| --- | --- |
| Sprint period | 10/1/2026 – 10/14/2026 |
| PRs merged | 18 |
| Lines added | +4,812 |
| Lines deleted | -1,276 |
| Files changed | 143 |
| Contributors | 6 |

## Executive Summary

The team shipped the new usage-based billing pipeline and closed out the authentication hardening epic, while reducing p95 API latency by roughly a third through targeted query and caching work.

### Key Outcomes

- Usage-based billing is live behind a feature gate for internal tenants.
- Sign in with Apple and Google now use PKCE end to end on web and iOS.
- p95 latency on `GET /results` dropped from 820 ms to 540 ms.

### Key Risks

- Billing reconciliation relies on a nightly job with no alerting yet.
- Two large PRs merged with a single reviewer.

## Key Metrics

Delivery stayed steady while review depth improved compared with the previous sprint.

| Metric | Value | Context |
| --- | --- | --- |
| Median time to merge | 19 h | Down from 31 h last sprint |
| Review comments per PR | 4.2 | Healthy discussion on complex changes |
| Test coverage delta | +3.1% | Driven by billing and auth suites |

## Work Breakdown

### Features

New customer-facing capabilities and integrations.

- Usage-based billing events and invoice preview (**acme/api#412**)
- Report export redesign with paginated PDF output

### Bug Fixes

Defects resolved across the API and the iOS client.

- Fixed token refresh race on app resume
- Corrected timezone handling for sprint date ranges

### Refactoring

- Consolidated S3 helpers into the shared library

## Technical Highlights

### Most Impactful Changes

- Moved report generation to the Bedrock Converse API.
- Introduced a KMS-bound GitHub token envelope.

### Notable Technical Decisions

- Chose Step Functions Map state over SQS fan-out for PR analysis.

### Quality Improvements

- Added contract tests for every API Gateway route.

## Repository Insights

| Repository | PRs | Added | Deleted |
| --- | ---: | ---: | ---: |
| acme/api | 9 | +2,904 | -712 |
| acme/web | 6 | +1,388 | -402 |
| acme/ios | 3 | +520 | -162 |

### acme/api

Billing and authentication work dominated the API this sprint.

- Billing event ingestion and invoice preview endpoints
- PKCE token exchange hardening

### acme/web

- Redesigned run experience and report viewer

## Team Collaboration

Review load was spread across the team, with every PR receiving at least one approval.

| Contributor | PRs |
| --- | ---: |
| alex-chen | 6 |
| priya-n | 5 |
| sam-ortiz | 4 |

- Pairing sessions on billing reduced rework.
- Async design reviews unblocked the iOS track.

## Sprint Retrospective

### What Went Well

- Clear acceptance criteria on billing stories.

### Areas for Improvement

- Large PRs should be split before review.

### Lessons Learned

- Feature gates made the billing rollout low-risk.

## Recommendations

### Next Sprint Focus

- Add alerting to billing reconciliation.

### Technical Debt to Address

- Retire the legacy html2canvas export path.

### Process Improvements

- Require two reviewers on PRs above 500 changed lines.
