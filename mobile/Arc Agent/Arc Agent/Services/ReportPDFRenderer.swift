import CoreText
import SwiftUI
import UIKit

/// Renders a sprint report as a paginated US Letter PDF with vector text: a cover page,
/// running header and footer, page numbers, and blocks that flow across pages without clipping.
/// The layout matches `static_site/src/utils/pdfExport.js`.
enum ReportPDFRenderer {
    static let pageSize = CGSize(width: 612, height: 792)

    static func render(markdown: String, generatedAt: Date = .now) -> Data {
        let document = ReportDocument(markdown: markdown)
        let firstPass = Layout(document: document, generatedAt: generatedAt, toc: [], totalPages: 0)
        _ = firstPass.render()
        let finalPass = Layout(document: document, generatedAt: generatedAt, toc: firstPass.tocEntries, totalPages: firstPass.pageNumber)
        return finalPass.render()
    }

    static func fileName(for sprintName: String, date: Date = .now) -> String {
        let slug = ReportDocument.slug(sprintName).nonEmptyOr("sprint")
        return "sprint-report-\(slug)-\(date.formatted(.iso8601.year().month().day())).pdf"
    }
}

private extension String {
    func nonEmptyOr(_ fallback: String) -> String { isEmpty ? fallback : self }
}

private enum PDFColor {
    private static let light = UITraitCollection(userInterfaceStyle: .light)

    private static func resolve(_ color: Color) -> UIColor {
        UIColor(color).resolvedColor(with: light)
    }

    static let heading = resolve(Palette.accentText)
    static let bullet = resolve(Palette.focusRing)
    static let primary = resolve(Palette.textPrimary)
    static let body = resolve(Palette.textSecondary)
    static let muted = resolve(Palette.textTertiary)
    static let link = resolve(Palette.textLink)
    static let tile = resolve(Palette.bgSubtle)
    static let rule = resolve(Palette.borderDefault)
    static let quote = resolve(Palette.accentSubtle)
    static let heroStart = resolve(Palette.heroStart)
    static let heroEnd = resolve(Palette.heroEnd)
    static let ember = resolve(Palette.brandEmber)
}

private enum PDFFont {
    static let body = UIFont.systemFont(ofSize: 10)
    static let bodyBold = UIFont.systemFont(ofSize: 10, weight: .semibold)
    static let mono = UIFont.monospacedSystemFont(ofSize: 9, weight: .regular)
    static let h2 = UIFont.systemFont(ofSize: 15, weight: .bold)
    static let h3 = UIFont.systemFont(ofSize: 11.5, weight: .bold)
    static let table = UIFont.systemFont(ofSize: 9)
    static let tableHead = UIFont.systemFont(ofSize: 8, weight: .bold)
    static let chrome = UIFont.systemFont(ofSize: 8)
}

private final class Layout {
    struct TocEntry {
        let title: String
        let page: Int
    }

    private let page = ReportPDFRenderer.pageSize
    private let margin: CGFloat = 54
    private let contentTop: CGFloat = 78
    private var contentBottom: CGFloat { page.height - 66 }
    private var width: CGFloat { page.width - margin * 2 }

    private let document: ReportDocument
    private let generatedLabel: String
    private let knownToc: [TocEntry]
    private let totalPages: Int

    private(set) var tocEntries: [TocEntry] = []
    private(set) var pageNumber = 0
    private var y: CGFloat = 0
    private var context: UIGraphicsPDFRendererContext!

    init(document: ReportDocument, generatedAt: Date, toc: [TocEntry], totalPages: Int) {
        self.document = document
        self.generatedLabel = generatedAt.formatted(date: .long, time: .omitted)
        self.knownToc = toc
        self.totalPages = totalPages
    }

    func render() -> Data {
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = [
            kCGPDFContextTitle as String: "Sprint Intelligence Report: \(document.sprintName)",
            kCGPDFContextCreator as String: "Arc Agent",
            kCGPDFContextAuthor as String: "BSC Analytics",
        ]
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: page), format: format)
        return renderer.pdfData { context in
            self.context = context
            drawCover()
            newPage()
            for block in document.blocks { draw(block) }
        }
    }

    // MARK: - Pages

    private func newPage() {
        context.beginPage()
        pageNumber += 1
        y = contentTop
        guard pageNumber > 1 else { return }
        let header = "Sprint Intelligence Report  ·  \(document.sprintName)"
        text(header, font: PDFFont.chrome, color: PDFColor.muted, at: CGPoint(x: margin, y: 34), width: width - 140, lines: 1)
        text(generatedLabel, font: PDFFont.chrome, color: PDFColor.muted, at: CGPoint(x: margin, y: 34), width: width, alignment: .right)
        hairline(at: 50)
        hairline(at: page.height - 50)
        text("Arc Agent  ·  BSC Analytics", font: PDFFont.chrome, color: PDFColor.muted, at: CGPoint(x: margin, y: page.height - 42), width: width)
        if totalPages > 0 {
            text("Page \(pageNumber) of \(totalPages)", font: PDFFont.chrome, color: PDFColor.muted, at: CGPoint(x: margin, y: page.height - 42), width: width, alignment: .right)
        }
    }

    private func ensureSpace(_ height: CGFloat) {
        if y + height > contentBottom { newPage() }
    }

    private func drawCover() {
        newPage()
        let cg = context.cgContext
        let titleFont = UIFont.systemFont(ofSize: 28, weight: .bold)
        let titleHeight = measure(attributed(document.sprintName, font: titleFont, color: .white), width: width)
        let bandHeight = max(240, 124 + titleHeight + 90)

        let colors = [PDFColor.heroStart.cgColor, PDFColor.heroEnd.cgColor] as CFArray
        if let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 1]) {
            cg.saveGState()
            cg.addRect(CGRect(x: 0, y: 0, width: page.width, height: bandHeight))
            cg.clip()
            cg.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: page.width, y: bandHeight), options: [])
            cg.restoreGState()
        }

        PDFColor.ember.setFill()
        UIBezierPath(ovalIn: CGRect(x: margin, y: 86, width: 6, height: 6)).fill()
        let overline = NSAttributedString(string: "SPRINT INTELLIGENCE REPORT", attributes: [
            .font: UIFont.systemFont(ofSize: 9, weight: .bold), .foregroundColor: UIColor.white, .kern: 1.2,
        ])
        overline.draw(at: CGPoint(x: margin + 12, y: 83))
        y = 112
        flow(attributed(document.sprintName, font: titleFont, color: .white), x: margin, width: width)
        let subtitle = [document.period, "Generated \(generatedLabel)"].compactMap { $0 }.joined(separator: "   ·   ")
        text(subtitle, font: .systemFont(ofSize: 12), color: UIColor.white.withAlphaComponent(0.85), at: CGPoint(x: margin, y: y + 8), width: width)

        let columns = 3
        let gap: CGFloat = 12
        let tileWidth = (width - gap * CGFloat(columns - 1)) / CGFloat(columns)
        let tileHeight: CGFloat = 64
        let kpis = Array(document.kpis.prefix(6))
        for (index, kpi) in kpis.enumerated() {
            let origin = CGPoint(
                x: margin + CGFloat(index % columns) * (tileWidth + gap),
                y: bandHeight + 32 + CGFloat(index / columns) * (tileHeight + gap)
            )
            PDFColor.tile.setFill()
            UIBezierPath(roundedRect: CGRect(origin: origin, size: CGSize(width: tileWidth, height: tileHeight)), cornerRadius: 8).fill()
            NSAttributedString(string: kpi.label.uppercased(), attributes: [
                .font: UIFont.systemFont(ofSize: 7.5, weight: .bold), .foregroundColor: PDFColor.muted, .kern: 0.6,
            ]).draw(at: CGPoint(x: origin.x + 14, y: origin.y + 14))
            text(kpi.value, font: .systemFont(ofSize: 18, weight: .bold), color: PDFColor.primary, at: CGPoint(x: origin.x + 14, y: origin.y + 30), width: tileWidth - 28, lines: 1)
        }

        var tocY = bandHeight + 32 + CGFloat((kpis.count + columns - 1) / columns) * (tileHeight + gap) + 20
        if !knownToc.isEmpty {
            NSAttributedString(string: "IN THIS REPORT", attributes: [
                .font: UIFont.systemFont(ofSize: 8, weight: .bold), .foregroundColor: PDFColor.muted, .kern: 0.8,
            ]).draw(at: CGPoint(x: margin, y: tocY))
            tocY += 22
            for entry in knownToc where tocY < page.height - 90 {
                text(entry.title, font: .systemFont(ofSize: 10), color: PDFColor.primary, at: CGPoint(x: margin, y: tocY), width: width - 40)
                text("\(entry.page)", font: .systemFont(ofSize: 10), color: PDFColor.muted, at: CGPoint(x: margin, y: tocY), width: width, alignment: .right)
                hairline(at: tocY + 16, color: PDFColor.tile)
                tocY += 22
            }
        }

        PDFColor.ember.setFill()
        UIBezierPath(ovalIn: CGRect(x: margin, y: page.height - 44, width: 5, height: 5)).fill()
        let footer = NSMutableAttributedString(string: "Arc Agent", attributes: [.font: UIFont.systemFont(ofSize: 9, weight: .bold), .foregroundColor: PDFColor.primary])
        footer.append(NSAttributedString(string: "  ·  BSC Analytics", attributes: [.font: UIFont.systemFont(ofSize: 9), .foregroundColor: PDFColor.muted]))
        footer.draw(at: CGPoint(x: margin + 10, y: page.height - 47))
    }

    // MARK: - Blocks

    private func draw(_ block: ReportDocument.Block) {
        switch block {
        case let .heading(level, text, _):
            if level <= 2 {
                ensureSpace(90)
                if y > contentTop { y += 14 }
                tocEntries.append(TocEntry(title: text, page: pageNumber))
                flow(attributed(text, font: PDFFont.h2, color: PDFColor.heading), x: margin, width: width)
                y += 4
                hairline(at: y)
                y += 12
            } else {
                ensureSpace(60)
                y += 6
                flow(attributed(text, font: PDFFont.h3, color: PDFColor.primary), x: margin, width: width)
                y += 6
            }
        case let .paragraph(text):
            flow(inline(text), x: margin, width: width)
            y += 8
        case let .list(items):
            for (index, item) in items.enumerated() {
                let indent = margin + CGFloat(item.level) * 16
                ensureSpace(15)
                if let marker = item.marker {
                    text(marker, font: PDFFont.bodyBold, color: PDFColor.heading, at: CGPoint(x: indent, y: y), width: 14)
                } else {
                    (item.level == 0 ? PDFColor.bullet : PDFColor.muted).setFill()
                    UIBezierPath(ovalIn: CGRect(x: indent + 2, y: y + 5, width: 3.6, height: 3.6)).fill()
                }
                flow(inline(item.text), x: indent + 14, width: width - (indent - margin) - 14)
                y += index == items.count - 1 ? 9 : 3
            }
        case let .table(header, rows, alignments):
            drawTable(header: header, rows: rows, alignments: alignments)
        case let .quote(text):
            let body = inline(text)
            let height = measure(body, width: width - 28) + 16
            ensureSpace(height)
            PDFColor.quote.setFill()
            UIRectFill(CGRect(x: margin, y: y, width: width, height: height))
            PDFColor.bullet.setFill()
            UIRectFill(CGRect(x: margin, y: y, width: 2.5, height: height))
            y += 8
            flow(body, x: margin + 14, width: width - 28)
            y += 22
        case let .code(code):
            flow(attributed(code, font: PDFFont.mono, color: PDFColor.primary), x: margin + 10, width: width - 20)
            y += 10
        case .rule:
            ensureSpace(20)
            hairline(at: y + 8)
            y += 20
        }
    }

    private func drawTable(header: [String], rows: [[String]], alignments: [ReportDocument.Alignment]) {
        let columns = header.count
        guard columns > 0 else { return }
        let padding: CGFloat = 8
        let weights = (0..<columns).map { column in
            ([header] + rows).map { $0.indices.contains(column) ? Double(min($0[column].count, 48)) : 0 }.max() ?? 1
        }
        let total = max(weights.reduce(0, +), 1)
        let widths = weights.map { max(CGFloat($0 / total) * width, 56) }
        let scale = width / widths.reduce(0, +)
        let columnWidths = widths.map { $0 * scale }

        func cellText(_ value: String, column: Int, head: Bool) -> NSAttributedString {
            let style = NSMutableParagraphStyle()
            style.alignment = alignments.indices.contains(column) && alignments[column] == .trailing ? .right : .left
            return NSAttributedString(string: value, attributes: [
                .font: head ? PDFFont.tableHead : PDFFont.table,
                .foregroundColor: head ? PDFColor.body : PDFColor.primary,
                .paragraphStyle: style,
            ])
        }

        func rowHeight(_ row: [String], head: Bool) -> CGFloat {
            (0..<columns).map { column in
                measure(cellText(row.indices.contains(column) ? row[column] : "", column: column, head: head), width: columnWidths[column] - padding * 2)
            }.max().map { $0 + padding * 2 } ?? 0
        }

        func drawRow(_ row: [String], head: Bool) {
            let height = rowHeight(row, head: head)
            if head {
                PDFColor.tile.setFill()
                UIRectFill(CGRect(x: margin, y: y, width: width, height: height))
            }
            var x = margin
            for column in 0..<columns {
                let value = row.indices.contains(column) ? row[column] : ""
                cellText(value, column: column, head: head).draw(
                    with: CGRect(x: x + padding, y: y + padding, width: columnWidths[column] - padding * 2, height: height),
                    options: [.usesLineFragmentOrigin], context: nil
                )
                x += columnWidths[column]
            }
            y += height
            hairline(at: y)
        }

        ensureSpace(rowHeight(header, head: true) + (rows.first.map { rowHeight($0, head: false) } ?? 0))
        drawRow(header, head: true)
        for row in rows {
            if y + rowHeight(row, head: false) > contentBottom {
                newPage()
                drawRow(header, head: true)
            }
            drawRow(row, head: false)
        }
        y += 14
    }

    // MARK: - Text

    private func attributed(_ string: String, font: UIFont, color: UIColor) -> NSAttributedString {
        let style = NSMutableParagraphStyle()
        style.lineHeightMultiple = font.pointSize <= 11 ? 1.25 : 1.1
        return NSAttributedString(string: string, attributes: [.font: font, .foregroundColor: color, .paragraphStyle: style])
    }

    /// Converts inline markdown (bold, italic, code, links) into PDF text attributes.
    private func inline(_ markdown: String) -> NSAttributedString {
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        let parsed = (try? AttributedString(markdown: markdown, options: options)) ?? AttributedString(markdown)
        let result = NSMutableAttributedString(attributedString: attributed("", font: PDFFont.body, color: PDFColor.body))
        for run in parsed.runs {
            let text = String(parsed[run.range].characters)
            let intent = run.inlinePresentationIntent ?? []
            var font = intent.contains(.code) ? PDFFont.mono : PDFFont.body
            if intent.contains(.stronglyEmphasized) { font = PDFFont.bodyBold }
            if intent.contains(.emphasized), let italic = font.fontDescriptor.withSymbolicTraits(.traitItalic) {
                font = UIFont(descriptor: italic, size: font.pointSize)
            }
            var piece = attributed(text, font: font, color: intent.contains(.stronglyEmphasized) ? PDFColor.primary : PDFColor.body)
            if let link = run.link {
                let linked = NSMutableAttributedString(attributedString: piece)
                linked.addAttributes([.link: link, .foregroundColor: PDFColor.link], range: NSRange(location: 0, length: linked.length))
                piece = linked
            }
            result.append(piece)
        }
        return result
    }

    private func measure(_ string: NSAttributedString, width: CGFloat) -> CGFloat {
        let framesetter = CTFramesetterCreateWithAttributedString(string)
        let size = CTFramesetterSuggestFrameSizeWithConstraints(framesetter, CFRange(), nil, CGSize(width: width, height: .greatestFiniteMagnitude), nil)
        return ceil(size.height)
    }

    /// Draws text at the cursor, continuing on new pages until the whole string is placed.
    private func flow(_ string: NSAttributedString, x: CGFloat, width: CGFloat) {
        let framesetter = CTFramesetterCreateWithAttributedString(string)
        var location = 0
        while location < string.length {
            let available = contentBottom - y
            let path = CGPath(rect: CGRect(x: x, y: page.height - contentBottom, width: width, height: available), transform: nil)
            let frame = CTFramesetterCreateFrame(framesetter, CFRange(location: location, length: 0), path, nil)
            let visible = CTFrameGetVisibleStringRange(frame)
            guard visible.length > 0 else {
                newPage()
                continue
            }
            let cg = context.cgContext
            cg.saveGState()
            cg.textMatrix = .identity
            cg.translateBy(x: 0, y: page.height)
            cg.scaleBy(x: 1, y: -1)
            CTFrameDraw(frame, cg)
            cg.restoreGState()
            addLinks(in: frame, string: string)

            let used = CTFramesetterSuggestFrameSizeWithConstraints(framesetter, visible, nil, CGSize(width: width, height: .greatestFiniteMagnitude), nil).height
            y += ceil(used)
            location += visible.length
            if location < string.length { newPage() }
        }
    }

    private func addLinks(in frame: CTFrame, string: NSAttributedString) {
        let lines = CTFrameGetLines(frame) as! [CTLine]
        var origins = [CGPoint](repeating: .zero, count: lines.count)
        CTFrameGetLineOrigins(frame, CFRange(), &origins)
        let frameRect = CTFrameGetPath(frame).boundingBox
        for (line, origin) in zip(lines, origins) {
            for run in CTLineGetGlyphRuns(line) as! [CTRun] {
                let attributes = CTRunGetAttributes(run) as NSDictionary
                guard let url = attributes[NSAttributedString.Key.link] as? URL else { continue }
                var ascent: CGFloat = 0
                var descent: CGFloat = 0
                let runWidth = CTRunGetTypographicBounds(run, CFRange(), &ascent, &descent, nil)
                let offset = CTLineGetOffsetForStringIndex(line, CTRunGetStringRange(run).location, nil)
                let top = page.height - (frameRect.minY + origin.y + ascent)
                context.setURL(url, for: CGRect(x: frameRect.minX + origin.x + offset, y: top, width: runWidth, height: ascent + descent))
            }
        }
    }

    private func text(_ string: String, font: UIFont, color: UIColor, at point: CGPoint, width: CGFloat, alignment: NSTextAlignment = .left, lines: Int = 0) {
        let style = NSMutableParagraphStyle()
        style.alignment = alignment
        style.lineBreakMode = lines == 1 ? .byTruncatingTail : .byWordWrapping
        let attributed = NSAttributedString(string: string, attributes: [.font: font, .foregroundColor: color, .paragraphStyle: style])
        let height = lines == 1 ? font.lineHeight : measure(attributed, width: width)
        attributed.draw(with: CGRect(x: point.x, y: point.y, width: width, height: height), options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine], context: nil)
    }

    private func hairline(at lineY: CGFloat, color: UIColor = PDFColor.rule) {
        color.setFill()
        UIRectFill(CGRect(x: margin, y: lineY, width: width, height: 0.5))
    }
}
