import Foundation

struct ProfileRepository: Sendable {
    let supabase: SupabaseService

    func fetchCurrentProfile(userID: UUID) async throws -> Profile {
        try await supabase.client
            .from("profiles")
            .select()
            .eq("id", value: userID.uuidString)
            .single()
            .execute()
            .value
    }

    func fetchTenantName(userID: UUID) async throws -> String? {
        struct TenantLookup: Decodable {
            let tenantId: UUID?

            enum CodingKeys: String, CodingKey {
                case tenantId = "tenant_id"
            }
        }

        struct TenantRecord: Decodable {
            let name: String
        }

        let profile: TenantLookup = try await supabase.client
            .from("profiles")
            .select("tenant_id")
            .eq("id", value: userID.uuidString)
            .single()
            .execute()
            .value

        guard let tenantID = profile.tenantId else {
            return nil
        }

        let tenant: TenantRecord = try await supabase.client
            .from("tenants")
            .select("name")
            .eq("id", value: tenantID.uuidString)
            .single()
            .execute()
            .value

        return tenant.name
    }

    func fetchTenantID(userID: UUID) async throws -> UUID {
        let profile: Profile = try await supabase.client
            .from("profiles")
            .select("id, tenant_id, full_name, phone, role, created_at, updated_at")
            .eq("id", value: userID.uuidString)
            .single()
            .execute()
            .value

        if let tenantID = profile.tenantId {
            return tenantID
        }

        throw NSError(
            domain: "ProfileRepository",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "Profile tenant not found."]
        )
    }
}
