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
