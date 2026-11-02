import SwiftUI

struct ProgressTrackerView: View {
    @ObservedObject var viewModel: SprintAnalysisViewModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let manager = WorkflowStepsManager.shared

    private var retrieving: Bool { viewModel.status == .retrieving }
    private var step: WorkflowStep { viewModel.currentStep }
    private var isAI: Bool { !retrieving && step.type == .ai }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s5) {
            HStack(alignment: .center, spacing: Space.s4) {
                ProgressRing(progress: viewModel.progress / 100, tint: isAI ? Palette.aiSolid : Palette.accentSolid)
                    .frame(width: 64, height: 64)
                VStack(alignment: .leading, spacing: Space.s1) {
                    Badge(
                        text: retrieving ? "Finishing up" : isAI ? "AI processing" : "System process",
                        systemImage: isAI ? "cpu" : "gearshape",
                        tone: isAI ? .ai : .accent
                    )
                    Text(Duration.seconds(viewModel.elapsed).formatted(.time(pattern: .minuteSecond)))
                        .font(.arcMono)
                        .foregroundStyle(Palette.textTertiary)
                        .monospacedDigit()
                        .accessibilityLabel("Elapsed \(Duration.seconds(viewModel.elapsed).formatted(.units(allowed: [.minutes, .seconds], width: .wide)))")
                }
                Spacer()
            }

            HStack(spacing: Space.s2) {
                ForEach(WorkflowPhase.allCases) { phase in
                    PhaseBar(
                        title: phase.title,
                        fill: manager.progress(of: phase, currentStep: viewModel.currentStepIndex, complete: retrieving),
                        tint: phase.isAI ? Palette.aiSolid : Palette.accentSolid
                    )
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Sprint analysis progress")
            .accessibilityValue("\(Int(viewModel.progress)) percent")

            Text(retrieving ? "Retrieving your report…" : step.name)
                .font(.arcH3)
                .foregroundStyle(Palette.textPrimary)
                .id(retrieving ? -1 : viewModel.currentStepIndex)
                .transition(reduceMotion ? .opacity : .asymmetric(insertion: .move(edge: .bottom).combined(with: .opacity), removal: .opacity))
                .animation(.smooth(duration: DesignTokens.Duration.base), value: viewModel.currentStepIndex)
                .accessibilityAddTraits(.updatesFrequently)

            VStack(spacing: 0) {
                ForEach(visibleSteps, id: \.self) { index in
                    StepRowView(step: manager.steps[index], active: !retrieving && index == viewModel.currentStepIndex)
                    Divider().overlay(Palette.borderSubtle)
                }
            }
            .animation(reduceMotion ? nil : .smooth(duration: DesignTokens.Duration.base), value: visibleSteps)
        }
    }

    private var visibleSteps: [Int] {
        retrieving ? Array(manager.steps.indices.reversed()) : Array((0...viewModel.currentStepIndex).reversed())
    }
}

private struct ProgressRing: View {
    let progress: Double
    let tint: Color

    var body: some View {
        ZStack {
            Circle().stroke(Palette.bgSubtle, lineWidth: 7)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(tint, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.linear(duration: 0.1), value: progress)
            Text("\(Int(progress * 100))%")
                .font(.system(.subheadline, design: .rounded, weight: .bold))
                .monospacedDigit()
                .foregroundStyle(Palette.textPrimary)
        }
        .accessibilityHidden(true)
    }
}

private struct PhaseBar: View {
    let title: String
    let fill: Double
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s1) {
            GeometryReader { proxy in
                Capsule()
                    .fill(Palette.bgSubtle)
                    .overlay(alignment: .leading) {
                        Capsule()
                            .fill(tint)
                            .frame(width: proxy.size.width * fill)
                            .animation(.smooth(duration: DesignTokens.Duration.slower), value: fill)
                    }
            }
            .frame(height: 8)
            Text(title)
                .font(.arcCaption.weight(.semibold))
                .foregroundStyle(fill > 0 ? Palette.textPrimary : Palette.textTertiary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
    }
}

private struct StepRowView: View {
    let step: WorkflowStep
    let active: Bool

    var body: some View {
        HStack(spacing: Space.s3) {
            ZStack {
                Circle().fill(active ? (step.type == .ai ? Palette.aiSubtle : Palette.accentSubtle) : Palette.successSubtle)
                if active {
                    ProgressView().controlSize(.mini).tint(step.type == .ai ? Palette.aiText : Palette.accentText)
                } else {
                    Image(systemName: "checkmark").font(.caption2.weight(.bold)).foregroundStyle(Palette.successText)
                }
            }
            .frame(width: 24, height: 24)
            Text(step.name)
                .font(active ? .arcSmall.weight(.semibold) : .arcSmall)
                .foregroundStyle(active ? Palette.textPrimary : Palette.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
            Badge(text: step.type.displayName, tone: step.type == .ai ? .ai : .neutral)
        }
        .padding(.vertical, Space.s3)
        .accessibilityElement(children: .combine)
        .accessibilityValue(active ? "In progress" : "Completed")
    }
}
