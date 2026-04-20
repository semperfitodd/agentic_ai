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
}

