import Foundation

struct MenuRepository: Sendable {
    let supabase: SupabaseService

    func fetchMenu() async throws -> [MenuSection] {
        let tenantID = try await fetchCurrentTenantID()
        let client = supabase.client

        async let categoriesRequest: [MenuCategory] = client
            .from("menu_categories")
            .select()
            .eq("tenant_id", value: tenantID.uuidString)
            .eq("is_active", value: true)
            .order("sort_order", ascending: true)
            .execute()
            .value

        async let itemsRequest: [MenuItem] = client
            .from("menu_items")
            .select()
            .eq("tenant_id", value: tenantID.uuidString)
            .eq("is_available", value: true)
            .order("name", ascending: true)
            .execute()
            .value

        let (categories, items) = try await (categoriesRequest, itemsRequest)

        return categories.map { category in
            MenuSection(
                category: category,
                items: items.filter { $0.categoryId == category.id }
            )
        }
        .filter { !$0.items.isEmpty }
    }

    private func fetchCurrentTenantID() async throws -> UUID {
        let session = try await supabase.client.auth.session
        return try await ProfileRepository(supabase: supabase).fetchTenantID(userID: session.user.id)
    }
}
