import SwiftUI

enum KitchenTheme {
    static let background = Color(uiColor: .systemGroupedBackground)
    static let panel = Color(uiColor: .secondarySystemGroupedBackground)
    static let accent = isKitchenAdminApp ? adminAccent : customerAccent
    static let text = Color(uiColor: .label)
    static let muted = Color(uiColor: .secondaryLabel)
    static let success = Color(red: 0.25, green: 0.55, blue: 0.36)

    private static let customerAccent = Color(red: 0.82, green: 0.43, blue: 0.26)
    private static let adminAccent = Color(red: 44 / 255, green: 54 / 255, blue: 70 / 255)
    private static let isKitchenAdminApp = Bundle.main.bundleIdentifier == "com.mommyskitchen.mommy"
}
