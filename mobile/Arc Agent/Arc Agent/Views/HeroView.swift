import SwiftUI

struct AgentOverviewView: View {
    private struct Capability: Identifiable {
        let id = UUID()
        let title: String
        let subtitle: String
        let icon: String
        let tint: Color
    }
    
    private let capabilities: [Capability] = [
        .init(title: "Autonomous", subtitle: "Multi-agent orchestration", icon: "sparkles", tint: Color.purple),
        .init(title: "Context-Aware", subtitle: "Understands repos + history", icon: "brain.head.profile", tint: Color.blue),
        .init(title: "Enterprise Ready", subtitle: "Secure, auditable outputs", icon: "lock.shield", tint: Color.green)
    ]
    
    var body: some View {
        VStack(spacing: 28) {
            heroCard
            capabilityGrid
            deliverablesPanel
            processStack
        }
    }
    
    private var heroCard: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 36, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.21, green: 0.24, blue: 0.52),
                            Color(red: 0.09, green: 0.16, blue: 0.33)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: Color.black.opacity(0.25), radius: 30, y: 18)
            
            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .top) {
                    Text("Agentic AI Demo")
                        .font(.system(size: 34, weight: .heavy))
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)
                        .multilineTextAlignment(.leading)
                    Spacer()
                    Label("Sprint Intelligence", systemImage: "waveform.path.ecg")
                        .font(.system(size: 14, weight: .semibold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.15), in: Capsule())
                }
                
                Text("Advanced AI-powered sprint analysis platform combining autonomous agents, code intelligence, and executive-ready storytelling.")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.9))
                
                HStack(spacing: 12) {
                    Label("Adaptive reasoning", systemImage: "sparkles")
                    Label("Live GitHub context", systemImage: "bolt.horizontal")
                    Label("Enterprise delivery", systemImage: "checkmark.seal")
                }
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white)
                .opacity(0.8)
            }
            .padding(28)
            .foregroundColor(.white)
        }
    }
    
    private var capabilityGrid: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 16)], spacing: 16) {
            ForEach(capabilities) { capability in
                HStack(spacing: 14) {
                    Image(systemName: capability.icon)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(12)
                        .background(capability.tint, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(capability.title)
                            .font(.headline)
                        Text(capability.subtitle)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(18)
                .background(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .fill(Color.primary.opacity(0.03))
                )
                .shadow(color: capability.tint.opacity(0.12), radius: 20, y: 10)
            }
        }
    }
    
    private var deliverablesPanel: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("What This Agent Delivers")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("The system autonomously analyzes your GitHub repositories to craft a boardroom-ready sprint report. Each stage blends self-directed discovery, Claude Sonnet analysis, and synthesis by a master coordination agent.")
                .font(.body)
                .foregroundColor(.secondary)
            
            VStack(alignment: .leading, spacing: 10) {
                BulletPoint(title: "Sprint Summary:", description: "Executive overview with KPIs, narratives, and trend lines.")
                BulletPoint(title: "Work Breakdown:", description: "Feature, bug, refactor, and documentation analytics.")
                BulletPoint(title: "Repository Activity:", description: "Heatmaps of contributors, cadence, and dependencies.")
                BulletPoint(title: "Detailed PR Insights:", description: "Claude-level reasoning on impact, quality, and risk.")
                BulletPoint(title: "Recommendations:", description: "Next-best actions surfaced by goal-oriented agents.")
            }
            .padding(20)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
    }
    
    private var processStack: some View {
        VStack(spacing: 18) {
            ProcessStepCard(
                icon: "🔍",
                title: "Autonomous Discovery",
                description: "Agents fetch merged PRs, comments, and artifacts within the requested window."
            )
            
            ProcessStepCard(
                icon: "🤖",
                title: "Intelligent Analysis",
                description: "Claude 3.5 Sonnet inspects each code path for impact, regressions, and product context."
            )
            
            ProcessStepCard(
                icon: "📊",
                title: "Executive Synthesis",
                description: "A master orchestrator weaves findings into a narrative designed for leadership."
            )
        }
    }
}

struct ProcessStepCard: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Text(icon)
                .font(.system(size: 40))
                .frame(width: 52, height: 52)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color.primary.opacity(0.06))
                )
            
            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.secondary.opacity(0.08))
        )
        .shadow(color: Color.black.opacity(0.08), radius: 12, y: 6)
    }
}

struct BulletPoint: View {
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Circle()
                .fill(Color.blue)
                .frame(width: 10, height: 10)
                .padding(.top, 6)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .fontWeight(.semibold)
                Text(description)
            }
            .font(.subheadline)
            .foregroundColor(.secondary)
        }
    }
}

#Preview {
    AgentOverviewView()
        .padding()
}

