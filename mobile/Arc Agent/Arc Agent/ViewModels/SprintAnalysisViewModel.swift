import Foundation
import SwiftUI
import Combine
import AuthenticationServices

enum RunStatus: Equatable {
    case idle, running, retrieving, ready, failed
}

@MainActor
class SprintAnalysisViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var isFetchingReport = false
    @Published var progress: Double = 0.0
    @Published var currentStepIndex: Int = 0
    @Published var completedSteps: Set<Int> = []
    @Published var errorMessage: String?
    @Published var markdownReport: String?
    @Published var showReportModal = false
    @Published var workflowComplete = false
    @Published var analysisInfo: AnalysisInfo?
    @Published private(set) var elapsed: TimeInterval = 0

    private var ticker: Timer?
    private var startedAt = Date()
    private var analysisTask: Task<Void, Never>?
    private let manager = WorkflowStepsManager.shared
    private let totalDuration: TimeInterval

    init() {
        self.totalDuration = Double(APIConfig.workflowDuration) / 1000.0
    }

    var status: RunStatus {
        if isLoading { return .running }
        if isFetchingReport { return .retrieving }
        if errorMessage != nil { return .failed }
        if markdownReport != nil { return .ready }
        return .idle
    }

    var currentStep: WorkflowStep { manager.steps[currentStepIndex] }

    func runSprintAnalysis(using webAuthenticationSession: WebAuthenticationSession) {
        analysisTask?.cancel()
        analysisTask = Task {
            if !AuthService.shared.isSignedIn {
                do {
                    try await AuthService.shared.signIn(using: webAuthenticationSession)
                } catch {
                    if !Task.isCancelled { errorMessage = error.localizedDescription }
                    return
                }
            }
            guard !Task.isCancelled else { return }
            await startAnalysis()
        }
    }

    func reset() {
        analysisTask?.cancel()
        analysisTask = nil
        stopTicker()
        isLoading = false
        isFetchingReport = false
        progress = 0.0
        currentStepIndex = 0
        completedSteps = []
        errorMessage = nil
        markdownReport = nil
        showReportModal = false
        workflowComplete = false
        analysisInfo = nil
        elapsed = 0
    }

    private func startAnalysis() async {
        isLoading = true
        isFetchingReport = false
        progress = 0.0
        currentStepIndex = 0
        completedSteps = []
        errorMessage = nil
        markdownReport = nil
        showReportModal = false
        workflowComplete = false
        analysisInfo = nil

        startTicker()

        do {
            let result = try await APIService.shared.startSprintAnalysis()
            analysisInfo = AnalysisInfo(repos: result.repos, dateRange: result.dateRange, executionArn: result.executionArn)

            let remaining = max(0, totalDuration - Date().timeIntervalSince(startedAt))
            if remaining > 0 {
                try await Task.sleep(for: .seconds(remaining))
            }
            guard !Task.isCancelled else { return }

            progress = 100.0
            completedSteps = Set(manager.steps.indices)
            workflowComplete = true
            isLoading = false
            isFetchingReport = true

            let markdown = try await APIService.shared.pollForReport(executionArn: result.executionArn)
            guard !Task.isCancelled else { return }
            markdownReport = markdown
            isFetchingReport = false
            stopTicker()
            showReportModal = true
        } catch {
            stopTicker()
            isLoading = false
            isFetchingReport = false
            errorMessage = error.localizedDescription
        }
    }

    private func startTicker() {
        startedAt = Date()
        elapsed = 0
        ticker = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
    }

    private func tick() {
        elapsed = Date().timeIntervalSince(startedAt)
        guard isLoading else { return }
        progress = min(elapsed / totalDuration * 100, 100)
        let index = manager.stepIndex(at: elapsed, of: totalDuration)
        if index != currentStepIndex {
            currentStepIndex = index
            completedSteps = Set(0..<index)
        }
    }

    private func stopTicker() {
        ticker?.invalidate()
        ticker = nil
    }

    func dismissReport() {
        showReportModal = false
    }
}
