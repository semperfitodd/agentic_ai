import AuthenticationServices
import SwiftUI

struct SettingsView: View {
    @Environment(\.webAuthenticationSession) private var webAuthenticationSession
    @ObservedObject private var auth = AuthService.shared
    @AppStorage(AppearancePreference.storageKey) private var appearance = AppearancePreference.system
    @AppStorage("custom_repos") private var customReposString = ""
    @AppStorage("custom_sprint_name") private var customSprintName = ""
    @State private var customGithubToken = GithubTokenStore.token()
    @AppStorage(SettingsView.sinceKey) private var customSince = ""
    @AppStorage(SettingsView.untilKey) private var customUntil = ""
    @State private var authError: String?
    @State private var showDeleteConfirmation = false
    @State private var isDeletingAccount = false
    @State private var showAddRepo = false
    @State private var repoInput = ""
    @State private var showResetConfirmation = false

    private var customRepos: [String] {
        customReposString.isEmpty ? [] : customReposString.split(separator: ",").map(String.init)
    }

    var body: some View {
        Form {
            Section {
                Picker("Appearance", selection: $appearance) {
                    ForEach(AppearancePreference.allCases) { option in
                        Text(option.title).tag(option)
                    }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            } header: {
                Text("Appearance")
            }

            Section {
                LabeledContent("Status") {
                    Badge(text: auth.isSignedIn ? "Signed in" : "Signed out", tone: auth.isSignedIn ? .success : .neutral)
                }
                if auth.isSignedIn {
                    Button("Sign Out") { auth.signOut() }
                    Button("Delete Account", role: .destructive) { showDeleteConfirmation = true }
                        .disabled(isDeletingAccount)
                } else {
                    Button("Sign In") { signIn() }
                }
                if let authError {
                    Text(authError).font(.arcSmall).foregroundStyle(Palette.dangerText)
                }
            } header: {
                Text("Account")
            } footer: {
                Text("Sign in with Google or Apple to run the agent.")
            }

            Section {
                SecureField("Token (optional for public repos)", text: $customGithubToken)
                    .font(.arcMono)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .onChange(of: customGithubToken) { _, token in
                        persistGithubToken(token)
                    }
            } header: {
                Text("GitHub Token")
            } footer: {
                Text(customGithubToken.isEmpty ? "Public repos only — no token set." : "Stored in the Keychain on this device only.")
            }

            Section("Sprint") {
                TextField("Sprint name", text: $customSprintName, prompt: Text(Secrets.sprintName))
                DatePicker("Start date", selection: sinceDate, displayedComponents: .date)
                DatePicker("End date", selection: untilDate, in: sinceDate.wrappedValue..., displayedComponents: .date)
            }
            // Sprint dates are stored as UTC midnight; show them in UTC so the picked day round-trips.
            .environment(\.timeZone, .gmt)

            Section {
                ForEach(customRepos.isEmpty ? Secrets.defaultRepos : customRepos, id: \.self) { repo in
                    Label(repo, systemImage: "folder")
                        .font(.arcMono)
                        .foregroundStyle(customRepos.isEmpty ? Palette.textSecondary : Palette.textPrimary)
                }
                .onDelete(perform: customRepos.isEmpty ? nil : removeRepos)
                Button {
                    showAddRepo = true
                } label: {
                    Label("Add Repository", systemImage: "plus.circle.fill")
                }
            } header: {
                Text("Repositories")
            } footer: {
                Text(customRepos.isEmpty ? "Using default repositories. Adding one replaces the defaults." : "Swipe a repository to remove it.")
            }

            Section {
                Button("Reset All to Defaults", role: .destructive) { showResetConfirmation = true }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Palette.bgCanvas.ignoresSafeArea())
        .onChange(of: auth.isSignedIn) { _, signedIn in
            if signedIn {
                customGithubToken = GithubTokenStore.token()
            } else {
                customGithubToken = ""
            }
        }
        .alert("Add Repository", isPresented: $showAddRepo) {
            TextField("owner/repo or GitHub URL", text: $repoInput)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            Button("Cancel", role: .cancel) { repoInput = "" }
            Button("Add", action: addRepo)
        }
        .confirmationDialog("Delete your account?", isPresented: $showDeleteConfirmation, titleVisibility: .visible) {
            Button("Delete Account", role: .destructive) {
                Task { await deleteAccount() }
            }
        } message: {
            Text("This permanently removes your sign-in and the GitHub token stored on this device.")
        }
        .confirmationDialog("Reset all settings?", isPresented: $showResetConfirmation, titleVisibility: .visible) {
            Button("Reset", role: .destructive, action: resetAllSettings)
        }
        .sensoryFeedback(.warning, trigger: showDeleteConfirmation) { _, shown in shown }
    }

    // MARK: - Actions

    private func signIn() {
        Task {
            do {
                try await auth.signIn(using: webAuthenticationSession)
                authError = nil
            } catch {
                authError = error.localizedDescription
            }
        }
    }

    private func deleteAccount() async {
        isDeletingAccount = true
        defer { isDeletingAccount = false }
        do {
            try await APIService.shared.deleteAccount()
            customGithubToken = ""
            GithubTokenStore.clear()
            auth.signOut()
            authError = nil
        } catch {
            authError = error.localizedDescription
        }
    }

    private func addRepo() {
        let trimmed = repoInput.trimmingCharacters(in: .whitespaces)
        repoInput = ""
        guard !trimmed.isEmpty, !customRepos.contains(trimmed) else { return }
        customReposString = (customRepos + [trimmed]).joined(separator: ",")
    }

    private func removeRepos(at offsets: IndexSet) {
        var repos = customRepos
        repos.remove(atOffsets: offsets)
        customReposString = repos.joined(separator: ",")
    }

    private func persistGithubToken(_ token: String) {
        if token.isEmpty {
            GithubTokenStore.clear()
            return
        }
        guard let subject = auth.accessTokenSubject else {
            GithubTokenStore.clear()
            customGithubToken = ""
            return
        }
        GithubTokenStore.set(token: token, subject: subject)
    }

    private func resetAllSettings() {
        customGithubToken = ""
        GithubTokenStore.clear()
        customReposString = ""
        customSprintName = ""
        customSince = ""
        customUntil = ""
    }

    // MARK: - Dates

    // Bound straight to storage so only a user's pick is written; reading never persists the defaults.
    private var sinceDate: Binding<Date> {
        Binding(
            get: { Self.sprintDate(customSince, default: Secrets.defaultSince) ?? Date().addingTimeInterval(-14 * 86_400) },
            set: { customSince = Self.storedSprintDate($0, default: Secrets.defaultSince) }
        )
    }

    private var untilDate: Binding<Date> {
        Binding(
            get: { Self.sprintDate(customUntil, default: Secrets.defaultUntil) ?? Date() },
            set: { customUntil = Self.storedSprintDate($0, default: Secrets.defaultUntil) }
        )
    }
}

// MARK: - Effective settings

extension SettingsView {
    nonisolated static func effectiveGithubToken() -> String {
        GithubTokenStore.token()
    }

    nonisolated static func effectiveRepos() -> [String] {
        let customString = UserDefaults.standard.string(forKey: "custom_repos") ?? ""
        let custom = customString.isEmpty ? [] : customString.split(separator: ",").map { String($0) }
        return custom.isEmpty ? Secrets.defaultRepos : custom
    }

    nonisolated static func effectiveSprintName() -> String {
        let custom = UserDefaults.standard.string(forKey: "custom_sprint_name") ?? ""
        return custom.isEmpty ? Secrets.sprintName : custom
    }

    nonisolated static let sinceKey = "custom_since_date"
    nonisolated static let untilKey = "custom_until_date"

    nonisolated static func effectiveSince(in defaults: UserDefaults = .standard) -> String {
        effectiveSprintDate(defaults.string(forKey: sinceKey), default: Secrets.defaultSince)
    }

    nonisolated static func effectiveUntil(in defaults: UserDefaults = .standard) -> String {
        effectiveSprintDate(defaults.string(forKey: untilKey), default: Secrets.defaultUntil)
    }

    nonisolated static func effectiveSprintDate(_ custom: String?, default fallback: String) -> String {
        guard let custom, !custom.isEmpty else { return fallback }
        return custom
    }

    nonisolated static func sprintDate(_ custom: String?, default fallback: String) -> Date? {
        try? Date(effectiveSprintDate(custom, default: fallback), strategy: .iso8601)
    }

    nonisolated static func storedSprintDate(_ date: Date, default fallback: String) -> String {
        if let defaultDate = try? Date(fallback, strategy: .iso8601), defaultDate == date { return "" }
        return date.formatted(.iso8601)
    }
}

#Preview {
    NavigationStack { SettingsView().navigationTitle("Settings") }
}
