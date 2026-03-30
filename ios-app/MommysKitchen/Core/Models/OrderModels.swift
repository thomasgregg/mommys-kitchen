import Foundation

enum OrderStatus: String, Codable, CaseIterable, Sendable {
    case placed
    case accepted
    case preparing
    case ready
    case completed
    case cancelled
    case rejected

    var title: String {
        switch self {
        case .placed: return "Placed"
        case .accepted: return "Accepted"
        case .preparing: return "Preparing"
        case .ready: return "Ready"
        case .completed: return "Completed"
        case .cancelled: return "Cancelled"
        case .rejected: return "Rejected"
        }
    }

    var isActive: Bool {
        switch self {
        case .placed, .accepted, .preparing, .ready:
            return true
        case .completed, .cancelled, .rejected:
            return false
        }
    }
}

struct OrderItem: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let orderId: UUID
    let menuItemId: UUID?
    let quantity: Int
    let unitPriceCents: Int
    let itemNameSnapshot: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case orderId = "order_id"
        case menuItemId = "menu_item_id"
        case quantity
        case unitPriceCents = "unit_price_cents"
        case itemNameSnapshot = "item_name_snapshot"
        case createdAt = "created_at"
    }
}

struct OrderStatusHistoryEntry: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let orderId: UUID
    let status: OrderStatus
    let changedByUserId: UUID?
    let note: String?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case orderId = "order_id"
        case status
        case changedByUserId = "changed_by_user_id"
        case note
        case createdAt = "created_at"
    }
}

struct Order: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let userId: UUID
    let orderNumber: String
    let status: OrderStatus
    let subtotalCents: Int
    let totalCents: Int
    let notes: String?
    let estimatedReadyAt: Date?
    let placedAt: Date
    let acceptedAt: Date?
    let readyAt: Date?
    let completedAt: Date?
    let cancelledAt: Date?
    let rejectedAt: Date?
    let createdAt: Date
    let updatedAt: Date
    let orderItems: [OrderItem]
    let orderStatusHistory: [OrderStatusHistoryEntry]

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case orderNumber = "order_number"
        case status
        case subtotalCents = "subtotal_cents"
        case totalCents = "total_cents"
        case notes
        case estimatedReadyAt = "estimated_ready_at"
        case placedAt = "placed_at"
        case acceptedAt = "accepted_at"
        case readyAt = "ready_at"
        case completedAt = "completed_at"
        case cancelledAt = "cancelled_at"
        case rejectedAt = "rejected_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case orderItems = "order_items"
        case orderStatusHistory = "order_status_history"
    }

    var isTrackable: Bool {
        status.isActive
    }
}

struct CreateOrderResponse: Decodable {
    let order: Order
}
