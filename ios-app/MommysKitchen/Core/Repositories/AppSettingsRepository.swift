import Foundation

struct AppSettingsRepository: Sendable {
    private struct TenantSettingsRecord: Decodable {
        let currencyCode: String
        let languageCode: String
        let localeIdentifier: String

        enum CodingKeys: String, CodingKey {
            case currencyCode = "currency_code"
            case languageCode = "language_code"
            case localeIdentifier = "locale_identifier"
        }
    }

    let supabase: SupabaseService

    func fetchGlobalSettings() async throws -> GlobalAppSettings {
        if let tenantID = try await fetchCurrentTenantID() {
            do {
                let tenantSettings: TenantSettingsRecord = try await supabase.client
                    .from("tenant_settings")
                    .select("currency_code, language_code, locale_identifier")
                    .eq("tenant_id", value: tenantID.uuidString)
                    .single()
                    .execute()
                    .value

                return GlobalAppSettings(
                    singletonKey: "global",
                    currencyCode: tenantSettings.currencyCode,
                    languageCode: tenantSettings.languageCode,
                    localeIdentifier: tenantSettings.localeIdentifier
                )
            } catch {
                // Fall back to the legacy singleton row until every environment is migrated.
            }
        }

        return try await supabase.client
            .from("app_settings")
            .select()
            .eq("singleton_key", value: "global")
            .single()
            .execute()
            .value
    }

    private func fetchCurrentTenantID() async throws -> UUID? {
        guard let session = try? await supabase.client.auth.session else {
            return nil
        }

        return try await ProfileRepository(supabase: supabase).fetchTenantID(userID: session.user.id)
    }
}
