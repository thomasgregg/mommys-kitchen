import Foundation

@MainActor
final class AppContext: ObservableObject {
    @Published private(set) var supabase: SupabaseService
    @Published private(set) var profileRepository: ProfileRepository
    @Published private(set) var appSettingsRepository: AppSettingsRepository
    @Published private(set) var appSettingsStore: AppSettingsStore
    @Published private(set) var menuRepository: MenuRepository
    @Published private(set) var orderRepository: OrderRepository
    @Published private(set) var authManager: AuthManager

    let cartStore = CartStore()
    let pushManager = PushNotificationManager.shared

    init() {
        let supabase = SupabaseService()
        let profileRepository = ProfileRepository(supabase: supabase)
        let appSettingsRepository = AppSettingsRepository(supabase: supabase)
        let appSettingsStore = AppSettingsStore(repository: appSettingsRepository)
        let menuRepository = MenuRepository(supabase: supabase)
        let orderRepository = OrderRepository(supabase: supabase)
        let authManager = AuthManager(
            supabase: supabase,
            profileRepository: profileRepository,
            appSettingsStore: appSettingsStore
        )

        self.supabase = supabase
        self.profileRepository = profileRepository
        self.appSettingsRepository = appSettingsRepository
        self.appSettingsStore = appSettingsStore
        self.menuRepository = menuRepository
        self.orderRepository = orderRepository
        self.authManager = authManager

        authManager.start()
        pushManager.configure(authManager: authManager, orderRepository: orderRepository)
        Task {
            await pushManager.requestAuthorization()
        }
    }

    var currentSupabaseURL: String {
        AppConfig.currentBackend.urlString
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

    func updateCustomBackend(urlString: String, anonKey: String) throws {
        try AppConfig.saveCustomBackend(url: urlString, anonKey: anonKey)
        rebuildForServerChange()
    }

    func resetToDefaultBackend() {
        AppConfig.resetCustomBackend()
        rebuildForServerChange()
    }

    func resetToLocalBackend() {
        resetToDefaultBackend()
    }

    private func rebuildForServerChange() {
        authManager.stop()
        cartStore.clear()

        let supabase = SupabaseService()
        let profileRepository = ProfileRepository(supabase: supabase)
        let appSettingsRepository = AppSettingsRepository(supabase: supabase)
        let appSettingsStore = AppSettingsStore(repository: appSettingsRepository)
        let menuRepository = MenuRepository(supabase: supabase)
        let orderRepository = OrderRepository(supabase: supabase)
        let authManager = AuthManager(
            supabase: supabase,
            profileRepository: profileRepository,
            appSettingsStore: appSettingsStore
        )

        self.supabase = supabase
        self.profileRepository = profileRepository
        self.appSettingsRepository = appSettingsRepository
        self.appSettingsStore = appSettingsStore
        self.menuRepository = menuRepository
        self.orderRepository = orderRepository
        self.authManager = authManager

        pushManager.configure(authManager: authManager, orderRepository: orderRepository)
        authManager.start()
    }
}
