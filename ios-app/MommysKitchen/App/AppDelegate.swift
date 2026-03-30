import UIKit

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        configureAppearance()
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { @MainActor in
            PushNotificationManager.shared.didRegisterForRemoteNotifications(deviceToken: deviceToken)
        }
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        applyWindowBackgrounds(for: application)
    }

    private func configureAppearance() {
        let accentColor = UIColor(red: 0.82, green: 0.43, blue: 0.26, alpha: 1)
        let navigationAppearance = UINavigationBarAppearance()
        navigationAppearance.configureWithOpaqueBackground()
        navigationAppearance.backgroundColor = .systemGroupedBackground

        UINavigationBar.appearance().standardAppearance = navigationAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navigationAppearance
        UINavigationBar.appearance().compactAppearance = navigationAppearance

        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithOpaqueBackground()
        tabBarAppearance.backgroundColor = .systemBackground
        tabBarAppearance.stackedLayoutAppearance.normal.badgeBackgroundColor = accentColor
        tabBarAppearance.stackedLayoutAppearance.selected.badgeBackgroundColor = accentColor
        tabBarAppearance.inlineLayoutAppearance.normal.badgeBackgroundColor = accentColor
        tabBarAppearance.inlineLayoutAppearance.selected.badgeBackgroundColor = accentColor
        tabBarAppearance.compactInlineLayoutAppearance.normal.badgeBackgroundColor = accentColor
        tabBarAppearance.compactInlineLayoutAppearance.selected.badgeBackgroundColor = accentColor

        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
        UITabBar.appearance().tintColor = accentColor
    }

    private func applyWindowBackgrounds(for application: UIApplication) {
        let windows = application.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)

        for window in windows {
            window.backgroundColor = .systemGroupedBackground
            window.rootViewController?.view.backgroundColor = .systemGroupedBackground
        }
    }
}
