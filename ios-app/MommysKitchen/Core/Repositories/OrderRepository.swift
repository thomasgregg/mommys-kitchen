import Foundation
import Supabase

struct OrderRepository {
    enum PushAppTarget: String, Encodable {
        case customerIOS = "customer_ios"
        case mommyIOS = "mommy_ios"
    }

    enum PushEnvironment: String, Encodable {
        case sandbox
        case production

        static var current: PushEnvironment {
            #if DEBUG
            return .sandbox
            #else
            return .production
            #endif
        }
    }

    private struct ErrorResponse: Decodable {
        let error: String
    }

    private struct CreateOrderBody: Encodable {
        struct Item: Encodable {
            let menuItemId: UUID
            let quantity: Int
        }

        let items: [Item]
        let notes: String?
    }

    private struct UpdateOrderStatusBody: Encodable {
        let orderId: UUID
        let newStatus: OrderStatus
        let note: String?
    }

    private struct RegisterDeviceTokenBody: Encodable {
        let deviceToken: String
        let platform: String
        let appTarget: PushAppTarget
        let pushEnvironment: PushEnvironment
    }

    let supabase: SupabaseService

    func fetchOrders() async throws -> [Order] {
        try await supabase.client
            .from("orders")
            .select("*, order_items(*), order_status_history(*)")
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    func fetchOrder(id: UUID) async throws -> Order {
        try await supabase.client
            .from("orders")
            .select("*, order_items(*), order_status_history(*)")
            .eq("id", value: id.uuidString)
            .single()
            .execute()
            .value
    }

    func createOrder(cartLines: [CartLine], notes: String) async throws -> Order {
        let body = CreateOrderBody(
            items: cartLines.map { .init(menuItemId: $0.menuItem.id, quantity: $0.quantity) },
            notes: notes.isEmpty ? nil : notes
        )
        do {
            let response: CreateOrderResponse = try await invokeFunction("create-order", body: body)
            return response.order
        } catch {
            throw await decorateCheckoutError(error, functionName: "create-order")
        }
    }

    func cancelOrder(orderID: UUID, note: String? = nil) async throws {
        let body = UpdateOrderStatusBody(orderId: orderID, newStatus: .cancelled, note: note)
        try await invokeFunctionWithoutResponse("update-order-status", body: body)
    }

    func registerDeviceToken(
        token: String,
        appTarget: PushAppTarget,
        pushEnvironment: PushEnvironment
    ) async throws {
        let body = RegisterDeviceTokenBody(
            deviceToken: token,
            platform: "ios",
            appTarget: appTarget,
            pushEnvironment: pushEnvironment
        )
        try await invokeFunctionWithoutResponse("register-device-token", body: body)
    }

    private func invokeFunction<Response: Decodable>(
        _ name: String,
        body: some Encodable
    ) async throws -> Response {
        do {
            return try await supabase.client.functions.invoke(
                name,
                options: .init(body: body),
                decoder: JSONDecoder.mommysKitchen
            )
        } catch let error as FunctionsError {
            throw await decodeFunctionsError(error)
        } catch {
            throw error
        }
    }

    private func invokeFunctionWithoutResponse(
        _ name: String,
        body: some Encodable
    ) async throws {
        do {
            try await supabase.client.functions.invoke(name, options: .init(body: body))
        } catch let error as FunctionsError {
            throw await decodeFunctionsError(error)
        } catch {
            throw error
        }
    }

    private func decodeFunctionsError(_ error: FunctionsError) async -> Error {
        switch error {
        case let .httpError(statusCode, data):
            let message: String
            if let decoded = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                message = decoded.error
            } else {
                message = String(data: data, encoding: .utf8) ?? "Unexpected server response"
            }

            guard message.contains("Invalid JWT") else {
                return NSError(domain: "OrderRepository", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
            }

            return NSError(
                domain: "OrderRepository",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: await invalidJWTDiagnostics(statusCode: statusCode, message: message)]
            )
        case .relayError:
            return NSError(domain: "OrderRepository", code: 1, userInfo: [NSLocalizedDescriptionKey: "Edge Function relay error"])
        }
    }

    private func decorateCheckoutError(_ error: Error, functionName: String) async -> Error {
        let message: String
        if let functionsError = error as? FunctionsError {
            switch functionsError {
            case let .httpError(_, data):
                if let decoded = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    message = decoded.error
                } else {
                    message = String(data: data, encoding: .utf8) ?? error.localizedDescription
                }
            case .relayError:
                message = "Edge Function relay error"
            }
        } else {
            message = error.localizedDescription
        }

        let diagnostics = await checkoutDiagnostics(functionName: functionName)
        return NSError(
            domain: "OrderRepository",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "\(message) | \(diagnostics)"]
        )
    }

    private func checkoutDiagnostics(functionName: String) async -> String {
        let key = AppConfig.supabaseAnonKey
        let keyKind: String
        if key.hasPrefix("sb_publishable_") {
            keyKind = "publishable"
        } else if key.split(separator: ".").count == 3 {
            keyKind = "jwt"
        } else {
            keyKind = "unknown"
        }

        let sessionDetails: String
        if let session = try? await supabase.client.auth.session {
            let token = session.accessToken
            let prefix = String(token.prefix(18))
            let expiresAt = Date(timeIntervalSince1970: session.expiresAt).ISO8601Format()
            sessionDetails = [
                "session=present",
                "user=\(session.user.id.uuidString)",
                "token_prefix=\(prefix)…",
                "token_parts=\(token.split(separator: ".").count)",
                "expires=\(expiresAt)",
            ].joined(separator: ", ")
        } else {
            sessionDetails = "session=missing"
        }

        return [
            "fn=\(functionName)",
            "backend=\(AppConfig.currentBackend.title)",
            "url=\(AppConfig.supabaseURL.absoluteString)",
            "key_kind=\(keyKind)",
            sessionDetails,
        ].joined(separator: " | ")
    }

    private func invalidJWTDiagnostics(statusCode: Int, message: String) async -> String {
        let key = AppConfig.supabaseAnonKey
        let keyKind: String
        if key.hasPrefix("sb_publishable_") {
            keyKind = "publishable"
        } else if key.split(separator: ".").count == 3 {
            keyKind = "jwt"
        } else {
            keyKind = "unknown"
        }

        let sessionDetails: String
        if let session = try? await supabase.client.auth.session {
            let token = session.accessToken
            let prefix = String(token.prefix(18))
            sessionDetails = [
                "session_user=\(session.user.id.uuidString)",
                "token_prefix=\(prefix)…",
                "token_parts=\(token.split(separator: ".").count)",
            ].joined(separator: ", ")
        } else {
            sessionDetails = "session=missing"
        }

        return [
            message,
            "debug: status=\(statusCode)",
            "backend=\(AppConfig.currentBackend.title)",
            "url=\(AppConfig.supabaseURL.host ?? AppConfig.supabaseURLString)",
            "key_kind=\(keyKind)",
            sessionDetails,
        ].joined(separator: " | ")
    }
}
