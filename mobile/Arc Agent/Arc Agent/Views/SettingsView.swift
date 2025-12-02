import SwiftUI

#if os(iOS)
import UIKit
#endif

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("custom_github_token") private var customGithubToken = ""
    @AppStorage("custom_repos") private var customReposString = ""
    @AppStorage("custom_sprint_name") private var customSprintName = ""
    @State private var customSinceDate = Date().addingTimeInterval(-30 * 24 * 60 * 60)
    @State private var customUntilDate = Date()
    @State private var showRepoSheet = false
    @State private var repoInput = ""
    
    private var customRepos: [String] {
        customReposString.isEmpty ? [] : customReposString.split(separator: ",").map { String($0) }
    }
    
    private func setCustomRepos(_ repos: [String]) {
        customReposString = repos.joined(separator: ",")
    }
    
    // MARK: - Adaptive Colors
    
    private var backgroundColor: Color {
        #if os(iOS)
        Color(uiColor: .systemGroupedBackground)
        #else
        Color(nsColor: .windowBackgroundColor)
        #endif
    }
    
    private var cardBackgroundColor: Color {
        #if os(iOS)
        Color(uiColor: .secondarySystemGroupedBackground)
        #else
        Color(nsColor: .controlBackgroundColor)
        #endif
    }
    
    private var inputBackgroundColor: Color {
        #if os(iOS)
        Color(uiColor: .tertiarySystemGroupedBackground)
        #else
        Color(nsColor: .textBackgroundColor)
        #endif
    }
    
    // MARK: - Theme Colors
    
    private let accentBlue = Color(red: 0.32, green: 0.52, blue: 0.87)
    private let successGreen = Color(red: 0.18, green: 0.5, blue: 0.34)
    private let warningOrange = Color(red: 0.92, green: 0.45, blue: 0.4)
    
    // MARK: - Body
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    headerSection
                    githubTokenSection
                    sprintNameSection
                    dateRangeSection
                    repositoriesSection
                    resetSection
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 28)
            }
            .background(backgroundColor)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
        .onAppear { loadDates() }
        .sheet(isPresented: $showRepoSheet) { addRepoSheet }
    }
    
    // MARK: - Sections
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(accentBlue)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Configuration")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.primary)
                    Text("Override default values")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
            }
            
            Text("Leave fields empty to use default values. Changes are saved automatically.")
                .font(.system(size: 13))
                .foregroundColor(.secondary)
                .padding(.top, 8)
        }
        .modifier(CardStyle(background: cardBackgroundColor))
    }
    
    private var githubTokenSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(icon: "key.fill", title: "GitHub Token", subtitle: "Personal access token for API authentication")
            
            VStack(alignment: .leading, spacing: 8) {
                SecureField("Enter custom token (optional)", text: $customGithubToken)
                    .modifier(InputFieldStyle(background: inputBackgroundColor, isMonospaced: true))
                
                statusLabel(
                    isDefault: customGithubToken.isEmpty,
                    defaultText: "Using default token",
                    customText: "Using custom token",
                    showWarning: true
                )
            }
        }
        .modifier(CardStyle(background: cardBackgroundColor))
    }
    
    private var sprintNameSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(icon: "tag.fill", title: "Sprint Name", subtitle: "Custom name for your sprint analysis")
            
            VStack(alignment: .leading, spacing: 8) {
                TextField("Enter custom sprint name (optional)", text: $customSprintName)
                    .modifier(InputFieldStyle(background: inputBackgroundColor))
                
                statusLabel(
                    isDefault: customSprintName.isEmpty,
                    defaultText: "Using default: \"\(Secrets.sprintName)\"",
                    customText: "Using custom name"
                )
            }
        }
        .modifier(CardStyle(background: cardBackgroundColor))
    }
    
    private var dateRangeSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(icon: "calendar", title: "Date Range", subtitle: "Analysis period for sprint reports")
            
            VStack(spacing: 12) {
                DatePicker("Start Date", selection: $customSinceDate, displayedComponents: [.date])
                    .datePickerStyle(.compact)
                    .modifier(InputFieldStyle(background: inputBackgroundColor))
                    .onChange(of: customSinceDate) { _ in saveDates() }
                
                DatePicker("End Date", selection: $customUntilDate, displayedComponents: [.date])
                    .datePickerStyle(.compact)
                    .modifier(InputFieldStyle(background: inputBackgroundColor))
                    .onChange(of: customUntilDate) { _ in saveDates() }
            }
            
            apiDatePreview
        }
        .modifier(CardStyle(background: cardBackgroundColor))
    }
    
    private var apiDatePreview: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Formatted for API:")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.secondary)
            
            dateRow(label: "Since:", value: formatDateForAPI(customSinceDate))
            dateRow(label: "Until:", value: formatDateForAPI(customUntilDate))
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(inputBackgroundColor)
        .cornerRadius(10)
    }
    
    private func dateRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.secondary)
            Text(value)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(accentBlue)
        }
    }
    
    private var repositoriesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(icon: "folder.fill", title: "Repositories", subtitle: "GitHub repositories to analyze")
            
            if customRepos.isEmpty {
                defaultReposView
            } else {
                customReposView
            }
            
            addRepoButton
        }
        .modifier(CardStyle(background: cardBackgroundColor))
    }
    
    private var defaultReposView: some View {
        VStack(spacing: 12) {
            statusLabel(isDefault: true, defaultText: "Using default repositories", customText: "")
                .frame(maxWidth: .infinity, alignment: .leading)
            
            ForEach(Secrets.defaultRepos, id: \.self) { repo in
                repoRow(repo: repo, isDefault: true)
            }
        }
    }
    
    private var customReposView: some View {
        ForEach(customRepos, id: \.self) { repo in
            repoRow(repo: repo, isDefault: false)
        }
    }
    
    private func repoRow(repo: String, isDefault: Bool) -> some View {
        HStack {
            Image(systemName: isDefault ? "folder" : "folder.fill")
                .foregroundColor(isDefault ? .secondary : accentBlue)
            Text(repo)
                .font(.system(size: 14, design: .monospaced))
                .foregroundColor(.primary)
            Spacer()
            if !isDefault {
                Button(action: { removeRepo(repo) }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(12)
        .background(inputBackgroundColor)
        .cornerRadius(10)
    }
    
    private var addRepoButton: some View {
        Button(action: { showRepoSheet = true }) {
            Label(
                customRepos.isEmpty ? "Add Custom Repository" : "Add Another Repository",
                systemImage: "plus.circle.fill"
            )
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(accentBlue)
            .frame(maxWidth: .infinity)
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(accentBlue, lineWidth: 1.5)
            )
        }
    }
    
    private var resetSection: some View {
        VStack(spacing: 12) {
            Button(action: resetAllSettings) {
                Label("Reset All to Defaults", systemImage: "arrow.counterclockwise")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(16)
                    .background(
                        LinearGradient(
                            colors: [warningOrange, warningOrange.opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        in: RoundedRectangle(cornerRadius: 14, style: .continuous)
                    )
                    .shadow(color: warningOrange.opacity(0.4), radius: 12, y: 6)
            }
            
            Text("This will clear all custom settings and revert to defaults")
                .font(.system(size: 12))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(20)
    }
    
    // MARK: - Helper Views
    
    private func sectionHeader(icon: String, title: String, subtitle: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(accentBlue)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.primary)
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private func statusLabel(isDefault: Bool, defaultText: String, customText: String, showWarning: Bool = false) -> some View {
        Group {
            if isDefault {
                Label(defaultText, systemImage: "checkmark.circle.fill")
                    .foregroundColor(successGreen)
            } else {
                Label(customText, systemImage: showWarning ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                    .foregroundColor(showWarning ? warningOrange : accentBlue)
            }
        }
        .font(.system(size: 12))
    }
    
    private var addRepoSheet: some View {
        NavigationView {
            VStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Repository Format")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.secondary)
                    
                    Text("Examples:")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.secondary)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("• owner/repo")
                        Text("• https://github.com/owner/repo")
                    }
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(.secondary)
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(inputBackgroundColor)
                .cornerRadius(12)
                
                TextField("Enter repository", text: $repoInput)
                    .modifier(InputFieldStyle(background: cardBackgroundColor, isMonospaced: true))
                
                Spacer()
            }
            .padding()
            .navigationTitle("Add Repository")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        repoInput = ""
                        showRepoSheet = false
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add") { addRepo() }
                        .disabled(repoInput.trimmingCharacters(in: .whitespaces).isEmpty)
                        .fontWeight(.semibold)
                }
            }
        }
    }
    
    // MARK: - Actions
    
    private func addRepo() {
        let trimmed = repoInput.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        
        var repos = customRepos
        if !repos.contains(trimmed) {
            repos.append(trimmed)
            setCustomRepos(repos)
        }
        
        repoInput = ""
        showRepoSheet = false
    }
    
    private func removeRepo(_ repo: String) {
        var repos = customRepos
        repos.removeAll { $0 == repo }
        setCustomRepos(repos)
    }
    
    private func resetAllSettings() {
        customGithubToken = ""
        customReposString = ""
        customSprintName = ""
        customSinceDate = parseDate(Secrets.defaultSince) ?? Date().addingTimeInterval(-30 * 24 * 60 * 60)
        customUntilDate = parseDate(Secrets.defaultUntil) ?? Date()
        saveDates()
    }
    
    // MARK: - Date Helpers
    
    private static let iso8601Formatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
    
    private func formatDateForAPI(_ date: Date) -> String {
        Self.iso8601Formatter.string(from: date)
    }
    
    private func parseDate(_ string: String) -> Date? {
        Self.iso8601Formatter.date(from: string)
    }
    
    private func saveDates() {
        UserDefaults.standard.set(formatDateForAPI(customSinceDate), forKey: "custom_since_date")
        UserDefaults.standard.set(formatDateForAPI(customUntilDate), forKey: "custom_until_date")
    }
    
    private func loadDates() {
        if let sinceString = UserDefaults.standard.string(forKey: "custom_since_date"),
           let sinceDate = parseDate(sinceString) {
            customSinceDate = sinceDate
        } else if let defaultSince = parseDate(Secrets.defaultSince) {
            customSinceDate = defaultSince
        }
        
        if let untilString = UserDefaults.standard.string(forKey: "custom_until_date"),
           let untilDate = parseDate(untilString) {
            customUntilDate = untilDate
        } else if let defaultUntil = parseDate(Secrets.defaultUntil) {
            customUntilDate = defaultUntil
        }
    }
}

// MARK: - View Modifiers

private struct CardStyle: ViewModifier {
    let background: Color
    
    func body(content: Content) -> some View {
        content
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(background)
                    .shadow(color: Color.black.opacity(0.05), radius: 12, y: 6)
            )
    }
}

private struct InputFieldStyle: ViewModifier {
    let background: Color
    var isMonospaced: Bool = false
    
    func body(content: Content) -> some View {
        content
            .textFieldStyle(.plain)
            .padding(14)
            .background(background)
            .cornerRadius(12)
            .font(.system(size: 15, design: isMonospaced ? .monospaced : .default))
    }
}

// MARK: - Static Helpers

extension SettingsView {
    static func effectiveGithubToken() -> String {
        let custom = UserDefaults.standard.string(forKey: "custom_github_token") ?? ""
        return custom.isEmpty ? Secrets.githubToken : custom
    }
    
    static func effectiveRepos() -> [String] {
        let customString = UserDefaults.standard.string(forKey: "custom_repos") ?? ""
        let custom = customString.isEmpty ? [] : customString.split(separator: ",").map { String($0) }
        return custom.isEmpty ? Secrets.defaultRepos : custom
    }
    
    static func effectiveSprintName() -> String {
        let custom = UserDefaults.standard.string(forKey: "custom_sprint_name") ?? ""
        return custom.isEmpty ? Secrets.sprintName : custom
    }
    
    static func effectiveSince() -> String {
        UserDefaults.standard.string(forKey: "custom_since_date") ?? Secrets.defaultSince
    }
    
    static func effectiveUntil() -> String {
        UserDefaults.standard.string(forKey: "custom_until_date") ?? Secrets.defaultUntil
    }
}

#Preview {
    SettingsView()
}
