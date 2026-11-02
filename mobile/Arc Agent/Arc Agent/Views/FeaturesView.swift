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
