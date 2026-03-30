import Foundation

struct CartLine: Identifiable, Hashable {
    var id: UUID { menuItem.id }
    let menuItem: MenuItem
    var quantity: Int

    var lineTotalCents: Int {
        menuItem.priceCents * quantity
    }
}
