import PDFKit
import SwiftUI
import XCTest
@testable import Arc_Agent

final class APIErrorTests: XCTestCase {

    func testInvalidResponseCarriesReason() {
        let error = APIError.invalidResponse(reason: "missing key")
        XCTAssertEqual(error.errorDescription, "Invalid response from server: missing key")
    }
}

final class ExecutionOutputDecodingTests: XCTestCase {

    func testDecodesNoValidAnalysesPayload() throws {
        let json = """
        {
          "status": "SUCCEEDED",
          "output": {
            "body": {
              "sprintName": "Current sprint",
              "since": "2025-11-20T00:00:00Z",
              "until": "2026-04-20T00:00:00Z",
              "totalPRs": 0,
              "report": "No valid PR analyses were available to generate a sprint report.",
              "warning": "All PR analyses failed validation"
            }
          }
        }
        """
        let status = try JSONDecoder().decode(ExecutionStatus.self, from: json.data(using: .utf8)!)
        XCTAssertEqual(status.status, "SUCCEEDED")
        XCTAssertNil(status.output?.s3Location)
        XCTAssertNil(status.output?.body?.s3Location)
        XCTAssertEqual(status.output?.body?.report, "No valid PR analyses were available to generate a sprint report.")
        XCTAssertEqual(status.output?.body?.warning, "All PR analyses failed validation")
        XCTAssertEqual(status.output?.body?.sprintName, "Current sprint")
    }

    func testDecodesSuccessPayloadWithMarkdownKey() throws {
        let json = """
        {
          "status": "SUCCEEDED",
          "output": {
            "s3Location": { "markdownKey": "reports/sprint/x.md" },
            "totalPRs": 5
          }
        }
        """
        let status = try JSONDecoder().decode(ExecutionStatus.self, from: json.data(using: .utf8)!)
        XCTAssertEqual(status.output?.s3Location?.markdownKey, "reports/sprint/x.md")
        XCTAssertNil(status.output?.body?.report)
    }
}

final class WorkflowStepsManagerTests: XCTestCase {

    func testStepsAreNonEmpty() {
        let manager = WorkflowStepsManager()
        XCTAssertFalse(manager.steps.isEmpty)
    }

    func testTotalDurationIsPositive() {
        let manager = WorkflowStepsManager()
        XCTAssertGreaterThan(manager.totalDuration, 0)
    }

    func testTotalDurationEqualsSumOfStepDurations() {
        let manager = WorkflowStepsManager()
        let expected = manager.steps.reduce(0) { $0 + $1.duration }
        XCTAssertEqual(manager.totalDuration, expected)
    }

    func testStepTypesAreValid() {
        let manager = WorkflowStepsManager()
        for step in manager.steps {
            XCTAssertTrue(step.type == .application || step.type == .ai)
        }
    }

    func testAllStepsHaveNames() {
        let manager = WorkflowStepsManager()
        for step in manager.steps {
            XCTAssertFalse(step.name.isEmpty, "Step should have a non-empty name")
        }
    }
}

final class SprintAnalysisViewModelTests: XCTestCase {

    @MainActor
    func testInitialStateIsIdle() {
        let vm = SprintAnalysisViewModel()
        XCTAssertFalse(vm.isLoading)
        XCTAssertFalse(vm.isFetchingReport)
        XCTAssertEqual(vm.progress, 0.0)
        XCTAssertEqual(vm.currentStepIndex, 0)
        XCTAssertTrue(vm.completedSteps.isEmpty)
        XCTAssertNil(vm.errorMessage)
        XCTAssertNil(vm.markdownReport)
        XCTAssertFalse(vm.showReportModal)
        XCTAssertFalse(vm.workflowComplete)
    }

    @MainActor
    func testDismissReportSetsShowReportModalFalse() {
        let vm = SprintAnalysisViewModel()
        vm.showReportModal = true
        vm.dismissReport()
        XCTAssertFalse(vm.showReportModal)
    }

    @MainActor
    func testResetClearsReportAndErrors() {
        let vm = SprintAnalysisViewModel()
        vm.markdownReport = "# Report"
        vm.errorMessage = "failed"
        vm.showReportModal = true
        vm.reset()
        XCTAssertNil(vm.markdownReport)
        XCTAssertNil(vm.errorMessage)
        XCTAssertFalse(vm.showReportModal)
        XCTAssertEqual(vm.status, .idle)
    }
}


final class GithubTokenStoreTests: XCTestCase {

    override func tearDown() {
        GithubTokenStore.clear()
        super.tearDown()
    }

    func testClearsTokenWhenSubjectMismatches() {
        GithubTokenStore.set(token: "ghp_test", subject: "user-a")
        GithubTokenStore.reconcile(currentSubject: "user-b")
        XCTAssertEqual(GithubTokenStore.token(), "")
    }

    func testKeepsTokenWhenSubjectMatches() {
        GithubTokenStore.set(token: "ghp_test", subject: "user-a")
        GithubTokenStore.reconcile(currentSubject: "user-a")
        XCTAssertEqual(GithubTokenStore.token(), "ghp_test")
    }
}

final class ReportMarkdownSanitizerTests: XCTestCase {

    private let hostile = """
    <script>alert(1)</script>
    <iframe src="https://evil.example"></iframe>
    [javascript link](javascript:alert(1))
    [safe](https://example.com)
    """

    func testInlineAllowsOnlySafeLinks() {
        let rendered = MarkdownContentView.inline(hostile)
        let links = rendered.runs.compactMap(\.link)
        XCTAssertEqual(links.count, 1)
        XCTAssertEqual(links.first?.absoluteString, "https://example.com")
        let text = String(rendered.characters).lowercased()
        XCTAssertFalse(text.contains("javascript:"))
        XCTAssertFalse(text.contains("<iframe"))
    }
}

final class AuthServicePKCETests: XCTestCase {

    func testSubjectFromAccessTokenPayload() {
        let payload = Data("{\"sub\":\"user-123\"}".utf8).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        let jwt = "header.\(payload).sig"
        XCTAssertEqual(AuthService.subject(from: jwt), "user-123")
    }

    func testCodeChallengeMatchesRFC7636Vector() {
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        XCTAssertEqual(AuthService.codeChallenge(for: verifier), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
    }

    func testAuthorizationCodeRequiresMatchingState() throws {
        let callback = URL(string: "arcagent://auth/callback?code=abc123&state=xyz")!
        XCTAssertEqual(try AuthService.authorizationCode(from: callback, expectedState: "xyz"), "abc123")
        XCTAssertThrowsError(try AuthService.authorizationCode(from: callback, expectedState: "other"))
    }

    func testAuthorizationCodeRejectsMissingCode() {
        let callback = URL(string: "arcagent://auth/callback?state=xyz&error=access_denied")!
        XCTAssertThrowsError(try AuthService.authorizationCode(from: callback, expectedState: "xyz"))
    }
}

private let sampleReport: String = {
    let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    return (try? String(contentsOf: root.appendingPathComponent("static_site/src/__tests__/fixtures/sampleReport.md"), encoding: .utf8)) ?? ""
}()

final class WorkflowPhaseTests: XCTestCase {

    func testEveryPhaseHasSteps() {
        let manager = WorkflowStepsManager()
        for phase in WorkflowPhase.allCases {
            XCTAssertTrue(manager.steps.contains { $0.phase == phase }, "\(phase) has no steps")
        }
    }

    func testStepIndexWalksEveryStepInOrder() {
        let manager = WorkflowStepsManager()
        XCTAssertEqual(manager.stepIndex(at: 0, of: 10), 0)
        XCTAssertEqual(manager.stepIndex(at: 20, of: 10), manager.steps.count - 1)
        let seen = Set(stride(from: 0.0, to: 10.0, by: 0.01).map { manager.stepIndex(at: $0, of: 10) })
        XCTAssertEqual(seen.count, manager.steps.count)
    }

    func testPhaseProgress() {
        let manager = WorkflowStepsManager()
        XCTAssertEqual(manager.progress(of: .prepare, currentStep: 0, complete: false), 0.125)
        XCTAssertEqual(manager.progress(of: .prepare, currentStep: 4, complete: false), 1)
        XCTAssertEqual(manager.progress(of: .synthesize, currentStep: 0, complete: false), 0)
        XCTAssertEqual(manager.progress(of: .synthesize, currentStep: 0, complete: true), 1)
    }
}

final class ReportDocumentTests: XCTestCase {

    func testFixtureIsAvailable() {
        XCTAssertFalse(sampleReport.isEmpty)
    }

    func testParsesCoverMetadataFromAtAGlanceTable() {
        let document = ReportDocument(markdown: sampleReport)
        XCTAssertEqual(document.sprintName, "Sprint 42 — Platform Hardening")
        XCTAssertEqual(document.period, "10/1/2026 – 10/14/2026")
        XCTAssertEqual(document.kpis.map(\.label), ["PRs merged", "Lines added", "Lines deleted", "Files changed", "Contributors"])
        XCTAssertEqual(document.kpis.first?.value, "18")
    }

    func testBodyOmitsTitleAndGlanceSection() {
        let document = ReportDocument(markdown: sampleReport)
        XCTAssertEqual(document.sections.first, .init(id: "executive-summary", title: "Executive Summary"))
        XCTAssertEqual(document.sections.count, 8)
        XCTAssertEqual(document.blocks.first, .heading(level: 2, text: "Executive Summary", id: "executive-summary"))
        XCTAssertFalse(document.sections.contains { $0.title == "At a Glance" })
    }

    func testParsesTablesWithAlignment() throws {
        let document = ReportDocument(markdown: sampleReport)
        let table = document.blocks.compactMap { block -> ([String], [[String]], [ReportDocument.Alignment])? in
            if case let .table(header, rows, alignments) = block, header.first == "Repository" { return (header, rows, alignments) }
            return nil
        }.first
        let (header, rows, alignments) = try XCTUnwrap(table)
        XCTAssertEqual(header, ["Repository", "PRs", "Added", "Deleted"])
        XCTAssertEqual(rows.first, ["acme/api", "9", "+2,904", "-712"])
        XCTAssertEqual(alignments, [.leading, .trailing, .trailing, .trailing])
    }

    func testParsesListsQuotesAndEscapedPipes() {
        let markdown = "# Sprint Report\n\n## Notes\n\n- one\n  - nested\n1. first\n\n> quoted **text**\n\n| A | B |\n| --- | --- |\n| x \\| y | 2 |"
        let blocks = ReportDocument(markdown: markdown).blocks
        XCTAssertTrue(blocks.contains(.list([.init(level: 0, marker: nil, text: "one"), .init(level: 1, marker: nil, text: "nested"), .init(level: 0, marker: "1.", text: "first")])))
        XCTAssertTrue(blocks.contains(.quote("quoted **text**")))
        XCTAssertTrue(blocks.contains(.table(header: ["A", "B"], rows: [["x | y", "2"]], alignments: [.leading, .leading])))
    }

    func testReadsLegacyBulletPreamble() {
        let markdown = "# Sprint Report: Sprint 7\n\n- **Sprint Period**: 1/1/2024 to 1/14/2024\n- **Total PRs Merged**: 5\n\n## Executive Summary\n\nSteady."
        let document = ReportDocument(markdown: markdown)
        XCTAssertEqual(document.sprintName, "Sprint 7")
        XCTAssertEqual(document.period, "1/1/2024 to 1/14/2024")
        XCTAssertEqual(document.kpis, [.init(label: "PRs Merged", value: "5")])
    }
}

final class ReportPDFRendererTests: XCTestCase {

    func testRendersPaginatedLetterPDFWithCoverAndPageNumbers() throws {
        let data = ReportPDFRenderer.render(markdown: sampleReport, generatedAt: Date(timeIntervalSince1970: 1_793_620_800))
        let pdf = try XCTUnwrap(PDFDocument(data: data))
        XCTAssertGreaterThanOrEqual(pdf.pageCount, 3)

        let cover = try XCTUnwrap(pdf.page(at: 0))
        XCTAssertEqual(cover.bounds(for: .mediaBox).size, CGSize(width: 612, height: 792))
        let coverText = cover.string ?? ""
        XCTAssertTrue(coverText.contains("SPRINT INTELLIGENCE REPORT"))
        XCTAssertTrue(coverText.contains("IN THIS REPORT"))
        XCTAssertFalse(coverText.contains("Page 1 of"))

        XCTAssertTrue(pdf.page(at: 1)?.string?.contains("Page 2 of \(pdf.pageCount)") == true)
        XCTAssertTrue(pdf.page(at: 1)?.string?.contains("Executive Summary") == true)
        XCTAssertTrue(pdf.page(at: pdf.pageCount - 1)?.string?.contains("Page \(pdf.pageCount) of \(pdf.pageCount)") == true)
    }

    func testLongReportsFlowAcrossPagesWithoutDroppingText() throws {
        let items = (0..<120).map { "- Item \($0) with enough words to wrap across the page width in the PDF body text." }.joined(separator: "\n")
        let data = ReportPDFRenderer.render(markdown: sampleReport + "\n\n## Appendix\n\n" + items)
        let pdf = try XCTUnwrap(PDFDocument(data: data))
        XCTAssertGreaterThan(pdf.pageCount, 5)
        XCTAssertTrue(pdf.string?.contains("Item 119 with enough words") == true)
    }

    func testFileNameIsSluggedAndDated() {
        let date = Date(timeIntervalSince1970: 1_793_620_800)
        XCTAssertEqual(ReportPDFRenderer.fileName(for: "Sprint 42 — Platform Hardening", date: date), "sprint-report-sprint-42-platform-hardening-2026-11-02.pdf")
    }
}

final class AppearancePreferenceTests: XCTestCase {

    func testMapsToColorSchemes() {
        XCTAssertNil(AppearancePreference.system.colorScheme)
        XCTAssertEqual(AppearancePreference.light.colorScheme, .light)
        XCTAssertEqual(AppearancePreference.dark.colorScheme, .dark)
    }
}
