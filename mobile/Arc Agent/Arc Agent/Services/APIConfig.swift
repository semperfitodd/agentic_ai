import Foundation

enum APIConfig {
    static var apiURL: String {
        Secrets.apiURL
    }
    
    static var apiKey: String {
        Secrets.apiKey
    }
    
    static var githubToken: String {
        Secrets.githubToken
    }
    
    static var defaultRepos: [String] {
        Secrets.defaultRepos
    }
    
    static var defaultSince: String {
        Secrets.defaultSince
    }
    
    static var defaultUntil: String {
        Secrets.defaultUntil
    }
    
    static var sprintName: String {
        Secrets.sprintName
    }
    
    static var workflowDuration: Int {
        Secrets.workflowDuration
    }
}

