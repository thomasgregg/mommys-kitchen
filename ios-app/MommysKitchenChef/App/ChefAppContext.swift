import Foundation

@MainActor
final class ChefAppContext: ObservableObject {
    @Published private(set) var supabase: SupabaseService
    @Published private(set) var profileRepository: ProfileRepository
    @Published private(set) var appSettingsRepository: AppSettingsRepository
    @Published private(set) var appSettingsStore: AppSettingsStore
    @Published private(set) var orderRepository: OrderRepository
    @Published private(set) var kitchenOrderRepository: KitchenOrderRepository
    @Published private(set) var kitchenOrdersStore: KitchenOrdersStore
    @Published private(set) var authManager: AuthManager

    let pushManager = PushNotificationManager.shared

    init() {
        let supabase = SupabaseService()
        let profileRepository = ProfileRepository(supabase: supabase)
        let appSettingsRepository = AppSettingsRepository(supabase: supabase)
        let appSettingsStore = AppSettingsStore(repository: appSettingsRepository)
        let orderRepository = OrderRepository(supabase: supabase)
        let kitchenOrderRepository = KitchenOrderRepository(supabase: supabase)
        let kitchenOrdersStore = KitchenOrdersStore(repository: kitchenOrderRepository)
        let authManager = AuthManager(
            supabase: supabase,
            profileRepository: profileRepository,
            appSettingsStore: appSettingsStore,
            requiredRole: .admin,
            roleMismatchMessage: "This account doesn’t have kitchen access. Sign in with the Mommy/Chef account."
        )

        self.supabase = supabase
        self.profileRepository = profileRepository
        self.appSettingsRepository = appSettingsRepository
        self.appSettingsStore = appSettingsStore
        self.orderRepository = orderRepository
        self.kitchenOrderRepository = kitchenOrderRepository
        self.kitchenOrdersStore = kitchenOrdersStore
        self.authManager = authManager

        authManager.start()
        pushManager.configure(authManager: authManager, orderRepository: orderRepository, appTarget: .mommyIOS)
        Task {
            await pushManager.requestAuthorization()
        }
    }

    var currentBackendName: String {
        AppConfig.currentBackend.title
    }

    var localSupabaseURL: String {
        AppConfig.localConfiguration.urlString
    }

    var productionSupabaseURL: String {
        AppConfig.productionConfiguration.urlString
    }

    var selectedBackendMode: AppConfig.BackendMode {
        AppConfig.selectedBackendMode
    }

    var isUsingCustomBackend: Bool {
        AppConfig.isUsingCustomBackend
    }

    func updateBackendMode(_ mode: AppConfig.BackendMode) {
        switch mode {
        case .local:
            AppConfig.selectLocalBackend()
        case .production:
            AppConfig.selectProductionBackend()
        case .custom:
            AppConfig.saveBackendMode(.custom)
        }
        rebuildForServerChange()
    }

    func updateCustomBackend(urlString: String, publishableKey: String) throws {
        try AppConfig.saveCustomBackend(url: urlString, publishableKey: publishableKey)
        rebuildForServerChange()
    }

    func resetToDefaultBackend() {
        AppConfig.resetCustomBackend()
        rebuildForServerChange()
    }

    private func rebuildForServerChange() {
        authManager.stop()

        let supabase = SupabaseService()
        let profileRepository = ProfileRepository(supabase: supabase)
        let appSettingsRepository = AppSettingsRepository(supabase: supabase)
        let appSettingsStore = AppSettingsStore(repository: appSettingsRepository)
        let orderRepository = OrderRepository(supabase: supabase)
        let kitchenOrderRepository = KitchenOrderRepository(supabase: supabase)
        let kitchenOrdersStore = KitchenOrdersStore(repository: kitchenOrderRepository)
        let authManager = AuthManager(
            supabase: supabase,
            profileRepository: profileRepository,
            appSettingsStore: appSettingsStore,
            requiredRole: .admin,
            roleMismatchMessage: "This account doesn’t have kitchen access. Sign in with the Mommy/Chef account."
        )

        self.supabase = supabase
        self.profileRepository = profileRepository
        self.appSettingsRepository = appSettingsRepository
        self.appSettingsStore = appSettingsStore
        self.orderRepository = orderRepository
        self.kitchenOrderRepository = kitchenOrderRepository
        self.kitchenOrdersStore = kitchenOrdersStore
        self.authManager = authManager

        pushManager.configure(authManager: authManager, orderRepository: orderRepository, appTarget: .mommyIOS)
        authManager.start()
    }
}
