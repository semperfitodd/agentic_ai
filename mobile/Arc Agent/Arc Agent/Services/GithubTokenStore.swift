import Foundation

enum GithubTokenStore {
    static let tokenKey = "github_token"
    static let subjectKey = "github_token_subject"

    static func token() -> String {
        KeychainStore.string(for: tokenKey) ?? ""
    }

    static func set(token: String, subject: String) {
        let trimmed = token.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !subject.isEmpty else {
            clear()
            return
        }
        KeychainStore.set(trimmed, for: tokenKey)
        KeychainStore.set(subject, for: subjectKey)
    }

    static func clear() {
        KeychainStore.set(nil as String?, for: tokenKey)
        KeychainStore.set(nil as String?, for: subjectKey)
    }

    static func reconcile(currentSubject: String?) {
        guard KeychainStore.string(for: tokenKey) != nil else { return }
        let bound = KeychainStore.string(for: subjectKey)
        if currentSubject == nil || bound != currentSubject {
            clear()
        }
    }
}
