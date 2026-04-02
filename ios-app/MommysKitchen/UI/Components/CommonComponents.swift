import SwiftUI

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(KitchenTheme.accent.opacity(configuration.isPressed ? 0.85 : 1.0))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(16)
            .background(KitchenTheme.panel)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.black.opacity(0.05), lineWidth: 0.5)
            )
    }
}

extension View {
    func kitchenCard() -> some View {
        modifier(CardModifier())
    }
}

struct QuantityStepper: View {
    let quantity: Int
    let onDecrement: () -> Void
    let onIncrement: () -> Void

    var body: some View {
        HStack(spacing: 0) {
            Button(action: onDecrement) {
                Image(systemName: "minus")
                    .font(.system(size: 14, weight: .bold))
                    .frame(width: 44, height: 36)
            }
            .buttonStyle(.plain)

            Text("\(quantity)")
                .font(.headline.weight(.semibold))
                .monospacedDigit()
                .frame(minWidth: 40)

            Button(action: onIncrement) {
                Image(systemName: "plus")
                    .font(.system(size: 14, weight: .bold))
                    .frame(width: 44, height: 36)
            }
            .buttonStyle(.plain)
        }
        .frame(height: 44)
        .background(Color.black.opacity(0.05))
        .clipShape(Capsule())
    }
}

struct OrderStatusBadge: View {
    let status: OrderStatus

    var body: some View {
        let style = style(for: status)

        Text(status.title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(style.text)
            .padding(.horizontal, 14)
            .padding(.vertical, 7)
            .background(
                Capsule()
                    .fill(style.background)
            )
            .overlay(
                Capsule()
                    .stroke(style.border, lineWidth: 1)
            )
    }

    private func style(for status: OrderStatus) -> BadgeStyle {
        switch status {
        case .placed:
            return BadgeStyle(
                text: Color(red: 146 / 255, green: 64 / 255, blue: 14 / 255),
                background: Color(red: 255 / 255, green: 251 / 255, blue: 235 / 255),
                border: Color(red: 253 / 255, green: 230 / 255, blue: 138 / 255)
            )
        case .accepted:
            return BadgeStyle(
                text: Color(red: 7 / 255, green: 89 / 255, blue: 133 / 255),
                background: Color(red: 240 / 255, green: 249 / 255, blue: 255 / 255),
                border: Color(red: 186 / 255, green: 230 / 255, blue: 253 / 255)
            )
        case .preparing:
            return BadgeStyle(
                text: Color(red: 154 / 255, green: 52 / 255, blue: 18 / 255),
                background: Color(red: 255 / 255, green: 247 / 255, blue: 237 / 255),
                border: Color(red: 254 / 255, green: 215 / 255, blue: 170 / 255)
            )
        case .ready, .completed:
            return BadgeStyle(
                text: Color(red: 6 / 255, green: 95 / 255, blue: 70 / 255),
                background: Color(red: 236 / 255, green: 253 / 255, blue: 245 / 255),
                border: Color(red: 167 / 255, green: 243 / 255, blue: 208 / 255)
            )
        case .cancelled:
            return BadgeStyle(
                text: Color(red: 159 / 255, green: 18 / 255, blue: 57 / 255),
                background: Color(red: 255 / 255, green: 241 / 255, blue: 242 / 255),
                border: Color(red: 254 / 255, green: 205 / 255, blue: 211 / 255)
            )
        case .rejected:
            return BadgeStyle(
                text: Color(red: 51 / 255, green: 65 / 255, blue: 85 / 255),
                background: Color(red: 241 / 255, green: 245 / 255, blue: 249 / 255),
                border: Color(red: 226 / 255, green: 232 / 255, blue: 240 / 255)
            )
        }
    }

    private struct BadgeStyle {
        let text: Color
        let background: Color
        let border: Color
    }
}
