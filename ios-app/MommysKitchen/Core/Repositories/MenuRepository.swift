import Foundation

struct MenuRepository {
    let supabase: SupabaseService

    func fetchMenu() async throws -> [MenuSection] {
        async let categoriesRequest: [MenuCategory] = supabase.client
            .from("menu_categories")
            .select()
            .eq("is_active", value: true)
            .order("sort_order", ascending: true)
            .execute()
            .value

        async let itemsRequest: [MenuItem] = supabase.client
            .from("menu_items")
            .select()
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
}
