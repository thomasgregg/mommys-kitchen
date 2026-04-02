import SwiftUI

@main
struct MommysKitchenChefApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var appContext = ChefAppContext()

    var body: some Scene {
        WindowGroup {
            ChefRootView()
                .environmentObject(appContext)
                .preferredColorScheme(.light)
        }
    }
}

private struct ChefRootView: View {
    @EnvironmentObject private var appContext: ChefAppContext
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ChefAuthGateView(authManager: appContext.authManager, ordersStore: appContext.kitchenOrdersStore)
            .task {
                await appContext.appSettingsStore.refresh()
            }
            .onChange(of: scenePhase) { _, newPhase in
                guard newPhase == .active else { return }
                Task {
                    await appContext.appSettingsStore.refresh()
                    await appContext.kitchenOrdersStore.refresh(silent: true)
                }
            }
    }
}

private struct ChefAuthGateView: View {
    @ObservedObject var authManager: AuthManager
    @ObservedObject var ordersStore: KitchenOrdersStore

    var body: some View {
        switch authManager.state {
        case .loading:
            KitchenTheme.background
                .ignoresSafeArea()
        case .signedOut:
            ChefAuthView(authManager: authManager)
        case .signedIn:
            ChefMainTabView(ordersStore: ordersStore)
        }
    }
}

private struct ChefMainTabView: View {
    @EnvironmentObject private var appContext: ChefAppContext
    @ObservedObject var ordersStore: KitchenOrdersStore
    @ObservedObject private var pushManager = PushNotificationManager.shared
    @State private var selectedTab: ChefTab = .orders

    var body: some View {
        TabView(selection: $selectedTab) {
            ChefOrdersView(ordersStore: ordersStore, pushManager: appContext.pushManager)
                .tag(ChefTab.orders)
                .tabItem {
                    Label("Orders", systemImage: "fork.knife.circle")
                }
                .badge(ordersStore.placedOrders.count)

            ChefHistoryView(ordersStore: ordersStore)
                .tag(ChefTab.history)
                .tabItem {
                    Label("History", systemImage: "clock.arrow.circlepath")
                }

            ChefProfileView(authManager: appContext.authManager)
                .tag(ChefTab.profile)
                .tabItem {
                    Label("Profile", systemImage: "person.crop.circle")
                }
        }
        .background(KitchenTheme.background.ignoresSafeArea())
        .task {
            ordersStore.startPolling()
        }
        .onDisappear {
            ordersStore.stopPolling()
        }
        .onAppear {
            guard pushManager.lastOpenedOrderID != nil else { return }
            selectedTab = .orders
        }
        .onChange(of: pushManager.lastOpenedOrderID) { _, orderID in
            guard orderID != nil else { return }
            selectedTab = .orders
        }
    }
}

private enum ChefTab: Hashable {
    case orders
    case history
    case profile
}
