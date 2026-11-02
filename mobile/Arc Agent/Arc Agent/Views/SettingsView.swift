import AuthenticationServices
import SwiftUI

struct SettingsView: View {
    @Environment(\.webAuthenticationSession) private var webAuthenticationSession
    @ObservedObject private var auth = AuthService.shared
    @AppStorage(AppearancePreference.storageKey) private var appearance = AppearancePreference.system
    @AppStorage("custom_repos") private var customReposString = ""
    @AppStorage("custom_sprint_name") private var customSprintName = ""
    @State private var customGithubToken = KeychainStore.string(for: SettingsView.githubTokenKey) ?? ""
    @State private var sinceDate = Date()
    @State private var untilDate = Date()
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
                        KeychainStore.set(token, for: SettingsView.githubTokenKey)
                    }
            } header: {
                Text("GitHub Token")
            } footer: {
                Text(customGithubToken.isEmpty ? "Public repos only — no token set." : "Stored in the Keychain on this device only.")
            }

            Section("Sprint") {
                TextField("Sprint name", text: $customSprintName, prompt: Text(Secrets.sprintName))
                DatePicker("Start date", selection: $sinceDate, displayedComponents: .date)
                    .onChange(of: sinceDate) { saveDates() }
                DatePicker("End date", selection: $untilDate, in: sinceDate..., displayedComponents: .date)
                    .onChange(of: untilDate) { saveDates() }
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
        .onAppear(perform: loadDates)
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
            KeychainStore.set(nil as String?, for: SettingsView.githubTokenKey)
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

    private func resetAllSettings() {
        customGithubToken = ""
        customReposString = ""
        customSprintName = ""
        sinceDate = parseDate(Secrets.defaultSince) ?? Date().addingTimeInterval(-14 * 86_400)
        untilDate = parseDate(Secrets.defaultUntil) ?? Date()
        saveDates()
    }

    // MARK: - Dates

    private static let iso8601Formatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private func parseDate(_ string: String) -> Date? {
        Self.iso8601Formatter.date(from: string)
    }

    private func saveDates() {
        UserDefaults.standard.set(Self.iso8601Formatter.string(from: sinceDate), forKey: "custom_since_date")
        UserDefaults.standard.set(Self.iso8601Formatter.string(from: untilDate), forKey: "custom_until_date")
    }

    private func loadDates() {
        sinceDate = parseDate(Self.effectiveSince()) ?? Date().addingTimeInterval(-14 * 86_400)
        untilDate = parseDate(Self.effectiveUntil()) ?? Date()
    }
}

// MARK: - Effective settings

extension SettingsView {
    nonisolated static let githubTokenKey = "github_token"

    nonisolated static func effectiveGithubToken() -> String {
        KeychainStore.string(for: githubTokenKey) ?? ""
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

    nonisolated static func effectiveSince() -> String {
        UserDefaults.standard.string(forKey: "custom_since_date") ?? Secrets.defaultSince
    }

    nonisolated static func effectiveUntil() -> String {
        UserDefaults.standard.string(forKey: "custom_until_date") ?? Secrets.defaultUntil
    }
}

#Preview {
    NavigationStack { SettingsView().navigationTitle("Settings") }
}
