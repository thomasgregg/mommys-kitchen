import Foundation

struct Profile: Codable, Identifiable, Hashable, Sendable {
    enum Role: String, Codable, Sendable {
        case customer
        case admin
    }

    let id: UUID
    let fullName: String?
    let phone: String?
    let role: Role
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case phone
        case role
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
