import Foundation

enum StepType: String, Codable {
    case application = "APPLICATION"
    case ai = "AI"
    
    var displayName: String {
        switch self {
        case .application:
            return "⚙️ System Process"
        case .ai:
            return "🤖 AI Processing"
        }
    }
}

struct WorkflowStep: Identifiable, Codable {
    let id = UUID()
    let name: String
    let type: StepType
    let duration: Int
    
    enum CodingKeys: String, CodingKey {
        case name, type, duration
    }
}

class WorkflowStepsManager {
    static let shared = WorkflowStepsManager()
    
    let steps: [WorkflowStep] = [
        WorkflowStep(name: "Initializing Step Functions Workflow", type: .application, duration: 2),
        WorkflowStep(name: "Parsing Repository URLs and Validating Format", type: .application, duration: 2),
        WorkflowStep(name: "Fetching Repository Metadata from GitHub API", type: .application, duration: 3),
        WorkflowStep(name: "Mapping Repositories for Parallel Processing", type: .application, duration: 2),
        WorkflowStep(name: "Preparing Pull Request Dataset and Filtering", type: .application, duration: 3),
        WorkflowStep(name: "Validating PR Count and Date Ranges", type: .application, duration: 2),
        WorkflowStep(name: "Fetching Detailed PR Information (Comments, Reviews, Files)", type: .application, duration: 4),
        WorkflowStep(name: "Intelligent Data Summarization for Payload Optimization", type: .application, duration: 3),
        WorkflowStep(name: "AI Analysis: Reading Code Changes and Diffs", type: .ai, duration: 5),
        WorkflowStep(name: "AI Analysis: Evaluating Code Quality and Best Practices", type: .ai, duration: 5),
        WorkflowStep(name: "AI Analysis: Assessing Impact and Risk Level", type: .ai, duration: 4),
        WorkflowStep(name: "AI Analysis: Categorizing PR Type (Feature/Bug/Refactor)", type: .ai, duration: 4),
        WorkflowStep(name: "Writing Individual PR Analyses to S3", type: .application, duration: 3),
        WorkflowStep(name: "Collecting All PR Analysis References", type: .application, duration: 2),
        WorkflowStep(name: "AI Aggregation: Loading PR Analyses from S3", type: .application, duration: 3),
        WorkflowStep(name: "AI Aggregation: Synthesizing Cross-PR Insights", type: .ai, duration: 5),
        WorkflowStep(name: "AI Aggregation: Calculating Sprint Metrics and Trends", type: .ai, duration: 5),
        WorkflowStep(name: "AI Aggregation: Generating Executive Summary", type: .ai, duration: 5),
        WorkflowStep(name: "Writing Final Sprint Report to S3", type: .application, duration: 3),
        WorkflowStep(name: "Generating Report Metadata and Keys", type: .application, duration: 2),
    ]
    
    var totalDuration: Int {
        return steps.reduce(0) { $0 + $1.duration }
    }
}

