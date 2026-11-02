import SwiftUI

struct MarkdownContentView: View {
    let blocks: [ReportDocument.Block]

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s4) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { index, block in
                view(for: block, isFirst: index == 0)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func view(for block: ReportDocument.Block, isFirst: Bool) -> some View {
        switch block {
        case let .heading(level, text, id):
            if level <= 2 {
                VStack(alignment: .leading, spacing: Space.s4) {
                    if !isFirst { Divider().overlay(Palette.borderSubtle) }
                    Text(text).font(.arcH2).foregroundStyle(Palette.textPrimary)
                }
                .padding(.top, isFirst ? 0 : Space.s6)
                .id(id)
                .accessibilityAddTraits(.isHeader)
            } else {
                Text(text)
                    .font(.arcH3)
                    .foregroundStyle(Palette.textPrimary)
                    .padding(.top, Space.s3)
                    .accessibilityAddTraits(.isHeader)
            }
        case let .paragraph(text):
            Text(Self.inline(text))
                .font(.arcBody)
                .foregroundStyle(Palette.textSecondary)
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)
        case let .list(items):
            VStack(alignment: .leading, spacing: Space.s2) {
                ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                    HStack(alignment: .firstTextBaseline, spacing: Space.s3) {
                        if let marker = item.marker {
                            Text(marker).font(.arcBody.weight(.semibold)).foregroundStyle(Palette.accentText).monospacedDigit()
                        } else {
                            Circle()
                                .fill(item.level == 0 ? Palette.accentSolid : Palette.textTertiary)
                                .frame(width: 6, height: 6)
                                .alignmentGuide(.firstTextBaseline) { $0[.bottom] + 1 }
                        }
                        Text(Self.inline(item.text))
                            .font(.arcBody)
                            .foregroundStyle(Palette.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.leading, CGFloat(item.level) * Space.s5)
                    .accessibilityElement(children: .combine)
                }
            }
        case let .table(header, rows, alignments):
            ReportTable(header: header, rows: rows, alignments: alignments)
        case let .quote(text):
            Text(Self.inline(text))
                .font(.arcBody)
                .foregroundStyle(Palette.textPrimary)
                .padding(Space.s4)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.accentSubtle, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous))
                .overlay(alignment: .leading) {
                    UnevenRoundedRectangle(topLeadingRadius: DesignTokens.Radius.md, bottomLeadingRadius: DesignTokens.Radius.md)
                        .fill(Palette.accentSolid)
                        .frame(width: 3)
                }
        case let .code(code):
            ScrollView(.horizontal) {
                Text(code)
                    .font(.arcMono)
                    .foregroundStyle(Palette.textPrimary)
                    .padding(Space.s4)
            }
            .background(Palette.bgSubtle, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous))
        case .rule:
            Divider().overlay(Palette.borderSubtle).padding(.vertical, Space.s4)
        }
    }

    static func inline(_ markdown: String) -> AttributedString {
        let sanitized = ReportMarkdownSanitizer.preprocess(markdown)
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        guard var parsed = try? AttributedString(markdown: sanitized, options: options) else {
            return AttributedString(sanitized)
        }
        for run in parsed.runs {
            if let link = run.link, !ReportMarkdownSanitizer.isAllowedURL(link) {
                parsed[run.range].link = nil
            }
        }
        return parsed
    }
}

private struct ReportTable: View {
    let header: [String]
    let rows: [[String]]
    let alignments: [ReportDocument.Alignment]

    var body: some View {
        Grid(alignment: .leading, horizontalSpacing: 0, verticalSpacing: 0) {
            GridRow {
                ForEach(header.indices, id: \.self) { column in
                    cell(header[column].uppercased(), column: column)
                        .font(.arcOverline)
                        .tracking(0.6)
                        .foregroundStyle(Palette.textTertiary)
                }
            }
            .background(Palette.bgSubtle)
            ForEach(rows.indices, id: \.self) { row in
                Divider().overlay(Palette.borderSubtle)
                GridRow {
                    ForEach(header.indices, id: \.self) { column in
                        cell(rows[row].indices.contains(column) ? rows[row][column] : "", column: column)
                            .font(.arcSmall)
                            .foregroundStyle(Palette.textPrimary)
                            .monospacedDigit()
                    }
                }
                .accessibilityElement(children: .combine)
            }
        }
        .background(Palette.bgSurface)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous).strokeBorder(Palette.borderSubtle))
    }

    private func cell(_ text: String, column: Int) -> some View {
        let trailing = alignments.indices.contains(column) && alignments[column] == .trailing
        return Text(MarkdownContentView.inline(text))
            .multilineTextAlignment(trailing ? .trailing : .leading)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: trailing ? .trailing : .leading)
            .padding(.horizontal, Space.s3)
            .padding(.vertical, Space.s2)
    }
}
