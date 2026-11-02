import Foundation

enum StepType: String, Codable {
    case application = "APPLICATION"
    case ai = "AI"

    var displayName: String {
        switch self {
        case .application: "System"
        case .ai: "AI"
        }
    }
}

enum WorkflowPhase: String, CaseIterable, Codable, Identifiable {
    case prepare, collect, analyze, synthesize

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var isAI: Bool { self == .analyze || self == .synthesize }
}

struct WorkflowStep: Identifiable, Codable {
    let id = UUID()
    let name: String
    let type: StepType
    let duration: Int
    let phase: WorkflowPhase

    enum CodingKeys: String, CodingKey {
        case name, type, duration, phase
    }
}

class WorkflowStepsManager {
    static let shared = WorkflowStepsManager()

    let steps: [WorkflowStep] = [
        WorkflowStep(name: "Initializing Step Functions Workflow", type: .application, duration: 2, phase: .prepare),
        WorkflowStep(name: "Parsing Repository URLs and Validating Format", type: .application, duration: 2, phase: .prepare),
        WorkflowStep(name: "Fetching Repository Metadata from GitHub API", type: .application, duration: 3, phase: .prepare),
        WorkflowStep(name: "Mapping Repositories for Parallel Processing", type: .application, duration: 2, phase: .prepare),
        WorkflowStep(name: "Preparing Pull Request Dataset and Filtering", type: .application, duration: 3, phase: .collect),
        WorkflowStep(name: "Validating PR Count and Date Ranges", type: .application, duration: 2, phase: .collect),
        WorkflowStep(name: "Fetching Detailed PR Information (Comments, Reviews, Files)", type: .application, duration: 4, phase: .collect),
        WorkflowStep(name: "Intelligent Data Summarization for Payload Optimization", type: .application, duration: 3, phase: .collect),
        WorkflowStep(name: "AI Analysis: Reading Code Changes and Diffs", type: .ai, duration: 5, phase: .analyze),
        WorkflowStep(name: "AI Analysis: Evaluating Code Quality and Best Practices", type: .ai, duration: 5, phase: .analyze),
        WorkflowStep(name: "AI Analysis: Assessing Impact and Risk Level", type: .ai, duration: 4, phase: .analyze),
        WorkflowStep(name: "AI Analysis: Categorizing PR Type (Feature/Bug/Refactor)", type: .ai, duration: 4, phase: .analyze),
        WorkflowStep(name: "Writing Individual PR Analyses to S3", type: .application, duration: 3, phase: .analyze),
        WorkflowStep(name: "Collecting All PR Analysis References", type: .application, duration: 2, phase: .analyze),
        WorkflowStep(name: "AI Aggregation: Loading PR Analyses from S3", type: .application, duration: 3, phase: .synthesize),
        WorkflowStep(name: "AI Aggregation: Synthesizing Cross-PR Insights", type: .ai, duration: 5, phase: .synthesize),
        WorkflowStep(name: "AI Aggregation: Calculating Sprint Metrics and Trends", type: .ai, duration: 5, phase: .synthesize),
        WorkflowStep(name: "AI Aggregation: Generating Executive Summary", type: .ai, duration: 5, phase: .synthesize),
        WorkflowStep(name: "Writing Final Sprint Report to S3", type: .application, duration: 3, phase: .synthesize),
        WorkflowStep(name: "Generating Report Metadata and Keys", type: .application, duration: 2, phase: .synthesize),
    ]

    var totalDuration: Int {
        steps.reduce(0) { $0 + $1.duration }
    }

    func stepIndex(at elapsed: TimeInterval, of total: TimeInterval) -> Int {
        var boundary: TimeInterval = 0
        for (index, step) in steps.enumerated() {
            boundary += Double(step.duration) / Double(totalDuration) * total
            if elapsed < boundary { return index }
        }
        return steps.count - 1
    }

    /// Fraction of a phase that is done; the current step counts as half complete.
    func progress(of phase: WorkflowPhase, currentStep: Int, complete: Bool) -> Double {
        if complete { return 1 }
        let indices = steps.indices.filter { steps[$0].phase == phase }
        let done = Double(indices.filter { $0 < currentStep }.count) + (indices.contains(currentStep) ? 0.5 : 0)
        return done / Double(indices.count)
    }
}
