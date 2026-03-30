import SwiftUI

@MainActor
final class OrdersViewModel: ObservableObject {
    @Published private(set) var orders: [Order] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let repository: OrderRepository
    private var pollingTask: Task<Void, Never>?

    init(repository: OrderRepository) {
        self.repository = repository
    }

    var activeOrders: [Order] {
        orders.filter(\.isTrackable)
    }

    var historyOrders: [Order] {
        orders.filter { !$0.isTrackable }
    }

    func startPolling() {
        pollingTask?.cancel()
        pollingTask = Task {
            await refresh()
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(15))
                await refresh(silent: true)
            }
        }
    }

    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }

    func refresh(silent: Bool = false) async {
        if !silent { isLoading = true }
        defer { isLoading = false }

        do {
            errorMessage = nil
            orders = try await repository.fetchOrders()
        } catch is CancellationError {
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func cancel(_ order: Order) async -> Bool {
        do {
            errorMessage = nil
            try await repository.cancelOrder(orderID: order.id)
            await refresh(silent: true)
            return true
        } catch is CancellationError {
            errorMessage = nil
            return false
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}

struct OrdersView: View {
    @StateObject private var viewModel: OrdersViewModel
    @ObservedObject private var cartStore: CartStore
    @ObservedObject private var pushManager: PushNotificationManager
    @State private var selectedOrderID: UUID?

    init(repository: OrderRepository, cartStore: CartStore, pushManager: PushNotificationManager) {
        _viewModel = StateObject(wrappedValue: OrdersViewModel(repository: repository))
        self.cartStore = cartStore
        self.pushManager = pushManager
    }

    var body: some View {
        NavigationStack {
            List {
                if let errorMessage = viewModel.errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }

                Section(activeOrdersSectionTitle) {
                    if !activeOrders.isEmpty {
                        ForEach(activeOrders) { activeOrder in
                            NavigationLink {
                                OrderDetailView(order: activeOrder) {
                                    await viewModel.cancel(activeOrder)
                                }
                            } label: {
                                ActiveOrderCard(order: activeOrder)
                            }
                        }
                    } else if viewModel.isLoading {
                        ProgressView("Loading orders...")
                    } else {
                        ContentUnavailableView("No active orders", systemImage: "takeoutbag.and.cup.and.straw", description: Text("When you place an order, live status updates will show here."))
                    }
                }

                Section("Order history") {
                    if viewModel.historyOrders.isEmpty {
                        Text("Past orders will appear here.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(viewModel.historyOrders) { order in
                            NavigationLink {
                                OrderDetailView(order: order) {
                                    cartStore.load(from: order)
                                    return true
                                }
                            } label: {
                                HistoryOrderRow(order: order)
                            }
                        }
                    }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(KitchenTheme.background)
            .contentMargins(.bottom, 96, for: .scrollContent)
            .navigationTitle("Orders")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await viewModel.refresh() }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(KitchenTheme.background.ignoresSafeArea())
        .task {
            viewModel.startPolling()
        }
        .onDisappear {
            viewModel.stopPolling()
        }
        .onChange(of: pushManager.lastOpenedOrderID) { _, orderID in
            guard let orderID else { return }
            selectedOrderID = orderID
            Task { await viewModel.refresh(silent: true) }
        }
    }

    private var activeOrders: [Order] {
        let activeOrders = viewModel.activeOrders.sorted { $0.placedAt > $1.placedAt }
        guard let selectedOrderID else { return activeOrders }

        return activeOrders.sorted { lhs, rhs in
            if lhs.id == selectedOrderID { return true }
            if rhs.id == selectedOrderID { return false }
            return lhs.placedAt > rhs.placedAt
        }
    }

    private var activeOrdersSectionTitle: String {
        activeOrders.count == 1 ? "Active order" : "Active orders"
    }
}

private struct OrderDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let order: Order
    let primaryAction: () async -> Bool
    @State private var isShowingCancelConfirmation = false
    @State private var isPerformingPrimaryAction = false

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(order.orderNumber)
                                .font(.headline)
                            Text(Formatters.shortDateString(order.createdAt))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        OrderStatusBadge(status: order.status)
                    }

                    if !order.orderItems.isEmpty {
                        Text(order.orderItems.map(\.itemNameSnapshot).joined(separator: ", "))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    if let estimatedReadyAt = order.estimatedReadyAt {
                        Label("Estimated ready \(Formatters.shortDateString(estimatedReadyAt))", systemImage: "clock")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }

            Section("Status updates") {
                ForEach(order.orderStatusHistory.sorted(by: { $0.createdAt > $1.createdAt })) { entry in
                    OrderTimelineRow(entry: entry)
                }
            }

            Section {
                if isCancellationAction {
                    if isPerformingPrimaryAction {
                        HStack(spacing: 12) {
                            ProgressView()
                            Text("Cancelling order...")
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        Button("Cancel order", role: .destructive) {
                            isShowingCancelConfirmation = true
                        }
                    }
                } else {
                    Button("Reorder") {
                        Task {
                            isPerformingPrimaryAction = true
                            _ = await primaryAction()
                            isPerformingPrimaryAction = false
                        }
                    }
                        .foregroundStyle(KitchenTheme.accent)
                        .disabled(isPerformingPrimaryAction)
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(KitchenTheme.background)
        .navigationTitle(order.orderNumber)
        .navigationBarTitleDisplayMode(.inline)
        .alert("Cancel this order?", isPresented: $isShowingCancelConfirmation) {
            Button("Keep order", role: .cancel) {}
            Button("Cancel order", role: .destructive) {
                Task {
                    isPerformingPrimaryAction = true
                    let didSucceed = await primaryAction()
                    isPerformingPrimaryAction = false
                    if didSucceed {
                        dismiss()
                    }
                }
            }
        } message: {
            Text("The kitchen has not started this order yet. This action cannot be undone.")
        }
    }

    private var isCancellationAction: Bool {
        order.isTrackable && order.status == .placed
    }
}

private struct ActiveOrderCard: View {
    let order: Order

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(order.orderNumber)
                        .font(.headline)
                    Text("Ordered \(Formatters.relativeDate.localizedString(for: order.placedAt, relativeTo: Date()))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                OrderStatusBadge(status: order.status)
            }

            if !order.orderItems.isEmpty {
                Text(order.orderItems.map(\.itemNameSnapshot).joined(separator: ", "))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if let estimatedReadyAt = order.estimatedReadyAt {
                Label("Estimated ready \(Formatters.shortDateString(estimatedReadyAt))", systemImage: "clock")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(currentStatusTitle)
                    .font(.subheadline.weight(.semibold))
                Text(currentStatusMessage)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if !timelineEntries.isEmpty {
                Divider()

                VStack(alignment: .leading, spacing: 12) {
                    Text("Updates")
                        .font(.subheadline.weight(.semibold))

                    ForEach(timelineEntries) { entry in
                        OrderTimelineRow(entry: entry)
                    }
                }
            }
        }
        .padding(.vertical, 6)
    }

    private var sortedHistory: [OrderStatusHistoryEntry] {
        order.orderStatusHistory.sorted(by: { $0.createdAt > $1.createdAt })
    }

    private var timelineEntries: [OrderStatusHistoryEntry] {
        sortedHistory.filter { $0.status != .placed }
    }

    private var latestEntry: OrderStatusHistoryEntry? {
        sortedHistory.first
    }

    private var currentStatusTitle: String {
        switch order.status {
        case .placed:
            return "Order received"
        case .accepted:
            return "Kitchen accepted your order"
        case .preparing:
            return "The kitchen is cooking now"
        case .ready:
            return "Ready for pickup"
        case .completed:
            return "Order completed"
        case .cancelled:
            return "Order cancelled"
        case .rejected:
            return "Order rejected"
        }
    }

    private var currentStatusMessage: String {
        if let note = latestEntry?.note, !note.isEmpty {
            return note
        }

        switch order.status {
        case .placed:
            return "We've received your order and the kitchen will review it shortly."
        case .accepted:
            return "Your order is confirmed and queued for prep."
        case .preparing:
            return "Everything is underway. We'll let you know as soon as it's ready."
        case .ready:
            return "Your food is ready now."
        case .completed:
            return "This order has been marked complete."
        case .cancelled:
            return "This order was cancelled before preparation began."
        case .rejected:
            return "The kitchen couldn't accept this order."
        }
    }
}

private struct OrderTimelineRow: View {
    let entry: OrderStatusHistoryEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(entry.status.title)
                .font(.subheadline.weight(.semibold))
            Text(Formatters.shortDateString(entry.createdAt))
                .font(.caption)
                .foregroundStyle(.secondary)
            if let note = entry.note, !note.isEmpty {
                Text(note)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct HistoryOrderRow: View {
    let order: Order

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(order.orderNumber)
                        .font(.headline)
                    Text(Formatters.shortDateString(order.createdAt))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                OrderStatusBadge(status: order.status)
            }

            Text(order.orderItems.map(\.itemNameSnapshot).joined(separator: ", "))
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}
