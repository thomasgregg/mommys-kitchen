import Combine
import Foundation
import UIKit
import UserNotifications

@MainActor
final class PushNotificationManager: NSObject, ObservableObject {
    static let shared = PushNotificationManager()

    @Published var lastOpenedOrderID: UUID?

    private weak var authManager: AuthManager?
    private var orderRepository: OrderRepository?
    private var pendingDeviceToken: String?
    private var authCancellable: AnyCancellable?
    private var appTarget: OrderRepository.PushAppTarget = .customerIOS

    private override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    func configure(
        authManager: AuthManager,
        orderRepository: OrderRepository,
        appTarget: OrderRepository.PushAppTarget = .customerIOS
    ) {
        self.authManager = authManager
        self.orderRepository = orderRepository
        self.appTarget = appTarget
        authCancellable = authManager.$state.sink { [weak self] _ in
            self?.flushPendingTokenIfNeeded()
        }

    }

    func requestAuthorization() async {
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
            guard granted else { return }
            UIApplication.shared.registerForRemoteNotifications()
        } catch {
            print("Notification authorization failed: \(error.localizedDescription)")
        }
    }

    func didRegisterForRemoteNotifications(deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        registerIfPossible(token: token)
    }

    func didFailToRegisterForRemoteNotifications(error: Error) {
        print("Remote notification registration failed: \(error.localizedDescription)")
    }

    private func registerIfPossible(token: String) {
        pendingDeviceToken = token
        guard authManager?.currentUser != nil, let orderRepository else { return }
        let appTarget = appTarget
        Task {
            try? await orderRepository.registerDeviceToken(
                token: token,
                appTarget: appTarget,
                pushEnvironment: .current
            )
        }
    }

    private func flushPendingTokenIfNeeded() {
        guard let pendingDeviceToken else { return }
        registerIfPossible(token: pendingDeviceToken)
    }

    func handleNotification(userInfo: [AnyHashable: Any]) {
        if let rawOrderID = userInfo["order_id"] as? String, let orderID = UUID(uuidString: rawOrderID) {
            lastOpenedOrderID = orderID
        }
    }
}

extension PushNotificationManager: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .list, .sound])
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let rawOrderID = response.notification.request.content.userInfo["order_id"] as? String
        Task { @MainActor in
            if let rawOrderID, let orderID = UUID(uuidString: rawOrderID) {
                self.lastOpenedOrderID = orderID
            }
        }
        completionHandler()
    }
}
