import SwiftUI

@MainActor
final class KitchenOrdersStore: ObservableObject {
    @Published private(set) var orders: [KitchenOrderRecord] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let repository: KitchenOrderRepository
    private var pollingTask: Task<Void, Never>?

    init(repository: KitchenOrderRepository) {
        self.repository = repository
    }

    var activeOrders: [KitchenOrderRecord] {
        orders.filter { $0.order.status.isActive }
    }

    var historyOrders: [KitchenOrderRecord] {
        orders.filter { !$0.order.status.isActive }
    }

    var placedOrders: [KitchenOrderRecord] {
        activeOrders.filter { $0.order.status == .placed }
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

    func transition(orderID: UUID, to status: OrderStatus, note: String? = nil) async -> Bool {
        do {
            errorMessage = nil
            try await repository.updateOrderStatus(orderID: orderID, newStatus: status, note: note)
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

    func order(for orderID: UUID) -> KitchenOrderRecord? {
        orders.first(where: { $0.id == orderID })
    }
}

struct ChefOrdersView: View {
    @ObservedObject var ordersStore: KitchenOrdersStore
    @ObservedObject var pushManager: PushNotificationManager
    @State private var navigationPath: [UUID] = []

    var body: some View {
        NavigationStack(path: $navigationPath) {
            List {
                if let errorMessage = ordersStore.errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }

                if ordersStore.activeOrders.isEmpty {
                    Section {
                        if ordersStore.isLoading {
                            ProgressView("Loading kitchen queue...")
                        } else {
                            ContentUnavailableView("No active orders", systemImage: "fork.knife.circle", description: Text("New family orders will show up here as soon as they’re placed."))
                        }
                    }
                } else {
                    ChefQueueSection(title: "New orders", orders: queueOrders(for: .placed), navigationPath: $navigationPath)
                    ChefQueueSection(title: "Accepted", orders: queueOrders(for: .accepted), navigationPath: $navigationPath)
                    ChefQueueSection(title: "Preparing", orders: queueOrders(for: .preparing), navigationPath: $navigationPath)
                    ChefQueueSection(title: "Ready for delivery", orders: queueOrders(for: .ready), navigationPath: $navigationPath)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(KitchenTheme.background)
            .contentMargins(.bottom, 96, for: .scrollContent)
            .navigationTitle("Orders")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await ordersStore.refresh() }
            .navigationDestination(for: UUID.self) { orderID in
                ChefOrderDetailView(orderID: orderID, ordersStore: ordersStore)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(KitchenTheme.background.ignoresSafeArea())
        .task {
            await consumePendingNotificationOpen()
        }
        .onChange(of: pushManager.lastOpenedOrderID) { _, orderID in
            guard let orderID else { return }
            Task {
                await consumePendingNotificationOpen(orderID: orderID)
            }
        }
    }

    private func queueOrders(for status: OrderStatus) -> [KitchenOrderRecord] {
        ordersStore.activeOrders
            .filter { $0.order.status == status }
            .sorted { $0.order.placedAt < $1.order.placedAt }
    }

    private func consumePendingNotificationOpen(orderID: UUID? = nil) async {
        guard let orderID = orderID ?? pushManager.lastOpenedOrderID else { return }
        await ordersStore.refresh(silent: true)
        if ordersStore.order(for: orderID) != nil {
            navigationPath = [orderID]
        }
        pushManager.lastOpenedOrderID = nil
    }
}

struct ChefHistoryView: View {
    @ObservedObject var ordersStore: KitchenOrdersStore
    @State private var navigationPath: [UUID] = []

    var body: some View {
        NavigationStack(path: $navigationPath) {
            List {
                if ordersStore.historyOrders.isEmpty {
                    Section {
                        ContentUnavailableView("No past orders", systemImage: "clock.arrow.circlepath", description: Text("Completed, cancelled, and declined orders will gather here."))
                    }
                } else {
                    Section("Order history") {
                        ForEach(ordersStore.historyOrders.sorted(by: { $0.order.createdAt > $1.order.createdAt })) { record in
                            NavigationLink(value: record.id) {
                                ChefHistoryRow(record: record)
                            }
                        }
                    }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(KitchenTheme.background)
            .contentMargins(.bottom, 96, for: .scrollContent)
            .navigationTitle("History")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await ordersStore.refresh() }
            .navigationDestination(for: UUID.self) { orderID in
                ChefOrderDetailView(orderID: orderID, ordersStore: ordersStore)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(KitchenTheme.background.ignoresSafeArea())
    }
}

private struct ChefQueueSection: View {
    let title: String
    let orders: [KitchenOrderRecord]
    @Binding var navigationPath: [UUID]

    var body: some View {
        if !orders.isEmpty {
            Section(title) {
                ForEach(orders) { record in
                    Button {
                        navigationPath = [record.id]
                    } label: {
                        ChefQueueCard(record: record)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

private struct ChefQueueCard: View {
    let record: KitchenOrderRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(record.order.orderNumber)
                        .font(.headline)
                        .foregroundStyle(KitchenTheme.text)
                    Text(record.customer?.fullName ?? "Family order")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(KitchenTheme.muted)
                    Text("Placed \(Formatters.relativeDate.localizedString(for: record.order.placedAt, relativeTo: Date()))")
                        .font(.caption)
                        .foregroundStyle(KitchenTheme.muted)
                }
                Spacer()
                ChefOrderStatusBadge(status: record.order.status)
            }

            Text(record.order.orderItems.map { "\($0.quantity)x \($0.itemNameSnapshot)" }.joined(separator: ", "))
                .font(.subheadline)
                .foregroundStyle(KitchenTheme.text)

            if let notes = record.order.notes, !notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text(notes)
                    .font(.footnote)
                    .foregroundStyle(KitchenTheme.muted)
                    .lineLimit(2)
            }
        }
        .kitchenCard()
    }
}

private struct ChefHistoryRow: View {
    let record: KitchenOrderRecord

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 6) {
                Text(record.order.orderNumber)
                    .font(.headline)
                Text(record.customer?.fullName ?? "Family order")
                    .font(.subheadline)
                    .foregroundStyle(KitchenTheme.muted)
                Text(Formatters.shortDateString(record.order.updatedAt))
                    .font(.caption)
                    .foregroundStyle(KitchenTheme.muted)
            }
            Spacer()
            ChefOrderStatusBadge(status: record.order.status)
        }
        .padding(.vertical, 4)
    }
}

private struct ChefOrderDetailView: View {
    let orderID: UUID
    @ObservedObject var ordersStore: KitchenOrdersStore
    @State private var showingDestructiveConfirmation = false
    @State private var destructiveAction: KitchenOrderAction?
    @State private var isPerformingAction = false

    private var record: KitchenOrderRecord? {
        ordersStore.order(for: orderID)
    }

    var body: some View {
        Group {
            if let record {
                List {
                    Section {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(record.order.orderNumber)
                                        .font(.headline)
                                    Text(record.customer?.fullName ?? "Family order")
                                        .font(.subheadline)
                                        .foregroundStyle(KitchenTheme.muted)
                                    Text("Placed \(Formatters.shortDateString(record.order.placedAt))")
                                        .font(.caption)
                                        .foregroundStyle(KitchenTheme.muted)
                                }
                                Spacer()
                                ChefOrderStatusBadge(status: record.order.status)
                            }

                            if let phone = record.customer?.phone, !phone.isEmpty {
                                LabeledContent("Phone", value: phone)
                                    .font(.subheadline)
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    Section("Items") {
                        ForEach(record.order.orderItems) { item in
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(item.itemNameSnapshot)
                                        .font(.body.weight(.medium))
                                    Text("Qty \(item.quantity)")
                                        .font(.subheadline)
                                        .foregroundStyle(KitchenTheme.muted)
                                }
                                Spacer()
                                Text(Formatters.currency(cents: item.quantity * item.unitPriceCents))
                                    .fontWeight(.semibold)
                            }
                            .padding(.vertical, 2)
                        }

                        HStack {
                            Text("Total")
                            Spacer()
                            Text(Formatters.currency(cents: record.order.totalCents))
                                .fontWeight(.semibold)
                        }
                    }

                    if let notes = record.order.notes, !notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        Section("Kitchen note") {
                            Text(notes)
                        }
                    }

                    Section("Timeline") {
                        ForEach(record.order.orderStatusHistory.sorted(by: { $0.createdAt > $1.createdAt })) { entry in
                            ChefTimelineRow(entry: entry)
                        }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(KitchenTheme.background)
                .navigationTitle(record.order.orderNumber)
                .navigationBarTitleDisplayMode(.inline)
                .safeAreaInset(edge: .bottom) {
                    if let actions = actionSet(for: record.order.status) {
                        VStack(spacing: 12) {
                            Button {
                                Task {
                                    await perform(action: actions.primary)
                                }
                            } label: {
                                if isPerformingAction {
                                    ProgressView().tint(.white)
                                } else {
                                    Text(actions.primary.label)
                                }
                            }
                            .buttonStyle(PrimaryButtonStyle())
                            .disabled(isPerformingAction)

                            if let secondary = actions.secondary {
                                Button(secondary.label, role: .destructive) {
                                    destructiveAction = secondary
                                    showingDestructiveConfirmation = true
                                }
                                .disabled(isPerformingAction)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(.ultraThinMaterial)
                    }
                }
                .alert(destructiveAction?.confirmationTitle ?? "Confirm action", isPresented: $showingDestructiveConfirmation) {
                    Button("Keep order", role: .cancel) {}
                    Button(destructiveAction?.label ?? "Continue", role: .destructive) {
                        if let destructiveAction {
                            Task {
                                await perform(action: destructiveAction)
                            }
                        }
                    }
                } message: {
                    Text(destructiveAction?.confirmationMessage ?? "")
                }
            } else {
                ProgressView("Loading order...")
                    .task {
                        await ordersStore.refresh(silent: true)
                    }
            }
        }
        .background(KitchenTheme.background.ignoresSafeArea())
    }

    private func perform(action: KitchenOrderAction) async {
        isPerformingAction = true
        _ = await ordersStore.transition(orderID: orderID, to: action.status)
        isPerformingAction = false
    }
}

private struct ChefTimelineRow: View {
    let entry: OrderStatusHistoryEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(entry.status.title)
                    .font(.body.weight(.semibold))
                Spacer()
                Text(Formatters.shortDateString(entry.createdAt))
                    .font(.caption)
                    .foregroundStyle(KitchenTheme.muted)
            }
            if let note = entry.note, !note.isEmpty {
                Text(note)
                    .font(.subheadline)
                    .foregroundStyle(KitchenTheme.muted)
            }
        }
        .padding(.vertical, 2)
    }
}

private struct ChefOrderStatusBadge: View {
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

private struct KitchenOrderActionSet {
    let primary: KitchenOrderAction
    let secondary: KitchenOrderAction?
}

private struct KitchenOrderAction {
    let status: OrderStatus
    let label: String
    let confirmationTitle: String
    let confirmationMessage: String
}

private func actionSet(for status: OrderStatus) -> KitchenOrderActionSet? {
    switch status {
    case .placed:
        return KitchenOrderActionSet(
            primary: KitchenOrderAction(status: .accepted, label: "Accept", confirmationTitle: "Accept order?", confirmationMessage: "This moves the order into the kitchen queue."),
            secondary: KitchenOrderAction(status: .rejected, label: "Decline", confirmationTitle: "Decline this order?", confirmationMessage: "Use this if the family kitchen will not take this order.")
        )
    case .accepted:
        return KitchenOrderActionSet(
            primary: KitchenOrderAction(status: .preparing, label: "Start preparing", confirmationTitle: "Start preparing?", confirmationMessage: "This marks the order as actively in progress."),
            secondary: KitchenOrderAction(status: .cancelled, label: "Cancel order", confirmationTitle: "Cancel this order?", confirmationMessage: "Use this if the order was accepted but can no longer be completed.")
        )
    case .preparing:
        return KitchenOrderActionSet(
            primary: KitchenOrderAction(status: .ready, label: "Mark ready", confirmationTitle: "Mark order ready?", confirmationMessage: "This notifies the customer that the order is ready."),
            secondary: KitchenOrderAction(status: .cancelled, label: "Cancel order", confirmationTitle: "Cancel this order?", confirmationMessage: "Use this only if the order can no longer be completed.")
        )
    case .ready:
        return KitchenOrderActionSet(
            primary: KitchenOrderAction(status: .completed, label: "Complete", confirmationTitle: "Complete this order?", confirmationMessage: "This moves the order into history."),
            secondary: nil
        )
    case .completed, .cancelled, .rejected:
        return nil
    }
}
