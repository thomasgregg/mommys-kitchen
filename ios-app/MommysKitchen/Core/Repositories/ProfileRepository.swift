import Foundation

struct ProfileRepository {
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
}
