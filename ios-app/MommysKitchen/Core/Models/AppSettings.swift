import Foundation

struct GlobalAppSettings: Codable, Sendable {
    let singletonKey: String
    let currencyCode: String
    let languageCode: String
    let localeIdentifier: String

    enum CodingKeys: String, CodingKey {
        case singletonKey = "singleton_key"
        case currencyCode = "currency_code"
        case languageCode = "language_code"
        case localeIdentifier = "locale_identifier"
    }
}
