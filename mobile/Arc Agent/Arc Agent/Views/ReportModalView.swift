import SwiftUI
#if os(macOS)
import AppKit
#elseif os(iOS)
import UIKit
#endif

struct ReportModalView: View {
    let markdown: String
    @Binding var isPresented: Bool
    @Environment(\.dismiss) private var dismiss
    @State private var pdfURL: URL?
    @State private var showShareSheet = false
    
    var body: some View {
        GeometryReader { proxy in
            let isCompact = proxy.size.width < 720
        VStack(spacing: 0) {
                heroHeader(isCompact: isCompact)
                
                ScrollView {
                    VStack(spacing: 24) {
                        reportHighlights
                        if !sprintStatistics.isEmpty {
                            reportStatistics
                        }
                        insightsCallout
                        reportContentCard
                        actionFooter
                    }
                    .padding(.horizontal, isCompact ? 20 : 32)
                    .padding(.vertical, 28)
                }
                .background(Color(red: 0.96, green: 0.97, blue: 0.99))
            }
            .frame(maxWidth: min(proxy.size.width - (isCompact ? 0 : 80), 1100))
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .padding(.vertical, isCompact ? 0 : 24)
            .padding(.horizontal, isCompact ? 0 : 20)
            .background(
                LinearGradient(
                    colors: [
                        Color(red: 0.05, green: 0.08, blue: 0.18),
                        Color(red: 0.12, green: 0.16, blue: 0.33)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
            )
            .sheet(isPresented: $showShareSheet) {
                if let url = pdfURL {
                    ShareSheet(items: [url])
                } else {
                    ShareSheet(items: [markdown])
                }
            }
        }
    }

    private func heroHeader(isCompact: Bool) -> some View {
        VStack(alignment: .leading, spacing: 24) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Sprint Intelligence Report")
                        .font(.system(size: isCompact ? 28 : 34, weight: .heavy))
                    Text("Enterprise delivery insights · Ready for circulation")
                        .font(.system(size: 15, weight: .semibold))
                        .opacity(0.85)
                    }
                    
                    Spacer()
                
                VStack(alignment: .trailing, spacing: 10) {
                    Label("Status · Published", systemImage: "checkmark.seal.fill")
                        .font(.system(size: 13, weight: .semibold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.15), in: Capsule())
                    
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(Color(red: 0.16, green: 0.2, blue: 0.42))
                            .padding(10)
                            .background(Color.white, in: Circle())
                            .shadow(color: Color.black.opacity(0.2), radius: 10, y: 4)
                    }
                    .buttonStyle(.plain)
                }
            }
            
            LazyVGrid(columns: heroMetricColumns(isCompact: isCompact), spacing: 12) {
                ForEach(heroMetrics) { metric in
                    heroInfoChip(metric: metric)
                }
            }
        }
        .padding(isCompact ? 24 : 32)
                            .background(
            RoundedRectangle(cornerRadius: isCompact ? 24 : 32, style: .continuous)
                .fill(
                                LinearGradient(
                        colors: [
                            Color(red: 0.28, green: 0.37, blue: 0.8),
                            Color(red: 0.14, green: 0.18, blue: 0.42)
                        ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: isCompact ? 24 : 32, style: .continuous)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                )
                            )
                            .foregroundColor(.white)
        .shadow(color: Color.black.opacity(0.35), radius: 30, y: 18)
    }
    
    private func heroInfoChip(metric: HeroMetric) -> some View {
        HStack(spacing: 12) {
            Image(systemName: metric.icon)
                .font(.system(size: 18, weight: .semibold))
                .frame(width: 32, height: 32)
                .background(Color.white.opacity(0.22), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            
            VStack(alignment: .leading, spacing: 4) {
                Text(metric.label.uppercased())
                    .font(.system(size: 11, weight: .heavy))
                    .opacity(0.75)
                Text(metric.value)
                    .font(.system(size: 16, weight: .semibold))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.15), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
    
    private var reportHighlights: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "Executive highlights", subtitle: "Auto-generated summary of the current sprint intelligence.", icon: "sparkles")
            
            LazyVGrid(columns: highlightColumns, spacing: 16) {
                highlightCard(
                    icon: "square.grid.2x2.fill",
                    title: "Structured sections",
                    value: "\(sectionCount)",
                    detail: "Headings detected",
                    accent: Color(red: 0.32, green: 0.52, blue: 0.87)
                )
                
                highlightCard(
                    icon: "list.bullet.rectangle",
                    title: "Talking points",
                    value: "\(bulletCount)",
                    detail: "Actionable bullets",
                    accent: Color(red: 0.23, green: 0.71, blue: 0.53)
                )
                
                highlightCard(
                    icon: "doc.text.magnifyingglass",
                    title: "Word coverage",
                    value: "\(wordCount)",
                    detail: "Words analyzed",
                    accent: Color(red: 0.92, green: 0.45, blue: 0.4)
                )
                
                highlightCard(
                    icon: "bolt.badge.clock",
                    title: "Turnaround",
                    value: "\(estimatedReadTime) min",
                    detail: "Estimated read",
                    accent: Color(red: 0.58, green: 0.44, blue: 0.84)
                )
            }
        }
    }
    
    private var reportStatistics: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "Overview", subtitle: "Live metrics extracted from the markdown report.", icon: "target")
            
            // One full-width card per line so text never wraps mid-word or number
            LazyVGrid(columns: [GridItem(.flexible())], spacing: 12) {
                ForEach(sprintStatistics) { stat in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(stat.title)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                            .minimumScaleFactor(0.9)
                        Text(stat.value)
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundColor(Color(red: 0.16, green: 0.18, blue: 0.27))
                            .lineLimit(1) // keep numbers on a single line
                            .minimumScaleFactor(0.5)
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .fill(Color.white)
                    )
                    .shadow(color: Color.black.opacity(0.05), radius: 12, y: 8)
                }
            }
        }
    }
    
    private var insightsCallout: some View {
        HStack(alignment: .center, spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Insight quality review")
                    .font(.system(size: 18, weight: .bold))
                Text("Content is formatted for executive circulation with structured sections, clear callouts, and delivery-ready visuals.")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 6) {
                Label("Auto QA complete", systemImage: "checkmark.circle.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Color(red: 0.18, green: 0.5, blue: 0.34))
                Text("Last sync · \(generatedStamp)")
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
            }
        }
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(.white)
                .shadow(color: Color.black.opacity(0.06), radius: 25, y: 16)
        )
    }
    
    private var reportContentCard: some View {
        VStack(alignment: .leading, spacing: 24) {
            sectionHeader(title: "Report content", subtitle: "Markdown ingested by Arc Agent", icon: "doc.richtext")
            Divider()
                    MarkdownContentView(markdown: markdown)
        }
        .padding(32)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(Color.white)
                .shadow(color: Color.black.opacity(0.05), radius: 35, y: 18)
        )
    }
    
    private var actionFooter: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Distribution package")
                    .font(.system(size: 18, weight: .bold))
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                Text("Export as PDF or share directly with stakeholders. Markdown content can also be copied for Microsoft 365 handoffs.")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            }
            
            // Buttons: one per full-width line so labels are fully visible and centered
            VStack(spacing: 12) {
                copyButton
                exportButton
            }
        }
        .padding(26)
        .background(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(.white)
                .shadow(color: Color.black.opacity(0.05), radius: 30, y: 10)
        )
    }
    
    private func sectionHeader(title: String, subtitle: String, icon: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(Color(red: 0.32, green: 0.52, blue: 0.87))
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 20, weight: .bold))
                Text(subtitle)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            }
            Spacer()
        }
    }
    
    private var copyButton: some View {
        Button(action: copyMarkdownToClipboard) {
            HStack(spacing: 8) {
                Image(systemName: "doc.on.doc")
                Text("Copy Markdown")
            }
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(Color(red: 0.23, green: 0.29, blue: 0.62))
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.white)
                    .shadow(color: Color.black.opacity(0.04), radius: 8, y: 4)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Color(red: 0.28, green: 0.37, blue: 0.75).opacity(0.8), lineWidth: 1.2)
            )
        }
        .buttonStyle(.plain)
    }
    
    private var exportButton: some View {
        Button(action: { sharePDF() }) {
            Label("Export & Share", systemImage: "square.and.arrow.up")
                .font(.system(size: 15, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 22)
                .padding(.vertical, 14)
                .background(
                    LinearGradient(
                        colors: [
                            Color(red: 0.32, green: 0.52, blue: 0.87),
                            Color(red: 0.22, green: 0.32, blue: 0.68)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    in: RoundedRectangle(cornerRadius: 18, style: .continuous)
                )
                .foregroundStyle(.white)
                .shadow(color: Color(red: 0.22, green: 0.32, blue: 0.68).opacity(0.4), radius: 16, y: 8)
        }
        .buttonStyle(.plain)
    }
    
    private func highlightCard(icon: String, title: String, value: String, detail: String, accent: Color) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(accent)
                Spacer()
                Text(detail.uppercased())
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(accent.opacity(0.8))
            }
            Text(value)
                .font(.system(size: 32, weight: .heavy))
                .foregroundColor(Color(red: 0.16, green: 0.18, blue: 0.27))
            Text(title)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
        }
        .padding(22)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.white)
                .shadow(color: accent.opacity(0.15), radius: 20, y: 10)
        )
    }
    
    private var highlightColumns: [GridItem] {
        [
            GridItem(.adaptive(minimum: 220, maximum: 320), spacing: 16, alignment: .top)
        ]
    }
    
    @MainActor
    private func sharePDF() {
        if #available(macOS 13.0, iOS 16.0, *) {
            let url = renderPDF()
            self.pdfURL = url
            self.showShareSheet = true
        } else {
            self.pdfURL = nil
            self.showShareSheet = true
        }
    }
    
    @available(macOS 13.0, iOS 16.0, *)
    @MainActor
    private func renderPDF() -> URL {
        let printView = VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Sprint Intelligence Report")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.black)
                    Text("Generated: \(Date(), formatter: dateFormatter)")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
                Spacer()
            }
            .padding(40)
            .background(Color(white: 0.95))
            
            VStack(alignment: .leading, spacing: 16) {
                MarkdownContentView(markdown: markdown)
            }
            .padding(40)
        }
        .frame(width: 612)
        .background(Color.white)
        
        let renderer = ImageRenderer(content: printView)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("Sprint_Report.pdf")
        
        renderer.render { size, context in
            var box = CGRect(x: 0, y: 0, width: size.width, height: size.height)
            
            guard let pdf = CGContext(url as CFURL, mediaBox: &box, nil) else {
                return
            }
            
            pdf.beginPDFPage(nil)
            context(pdf)
            pdf.endPDFPage()
            pdf.closePDF()
        }
        
        return url
    }
    
    private func copyMarkdownToClipboard() {
#if os(macOS)
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(markdown, forType: .string)
#elseif os(iOS)
        UIPasteboard.general.string = markdown
#endif
    }

    private var generatedStamp: String {
        dateFormatter.string(from: Date())
    }
    
    private var wordCount: Int {
        markdown.split { $0.isWhitespace || $0.isNewline }.count
    }
    
    private var sectionCount: Int {
        let lines = markdown.split(separator: "\n")
        let headers = lines.filter { $0.trimmingCharacters(in: .whitespaces).hasPrefix("##") }
        return max(headers.count, 1)
    }
    
    private var bulletCount: Int {
        let lines = markdown.split(separator: "\n")
        return lines.filter {
            let trimmed = $0.trimmingCharacters(in: .whitespaces)
            return trimmed.hasPrefix("- ") || trimmed.hasPrefix("* ")
        }.count
    }
    
    private var estimatedReadTime: Int {
        max(1, Int(round(Double(wordCount) / 225.0)))
    }
    
    private var insightConfidenceScore: Int {
        min(99, max(70, sectionCount * 9 + bulletCount / 2))
    }
    
    private var heroMetrics: [HeroMetric] {
        [
            HeroMetric(icon: "calendar.badge.clock", label: "Generated", value: generatedStampShort),
            HeroMetric(icon: "clock.arrow.circlepath", label: "Reading time", value: "\(estimatedReadTime) min"),
            HeroMetric(icon: "chart.bar.xaxis", label: "Sections", value: "\(sectionCount)"),
            HeroMetric(icon: "checkmark.shield.fill", label: "Confidence", value: "\(insightConfidenceScore)%")
        ]
    }
    
    private func heroMetricColumns(isCompact: Bool) -> [GridItem] {
        if isCompact {
            return [
                GridItem(.flexible()),
                GridItem(.flexible())
            ]
        } else {
            return [
                GridItem(.adaptive(minimum: 180), spacing: 16)
            ]
        }
    }
    
    private var sprintStatistics: [StatEntry] {
        if let stats = stats(afterMarkers: ["## Sprint Statistics", "### Sprint Statistics", "## Quick Stats", "### Quick Stats", "Quick Stats"]) {
            return stats
        }
        return stats(afterMarkers: []) ?? []
    }
    
    private var generatedStampShort: String {
        shortDateFormatter.string(from: Date())
    }
    
    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }
    
    private var shortDateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }
    
    private func stats(afterMarkers markers: [String]) -> [StatEntry]? {
        if markers.isEmpty {
            return parseStatLines(from: markdown[...])
        }
        
        for marker in markers {
            if let range = markdown.range(of: marker, options: .caseInsensitive) {
                let remainder = markdown[range.upperBound...]
                let stats = parseStatLines(from: remainder)
                if !stats.isEmpty {
                    return stats
                }
            }
        }
        return nil
    }
    
    private func parseStatLines(from substring: Substring) -> [StatEntry] {
        var results: [StatEntry] = []
        var collecting = false
        
        for rawLine in substring.split(separator: "\n", omittingEmptySubsequences: false) {
            let trimmed = rawLine.trimmingCharacters(in: .whitespaces)
            
            if trimmed.isEmpty {
                if collecting && !results.isEmpty {
                    break
                } else {
                    continue
                }
            }
            
            guard let colonIndex = trimmed.firstIndex(of: ":") else {
                if collecting {
                    break
                } else {
                    continue
                }
            }
            
            collecting = true
            let title = trimmed[..<colonIndex].trimmingCharacters(in: .whitespacesAndNewlines)
            let value = trimmed[trimmed.index(after: colonIndex)...].trimmingCharacters(in: .whitespacesAndNewlines)
            if !title.isEmpty && !value.isEmpty {
                results.append(StatEntry(title: title, value: value))
            }
        }
        
        return results
    }
    
    private struct HeroMetric: Identifiable {
        let id = UUID()
        let icon: String
        let label: String
        let value: String
    }
    
    private struct StatEntry: Identifiable {
        let id = UUID()
        let title: String
        let value: String
    }
}

#Preview {
    ReportModalView(
        markdown: """
        # Sprint Report
        
        ## Summary
        This is a test sprint report with **bold** and *italic* text.
        
        ## Metrics
        - Total PRs: 15
        - Lines Changed: 2,500
        - Contributors: 5
        """,
        isPresented: .constant(true)
    )
}

