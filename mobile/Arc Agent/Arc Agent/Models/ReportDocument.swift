import Foundation

/// A sprint report parsed from markdown into cover metadata and renderable blocks.
/// Mirrors `static_site/src/utils/reportSummary.js` so web and iOS present the same structure.
struct ReportDocument {
    struct KPI: Hashable {
        let label: String
        let value: String
    }

    struct Section: Identifiable, Hashable {
        let id: String
        let title: String
    }

    struct ListItem: Hashable {
        let level: Int
        let marker: String?
        let text: String
    }

    enum Alignment: Hashable {
        case leading, trailing, center
    }

    enum Block: Hashable {
        case heading(level: Int, text: String, id: String)
        case paragraph(String)
        case list([ListItem])
        case table(header: [String], rows: [[String]], alignments: [Alignment])
        case quote(String)
        case code(String)
        case rule
    }

    let title: String
    let sprintName: String
    let period: String?
    let kpis: [KPI]
    let sections: [Section]
    let blocks: [Block]

    init(markdown: String) {
        let lines = markdown.replacingOccurrences(of: "\r\n", with: "\n").components(separatedBy: "\n")
        let titleIndex = lines.firstIndex { $0.hasPrefix("# ") }
        let title = titleIndex.map { Self.stripInline(String(lines[$0].dropFirst(2))) } ?? "Sprint Report"

        var preamble: [String] = []
        var sections: [(title: String, lines: [String])] = []
        for (index, line) in lines.enumerated() where index != titleIndex {
            if line.hasPrefix("## ") {
                sections.append((Self.stripInline(String(line.dropFirst(3))), []))
            } else if sections.isEmpty {
                preamble.append(line)
            } else {
                sections[sections.count - 1].lines.append(line)
            }
        }

        let glanceIndex = sections.firstIndex { $0.title.caseInsensitiveCompare("At a Glance") == .orderedSame }
        let preambleFacts = preamble.map(Self.parseFact)
        let facts: [KPI]
        if let glanceIndex {
            facts = Self.tableRows(sections[glanceIndex].lines).dropFirst().compactMap { row in
                guard row.count >= 2, !row[0].isEmpty, !row[1].isEmpty else { return nil }
                return KPI(label: Self.normalizeLabel(row[0]), value: row[1])
            }
        } else {
            facts = preambleFacts.compactMap { $0 }
        }

        let isPeriod: (KPI) -> Bool = { $0.label.localizedCaseInsensitiveContains("period") }
        let isSprint: (KPI) -> Bool = { $0.label.caseInsensitiveCompare("Sprint") == .orderedSame }
        let bodySections = sections.enumerated().filter { $0.offset != glanceIndex }.map(\.element)
        let preambleBody = zip(preamble, preambleFacts).filter { $0.1 == nil }.map(\.0)

        self.title = title
        self.sprintName = facts.first(where: isSprint)?.value
            ?? title.replacingOccurrences(of: #"^(?i)sprint report:?\s*"#, with: "", options: .regularExpression).nonEmpty
            ?? title
        self.period = facts.first(where: isPeriod)?.value
        self.kpis = facts.filter { !isPeriod($0) && !isSprint($0) }
        self.sections = bodySections.map { Section(id: Self.slug($0.title), title: $0.title) }
        self.blocks = Self.parseBlocks(preambleBody + bodySections.flatMap { ["## \($0.title)"] + $0.lines })
    }

    // MARK: - Block parsing

    private static func parseBlocks(_ lines: [String]) -> [Block] {
        var blocks: [Block] = []
        var paragraph: [String] = []
        var index = 0

        func flushParagraph() {
            guard !paragraph.isEmpty else { return }
            blocks.append(.paragraph(paragraph.joined(separator: " ")))
            paragraph = []
        }

        while index < lines.count {
            let line = lines[index]
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            if trimmed.isEmpty {
                flushParagraph()
                index += 1
            } else if trimmed.hasPrefix("```") {
                flushParagraph()
                var code: [String] = []
                index += 1
                while index < lines.count, !lines[index].trimmingCharacters(in: .whitespaces).hasPrefix("```") {
                    code.append(lines[index])
                    index += 1
                }
                blocks.append(.code(code.joined(separator: "\n")))
                index += 1
            } else if let match = trimmed.firstMatch(of: /^(#{1,6})\s+(.+?)\s*#*$/) {
                flushParagraph()
                let text = stripInline(String(match.2))
                blocks.append(.heading(level: match.1.count, text: text, id: slug(text)))
                index += 1
            } else if trimmed.hasPrefix("|") {
                flushParagraph()
                var tableLines: [String] = []
                while index < lines.count, lines[index].trimmingCharacters(in: .whitespaces).hasPrefix("|") {
                    tableLines.append(lines[index])
                    index += 1
                }
                let rows = tableRows(tableLines)
                let divider = tableLines.dropFirst().first.map(splitRow) ?? []
                let alignments = divider.map { cell -> Alignment in
                    switch (cell.hasPrefix(":"), cell.hasSuffix(":")) {
                    case (true, true): .center
                    case (false, true): .trailing
                    default: .leading
                    }
                }
                if let header = rows.first {
                    blocks.append(.table(header: header, rows: Array(rows.dropFirst()), alignments: alignments))
                }
            } else if trimmed.hasPrefix(">") {
                flushParagraph()
                var quote: [String] = []
                while index < lines.count, lines[index].trimmingCharacters(in: .whitespaces).hasPrefix(">") {
                    quote.append(lines[index].trimmingCharacters(in: .whitespaces).dropFirst().trimmingCharacters(in: .whitespaces))
                    index += 1
                }
                blocks.append(.quote(quote.joined(separator: " ")))
            } else if trimmed.wholeMatch(of: /(-{3,}|\*{3,}|_{3,})/) != nil {
                flushParagraph()
                blocks.append(.rule)
                index += 1
            } else if listItem(line) != nil {
                flushParagraph()
                var items: [ListItem] = []
                while index < lines.count, let item = listItem(lines[index]) {
                    items.append(item)
                    index += 1
                }
                blocks.append(.list(items))
            } else {
                paragraph.append(trimmed)
                index += 1
            }
        }
        flushParagraph()
        return blocks
    }

    private static func listItem(_ line: String) -> ListItem? {
        guard let match = line.firstMatch(of: /^(\s*)([-*+]|\d+[.)])\s+(.*)$/) else { return nil }
        let marker = String(match.2)
        return ListItem(
            level: match.1.count / 2,
            marker: marker.first?.isNumber == true ? marker : nil,
            text: String(match.3)
        )
    }

    // MARK: - Helpers

    static func stripInline(_ text: String) -> String {
        text.replacingOccurrences(of: "**", with: "")
            .replacingOccurrences(of: "__", with: "")
            .replacingOccurrences(of: "`", with: "")
            .trimmingCharacters(in: .whitespaces)
    }

    static func slug(_ text: String) -> String {
        stripInline(text).lowercased()
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
    }

    private static func splitRow(_ line: String) -> [String] {
        var row = line.trimmingCharacters(in: .whitespaces)
        if row.hasPrefix("|") { row.removeFirst() }
        if row.hasSuffix("|") && !row.hasSuffix("\\|") { row.removeLast() }
        return row.replacingOccurrences(of: "\\|", with: "\u{0}")
            .split(separator: "|", omittingEmptySubsequences: false)
            .map { $0.replacingOccurrences(of: "\u{0}", with: "|").trimmingCharacters(in: .whitespaces) }
    }

    static func tableRows(_ lines: [String]) -> [[String]] {
        lines.filter { $0.trimmingCharacters(in: .whitespaces).hasPrefix("|") }
            .map(splitRow)
            .filter { !$0.allSatisfy { $0.wholeMatch(of: /:?-{3,}:?/) != nil } }
            .map { $0.map(stripInline) }
    }

    private static func normalizeLabel(_ label: String) -> String {
        var result = label.trimmingCharacters(in: .whitespaces)
        if result.hasSuffix(":") { result.removeLast() }
        return result.replacingOccurrences(of: #"^(?i)total\s+"#, with: "", options: .regularExpression)
    }

    private static func parseFact(_ line: String) -> KPI? {
        if let match = line.firstMatch(of: /^\s*[-*]\s+\*\*(.+?)\*\*\s*:?\s*(.+)$/) {
            return KPI(label: normalizeLabel(String(match.1)), value: String(match.2).trimmingCharacters(in: .whitespaces))
        }
        if let match = line.firstMatch(of: /^\s*\*\*(.+?):\*\*\s*(.+)$/) {
            return KPI(label: normalizeLabel(String(match.1)), value: String(match.2).trimmingCharacters(in: .whitespaces))
        }
        return nil
    }
}

private extension String {
    var nonEmpty: String? { isEmpty ? nil : self }
}
