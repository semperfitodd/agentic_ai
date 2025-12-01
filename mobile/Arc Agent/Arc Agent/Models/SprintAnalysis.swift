import Foundation

struct SprintAnalysisRequest: Codable {
    let sprintName: String
    let since: String
    let until: String
    let githubToken: String
    let repos: [String]
}

struct SprintAnalysisResponse: Codable {
    let executionArn: String
    let message: String?
}

struct ExecutionStatus: Codable {
    let status: String
    let output: ExecutionOutput?
    let error: String?
    let cause: String?
}

struct ExecutionOutput: Codable {
    let s3Location: S3Location?
    let storedResults: StoredResults?
    let body: ExecutionBody?
}

struct StoredResults: Codable {
    let body: ExecutionBody?
}

struct ExecutionBody: Codable {
    let s3Location: S3Location?
}

struct S3Location: Codable {
    let markdownKey: String?
}

struct DateRange {
    let since: Date
    let until: Date
    
    var formattedSince: String {
        ISO8601DateFormatter().string(from: since)
    }
    
    var formattedUntil: String {
        ISO8601DateFormatter().string(from: until)
    }
}

struct AnalysisInfo {
    let repos: [String]
    let dateRange: DateRange
    let executionArn: String
}

