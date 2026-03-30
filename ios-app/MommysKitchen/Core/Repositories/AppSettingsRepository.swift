import Foundation

struct AppSettingsRepository {
    let supabase: SupabaseService

    func fetchGlobalSettings() async throws -> GlobalAppSettings {
        try await supabase.client
            .from("app_settings")
            .select()
            .eq("singleton_key", value: "global")
            .single()
            .execute()
            .value
    }
}
