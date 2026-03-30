import FirebaseCore
import FirebaseMessaging
import Foundation
import UIKit
import UserNotifications
import Combine

@MainActor
final class PushNotificationManager: NSObject, ObservableObject {
    static let shared = PushNotificationManager()

    @Published var lastOpenedOrderID: UUID?

    private weak var authManager: AuthManager?
    private var orderRepository: OrderRepository?
    private var pendingFCMToken: String?
    private var authCancellable: AnyCancellable?

    private override init() {
        super.init()
    }

    func configure(authManager: AuthManager, orderRepository: OrderRepository) {
        self.authManager = authManager
        self.orderRepository = orderRepository
        authCancellable = authManager.$state.sink { [weak self] _ in
            self?.flushPendingTokenIfNeeded()
        }

        if FirebaseApp.app() == nil,
           let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
           let options = FirebaseOptions(contentsOfFile: path) {
            FirebaseApp.configure(options: options)
        }

        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self
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
        Messaging.messaging().apnsToken = deviceToken
    }

    private func registerIfPossible(token: String) {
        pendingFCMToken = token
        guard authManager?.currentUser != nil, let orderRepository else { return }
        Task {
            try? await orderRepository.registerDeviceToken(token: token)
        }
    }

    private func flushPendingTokenIfNeeded() {
        guard let pendingFCMToken else { return }
        registerIfPossible(token: pendingFCMToken)
    }

    private func consumeNotification(userInfo: [AnyHashable: Any]) {
        if let rawOrderID = userInfo["order_id"] as? String, let orderID = UUID(uuidString: rawOrderID) {
            lastOpenedOrderID = orderID
        }
    }
}

extension PushNotificationManager: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else { return }
        registerIfPossible(token: fcmToken)
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
            self.consumeNotification(userInfo: response.notification.request.content.userInfo)
        }
        completionHandler()
    }
}
