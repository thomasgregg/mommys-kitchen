import Foundation
import Supabase

final class SupabaseService: @unchecked Sendable {
    let client: SupabaseClient

    init() {
        client = SupabaseClient(
            supabaseURL: AppConfig.supabaseURL,
            supabaseKey: AppConfig.supabaseAnonKey,
            options: SupabaseClientOptions(
                auth: .init(emitLocalSessionAsInitialSession: true)
            )
        )
    }

    func authorizedFunctionRequest(path: String, body: some Encodable) async throws -> URLRequest {
        let session = try await client.auth.session
        let endpoint = AppConfig.supabaseURL
            .appending(path: "functions")
            .appending(path: "v1")
            .appending(path: path)

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        request.httpBody = try encoder.encode(body)
        return request
    }
}
