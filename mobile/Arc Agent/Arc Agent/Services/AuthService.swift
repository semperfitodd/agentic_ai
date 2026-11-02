import AuthenticationServices
import CryptoKit
import Foundation
import SwiftUI

enum AuthError: LocalizedError {
    case notSignedIn
    case invalidCallback
    case stateMismatch
    case tokenExchangeFailed(String)

    var errorDescription: String? {
        switch self {
        case .notSignedIn:
            return "Sign in to run the agent"
        case .invalidCallback:
            return "Sign-in returned an unexpected response"
        case .stateMismatch:
            return "Sign-in state did not match; please try again"
        case .tokenExchangeFailed(let message):
            return "Sign-in failed: \(message)"
        }
    }
}

struct AuthTokens: Codable {
    let accessToken: String
    let refreshToken: String?
    let expiresAt: Date
}

private struct TokenResponse: Decodable {
    let access_token: String
    let refresh_token: String?
    let expires_in: Int
}

@MainActor
final class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published private(set) var isSignedIn: Bool

    private static let tokensKey = "cognito_tokens"
    private var tokens: AuthTokens?

    private init() {
        tokens = KeychainStore.data(for: Self.tokensKey).flatMap { try? JSONDecoder().decode(AuthTokens.self, from: $0) }
        isSignedIn = tokens != nil
    }

    func signIn(using webAuthenticationSession: WebAuthenticationSession) async throws {
        let verifier = Self.randomURLSafeString(byteCount: 32)
        let state = Self.randomURLSafeString(byteCount: 16)

        var components = URLComponents(string: "\(APIConfig.cognitoDomain)/oauth2/authorize")
        components?.queryItems = [
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "client_id", value: APIConfig.cognitoClientId),
            URLQueryItem(name: "redirect_uri", value: APIConfig.authRedirectURI),
            URLQueryItem(name: "scope", value: "openid email"),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "code_challenge", value: Self.codeChallenge(for: verifier)),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
        ]
        guard let url = components?.url else { throw APIError.invalidURL }

        let callback = try await webAuthenticationSession.authenticate(
            using: url,
            callback: .customScheme(APIConfig.authCallbackScheme),
            preferredBrowserSession: .ephemeral,
            additionalHeaderFields: [:]
        )
        let code = try Self.authorizationCode(from: callback, expectedState: state)

        try await requestTokens([
            "grant_type": "authorization_code",
            "client_id": APIConfig.cognitoClientId,
            "code": code,
            "code_verifier": verifier,
            "redirect_uri": APIConfig.authRedirectURI,
        ])
    }

    func validAccessToken() async throws -> String {
        guard let tokens else { throw AuthError.notSignedIn }
        if tokens.expiresAt > Date().addingTimeInterval(60) {
            return tokens.accessToken
        }
        guard let refreshToken = tokens.refreshToken else {
            signOut()
            throw AuthError.notSignedIn
        }
        do {
            try await requestTokens([
                "grant_type": "refresh_token",
                "client_id": APIConfig.cognitoClientId,
                "refresh_token": refreshToken,
            ])
        } catch {
            signOut()
            throw AuthError.notSignedIn
        }
        guard let refreshed = self.tokens else { throw AuthError.notSignedIn }
        return refreshed.accessToken
    }

    func signOut() {
        tokens = nil
        KeychainStore.set(nil as Data?, for: Self.tokensKey)
        GithubTokenStore.clear()
        isSignedIn = false
    }

    var accessTokenSubject: String? {
        tokens.flatMap { Self.subject(from: $0.accessToken) }
    }

    // MARK: - Token exchange

    private func requestTokens(_ form: [String: String]) async throws {
        guard let url = URL(string: "\(APIConfig.cognitoDomain)/oauth2/token") else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = Self.formEncode(form).data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw AuthError.tokenExchangeFailed(String(data: data, encoding: .utf8) ?? "Unknown error")
        }
        let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
        let newTokens = AuthTokens(
            accessToken: decoded.access_token,
            refreshToken: decoded.refresh_token ?? tokens?.refreshToken,
            expiresAt: Date().addingTimeInterval(TimeInterval(decoded.expires_in))
        )
        tokens = newTokens
        KeychainStore.set(try JSONEncoder().encode(newTokens), for: Self.tokensKey)
        isSignedIn = true
        GithubTokenStore.reconcile(currentSubject: Self.subject(from: newTokens.accessToken))
    }

    // MARK: - PKCE helpers

    nonisolated static func codeChallenge(for verifier: String) -> String {
        base64URLEncode(Data(SHA256.hash(data: Data(verifier.utf8))))
    }

    nonisolated static func authorizationCode(from callback: URL, expectedState: String) throws -> String {
        let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
        guard items.first(where: { $0.name == "state" })?.value == expectedState else { throw AuthError.stateMismatch }
        guard let code = items.first(where: { $0.name == "code" })?.value, !code.isEmpty else { throw AuthError.invalidCallback }
        return code
    }

    private nonisolated static func randomURLSafeString(byteCount: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        _ = SecRandomCopyBytes(kSecRandomDefault, byteCount, &bytes)
        return base64URLEncode(Data(bytes))
    }

    private nonisolated static func base64URLEncode(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    nonisolated static func subject(from accessToken: String) -> String? {
        let parts = accessToken.split(separator: ".")
        guard parts.count >= 2 else { return nil }
        var payload = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let padding = (4 - payload.count % 4) % 4
        payload += String(repeating: "=", count: padding)
        guard let data = Data(base64Encoded: payload),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let sub = json["sub"] as? String else { return nil }
        return sub
    }

    private nonisolated static func formEncode(_ form: [String: String]) -> String {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        return form
            .map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: allowed) ?? "")" }
            .joined(separator: "&")
    }
}
