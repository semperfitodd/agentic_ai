import SwiftUI

typealias Palette = DesignTokens.Palette
typealias Space = DesignTokens.Space

enum AppearancePreference: String, CaseIterable, Identifiable {
    case system, light, dark

    static let storageKey = "appearance"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: "System"
        case .light: "Light"
        case .dark: "Dark"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}

// Typography follows design/tokens.json, mapped onto Dynamic Type text styles.
extension Font {
    static let arcDisplay = Font.system(.largeTitle, weight: .bold)
    static let arcH1 = Font.system(.title, weight: .bold)
    static let arcH2 = Font.system(.title2, weight: .semibold)
    static let arcH3 = Font.system(.title3, weight: .semibold)
    static let arcTitle = Font.system(.headline)
    static let arcBody = Font.system(.body)
    static let arcSmall = Font.system(.subheadline)
    static let arcCaption = Font.system(.caption, weight: .medium)
    static let arcOverline = Font.system(.caption2, weight: .semibold)
    static let arcMono = Font.system(.footnote, design: .monospaced)
}

enum Tone {
    case neutral, accent, ai, success, warning, danger

    var foreground: Color {
        switch self {
        case .neutral: Palette.textSecondary
        case .accent: Palette.accentText
        case .ai: Palette.aiText
        case .success: Palette.successText
        case .warning: Palette.warningText
        case .danger: Palette.dangerText
        }
    }

    var background: Color {
        switch self {
        case .neutral: Palette.bgSubtle
        case .accent: Palette.accentSubtle
        case .ai: Palette.aiSubtle
        case .success: Palette.successSubtle
        case .warning: Palette.warningSubtle
        case .danger: Palette.dangerSubtle
        }
    }
}

struct Overline: View {
    let text: String
    var color: Color = Palette.textTertiary

    init(_ text: String, color: Color = Palette.textTertiary) {
        self.text = text
        self.color = color
    }

    var body: some View {
        Text(text.uppercased())
            .font(.arcOverline)
            .tracking(0.9)
            .foregroundStyle(color)
    }
}

struct Badge: View {
    let text: String
    var systemImage: String?
    var tone: Tone = .neutral

    var body: some View {
        HStack(spacing: Space.s1) {
            if let systemImage {
                Image(systemName: systemImage).imageScale(.small)
            }
            Text(text)
        }
        .font(.arcCaption.weight(.semibold))
        .foregroundStyle(tone.foreground)
        .padding(.horizontal, Space.s2)
        .padding(.vertical, 3)
        .background(tone.background, in: Capsule())
    }
}

struct IconTile: View {
    let systemName: String
    var tone: Tone = .accent
    var size: CGFloat = 40

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: size * 0.45, weight: .semibold))
            .foregroundStyle(tone.foreground)
            .frame(width: size, height: size)
            .background(tone.background, in: RoundedRectangle(cornerRadius: size * 0.3, style: .continuous))
            .accessibilityHidden(true)
    }
}

struct CardModifier: ViewModifier {
    var padding: CGFloat = Space.s5

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.bgSurface, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.lg, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg, style: .continuous)
                    .strokeBorder(Palette.borderSubtle, lineWidth: 1)
            )
    }
}

extension View {
    func arcCard(padding: CGFloat = Space.s5) -> some View {
        modifier(CardModifier(padding: padding))
    }

    func arcScreen() -> some View {
        scrollContentBackground(.hidden)
            .background(Palette.bgCanvas.ignoresSafeArea())
    }
}

struct ArcButtonStyle: ButtonStyle {
    enum Kind { case primary, secondary, destructive }

    var kind: Kind = .primary
    var large = false

    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(large ? .arcTitle : .arcSmall.weight(.semibold))
            .frame(maxWidth: large ? .infinity : nil, minHeight: large ? 52 : 44)
            .padding(.horizontal, large ? Space.s6 : Space.s4)
            .foregroundStyle(foreground)
            .background(background(pressed: configuration.isPressed), in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous))
            .overlay {
                if kind == .secondary {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous)
                        .strokeBorder(Palette.borderDefault, lineWidth: 1)
                }
            }
            .opacity(isEnabled ? 1 : 0.45)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .animation(.easeOut(duration: DesignTokens.Duration.fast), value: configuration.isPressed)
            .contentShape(Rectangle())
    }

    private var foreground: Color {
        switch kind {
        case .primary, .destructive: Palette.textOnSolid
        case .secondary: Palette.textPrimary
        }
    }

    private func background(pressed: Bool) -> Color {
        switch kind {
        case .primary: pressed ? Palette.accentSolidHover : Palette.accentSolid
        case .destructive: pressed ? Palette.dangerSolidHover : Palette.dangerSolid
        case .secondary: pressed ? Palette.bgSubtle : Palette.bgSurface
        }
    }
}

extension ButtonStyle where Self == ArcButtonStyle {
    static var arcPrimary: ArcButtonStyle { ArcButtonStyle(kind: .primary, large: true) }
    static var arcSecondary: ArcButtonStyle { ArcButtonStyle(kind: .secondary, large: true) }
}

extension LinearGradient {
    static let hero = LinearGradient(colors: [Palette.heroStart, Palette.heroEnd], startPoint: .topLeading, endPoint: .bottomTrailing)
}
