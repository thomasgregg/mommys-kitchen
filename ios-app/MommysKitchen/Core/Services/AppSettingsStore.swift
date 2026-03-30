import Foundation

@MainActor
final class AppSettingsStore: ObservableObject {
    @Published private(set) var settings = GlobalAppSettings(
        singletonKey: "global",
        currencyCode: "EUR",
        languageCode: "de",
        localeIdentifier: "de-DE"
    )

    private let repository: AppSettingsRepository

    init(repository: AppSettingsRepository) {
        self.repository = repository
        applyFormatting()
    }

    func refresh() async {
        do {
            settings = try await repository.fetchGlobalSettings()
            applyFormatting()
        } catch {
            applyFormatting()
        }
    }

    private func applyFormatting() {
        Formatters.configure(
            currencyCode: settings.currencyCode,
            localeIdentifier: settings.localeIdentifier
        )
    }
}
