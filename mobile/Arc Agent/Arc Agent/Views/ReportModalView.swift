import CoreTransferable
import SwiftUI
import UIKit
import UniformTypeIdentifiers

struct ReportPDF: Transferable {
    let markdown: String
    let sprintName: String

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(exportedContentType: .pdf) { report in
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(ReportPDFRenderer.fileName(for: report.sprintName))
            try ReportPDFRenderer.render(markdown: report.markdown).write(to: url, options: .atomic)
            return SentTransferredFile(url)
        }
    }
}

struct ReportModalView: View {
    let markdown: String
    private let document: ReportDocument
    private let generated = Date.now.formatted(date: .abbreviated, time: .shortened)

    init(markdown: String) {
        self.markdown = markdown
        self.document = ReportDocument(markdown: markdown)
    }

    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var copied = false

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 0) {
                        cover(document)
                        MarkdownContentView(blocks: document.blocks)
                            .frame(maxWidth: DesignTokens.Layout.readingMax)
                            .padding(.horizontal, Space.s5)
                            .padding(.vertical, Space.s8)
                            .frame(maxWidth: .infinity)
                    }
                }
                .arcScreen()
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Done") { dismiss() }
                    }
                    ToolbarItemGroup(placement: .primaryAction) {
                        if document.sections.count > 1 {
                            Menu {
                                ForEach(document.sections) { section in
                                    Button(section.title) {
                                        withAnimation { proxy.scrollTo(section.id, anchor: .top) }
                                    }
                                }
                            } label: {
                                Label("Sections", systemImage: "list.bullet")
                            }
                        }
                        Button {
                            UIPasteboard.general.string = markdown
                            copied = true
                        } label: {
                            Label(copied ? "Copied" : "Copy Markdown", systemImage: copied ? "checkmark" : "doc.on.doc")
                        }
                        ShareLink(
                            item: ReportPDF(markdown: markdown, sprintName: document.sprintName),
                            preview: SharePreview("Sprint report: \(document.sprintName)", image: Image(systemName: "doc.richtext"))
                        ) {
                            Label("Share PDF", systemImage: "square.and.arrow.up")
                        }
                    }
                }
                .navigationTitle("Sprint Report")
                .navigationBarTitleDisplayMode(.inline)
            }
        }
        .sensoryFeedback(.success, trigger: copied) { _, value in value }
        .task(id: copied) {
            guard copied else { return }
            try? await Task.sleep(for: .seconds(2))
            copied = false
        }
    }

    private func cover(_ document: ReportDocument) -> some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            HStack(spacing: Space.s2) {
                Circle().fill(Palette.brandEmber).frame(width: 7, height: 7)
                Overline("Sprint Intelligence Report", color: .white.opacity(0.8))
            }
            .accessibilityElement(children: .combine)
            Text(document.sprintName)
                .font(sizeClass == .regular ? .arcDisplay : .arcH1)
                .accessibilityAddTraits(.isHeader)
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Space.s5) { coverMeta(document) }
                VStack(alignment: .leading, spacing: Space.s1) { coverMeta(document) }
            }
            .font(.arcSmall)
            .foregroundStyle(.white.opacity(0.85))

            if !document.kpis.isEmpty {
                LazyVGrid(columns: kpiColumns, spacing: Space.s3) {
                    ForEach(document.kpis, id: \.self) { kpi in
                        VStack(alignment: .leading, spacing: Space.s1) {
                            Overline(kpi.label, color: .white.opacity(0.75))
                            Text(kpi.value)
                                .font(.system(.title2, weight: .bold))
                                .monospacedDigit()
                                .lineLimit(2)
                                .minimumScaleFactor(0.7)
                        }
                        .padding(Space.s4)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous).strokeBorder(.white.opacity(0.14)))
                        .accessibilityElement(children: .combine)
                    }
                }
                .padding(.top, Space.s3)
            }
        }
        .foregroundStyle(.white)
        .frame(maxWidth: DesignTokens.Layout.contentMax, alignment: .leading)
        .padding(.horizontal, Space.s5)
        .padding(.vertical, Space.s8)
        .frame(maxWidth: .infinity)
        .background(LinearGradient.hero)
    }

    @ViewBuilder
    private func coverMeta(_ document: ReportDocument) -> some View {
        if let period = document.period {
            Label(period, systemImage: "calendar")
        }
        Text("Generated \(generated)")
    }

    private var kpiColumns: [GridItem] {
        sizeClass == .regular
            ? [GridItem(.adaptive(minimum: 140), spacing: Space.s3)]
            : Array(repeating: GridItem(.flexible(), spacing: Space.s3), count: 2)
    }
}

#Preview {
    ReportModalView(markdown: """
    # Sprint Report: Sprint 42

    ## At a Glance

    | Metric | Value |
    | --- | --- |
    | Sprint period | 10/1/2026 – 10/14/2026 |
    | PRs merged | 18 |

    ## Executive Summary

    The team shipped **billing**.
    """)
}
