import Foundation

enum Formatters {
    private static var currencyCode = "EUR"
    private static var localeIdentifier = "de_DE"

    static let relativeDate: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter
    }()

    static func configure(currencyCode: String, localeIdentifier: String) {
        self.currencyCode = currencyCode
        self.localeIdentifier = localeIdentifier.replacingOccurrences(of: "-", with: "_")
    }

    private static var currencyFormatter: NumberFormatter {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currencyCode
        formatter.locale = Locale(identifier: localeIdentifier)
        return formatter
    }

    private static var shortDateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        formatter.locale = Locale(identifier: localeIdentifier)
        return formatter
    }

    static func currency(cents: Int) -> String {
        currencyFormatter.string(from: NSNumber(value: Double(cents) / 100.0)) ?? "\(currencyCode) 0.00"
    }

    static func shortDateString(_ date: Date) -> String {
        shortDateFormatter.string(from: date)
    }
}
