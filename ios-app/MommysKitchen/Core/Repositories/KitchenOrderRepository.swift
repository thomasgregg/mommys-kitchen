import Foundation
import Supabase

struct KitchenOrderRecord: Codable, Identifiable, Hashable, Sendable {
    let order: Order
    let customer: Profile?

    var id: UUID { order.id }
}

struct KitchenOrderRepository {
    private struct ErrorResponse: Decodable {
        let error: String
    }

    private struct KitchenOrdersResponse: Decodable {
        let orders: [KitchenOrderRecord]
    }

    private struct UpdateOrderStatusBody: Encodable {
        let orderId: UUID
        let newStatus: OrderStatus
        let note: String?

        enum CodingKeys: String, CodingKey {
            case orderId = "order_id"
            case newStatus = "new_status"
            case note
        }
    }

    let supabase: SupabaseService

    func fetchOrders() async throws -> [KitchenOrderRecord] {
        let response: KitchenOrdersResponse = try await invokeFunction("list-kitchen-orders")
        return response.orders
    }

    func updateOrderStatus(orderID: UUID, newStatus: OrderStatus, note: String? = nil) async throws {
        let body = UpdateOrderStatusBody(orderId: orderID, newStatus: newStatus, note: note)
        do {
            try await supabase.client.functions.invoke("update-order-status", options: .init(body: body))
        } catch let error as FunctionsError {
            throw decodeFunctionsError(error)
        } catch {
            throw error
        }
    }

    private func invokeFunction<Response: Decodable>(_ name: String) async throws -> Response {
        do {
            return try await supabase.client.functions.invoke(
                name,
                options: .init(),
                decoder: JSONDecoder.mommysKitchen
            )
        } catch let error as FunctionsError {
            throw decodeFunctionsError(error)
        } catch {
            throw error
        }
    }

    private func decodeFunctionsError(_ error: FunctionsError) -> Error {
        switch error {
        case let .httpError(_, data):
            if let decoded = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                return NSError(domain: "KitchenOrderRepository", code: 1, userInfo: [NSLocalizedDescriptionKey: decoded.error])
            }
            return NSError(
                domain: "KitchenOrderRepository",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: String(data: data, encoding: .utf8) ?? "Unexpected server response"]
            )
        case .relayError:
            return NSError(domain: "KitchenOrderRepository", code: 1, userInfo: [NSLocalizedDescriptionKey: "Edge Function relay error"])
        }
    }
}
