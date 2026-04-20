import SwiftUI

struct MarkdownContentView: View {
    let markdown: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            ForEach(parseMarkdown(), id: \.id) { element in
                renderElement(element)
            }
        }
    }
    
    private func parseMarkdown() -> [MarkdownElement] {
        var elements: [MarkdownElement] = []
        let lines = markdown.components(separatedBy: .newlines)
        var currentList: [ListItem] = []
        var currentCodeBlock: [String] = []
        var inCodeBlock = false
        var lastH2: String = ""
        var id = 0
        
        for line in lines {
            if line.hasPrefix("```") {
                if inCodeBlock {
                    if lastH2.contains("Key Metrics") || lastH2.contains("Dashboard") {
                        elements.append(MarkdownElement(id: id, type: .metricsBlock, content: currentCodeBlock))
                    } else {
                        elements.append(MarkdownElement(id: id, type: .codeBlock, content: currentCodeBlock))
                    }
                    currentCodeBlock = []
                    inCodeBlock = false
                    id += 1
                } else {
                    if !currentList.isEmpty {
                        elements.append(MarkdownElement(id: id, type: .list, content: [], listItems: currentList))
                        currentList = []
                        id += 1
                    }
                    inCodeBlock = true
                }
                continue
            }
            
            if inCodeBlock {
                currentCodeBlock.append(line)
                continue
            }
            
            if line.hasPrefix("# ") {
                if !currentList.isEmpty {
                    elements.append(MarkdownElement(id: id, type: .list, content: [], listItems: currentList))
                    currentList = []
                    id += 1
                }
                elements.append(MarkdownElement(id: id, type: .h1, content: [String(line.dropFirst(2))]))
                id += 1
            } else if line.hasPrefix("## ") {
                if !currentList.isEmpty {
                    elements.append(MarkdownElement(id: id, type: .list, content: [], listItems: currentList))
                    currentList = []
                    id += 1
                }
                lastH2 = String(line.dropFirst(3))
                elements.append(MarkdownElement(id: id, type: .h2, content: [lastH2]))
                id += 1
            } else if line.hasPrefix("### ") {
                if !currentList.isEmpty {
                    elements.append(MarkdownElement(id: id, type: .list, content: [], listItems: currentList))
                    currentList = []
                    id += 1
                }
                elements.append(MarkdownElement(id: id, type: .h3, content: [String(line.dropFirst(4))]))
                id += 1
            } else if line.hasPrefix("  - ") || line.hasPrefix("    - ") {
                currentList.append(ListItem(text: String(line.trimmingCharacters(in: .whitespaces).dropFirst(2)), level: 1))
            } else if line.hasPrefix("- ") {
                currentList.append(ListItem(text: String(line.dropFirst(2)), level: 0))
            } else if line.hasPrefix("* ") {
                currentList.append(ListItem(text: String(line.dropFirst(2)), level: 0))
            } else if !line.trimmingCharacters(in: .whitespaces).isEmpty {
                if !currentList.isEmpty {
                    elements.append(MarkdownElement(id: id, type: .list, content: [], listItems: currentList))
                    currentList = []
                    id += 1
                }
                elements.append(MarkdownElement(id: id, type: .paragraph, content: [line]))
                id += 1
            } else if line.trimmingCharacters(in: .whitespaces).isEmpty {
                if !currentList.isEmpty {
                    elements.append(MarkdownElement(id: id, type: .list, content: [], listItems: currentList))
                    currentList = []
                    id += 1
                }
            }
        }
        
        if !currentList.isEmpty {
            elements.append(MarkdownElement(id: id, type: .list, content: [], listItems: currentList))
        }
        
        return elements
    }
    
    @ViewBuilder
    private func renderElement(_ element: MarkdownElement) -> some View {
        switch element.type {
        case .h1:
            VStack(alignment: .leading, spacing: 12) {
                Text(element.content.first ?? "")
                    .font(.system(size: 38, weight: .bold))
                    .foregroundColor(Color(red: 0.1, green: 0.13, blue: 0.17))
                Rectangle()
                    .fill(Color(red: 0.89, green: 0.91, blue: 0.94))
                    .frame(height: 3)
            }
            .padding(.bottom, 16)
        case .h2:
            VStack(alignment: .leading, spacing: 0) {
                Text(element.content.first ?? "")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(Color(red: 0.1, green: 0.13, blue: 0.17))
                    .padding(.bottom, 12)
                
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color(red: 0.4, green: 0.49, blue: 0.92))
                        .frame(height: 3)
                    
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [Color(red: 0.4, green: 0.49, blue: 0.92), Color(red: 0.46, green: 0.29, blue: 0.64)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: 80, height: 3)
                }
            }
            .padding(.top, 40)
            .padding(.bottom, 20)
        case .h3:
            Text(element.content.first ?? "")
                .font(.system(size: 21, weight: .semibold))
                .foregroundColor(Color(red: 0.18, green: 0.22, blue: 0.28))
                .padding(.leading, 16)
                .overlay(
                    Rectangle()
                        .fill(Color(red: 0.4, green: 0.49, blue: 0.92))
                        .frame(width: 4),
                    alignment: .leading
                )
                .padding(.top, 32)
                .padding(.bottom, 16)
        case .paragraph:
            Text(formatInlineMarkdown(element.content.first ?? ""))
                .font(.system(size: 16))
                .foregroundColor(Color(red: 0.29, green: 0.33, blue: 0.41))
                .lineSpacing(8)
                .padding(.vertical, 4)
        case .list:
            VStack(alignment: .leading, spacing: 12) {
                ForEach(element.listItems, id: \.text) { item in
                    HStack(alignment: .top, spacing: 14) {
                        if item.level == 0 {
                            Circle()
                                .fill(Color(red: 0.4, green: 0.49, blue: 0.92))
                                .frame(width: 8, height: 8)
                                .padding(.top, 6)
                        } else {
                            Circle()
                                .stroke(Color(red: 0.62, green: 0.48, blue: 0.92), lineWidth: 2)
                                .frame(width: 6, height: 6)
                                .padding(.top, 6)
                                .padding(.leading, 16)
                        }
                        
                        // Strip leading emojis if present for cleaner look
                        Text(formatInlineMarkdown(stripLeadingEmoji(item.text)))
                            .font(.system(size: 16))
                            .foregroundColor(Color(red: 0.29, green: 0.33, blue: 0.41))
                            .lineSpacing(6)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.leading, item.level == 1 ? 20 : 0)
                }
            }
            .padding(.vertical, 12)
        case .metricsBlock:
            VStack(alignment: .leading, spacing: 0) {
                // Header removed since it's already rendered as H2 above
                
                VStack(alignment: .leading, spacing: 24) {
                    ForEach(parseMetrics(element.content), id: \.title) { section in
                        VStack(alignment: .leading, spacing: 16) {
                            Text(section.title)
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundColor(Color(red: 0.1, green: 0.13, blue: 0.17))
                            
                            // One metric card per row for predictable wrapping on all devices
                            LazyVGrid(columns: [GridItem(.flexible())], spacing: 12) {
                                ForEach(section.items, id: \.key) { item in
                                    HStack(spacing: 0) {
                                        Text(item.key)
                                            .font(.system(size: 15, weight: .medium))
                                            .foregroundColor(Color(red: 0.4, green: 0.42, blue: 0.49))
                                        Spacer()
                                        Text(item.value)
                                            .font(.system(size: 18, weight: .bold))
                                            .foregroundColor(Color(red: 0.1, green: 0.13, blue: 0.17))
                                    }
                                    .padding(20)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(Color(red: 0.97, green: 0.98, blue: 0.99))
                                            .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1)
                                    )
                                }
                            }
                        }
                        .padding(.bottom, 16)
                    }
                }
            }
            .padding(.vertical, 24)
        case .codeBlock:
            VStack(alignment: .leading, spacing: 0) {
                ForEach(element.content, id: \.self) { line in
                    Text(line)
                        .font(.system(size: 15, design: .monospaced))
                        .foregroundColor(Color(red: 0.18, green: 0.22, blue: 0.28))
                }
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                LinearGradient(
                    colors: [Color(red: 0.97, green: 0.98, blue: 0.99), Color.white],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 2)
            )
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
            .padding(.vertical, 16)
        }
    }
    
    private func formatInlineMarkdown(_ text: String) -> AttributedString {
        var attributed = AttributedString(text)
        
        let boldPattern = "\\*\\*(.+?)\\*\\*"
        
        if let regex = try? NSRegularExpression(pattern: boldPattern) {
            let matches = regex.matches(in: text, range: NSRange(text.startIndex..., in: text))
            for match in matches.reversed() {
                if let range = Range(match.range(at: 1), in: text) {
                    let content = String(text[range])
                    if let attrRange = Range(match.range, in: text) {
                        if let swiftRange = attributed.range(of: String(text[attrRange])) {
                            var boldText = AttributedString(content)
                            boldText.font = .system(size: 16, weight: .semibold)
                            boldText.foregroundColor = Color(red: 0.1, green: 0.13, blue: 0.17)
                            attributed.replaceSubrange(swiftRange, with: boldText)
                        }
                    }
                }
            }
        }
        
        return attributed
    }
}

struct ListItem {
    let text: String
    let level: Int
}

struct MetricSection {
    let title: String
    let items: [MetricItem]
}

struct MetricItem {
    let key: String
    let value: String
}

struct MarkdownElement {
    let id: Int
    let type: ElementType
    let content: [String]
    var listItems: [ListItem] = []
    
    enum ElementType {
        case h1, h2, h3, paragraph, list, codeBlock, metricsBlock
    }
}

extension Character {
    var isEmoji: Bool {
        guard let scalar = unicodeScalars.first else { return false }
        return scalar.properties.isEmoji && (scalar.value > 0x238C || unicodeScalars.count > 1)
    }
}

extension MarkdownContentView {
    func stripLeadingEmoji(_ text: String) -> String {
        var result = text.trimmingCharacters(in: .whitespaces)
        while let first = result.first, first.isEmoji {
            result = String(result.dropFirst()).trimmingCharacters(in: .whitespaces)
        }
        return result
    }
    
    func parseMetrics(_ lines: [String]) -> [MetricSection] {
        var sections: [MetricSection] = []
        var currentTitle = ""
        var currentItems: [MetricItem] = []
        
        // If no explicit sections detected, put everything in a default section
        var defaultItems: [MetricItem] = []
        
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.isEmpty || trimmed.hasPrefix("```") { continue }
            
            if trimmed.hasPrefix("---") { continue }
            
            if !trimmed.contains(":") {
                if !currentItems.isEmpty && !currentTitle.isEmpty {
                    sections.append(MetricSection(title: currentTitle, items: currentItems))
                    currentItems = []
                }
                currentTitle = trimmed
            } else {
                let parts = trimmed.components(separatedBy: ":")
                if parts.count >= 2 {
                    let key = parts[0].trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "|", with: "").replacingOccurrences(of: "├──", with: "").replacingOccurrences(of: "└──", with: "").replacingOccurrences(of: "- ", with: "")
                    let value = parts[1].trimmingCharacters(in: .whitespaces)
                    
                    if !key.isEmpty && !value.isEmpty {
                        if !currentTitle.isEmpty {
                            currentItems.append(MetricItem(key: key, value: value))
                        } else {
                            defaultItems.append(MetricItem(key: key, value: value))
                        }
                    }
                }
            }
        }
        
        if !currentItems.isEmpty && !currentTitle.isEmpty {
            sections.append(MetricSection(title: currentTitle, items: currentItems))
        }
        
        if !defaultItems.isEmpty {
            sections.insert(MetricSection(title: "Overview", items: defaultItems), at: 0)
        }
        
        return sections
    }
}

