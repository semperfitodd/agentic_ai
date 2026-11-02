import SwiftUI

enum AppTab: String, Hashable {
    case overview, features, run, settings
}

struct ContentView: View {
    @StateObject private var viewModel = SprintAnalysisViewModel()
    @ObservedObject private var auth = AuthService.shared
    @State private var selection: AppTab = .overview

    var body: some View {
        TabView(selection: $selection) {
            Tab("Overview", systemImage: "sparkles", value: AppTab.overview) {
                NavigationStack {
                    OverviewView(onRun: { selection = .run }, onLearnMore: { selection = .features })
                        .navigationTitle("Arc Agent")
                }
            }
            Tab("Features", systemImage: "square.grid.2x2", value: AppTab.features) {
                NavigationStack {
                    FeaturesView()
                        .navigationTitle("Features")
                }
            }
            Tab("Run", systemImage: "play.circle", value: AppTab.run) {
                NavigationStack {
                    RunAgentView(viewModel: viewModel, onEditSettings: { selection = .settings })
                        .navigationTitle("Run Analysis")
                }
            }
            Tab("Settings", systemImage: "gearshape", value: AppTab.settings) {
                NavigationStack {
                    SettingsView()
                        .navigationTitle("Settings")
                }
            }
        }
        .tabViewStyle(.sidebarAdaptable)
        .tint(Palette.accentSolid)
        .sheet(isPresented: $viewModel.showReportModal) {
            ReportModalView(markdown: viewModel.markdownReport ?? "")
                .presentationSizing(.page)
        }
        .sensoryFeedback(.success, trigger: viewModel.showReportModal) { _, shown in shown }
        .sensoryFeedback(.error, trigger: viewModel.errorMessage) { _, message in message != nil }
        .onChange(of: auth.isSignedIn) { _, signedIn in
            if !signedIn {
                viewModel.reset()
            }
        }
    }
}

#Preview {
    ContentView()
}
