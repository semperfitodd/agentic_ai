import Foundation

enum ReportMarkdownSanitizer {
    private static let blockTagRegex = try! NSRegularExpression(
        pattern: "(?i)<\\s*(script|iframe|object|embed)\\b[^>]*>[\\s\\S]*?<\\s*/\\s*\\1\\s*>",
        options: []
    )
    private static let htmlTagRegex = try! NSRegularExpression(pattern: "(?i)<[^>]+>", options: [])
    private static let markdownLinkRegex = try! NSRegularExpression(
        pattern: #"\[([^\]]*)\]\(([^)]+)\)"#,
        options: []
    )

    static func preprocess(_ markdown: String) -> String {
        var text = markdown
        text = replaceMatches(in: text, regex: blockTagRegex, with: "")
        text = replaceMatches(in: text, regex: htmlTagRegex, with: "")
        return stripUnsafeMarkdownLinks(text)
    }

    static func isAllowedURL(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased() else { return false }
        return scheme == "http" || scheme == "https" || scheme == "mailto"
    }

    static func isAllowedURLString(_ urlString: String) -> Bool {
        let trimmed = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !trimmed.hasPrefix("#") else { return false }
        guard let url = URL(string: trimmed) else { return false }
        return isAllowedURL(url)
    }

    private static func stripUnsafeMarkdownLinks(_ markdown: String) -> String {
        guard let match = markdownLinkRegex.firstMatch(in: markdown, range: NSRange(markdown.startIndex..., in: markdown)) else {
            return markdown
        }
        guard let fullRange = Range(match.range, in: markdown),
              let labelRange = Range(match.range(at: 1), in: markdown),
              let urlRange = Range(match.range(at: 2), in: markdown) else {
            return markdown
        }
        let label = String(markdown[labelRange])
        let url = String(markdown[urlRange])
        let before = markdown[..<fullRange.lowerBound]
        let after = markdown[fullRange.upperBound...]
        let middle = isAllowedURLString(url) ? String(markdown[fullRange]) : label
        return String(before) + middle + stripUnsafeMarkdownLinks(String(after))
    }

    private static func replaceMatches(in text: String, regex: NSRegularExpression, with replacement: String) -> String {
        let range = NSRange(text.startIndex..., in: text)
        return regex.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: replacement)
    }
}
