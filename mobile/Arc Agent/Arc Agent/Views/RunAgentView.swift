import AuthenticationServices
import SwiftUI

struct RunAgentView: View {
    @ObservedObject var viewModel: SprintAnalysisViewModel
    var onEditSettings: () -> Void

    @ObservedObject private var auth = AuthService.shared
    @Environment(\.webAuthenticationSession) private var webAuthenticationSession
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var runRequests = 0

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.s5) {
                Text("Configure your sprint, then let the agents work.")
                    .font(.arcBody)
                    .foregroundStyle(Palette.textSecondary)

                if sizeClass == .regular {
                    HStack(alignment: .top, spacing: Space.s5) {
                        ConfigurationCard(onEditSettings: onEditSettings, isBusy: isBusy)
                            .frame(width: 340)
                        runPanel
                    }
                } else {
                    runPanel
                    ConfigurationCard(onEditSettings: onEditSettings, isBusy: isBusy)
                }
            }
            .padding(.horizontal, Space.s5)
            .padding(.vertical, Space.s4)
            .frame(maxWidth: DesignTokens.Layout.contentMax)
            .frame(maxWidth: .infinity)
        }
        .arcScreen()
        .sensoryFeedback(.impact(weight: .medium), trigger: runRequests)
    }

    private var isBusy: Bool {
        viewModel.status == .running || viewModel.status == .retrieving
    }

    private var runPanel: some View {
        Group {
            switch viewModel.status {
            case .running, .retrieving:
                ProgressTrackerView(viewModel: viewModel)
            case .ready:
                stateView(icon: "checkmark.circle.fill", tone: .success, title: "Your report is ready",
                          message: "Open it to read the analysis, copy the markdown, or share a PDF.") {
                    Button {
                        viewModel.showReportModal = true
                    } label: {
                        Label("Open report", systemImage: "doc.text")
                    }
                    .buttonStyle(.arcPrimary)
                    runButton(title: "Run again", systemImage: "arrow.counterclockwise", style: .arcSecondary)
                }
            case .idle, .failed:
                stateView(icon: "play.fill", tone: .accent,
                          title: viewModel.status == .failed ? "Ready to try again" : "Ready when you are",
                          message: "The agents will fetch every merged pull request in your period, analyze each change, and assemble a sprint report.") {
                    runButton(
                        title: auth.isSignedIn ? (viewModel.status == .failed ? "Try again" : "Run sprint analysis") : "Sign in to run",
                        systemImage: auth.isSignedIn ? "play.fill" : "person.crop.circle",
                        style: .arcPrimary
                    )
                    Text("Typically takes about a minute.")
                        .font(.arcCaption)
                        .foregroundStyle(Palette.textTertiary)
                }
            }
        }
        .arcCard(padding: Space.s6)
        .animation(reduceMotion ? nil : .smooth(duration: DesignTokens.Duration.slow), value: viewModel.status)
    }

    private func runButton(title: String, systemImage: String, style: ArcButtonStyle) -> some View {
        Button {
            runRequests += 1
            viewModel.runSprintAnalysis(using: webAuthenticationSession)
        } label: {
            Label(title, systemImage: systemImage)
        }
        .buttonStyle(style)
    }

    private func stateView<Actions: View>(icon: String, tone: Tone, title: String, message: String, @ViewBuilder actions: () -> Actions) -> some View {
        VStack(spacing: Space.s4) {
            if let error = viewModel.errorMessage, viewModel.status == .failed {
                HStack(alignment: .top, spacing: Space.s3) {
                    Image(systemName: "exclamationmark.triangle.fill")
                    VStack(alignment: .leading, spacing: Space.s1) {
                        Text("Analysis failed").font(.arcTitle)
                        Text(error).font(.arcSmall).foregroundStyle(Palette.textPrimary)
                    }
                    Spacer(minLength: 0)
                }
                .foregroundStyle(Palette.dangerText)
                .padding(Space.s4)
                .background(Palette.dangerSubtle, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous))
                .accessibilityElement(children: .combine)
            } else {
                IconTile(systemName: icon, tone: tone, size: 56)
            }
            Text(title).font(.arcH3).foregroundStyle(Palette.textPrimary)
            Text(message)
                .font(.arcSmall)
                .foregroundStyle(Palette.textSecondary)
                .multilineTextAlignment(.center)
            actions()
        }
        .frame(maxWidth: 460)
        .frame(maxWidth: .infinity)
        .padding(.vertical, Space.s4)
        .transition(.opacity.combined(with: .move(edge: .bottom)))
    }
}

private struct ConfigurationCard: View {
    var onEditSettings: () -> Void
    var isBusy: Bool

    @AppStorage("custom_repos") private var customRepos = ""
    @AppStorage("custom_sprint_name") private var customSprintName = ""
    @AppStorage("custom_since_date") private var customSince = ""
    @AppStorage("custom_until_date") private var customUntil = ""
    @State private var hasToken = false

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s5) {
            Text("Configuration").font(.arcTitle).foregroundStyle(Palette.textPrimary)
            row(icon: "tag", label: "Sprint") {
                Text(SettingsView.effectiveSprintName())
            }
            row(icon: "calendar", label: "Period") {
                Text(period)
            }
            row(icon: "folder", label: "Repositories") {
                FlowLayout(spacing: Space.s2) {
                    ForEach(SettingsView.effectiveRepos(), id: \.self) { repo in
                        Text(repo)
                            .font(.arcMono)
                            .padding(.horizontal, Space.s2)
                            .padding(.vertical, 3)
                            .background(Palette.bgSubtle, in: Capsule())
                    }
                }
            }
            row(icon: "key", label: "GitHub token") {
                Badge(text: hasToken ? "Keychain token set" : "Public repos only", tone: hasToken ? .success : .neutral)
            }
            Button(action: onEditSettings) {
                Label("Edit settings", systemImage: "slider.horizontal.3")
            }
            .buttonStyle(.arcSecondary)
            .disabled(isBusy)
        }
        .foregroundStyle(Palette.textPrimary)
        .arcCard()
        .onAppear { hasToken = !SettingsView.effectiveGithubToken().isEmpty }
        .id([customRepos, customSprintName, customSince, customUntil].joined())
    }

    private var period: String {
        let parser = ISO8601DateFormatter()
        guard let since = parser.date(from: SettingsView.effectiveSince()),
              let until = parser.date(from: SettingsView.effectiveUntil()) else { return "Not set" }
        let style = Date.FormatStyle(date: .abbreviated, time: .omitted, timeZone: .gmt)
        return "\(since.formatted(style)) – \(until.formatted(style))"
    }

    private func row<Value: View>(icon: String, label: String, @ViewBuilder value: () -> Value) -> some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            Label { Overline(label) } icon: {
                Image(systemName: icon).font(.caption).foregroundStyle(Palette.textTertiary)
            }
            value().font(.arcBody.weight(.medium))
        }
        .accessibilityElement(children: .combine)
    }
}
