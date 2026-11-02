import SwiftUI

struct FeaturesView: View {
    private struct Feature: Identifiable {
        let id = UUID()
        let icon: String
        let title: String
        let text: String
        let tone: Tone
    }

    private let features: [Feature] = [
        Feature(icon: "cpu", title: "Autonomous analysis", text: "AI agents independently analyze pull requests and generate comprehensive insights without human intervention.", tone: .ai),
        Feature(icon: "bolt", title: "Real-time intelligence", text: "Sprint reports with actionable recommendations, powered by Amazon Nova on Bedrock.", tone: .accent),
        Feature(icon: "doc.text", title: "Executive summaries", text: "Clear, concise reports suitable for both technical and non-technical stakeholders.", tone: .accent),
        Feature(icon: "arrow.triangle.merge", title: "Multi-repo support", text: "Analyze multiple repositories at once and get unified insights across your codebase.", tone: .accent),
        Feature(icon: "chart.line.uptrend.xyaxis", title: "Trend analysis", text: "Track development patterns, identify bottlenecks, and measure team velocity over time.", tone: .ai),
        Feature(icon: "tag", title: "Smart categorization", text: "Automatically categorize changes as features, bug fixes, refactors, or documentation.", tone: .ai),
    ]

    private let stats: [(value: String, label: String)] = [
        ("20", "Workflow steps"), ("4", "Phases"), ("2", "AI agents"), ("1 min", "Typical run"),
    ]

    private let stack = ["AWS Step Functions", "AWS Lambda", "Amazon Bedrock · Nova 2 Lite", "Amazon S3", "Amazon Cognito", "AWS KMS"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.s8) {
                VStack(alignment: .leading, spacing: Space.s2) {
                    Overline("Powered by agentic AI")
                    Text("Autonomous agents read every change in your sprint so you can focus on decisions, not data gathering.")
                        .font(.arcBody)
                        .foregroundStyle(Palette.textSecondary)
                }

                AgentFlowView()

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: Space.s3)], spacing: Space.s3) {
                    ForEach(stats, id: \.label) { stat in
                        VStack(alignment: .leading, spacing: Space.s1) {
                            Text(stat.value)
                                .font(.system(.title, weight: .bold))
                                .monospacedDigit()
                                .foregroundStyle(Palette.textPrimary)
                            Overline(stat.label)
                        }
                        .arcCard(padding: Space.s4)
                        .accessibilityElement(children: .combine)
                    }
                }

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 280), spacing: Space.s4, alignment: .top)], spacing: Space.s4) {
                    ForEach(features) { feature in
                        VStack(alignment: .leading, spacing: Space.s3) {
                            IconTile(systemName: feature.icon, tone: feature.tone, size: 44)
                            Text(feature.title).font(.arcH3).foregroundStyle(Palette.textPrimary)
                            Text(feature.text).font(.arcSmall).foregroundStyle(Palette.textSecondary)
                        }
                        .frame(maxHeight: .infinity, alignment: .top)
                        .arcCard()
                        .accessibilityElement(children: .combine)
                    }
                }

                VStack(alignment: .leading, spacing: Space.s3) {
                    Overline("Built on AWS")
                    FlowLayout(spacing: Space.s2) {
                        ForEach(stack, id: \.self) { item in
                            Text(item)
                                .font(.arcSmall)
                                .foregroundStyle(Palette.textSecondary)
                                .padding(.horizontal, Space.s3)
                                .padding(.vertical, Space.s1)
                                .background(Palette.bgSubtle, in: Capsule())
                                .overlay(Capsule().strokeBorder(Palette.borderSubtle))
                        }
                    }
                }
            }
            .padding(.horizontal, Space.s5)
            .padding(.vertical, Space.s4)
            .frame(maxWidth: DesignTokens.Layout.contentMax)
            .frame(maxWidth: .infinity)
        }
        .arcScreen()
    }
}

/// Merged PRs → Nova analysis → Sprint report, with dots travelling along the connectors.
private struct AgentFlowView: View {
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private struct Node {
        let icon: String
        let title: String
        let caption: String
        let tone: Tone
    }

    private let nodes = [
        Node(icon: "arrow.triangle.pull", title: "Merged PRs", caption: "Every repo in your period", tone: .accent),
        Node(icon: "cpu", title: "Nova analysis", caption: "Intent, impact, and risk per PR", tone: .ai),
        Node(icon: "doc.text", title: "Sprint report", caption: "Summary, metrics, next steps", tone: .success),
    ]

    var body: some View {
        let horizontal = sizeClass == .regular
        TimelineView(.animation(paused: reduceMotion)) { context in
            let phase = reduceMotion ? 0.5 : context.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 2.4) / 2.4
            let layout = horizontal ? AnyLayout(HStackLayout(alignment: .top, spacing: 0)) : AnyLayout(VStackLayout(spacing: 0))
            layout {
                ForEach(nodes.indices, id: \.self) { index in
                    if index > 0 {
                        Connector(horizontal: horizontal, tint: nodes[index - 1].tone.foreground, phase: phase)
                            .frame(width: horizontal ? nil : 2, height: horizontal ? 2 : 44)
                            .frame(maxWidth: horizontal ? .infinity : nil)
                            .padding(.top, horizontal ? 28 : Space.s2)
                            .padding(.bottom, horizontal ? 0 : Space.s2)
                    }
                    node(nodes[index], index: index)
                        .frame(width: horizontal ? 180 : nil)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Space.s8)
        .padding(.horizontal, Space.s5)
        .background(
            RadialGradient(colors: [Palette.aiSubtle, Palette.bgSurface], center: .center, startRadius: 10, endRadius: 260),
            in: RoundedRectangle(cornerRadius: DesignTokens.Radius.xl, style: .continuous)
        )
        .overlay(RoundedRectangle(cornerRadius: DesignTokens.Radius.xl, style: .continuous).strokeBorder(Palette.borderSubtle))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Merged PRs flow to Nova analysis, then to the sprint report")
    }

    private func node(_ node: Node, index: Int) -> some View {
        VStack(spacing: Space.s2) {
            IconTile(systemName: node.icon, tone: node.tone, size: 56)
                .overlay(alignment: .topLeading) {
                    if index == 0 {
                        VStack(alignment: .trailing, spacing: 3) {
                            ForEach(["#412", "#418", "#423"], id: \.self) { pr in
                                Text(pr)
                                    .font(.system(size: 9, design: .monospaced))
                                    .foregroundStyle(Palette.textSecondary)
                                    .padding(.horizontal, 4)
                                    .background(Palette.bgRaised, in: RoundedRectangle(cornerRadius: 3))
                                    .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Palette.borderSubtle))
                            }
                        }
                        .offset(x: -44, y: -6)
                    }
                }
            Text(node.title).font(.arcTitle).foregroundStyle(Palette.textPrimary)
            Text(node.caption).font(.arcCaption).foregroundStyle(Palette.textTertiary).multilineTextAlignment(.center)
        }
    }
}

private struct Connector: View {
    let horizontal: Bool
    let tint: Color
    let phase: Double

    var body: some View {
        GeometryReader { proxy in
            let length = horizontal ? proxy.size.width : proxy.size.height
            ZStack(alignment: .topLeading) {
                Path { path in
                    path.move(to: .zero)
                    path.addLine(to: horizontal ? CGPoint(x: length, y: 0) : CGPoint(x: 0, y: length))
                }
                .stroke(Palette.borderDefault, style: StrokeStyle(lineWidth: 2, dash: [6, 6]))
                ForEach(0..<3, id: \.self) { dot in
                    let t = (phase + Double(dot) / 3).truncatingRemainder(dividingBy: 1)
                    Circle()
                        .fill(tint)
                        .frame(width: 8, height: 8)
                        .shadow(color: tint, radius: 4)
                        .opacity(min(t, 1 - t) * 6)
                        .offset(x: horizontal ? t * (length - 8) : -3, y: horizontal ? -3 : t * (length - 8))
                }
            }
        }
    }
}

/// Wraps children onto new lines when they run out of horizontal space.
struct FlowLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(subviews: subviews, width: proposal.width ?? .infinity)
        let height = rows.map(\.height).reduce(0, +) + spacing * CGFloat(max(rows.count - 1, 0))
        return CGSize(width: proposal.width ?? rows.map(\.width).max() ?? 0, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for row in arrange(subviews: subviews, width: bounds.width) {
            var x = bounds.minX
            for index in row.indices {
                let size = subviews[index].sizeThatFits(.unspecified)
                subviews[index].place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
                x += size.width + spacing
            }
            y += row.height + spacing
        }
    }

    private func arrange(subviews: Subviews, width: CGFloat) -> [(indices: [Int], width: CGFloat, height: CGFloat)] {
        var rows: [(indices: [Int], width: CGFloat, height: CGFloat)] = [([], 0, 0)]
        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)
            let last = rows[rows.count - 1]
            if !last.indices.isEmpty, last.width + spacing + size.width > width {
                rows.append(([index], size.width, size.height))
            } else {
                rows[rows.count - 1] = (last.indices + [index], last.width + (last.indices.isEmpty ? 0 : spacing) + size.width, max(last.height, size.height))
            }
        }
        return rows
    }
}

#Preview {
    NavigationStack { FeaturesView() }
}
