import SwiftUI

@MainActor
final class CartStore: ObservableObject {
    @Published private(set) var lines: [CartLine] = []

    var totalItems: Int {
        lines.reduce(0) { $0 + $1.quantity }
    }

    var subtotalCents: Int {
        lines.reduce(0) { $0 + $1.lineTotalCents }
    }

    func add(menuItem: MenuItem, quantity: Int) {
        if let index = lines.firstIndex(where: { $0.menuItem.id == menuItem.id }) {
            lines[index].quantity += quantity
        } else {
            lines.append(CartLine(menuItem: menuItem, quantity: quantity))
        }
    }

    func updateQuantity(for line: CartLine, quantity: Int) {
        if quantity <= 0 {
            lines.removeAll { $0.id == line.id }
            return
        }

        guard let index = lines.firstIndex(where: { $0.id == line.id }) else { return }
        lines[index].quantity = quantity
    }

    func load(from order: Order) {
        lines = order.orderItems.compactMap { item in
            guard let menuItemID = item.menuItemId else { return nil }
            let placeholder = MenuItem(
                id: menuItemID,
                categoryId: UUID(),
                name: item.itemNameSnapshot,
                description: "Reordered from a previous purchase.",
                imageURL: nil,
                priceCents: item.unitPriceCents,
                prepMinutes: 15,
                isAvailable: true,
                isFeatured: false,
                createdAt: item.createdAt,
                updatedAt: item.createdAt
            )
            return CartLine(menuItem: placeholder, quantity: item.quantity)
        }
    }

    func clear() {
        lines.removeAll()
    }
}

@MainActor
final class CheckoutViewModel: ObservableObject {
    @Published var notes = ""
    @Published var isSubmitting = false
    @Published var errorMessage: String?
    @Published var createdOrder: Order?

    private let orderRepository: OrderRepository
    private let cartStore: CartStore
    private let checkoutSnapshot: [CartLine]

    init(orderRepository: OrderRepository, cartStore: CartStore) {
        self.orderRepository = orderRepository
        self.cartStore = cartStore
        self.checkoutSnapshot = cartStore.lines
    }

    func checkout() async {
        guard createdOrder == nil, !checkoutSnapshot.isEmpty else { return }
        isSubmitting = true
        defer { isSubmitting = false }

        do {
            errorMessage = nil
            createdOrder = try await orderRepository.createOrder(cartLines: checkoutSnapshot, notes: notes)
            cartStore.clear()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    var displayItemCount: Int {
        if let createdOrder {
            return createdOrder.orderItems.reduce(0) { $0 + $1.quantity }
        }
        return checkoutSnapshot.reduce(0) { $0 + $1.quantity }
    }

    var displaySubtotalCents: Int {
        if let createdOrder {
            return createdOrder.subtotalCents
        }
        return checkoutSnapshot.reduce(0) { $0 + $1.lineTotalCents }
    }

    var isLocked: Bool {
        createdOrder != nil
    }

    var displayLines: [CheckoutDisplayLine] {
        if let createdOrder {
            return createdOrder.orderItems.map {
                CheckoutDisplayLine(
                    name: $0.itemNameSnapshot,
                    quantity: $0.quantity,
                    lineTotalCents: $0.unitPriceCents * $0.quantity
                )
            }
        }

        return checkoutSnapshot.map {
            CheckoutDisplayLine(
                name: $0.menuItem.name,
                quantity: $0.quantity,
                lineTotalCents: $0.lineTotalCents
            )
        }
    }
}

struct CheckoutDisplayLine: Identifiable {
    let id = UUID()
    let name: String
    let quantity: Int
    let lineTotalCents: Int
}

struct CartView: View {
    @ObservedObject var cartStore: CartStore
    @EnvironmentObject private var appContext: AppContext

    var body: some View {
        Group {
            if cartStore.lines.isEmpty {
                ContentUnavailableView("Your cart is empty", systemImage: "cart", description: Text("Add a few favorites from the menu to get started."))
            } else {
                List {
                    ForEach(cartStore.lines) { line in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text(line.menuItem.name)
                                    .font(.headline)
                                Spacer()
                                Text(Formatters.currency(cents: line.lineTotalCents))
                                    .foregroundStyle(KitchenTheme.accent)
                            }
                            QuantityStepper(
                                quantity: line.quantity,
                                onDecrement: { cartStore.updateQuantity(for: line, quantity: line.quantity - 1) },
                                onIncrement: { cartStore.updateQuantity(for: line, quantity: line.quantity + 1) }
                            )
                        }
                        .listRowBackground(KitchenTheme.panel)
                    }

                    Section {
                        HStack {
                            Text("Subtotal")
                            Spacer()
                            Text(Formatters.currency(cents: cartStore.subtotalCents))
                                .fontWeight(.semibold)
                        }
                    }
                    .listRowBackground(KitchenTheme.panel)
                }
                .scrollContentBackground(.hidden)
                .background(KitchenTheme.background)
                .safeAreaPadding(.bottom, 12)
                .safeAreaInset(edge: .bottom) {
                    NavigationLink {
                        CheckoutView(orderRepository: appContext.orderRepository, cartStore: cartStore)
                    } label: {
                        Text("Continue to checkout")
                            .padding(.horizontal, 20)
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .padding(20)
                    .background(.ultraThinMaterial)
                }
            }
        }
        .navigationTitle("Cart")
        .navigationBarTitleDisplayMode(.inline)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(KitchenTheme.background.ignoresSafeArea())
    }
}

struct CheckoutView: View {
    @StateObject private var viewModel: CheckoutViewModel

    init(orderRepository: OrderRepository, cartStore: CartStore) {
        _viewModel = StateObject(wrappedValue: CheckoutViewModel(orderRepository: orderRepository, cartStore: cartStore))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 10) {
                    Text(viewModel.createdOrder == nil ? "Almost ready" : "Order sent")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(KitchenTheme.text)
                    Text(
                        viewModel.createdOrder == nil
                        ? "Double-check your notes and place the order when you're happy with it."
                        : "Your order is in the kitchen queue and we’ll keep the status updated here."
                    )
                        .foregroundStyle(KitchenTheme.muted)
                }

                VStack(alignment: .leading, spacing: 14) {
                    Text("Order summary")
                        .font(.headline)

                    ForEach(viewModel.displayLines) { line in
                        HStack(alignment: .top, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(line.name)
                                    .foregroundStyle(KitchenTheme.text)
                                Text("Qty \(line.quantity)")
                                    .font(.subheadline)
                                    .foregroundStyle(KitchenTheme.muted)
                            }
                            Spacer()
                            Text(Formatters.currency(cents: line.lineTotalCents))
                                .fontWeight(.semibold)
                                .foregroundStyle(KitchenTheme.text)
                        }
                    }

                    Divider()

                    HStack {
                        Text("Total (\(viewModel.displayItemCount) item\(viewModel.displayItemCount == 1 ? "" : "s"))")
                            .foregroundStyle(KitchenTheme.muted)
                        Spacer()
                        Text(Formatters.currency(cents: viewModel.displaySubtotalCents))
                            .fontWeight(.semibold)
                    }
                }
                .kitchenCard()

                NotesEditor(text: $viewModel.notes, isDisabled: viewModel.isLocked)

                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                        .font(.footnote)
                }

            }
            .padding(20)
            .padding(.bottom, 120)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(KitchenTheme.background.ignoresSafeArea())
        .navigationTitle("Checkout")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            Group {
                if let createdOrder = viewModel.createdOrder {
                    HStack(spacing: 12) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(KitchenTheme.accent)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Order placed")
                                .font(.headline.weight(.semibold))
                                .foregroundStyle(KitchenTheme.text)
                            Text(createdOrder.orderNumber)
                                .font(.subheadline)
                                .foregroundStyle(KitchenTheme.muted)
                        }

                        Spacer()
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 16)
                    .background(KitchenTheme.panel)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(Color.black.opacity(0.05), lineWidth: 0.5)
                    )
                } else {
                    Button {
                        Task { await viewModel.checkout() }
                    } label: {
                        if viewModel.isSubmitting {
                            ProgressView().tint(.white)
                        } else {
                            Text("Place order")
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(viewModel.isSubmitting)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .padding(.bottom, 12)
            .background(.ultraThinMaterial)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
}

private struct NotesEditor: View {
    @Binding var text: String
    let isDisabled: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Kitchen notes")
                .font(.headline)

            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.white)

                if text.isEmpty {
                    Text("Add an allergy note, pickup detail, or anything the kitchen should know.")
                        .foregroundStyle(KitchenTheme.muted)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 18)
                }

                TextEditor(text: $text)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 120)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.sentences)
                    .foregroundStyle(KitchenTheme.text)
                    .disabled(isDisabled)
                    .opacity(isDisabled ? 0.55 : 1)
            }
            .frame(minHeight: 120)
        }
        .kitchenCard()
    }
}
