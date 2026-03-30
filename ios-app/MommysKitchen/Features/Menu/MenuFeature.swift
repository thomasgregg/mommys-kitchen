import SwiftUI

@MainActor
final class MenuViewModel: ObservableObject {
    @Published private(set) var sections: [MenuSection] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let repository: MenuRepository

    init(repository: MenuRepository) {
        self.repository = repository
    }

    func loadIfNeeded() async {
        guard sections.isEmpty else { return }
        await refresh()
    }

    func refresh() async {
        isLoading = true
        defer { isLoading = false }

        do {
            errorMessage = nil
            sections = try await repository.fetchMenu()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct MenuView: View {
    @StateObject private var viewModel: MenuViewModel
    @ObservedObject private var cartStore: CartStore

    init(repository: MenuRepository, cartStore: CartStore) {
        _viewModel = StateObject(wrappedValue: MenuViewModel(repository: repository))
        self.cartStore = cartStore
    }

    var body: some View {
        NavigationStack {
            List {
                if let errorMessage = viewModel.errorMessage, viewModel.sections.isEmpty {
                    Section {
                        ContentUnavailableView("Couldn't load the menu", systemImage: "fork.knife.circle", description: Text(errorMessage))
                    }
                } else {
                    ForEach(viewModel.sections) { section in
                        Section(section.category.name) {
                            ForEach(section.items) { item in
                                NavigationLink {
                                    MenuDetailView(menuItem: item, cartStore: cartStore)
                                } label: {
                                    MenuItemRow(item: item)
                                }
                            }
                        }
                    }
                }
            }
            .overlay {
                if viewModel.isLoading && viewModel.sections.isEmpty {
                    ProgressView("Loading menu...")
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(KitchenTheme.background)
            .contentMargins(.bottom, 96, for: .scrollContent)
            .refreshable { await viewModel.refresh() }
            .navigationTitle("Menu")
            .navigationBarTitleDisplayMode(.inline)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(KitchenTheme.background.ignoresSafeArea())
        .task {
            await viewModel.loadIfNeeded()
        }
    }
}

private struct MenuItemRow: View {
    let item: MenuItem

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: item.imageURL) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color(uiColor: .tertiarySystemFill))
            }
            .frame(width: 64, height: 64)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(item.name)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    Spacer(minLength: 8)
                    Text(Formatters.currency(cents: item.priceCents))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(KitchenTheme.accent)
                }

                Text(item.description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)

                Text("Ready in about \(item.prepMinutes) min")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

struct MenuDetailView: View {
    let menuItem: MenuItem
    @ObservedObject var cartStore: CartStore
    @State private var quantity = 1

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                AsyncImage(url: menuItem.imageURL) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Rectangle()
                        .fill(Color(uiColor: .tertiarySystemFill))
                }
                .frame(maxWidth: .infinity)
                .frame(height: 240)
                .clipped()

                VStack(alignment: .leading, spacing: 12) {
                    Text(menuItem.name)
                        .font(.title2.weight(.bold))
                    Text(menuItem.description)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 20)

                VStack(alignment: .leading, spacing: 16) {
                    Text("Details")
                        .font(.headline)
                        .foregroundStyle(KitchenTheme.muted)

                    LabeledContent("Price", value: Formatters.currency(cents: menuItem.priceCents))
                    LabeledContent("Prep time", value: "\(menuItem.prepMinutes) min")
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .kitchenCard()
                .padding(.horizontal, 20)

                HStack(alignment: .center, spacing: 16) {
                    Text("Quantity")
                        .font(.headline)
                        .foregroundStyle(KitchenTheme.muted)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    QuantityStepper(
                        quantity: quantity,
                        onDecrement: { quantity = max(1, quantity - 1) },
                        onIncrement: { quantity += 1 }
                    )
                    .fixedSize()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .kitchenCard()
                .padding(.horizontal, 20)
            }
            .padding(.bottom, 184)
        }
        .background(KitchenTheme.background.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) {
            Button {
                cartStore.add(menuItem: menuItem, quantity: quantity)
            } label: {
                Text("Add \(quantity) to cart · \(Formatters.currency(cents: menuItem.priceCents * quantity))")
            }
            .buttonStyle(PrimaryButtonStyle())
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.ultraThinMaterial)
        }
        .navigationTitle(menuItem.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Visibility.visible, for: .navigationBar)
        .toolbarBackground(Color(uiColor: .systemGroupedBackground), for: .navigationBar)
        .toolbarColorScheme(.light, for: .navigationBar)
    }
}
