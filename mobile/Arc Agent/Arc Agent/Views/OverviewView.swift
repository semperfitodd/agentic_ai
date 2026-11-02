import SwiftUI

struct OverviewView: View {
    var onRun: () -> Void
    var onLearnMore: () -> Void

    @Environment(\.horizontalSizeClass) private var sizeClass

    private struct Item: Identifiable {
        let id = UUID()
        let icon: String
        let title: String
        let text: String
        var tone: Tone = .accent
    }

    private let pipeline: [Item] = [
        Item(icon: "magnifyingglass", title: "Discover", text: "Fetches merged pull requests, diffs, reviews, and comments for every repository in your date range."),
        Item(icon: "cpu", title: "Analyze", text: "Amazon Nova on Bedrock reviews each PR like a senior engineer: intent, impact, risk, and quality.", tone: .ai),
        Item(icon: "sparkles", title: "Synthesize", text: "An aggregation agent turns individual analyses into an executive summary, metrics, and recommendations.", tone: .ai),
    ]

    private let deliverables: [Item] = [
        Item(icon: "doc.text", title: "Executive summary", text: "Outcomes and risks in plain language."),
        Item(icon: "chart.bar", title: "Key metrics", text: "Throughput, review depth, and code churn."),
        Item(icon: "checklist", title: "Work breakdown", text: "Features, fixes, and refactors by category."),
        Item(icon: "folder", title: "Repository insights", text: "Per-repo activity and highlights."),
        Item(icon: "person.2", title: "Team collaboration", text: "Contributors and review patterns."),
        Item(icon: "lightbulb", title: "Recommendations", text: "Focus areas and debt for next sprint."),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.s10) {
                hero
                section(overline: "How it works", title: "Three agents, one report") {
                    LazyVGrid(columns: columns(min: 220), spacing: Space.s4) {
                        ForEach(Array(pipeline.enumerated()), id: \.element.id) { index, item in
                            VStack(alignment: .leading, spacing: Space.s3) {
                                HStack {
                                    IconTile(systemName: item.icon, tone: item.tone)
                                    Spacer()
                                    Text(String(format: "%02d", index + 1))
                                        .font(.arcMono)
                                        .foregroundStyle(Palette.textTertiary)
                                }
                                Text(item.title).font(.arcH3).foregroundStyle(Palette.textPrimary)
                                Text(item.text).font(.arcSmall).foregroundStyle(Palette.textSecondary)
                            }
                            .frame(maxHeight: .infinity, alignment: .top)
                            .arcCard()
                            .accessibilityElement(children: .combine)
                        }
                    }
                }
                section(overline: "Deliverables", title: "What you’ll receive") {
                    LazyVGrid(columns: columns(min: 300), alignment: .leading, spacing: Space.s4) {
                        ForEach(deliverables) { item in
                            HStack(alignment: .top, spacing: Space.s3) {
                                IconTile(systemName: item.icon, size: 36)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.title).font(.arcTitle).foregroundStyle(Palette.textPrimary)
                                    Text(item.text).font(.arcSmall).foregroundStyle(Palette.textSecondary)
                                }
                                Spacer(minLength: 0)
                            }
                            .accessibilityElement(children: .combine)
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

    private var hero: some View {
        VStack(alignment: .leading, spacing: Space.s4) {
            Label("Agentic sprint intelligence", systemImage: "sparkles")
                .font(.arcCaption.weight(.semibold))
                .padding(.horizontal, Space.s3)
                .padding(.vertical, 5)
                .background(.white.opacity(0.16), in: Capsule())
            Text("Turn a sprint of pull requests into an executive-ready report.")
                .font(sizeClass == .regular ? .arcDisplay : .arcH1)
                .fixedSize(horizontal: false, vertical: true)
            Text("Arc Agent fetches every merged PR, has Amazon Nova analyze each change, and synthesizes a structured sprint report you can share as a polished PDF.")
                .font(.arcBody)
                .foregroundStyle(.white.opacity(0.88))
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Space.s3) { heroButtons }
                VStack(spacing: Space.s3) { heroButtons }
            }
            .padding(.top, Space.s2)
        }
        .foregroundStyle(.white)
        .padding(Space.s6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LinearGradient.hero, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.xl, style: .continuous))
        .overlay(alignment: .topTrailing) {
            Circle()
                .fill(Palette.brandEmber)
                .frame(width: 10, height: 10)
                .padding(Space.s6)
                .accessibilityHidden(true)
        }
    }

    @ViewBuilder
    private var heroButtons: some View {
        Button(action: onRun) {
            Label("Run an analysis", systemImage: "play.fill")
                .frame(maxWidth: .infinity, minHeight: 50)
                .font(.arcTitle)
                .foregroundStyle(Palette.accentSolid)
                .background(.white, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous))
        }
        .buttonStyle(.plain)
        Button(action: onLearnMore) {
            Label("See how it works", systemImage: "arrow.right")
                .frame(maxWidth: .infinity, minHeight: 50)
                .font(.arcTitle)
                .foregroundStyle(.white)
                .background(.white.opacity(0.14), in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func columns(min: CGFloat) -> [GridItem] {
        [GridItem(.adaptive(minimum: min), spacing: Space.s4, alignment: .top)]
    }

    private func section<Content: View>(overline: String, title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: Space.s4) {
            VStack(alignment: .leading, spacing: Space.s1) {
                Overline(overline)
                Text(title).font(.arcH2).foregroundStyle(Palette.textPrimary)
                    .accessibilityAddTraits(.isHeader)
            }
            content()
        }
    }
}

#Preview {
    NavigationStack { OverviewView(onRun: {}, onLearnMore: {}) }
}
