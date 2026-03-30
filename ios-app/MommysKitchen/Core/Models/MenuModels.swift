import Foundation

struct MenuCategory: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let sortOrder: Int
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case sortOrder = "sort_order"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct MenuItem: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let categoryId: UUID
    let name: String
    let description: String
    let imageURL: URL?
    let priceCents: Int
    let prepMinutes: Int
    let isAvailable: Bool
    let isFeatured: Bool
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case categoryId = "category_id"
        case name
        case description
        case imageURL = "image_url"
        case priceCents = "price_cents"
        case prepMinutes = "prep_minutes"
        case isAvailable = "is_available"
        case isFeatured = "is_featured"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct MenuSection: Identifiable, Hashable, Sendable {
    var id: UUID { category.id }
    let category: MenuCategory
    let items: [MenuItem]
}
