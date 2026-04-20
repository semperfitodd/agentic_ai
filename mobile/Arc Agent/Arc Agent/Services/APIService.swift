import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case networkError(Error)
    case invalidResponse(reason: String)
    case httpError(statusCode: Int, message: String)
    case decodingError(Error)
    case timeout

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse(let reason):
            return "Invalid response from server: \(reason)"
        case .httpError(let statusCode, let message):
            return "HTTP \(statusCode): \(message)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .timeout:
            return "Request timed out"
        }
    }
}

class APIService {
    static let shared = APIService()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: config)
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    // MARK: - Public API

    func startSprintAnalysis() async throws -> (executionArn: String, repos: [String], dateRange: DateRange) {
        let repos = SettingsView.effectiveRepos()
        let since = SettingsView.effectiveSince()
        let until = SettingsView.effectiveUntil()
        let sprintName = SettingsView.effectiveSprintName()
        let githubToken = SettingsView.effectiveGithubToken()

        let body = SprintAnalysisRequest(
            sprintName: sprintName,
            since: since,
            until: until,
            githubToken: githubToken,
            repos: repos
        )

        let request = try authorizedRequest(
            path: "/sprint-intelligence",
            method: "POST",
            body: encoder.encode(body)
        )

        let response: SprintAnalysisResponse = try await send(request)

        let formatter = ISO8601DateFormatter()
        guard let sinceDate = formatter.date(from: since),
              let untilDate = formatter.date(from: until) else {
            throw APIError.invalidResponse(reason: "Could not parse date range from settings")
        }

        return (response.executionArn, repos, DateRange(since: sinceDate, until: untilDate))
    }

    func checkExecutionStatus(executionArn: String) async throws -> ExecutionStatus {
        guard var components = URLComponents(string: "\(APIConfig.apiURL)/results") else {
            throw APIError.invalidURL
        }
        components.queryItems = [URLQueryItem(name: "executionArn", value: executionArn)]
        guard let url = components.url else { throw APIError.invalidURL }

        let request = authorizedRequest(url: url)
        return try await send(request)
    }

    func fetchMarkdownReport(key: String) async throws -> String {
        guard var components = URLComponents(string: "\(APIConfig.apiURL)/markdown") else {
            throw APIError.invalidURL
        }
        components.queryItems = [URLQueryItem(name: "key", value: key)]
        guard let url = components.url else { throw APIError.invalidURL }

        let request = authorizedRequest(url: url)
        let (data, response) = try await session.data(for: request)
        try validate(response: response, data: data)
        guard let text = String(data: data, encoding: .utf8) else {
            throw APIError.invalidResponse(reason: "Markdown response is not valid UTF-8")
        }
        return text
    }

    func pollForReport(executionArn: String, maxAttempts: Int = 30) async throws -> String {
        for attempt in 1...maxAttempts {
            do {
                let status = try await checkExecutionStatus(executionArn: executionArn)

                if status.status == "SUCCEEDED" {
                    if let markdownKey = extractMarkdownKey(from: status.output) {
                        return try await fetchMarkdownReport(key: markdownKey)
                    }
                    if let inline = buildEmptyReportMarkdown(from: status.output) {
                        return inline
                    }
                    throw APIError.invalidResponse(reason: "Execution succeeded but output contains no markdown key or report text")
                } else if status.status == "FAILED" {
                    let message = status.cause ?? status.error ?? "Unknown error"
                    throw APIError.httpError(statusCode: 500, message: "Workflow failed: \(message)")
                }

                if attempt < maxAttempts {
                    try await Task.sleep(nanoseconds: 10_000_000_000)
                }
            } catch {
                if attempt == maxAttempts { throw error }
                try await Task.sleep(nanoseconds: 10_000_000_000)
            }
        }

        throw APIError.timeout
    }

    // MARK: - Private Helpers

    private func authorizedRequest(path: String, method: String = "GET", body: Data? = nil) throws -> URLRequest {
        guard let url = URL(string: "\(APIConfig.apiURL)\(path)") else {
            throw APIError.invalidURL
        }
        return authorizedRequest(url: url, method: method, body: body)
    }

    private func authorizedRequest(url: URL, method: String = "GET", body: Data? = nil) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.addValue(APIConfig.apiKey, forHTTPHeaderField: "x-api-key")
        if let body {
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }
        return request
    }

    private func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        do {
            let (data, response) = try await session.data(for: request)
            try validate(response: response, data: data)
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    private func validate(response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse(reason: "Response is not an HTTP response")
        }
        guard (200...299).contains(http.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.httpError(statusCode: http.statusCode, message: message)
        }
    }

    private func extractMarkdownKey(from output: ExecutionOutput?) -> String? {
        output?.s3Location?.markdownKey ?? output?.body?.s3Location?.markdownKey
    }

    private func buildEmptyReportMarkdown(from output: ExecutionOutput?) -> String? {
        guard let body = output?.body,
              let report = body.report?.trimmingCharacters(in: .whitespacesAndNewlines),
              !report.isEmpty else {
            return nil
        }

        var lines: [String] = ["# Sprint Report", ""]
        if let name = body.sprintName { lines.append(contentsOf: ["**Sprint:** \(name)", ""]) }
        if let since = body.since, let until = body.until {
            lines.append(contentsOf: ["**Period:** \(since) → \(until)", ""])
        }
        lines.append(report)
        if let warning = body.warning { lines.append(contentsOf: ["", "> ⚠️ \(warning)"]) }
        return lines.joined(separator: "\n")
    }
}
