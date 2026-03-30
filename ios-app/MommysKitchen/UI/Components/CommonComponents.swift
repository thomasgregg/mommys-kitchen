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
        Text(status.title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(foregroundColor)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(backgroundColor)
            .clipShape(Capsule())
    }

    private var foregroundColor: Color {
        switch status {
        case .ready, .completed: return .green
        case .cancelled, .rejected: return .red
        default: return KitchenTheme.accent
        }
    }

    private var backgroundColor: Color {
        foregroundColor.opacity(0.12)
    }
}
