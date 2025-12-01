import SwiftUI

struct RunAgentView: View {
    @ObservedObject var viewModel: SprintAnalysisViewModel
    
    private let statusItems: [(icon: String, title: String)] = [
        ("bolt.horizontal.circle", "Orchestrator ready"),
        ("waveform.path.ecg", "Live telemetry"),
        ("lock.shield", "Secure channel")
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            missionHeader
            
            if let info = viewModel.analysisInfo {
                glassPanel {
                    workflowDetails(info: info)
                }
            }
            
            actionButton
            
            if viewModel.isLoading || viewModel.workflowComplete {
                glassPanel {
                    ProgressTrackerView(
                        progress: viewModel.progress,
                        currentStep: viewModel.currentStepIndex,
                        completedSteps: viewModel.completedSteps
                    )
                }
            }
            
            if viewModel.workflowComplete {
                glassPanel { CompletedStepsView() }
                if viewModel.isFetchingReport {
                    glassPanel { FetchingReportView() }
                }
            }
            
            if let error = viewModel.errorMessage {
                glassPanel { ErrorView(message: error) }
            }
        }
    }
    
    private var missionHeader: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Autonomous sprint orchestration", systemImage: "sparkles")
                .font(.caption.bold())
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(Color.white.opacity(0.2), in: Capsule())
                .foregroundColor(.white)
            
            Text("Run the Agent")
                .font(.system(size: 30, weight: .heavy))
                .foregroundColor(.white)
            
            Text("Kick off the multi-agent workflow to analyze your GitHub activity, track progress in real time, and receive an executive-ready report.")
                .foregroundColor(.white.opacity(0.9))
                .font(.system(size: 16, weight: .medium))
            
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 10)], spacing: 10) {
                ForEach(statusItems, id: \.title) { chip in
                    statusChip(icon: chip.icon, title: chip.title)
                }
            }
            .font(.footnote.weight(.semibold))
            .foregroundColor(.white.opacity(0.85))
        }
        .padding(26)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 32, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.28, green: 0.38, blue: 0.92),
                            Color(red: 0.12, green: 0.2, blue: 0.46)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
        .shadow(color: Color(red: 0.15, green: 0.19, blue: 0.44).opacity(0.4), radius: 24, y: 12)
    }
    
    private func statusChip(icon: String, title: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
            Text(title)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .layoutPriority(1)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.18), in: Capsule())
    }
    
    private var actionButton: some View {
        Button(action: {
            viewModel.runSprintAnalysis()
        }) {
            HStack {
                if viewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Image(systemName: "play.fill")
                }
                Text(buttonTitle)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                LinearGradient(
                    colors: viewModel.isLoading || viewModel.isFetchingReport ?
                        [Color.gray] :
                        [Color(red: 0.31, green: 0.53, blue: 0.97), Color(red: 0.33, green: 0.28, blue: 0.86)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(18)
            .shadow(color: Color.blue.opacity(0.3), radius: 20, y: 10)
        }
        .disabled(viewModel.isLoading || viewModel.isFetchingReport)
    }
    
    private func glassPanel<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .padding(22)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
    }
    
    private func workflowDetails(info: AnalysisInfo) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Repositories")
                    .font(.headline)
                ForEach(info.repos, id: \.self) { repo in
                    Link(destination: URL(string: "https://github.com/\(repo)")!) {
                        HStack {
                            Image(systemName: "arrow.turn.up.right")
                                .font(.caption)
                            Text(repo)
                                .font(.subheadline)
                            Spacer()
                            Image(systemName: "arrow.up.right.square")
                                .font(.caption)
                        }
                        .foregroundColor(.blue)
                    }
                }
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Date Range")
                    .font(.headline)
                HStack {
                    Label {
                        Text(info.dateRange.since, style: .date)
                    } icon: {
                        Image(systemName: "calendar")
                    }
                    Spacer()
                    Label {
                        Text(info.dateRange.until, style: .date)
                    } icon: {
                        Image(systemName: "flag.checkered")
                    }
                }
                .font(.subheadline)
            }
        }
    }
    
    private var buttonTitle: String {
        if viewModel.isLoading {
            return "Analysis in Progress..."
        } else if viewModel.isFetchingReport {
            return "Fetching Report..."
        } else {
            return "Run Sprint Analysis"
        }
    }
}

#Preview {
    RunAgentView(viewModel: SprintAnalysisViewModel())
        .padding()
}

