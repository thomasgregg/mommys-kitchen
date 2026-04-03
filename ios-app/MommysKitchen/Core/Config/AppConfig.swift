import Foundation

enum AppConfig {
    enum BackendMode: String, CaseIterable, Identifiable {
        case local
        case production
        case custom

        var id: String { rawValue }

        var title: String {
            switch self {
            case .local:
                return "Local"
            case .production:
                return "Production"
            case .custom:
                return "Custom"
            }
        }
    }

    struct BackendConfiguration: Identifiable, Equatable {
        let mode: BackendMode
        let title: String
        let detail: String
        let urlString: String
        let anonKey: String

        var id: BackendMode { mode }
    }

    private static let backendModeKey = "backend_mode"
    private static let customSupabaseURLKey = "custom_supabase_url"
    private static let customSupabaseAnonKeyKey = "custom_supabase_anon_key"

    private static let fallbackLocalURLString = "http://127.0.0.1:55421"
    private static let fallbackLocalAnonKey = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"

    private static let productionURLString = "https://tzzitwqfzntwpnakikfp.supabase.co"
    private static let productionAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6eml0d3Fmem50d3BuYWtpa2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODE0MzEsImV4cCI6MjA5MDU1NzQzMX0.2fVG4HojXXnkAzEpAtK5m6oJjaN-HECqGyPux3C1JBQ"

    static var localConfiguration: BackendConfiguration {
        BackendConfiguration(
            mode: .local,
            title: BackendMode.local.title,
            detail: "Use your local Supabase stack for development.",
            urlString: defaultLocalURLString,
            anonKey: defaultLocalAnonKey
        )
    }

    static var productionConfiguration: BackendConfiguration {
        BackendConfiguration(
            mode: .production,
            title: BackendMode.production.title,
            detail: "Use the hosted Supabase production project.",
            urlString: productionURLString,
            anonKey: productionAnonKey
        )
    }

    static var availablePresetConfigurations: [BackendConfiguration] {
        [localConfiguration, productionConfiguration]
    }

    static var defaultLocalURLString: String {
        if let rawValue = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
           let url = URL(string: rawValue),
           url.scheme != nil,
           url.host != nil {
            return rawValue
        }
        return fallbackLocalURLString
    }

    static var defaultLocalAnonKey: String {
        guard let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
              !key.isEmpty,
              key != "$(SUPABASE_ANON_KEY)",
              key != "YOUR_SUPABASE_ANON_KEY" else {
            return fallbackLocalAnonKey
        }
        return key
    }

    static var selectedBackendMode: BackendMode {
        if let rawValue = UserDefaults.standard.string(forKey: backendModeKey),
           let mode = BackendMode(rawValue: rawValue) {
            return mode
        }

        if UserDefaults.standard.string(forKey: customSupabaseURLKey) != nil ||
            UserDefaults.standard.string(forKey: customSupabaseAnonKeyKey) != nil {
            return .custom
        }

        return .production
    }

    static var currentBackend: BackendConfiguration {
        switch selectedBackendMode {
        case .local:
            return localConfiguration
        case .production:
            return productionConfiguration
        case .custom:
            return customConfiguration ?? localConfiguration
        }
    }

    static var currentCustomURLString: String {
        UserDefaults.standard.string(forKey: customSupabaseURLKey) ?? ""
    }

    static var currentCustomAnonKey: String {
        UserDefaults.standard.string(forKey: customSupabaseAnonKeyKey) ?? ""
    }

    static var isUsingCustomBackend: Bool {
        selectedBackendMode == .custom
    }

    static var supabaseURLString: String {
        currentBackend.urlString
    }

    static var supabaseURL: URL {
        guard let url = URL(string: supabaseURLString),
              url.scheme != nil,
              url.host != nil else {
            fatalError("SUPABASE_URL could not be resolved")
        }
        return url
    }

    static var supabaseAnonKey: String {
        currentBackend.anonKey
    }

    static var tenantSlug: String? {
        guard let slug = Bundle.main.object(forInfoDictionaryKey: "TENANT_SLUG") as? String else {
            return nil
        }

        let trimmed = slug.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed != "$(TENANT_SLUG)" else {
            return nil
        }

        return trimmed
    }

    static var tenantName: String? {
        guard let name = Bundle.main.object(forInfoDictionaryKey: "TENANT_NAME") as? String else {
            return nil
        }

        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed != "$(TENANT_NAME)" else {
            return nil
        }

        return trimmed
    }

    static func saveBackendMode(_ mode: BackendMode) {
        UserDefaults.standard.set(mode.rawValue, forKey: backendModeKey)
    }

    static func saveCustomBackend(url rawURLValue: String, anonKey rawKeyValue: String) throws {
        let normalizedURLValue = rawURLValue.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedKeyValue = rawKeyValue.trimmingCharacters(in: .whitespacesAndNewlines)

        guard let url = URL(string: normalizedURLValue),
              let scheme = url.scheme,
              let host = url.host,
              !scheme.isEmpty,
              !host.isEmpty else {
            throw AppConfigError.invalidURL
        }

        guard !normalizedKeyValue.isEmpty else {
            throw AppConfigError.missingAnonKey
        }

        UserDefaults.standard.set(normalizedURLValue, forKey: customSupabaseURLKey)
        UserDefaults.standard.set(normalizedKeyValue, forKey: customSupabaseAnonKeyKey)
        UserDefaults.standard.set(BackendMode.custom.rawValue, forKey: backendModeKey)
    }

    static func selectLocalBackend() {
        UserDefaults.standard.set(BackendMode.local.rawValue, forKey: backendModeKey)
    }

    static func selectProductionBackend() {
        UserDefaults.standard.set(BackendMode.production.rawValue, forKey: backendModeKey)
    }

    static func resetCustomBackend() {
        UserDefaults.standard.removeObject(forKey: customSupabaseURLKey)
        UserDefaults.standard.removeObject(forKey: customSupabaseAnonKeyKey)
        UserDefaults.standard.set(BackendMode.production.rawValue, forKey: backendModeKey)
    }

    private static var customConfiguration: BackendConfiguration? {
        let urlString = currentCustomURLString.trimmingCharacters(in: .whitespacesAndNewlines)
        let anonKey = currentCustomAnonKey.trimmingCharacters(in: .whitespacesAndNewlines)

        guard let url = URL(string: urlString),
              url.scheme != nil,
              url.host != nil,
              !anonKey.isEmpty else {
            return nil
        }

        return BackendConfiguration(
            mode: .custom,
            title: BackendMode.custom.title,
            detail: "Use a manually entered Supabase URL and anon key.",
            urlString: urlString,
            anonKey: anonKey
        )
    }
}

enum AppConfigError: LocalizedError {
    case invalidURL
    case missingAnonKey

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Enter a full Supabase URL such as https://your-project.supabase.co."
        case .missingAnonKey:
            return "Enter the matching Supabase anon key for that URL."
        }
    }
}
