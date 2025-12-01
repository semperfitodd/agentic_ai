import Foundation
import SwiftUI
import Combine

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
    
    private var progressTimer: Timer?
    private let workflowSteps = WorkflowStepsManager.shared.steps
    private let totalDuration: TimeInterval
    
    init() {
        self.totalDuration = Double(APIConfig.workflowDuration) / 1000.0
    }
    
    func runSprintAnalysis() {
        Task {
            await startAnalysis()
        }
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
        
        print("⏱️ Starting animation with duration: \(totalDuration) seconds")
        startProgressAnimation()
        
        do {
            let result = try await APIService.shared.startSprintAnalysis()
            print("✅ API call completed successfully")
            
            analysisInfo = AnalysisInfo(
                repos: result.repos,
                dateRange: result.dateRange,
                executionArn: result.executionArn
            )
            
            let elapsed = (progress / 100.0) * totalDuration
            let remaining = max(0, totalDuration - elapsed)
            print("⏱️ Progress: \(progress)% | Elapsed: \(elapsed)s | Remaining: \(remaining)s")
            
            if remaining > 0 {
                print("⏸️ Waiting \(remaining) seconds for animation to complete...")
                try await Task.sleep(nanoseconds: UInt64(remaining * 1_000_000_000))
            }
            
            stopProgressAnimation()
            progress = 100.0
            completedSteps = Set(workflowSteps.indices)
            workflowComplete = true
            isLoading = false
            
            print("📊 Animation complete, now fetching report...")
            isFetchingReport = true
            let markdown = try await APIService.shared.pollForReport(executionArn: result.executionArn)
            
            print("✅ Got markdown report, length: \(markdown.count) characters")
            markdownReport = markdown
            isFetchingReport = false
            showReportModal = true
            print("📱 Should be showing modal now...")
            
        } catch {
            stopProgressAnimation()
            isLoading = false
            isFetchingReport = false
            errorMessage = error.localizedDescription
        }
    }
    
    private func startProgressAnimation() {
        let startTime = Date()
        let steps = workflowSteps
        var stepTimings: [(start: TimeInterval, end: TimeInterval)] = []
        var accumulatedTime: TimeInterval = 0
        
        for step in steps {
            let start = accumulatedTime
            let stepDuration = (Double(step.duration) / 65.0) * totalDuration
            accumulatedTime += stepDuration
            stepTimings.append((start: start, end: accumulatedTime))
        }
        
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            
            Task { @MainActor in
                let elapsed = Date().timeIntervalSince(startTime)
                let progressPercent = min((elapsed / self.totalDuration) * 100.0, 100.0)
                
                self.progress = progressPercent
                
                for (index, timing) in stepTimings.enumerated() {
                    if elapsed >= timing.start && elapsed < timing.end {
                        if self.currentStepIndex != index {
                            self.currentStepIndex = index
                            self.completedSteps = Set(0..<index)
                        }
                        break
                    }
                }
                
                if progressPercent >= 100 {
                    self.completedSteps = Set(steps.indices)
                    self.workflowComplete = true
                    self.stopProgressAnimation()
                }
            }
        }
    }
    
    private func stopProgressAnimation() {
        progressTimer?.invalidate()
        progressTimer = nil
    }
    
    func dismissReport() {
        showReportModal = false
    }
}

