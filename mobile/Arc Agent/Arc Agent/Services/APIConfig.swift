import Foundation

enum APIConfig {
    static var apiURL: String {
        Secrets.apiURL
    }
    
    static var cognitoDomain: String {
        Secrets.cognitoDomain
    }

    static var cognitoClientId: String {
        Secrets.cognitoClientId
    }

    static let authCallbackScheme = "arcagent"
    static let authRedirectURI = "arcagent://auth/callback"
    
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

