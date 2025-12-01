import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case networkError(Error)
    case invalidResponse
    case httpError(statusCode: Int, message: String)
    case decodingError(Error)
    case timeout
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from server"
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
    
    func startSprintAnalysis() async throws -> (executionArn: String, repos: [String], dateRange: DateRange) {
        let urlString = "\(APIConfig.apiURL)/sprint-intelligence"
        print("🌐 Attempting to connect to: \(urlString)")
        print("🔑 Using API Key: \(APIConfig.apiKey.prefix(20))...")
        
        guard let url = URL(string: urlString) else {
            print("❌ Invalid URL: \(urlString)")
            throw APIError.invalidURL
        }
        
        let repos = APIConfig.defaultRepos
        let since = APIConfig.defaultSince
        let until = APIConfig.defaultUntil
        
        let request = SprintAnalysisRequest(
            sprintName: APIConfig.sprintName,
            since: since,
            until: until,
            githubToken: APIConfig.githubToken,
            repos: repos
        )
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.addValue(APIConfig.apiKey, forHTTPHeaderField: "x-api-key")
        urlRequest.httpBody = try encoder.encode(request)
        
        print("📤 Sending POST request to: \(url.absoluteString)")
        print("📦 Repos: \(repos)")
        
        let (data, response) = try await session.data(for: urlRequest)
        
        print("📥 Received response")
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.httpError(statusCode: httpResponse.statusCode, message: message)
        }
        
        let analysisResponse = try decoder.decode(SprintAnalysisResponse.self, from: data)
        
        let formatter = ISO8601DateFormatter()
        guard let sinceDate = formatter.date(from: since),
              let untilDate = formatter.date(from: until) else {
            throw APIError.invalidResponse
        }
        
        let dateRange = DateRange(since: sinceDate, until: untilDate)
        
        return (analysisResponse.executionArn, repos, dateRange)
    }
    
    func checkExecutionStatus(executionArn: String) async throws -> ExecutionStatus {
        guard var urlComponents = URLComponents(string: "\(APIConfig.apiURL)/results") else {
            throw APIError.invalidURL
        }
        
        urlComponents.queryItems = [
            URLQueryItem(name: "executionArn", value: executionArn)
        ]
        
        guard let url = urlComponents.url else {
            throw APIError.invalidURL
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.addValue(APIConfig.apiKey, forHTTPHeaderField: "x-api-key")
        
        let (data, response) = try await session.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.httpError(statusCode: httpResponse.statusCode, message: message)
        }
        
        return try decoder.decode(ExecutionStatus.self, from: data)
    }
    
    func fetchMarkdownReport(key: String) async throws -> String {
        guard var urlComponents = URLComponents(string: "\(APIConfig.apiURL)/markdown") else {
            throw APIError.invalidURL
        }
        
        urlComponents.queryItems = [
            URLQueryItem(name: "key", value: key)
        ]
        
        guard let url = urlComponents.url else {
            throw APIError.invalidURL
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.addValue(APIConfig.apiKey, forHTTPHeaderField: "x-api-key")
        
        let (data, response) = try await session.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.httpError(statusCode: httpResponse.statusCode, message: message)
        }
        
        guard let markdown = String(data: data, encoding: .utf8) else {
            throw APIError.invalidResponse
        }
        
        return markdown
    }
    
    func pollForReport(executionArn: String, maxAttempts: Int = 30) async throws -> String {
        print("🔄 Starting to poll for report (max \(maxAttempts) attempts)...")
        for attempt in 1...maxAttempts {
            do {
                print("🔄 Poll attempt \(attempt)/\(maxAttempts)...")
                let status = try await checkExecutionStatus(executionArn: executionArn)
                print("📊 Status: \(status.status)")
                
                if status.status == "SUCCEEDED" {
                    if let markdownKey = extractMarkdownKey(from: status.output) {
                        print("🔑 Found markdown key: \(markdownKey)")
                        return try await fetchMarkdownReport(key: markdownKey)
                    } else {
                        print("❌ No markdown key found in output")
                        throw APIError.invalidResponse
                    }
                } else if status.status == "FAILED" {
                    let errorMessage = status.cause ?? status.error ?? "Unknown error"
                    print("❌ Workflow failed: \(errorMessage)")
                    throw APIError.httpError(statusCode: 500, message: "Workflow failed: \(errorMessage)")
                }
                
                print("⏳ Still running, waiting 10 seconds...")
                if attempt < maxAttempts {
                    try await Task.sleep(nanoseconds: 10_000_000_000)
                }
            } catch {
                if attempt == maxAttempts {
                    throw error
                }
                // Retry on error
                try await Task.sleep(nanoseconds: 10_000_000_000)
            }
        }
        
        throw APIError.timeout
    }
    
    private func extractMarkdownKey(from output: ExecutionOutput?) -> String? {
        return output?.s3Location?.markdownKey
            ?? output?.storedResults?.body?.s3Location?.markdownKey
            ?? output?.body?.s3Location?.markdownKey
    }
}

