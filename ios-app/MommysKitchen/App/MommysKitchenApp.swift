import SwiftUI

@main
struct MommysKitchenApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var appContext = AppContext()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appContext)
                .preferredColorScheme(.light)
        }
    }
}

private struct RootView: View {
    @EnvironmentObject private var appContext: AppContext
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        AuthGateView(authManager: appContext.authManager, cartStore: appContext.cartStore)
            .task {
                await appContext.appSettingsStore.refresh()
            }
            .onChange(of: scenePhase) { _, newPhase in
                guard newPhase == .active else { return }
                Task {
                    await appContext.appSettingsStore.refresh()
                }
            }
    }
}

private struct AuthGateView: View {
    @ObservedObject var authManager: AuthManager
    @ObservedObject var cartStore: CartStore

    var body: some View {
        switch authManager.state {
        case .loading:
            KitchenTheme.background
                .ignoresSafeArea()
        case .signedOut:
            AuthView(authManager: authManager)
        case .signedIn:
            MainTabView(cartStore: cartStore)
        }
    }
}

private struct MainTabView: View {
    @EnvironmentObject private var appContext: AppContext
    @ObservedObject var cartStore: CartStore
    @State private var selectedTab: AppTab = .menu
    @State private var cartRootID = UUID()

    var body: some View {
        TabView(selection: $selectedTab) {
            MenuView(
                repository: appContext.menuRepository,
                cartStore: cartStore
            )
                .tag(AppTab.menu)
                .tabItem {
                    Label("Menu", systemImage: "fork.knife")
                }

            NavigationStack {
                CartView(cartStore: cartStore)
            }
            .id(cartRootID)
            .tag(AppTab.cart)
            .tabItem {
                Label("Cart", systemImage: "cart")
            }
            .badge(cartStore.totalItems)

            OrdersView(repository: appContext.orderRepository, cartStore: cartStore, pushManager: appContext.pushManager)
                .tag(AppTab.orders)
                .tabItem {
                    Label("Orders", systemImage: "clock.badge.checkmark")
                }

            ProfileView(authManager: appContext.authManager)
                .tag(AppTab.profile)
                .tabItem {
                    Label("Profile", systemImage: "person.crop.circle")
                }
        }
        .background(KitchenTheme.background.ignoresSafeArea())
        .onChange(of: selectedTab) { oldValue, newValue in
            guard oldValue == .cart, newValue != .cart, cartStore.lines.isEmpty else { return }
            cartRootID = UUID()
        }
    }
}

private enum AppTab: Hashable {
    case menu
    case cart
    case orders
    case profile
}
