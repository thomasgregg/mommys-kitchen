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

    private override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    func configure(authManager: AuthManager, orderRepository: OrderRepository) {
        self.authManager = authManager
        self.orderRepository = orderRepository
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
        Task {
            try? await orderRepository.registerDeviceToken(
                token: token,
                appTarget: .customerIOS,
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
        Task { @MainActor in
            self.handleNotification(userInfo: response.notification.request.content.userInfo)
        }
        completionHandler()
    }
}
