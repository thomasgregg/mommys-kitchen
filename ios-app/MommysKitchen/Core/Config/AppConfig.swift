import Foundation

enum AppConfig {
    private static let customSupabaseURLKey = "custom_supabase_url"
    private static let fallbackSupabaseURLString = "http://127.0.0.1:55421"
    private static let fallbackSupabaseAnonKey = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"

    static var defaultSupabaseURLString: String {
        if let rawValue = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
           let url = URL(string: rawValue),
           url.scheme != nil,
           url.host != nil {
            return rawValue
        }
        return fallbackSupabaseURLString
    }

    static var supabaseURLString: String {
        if let customValue = UserDefaults.standard.string(forKey: customSupabaseURLKey),
           let url = URL(string: customValue),
           url.scheme != nil,
           url.host != nil {
            return customValue
        }
        return defaultSupabaseURLString
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
        guard let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
              !key.isEmpty,
              key != "$(SUPABASE_ANON_KEY)",
              key != "YOUR_SUPABASE_ANON_KEY" else {
            return fallbackSupabaseAnonKey
        }
        return key
    }

    static var isUsingCustomSupabaseURL: Bool {
        UserDefaults.standard.string(forKey: customSupabaseURLKey) != nil
    }

    static func saveSupabaseURL(_ rawValue: String) throws {
        let normalizedValue = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: normalizedValue),
              let scheme = url.scheme,
              let host = url.host,
              !scheme.isEmpty,
              !host.isEmpty else {
            throw AppConfigError.invalidURL
        }

        if normalizedValue == defaultSupabaseURLString {
            UserDefaults.standard.removeObject(forKey: customSupabaseURLKey)
        } else {
            UserDefaults.standard.set(normalizedValue, forKey: customSupabaseURLKey)
        }
    }

    static func resetSupabaseURL() {
        UserDefaults.standard.removeObject(forKey: customSupabaseURLKey)
    }
}

enum AppConfigError: LocalizedError {
    case invalidURL

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Enter a full server URL such as http://127.0.0.1:55421."
        }
    }
}
