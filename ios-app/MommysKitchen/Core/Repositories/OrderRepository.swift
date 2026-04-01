import Foundation

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
        let request = try await supabase.authorizedFunctionRequest(path: "create-order", body: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response: response, data: data)
        return try JSONDecoder.mommysKitchen.decode(CreateOrderResponse.self, from: data).order
    }

    func cancelOrder(orderID: UUID, note: String? = nil) async throws {
        let body = UpdateOrderStatusBody(orderId: orderID, newStatus: .cancelled, note: note)
        let request = try await supabase.authorizedFunctionRequest(path: "update-order-status", body: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response: response, data: data)
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
        let request = try await supabase.authorizedFunctionRequest(path: "register-device-token", body: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response: response, data: data)
    }

    private func validate(response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse,
              (200 ..< 300).contains(httpResponse.statusCode) else {
            let message: String
            if let decoded = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                message = decoded.error
            } else {
                message = String(data: data, encoding: .utf8) ?? "Unexpected server response"
            }
            throw NSError(domain: "OrderRepository", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
        }
    }
}
