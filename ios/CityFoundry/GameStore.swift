import Foundation
import StoreKit

/// Apple-Käufe für My City Foundry (vorbereitet, noch keine Produkte).
/// Das Spiel (Website) zeigt den Shop selbst (mit Elternsperre unter 18 Jahren) und fragt hier nur Preise ab, startet Käufe und stellt Käufe wieder her.
/// Produkt-IDs kommen aus dem Spiel – neue Pakete brauchen keinen neuen App-Build, nur den Eintrag in App Store Connect
/// (Präfix com.ulfdigital.mycityfoundry.).
@MainActor
final class GameStore: ObservableObject {
    static let prefix = "com.ulfdigital.mycityfoundry."
    var deliver: ((StoreKit.Transaction) async -> Bool)?
    var sendProducts: (([[String: String]]) async -> Void)?
    var notify: ((String) async -> Void)?
    private var listener: Task<Void, Never>?
    private var inFlight: Set<UInt64> = []
    private var cache: [String: Product] = [:]

    init() {
        listener = Task { [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard let self else { return }
                await self.receive(result)
            }
        }
    }
    deinit { listener?.cancel() }

    private func valid(_ ids: [String]) -> [String] { ids.filter { $0.hasPrefix(Self.prefix) && $0.count < 120 } }

    func loadProducts(_ ids: [String]) async {
        let ids = valid(ids); guard !ids.isEmpty else { return }
        do {
            let products = try await Product.products(for: ids)
            for p in products { cache[p.id] = p }
            await sendProducts?(products.map { ["id": $0.id, "price": $0.displayPrice, "name": $0.displayName] })
        } catch { await notify?("Die Preise konnten nicht geladen werden. Bitte später erneut versuchen.") }
    }

    func buy(_ id: String) async {
        guard valid([id]).count == 1 else { return }
        do {
            var product = cache[id]
            if product == nil { product = try await Product.products(for: [id]).first; if let product { cache[id] = product } }
            guard let product else { await notify?("Dieses Angebot ist bei Apple noch nicht eingerichtet."); return }
            switch try await product.purchase() {
            case .success(let result): await receive(result)
            case .pending: await notify?("Der Kauf wartet auf eine Freigabe. Es wurde noch nichts freigeschaltet.")
            case .userCancelled: break
            @unknown default: await notify?("Der Kauf wurde noch nicht abgeschlossen.")
            }
        } catch { await notify?("Der Kauf konnte nicht abgeschlossen werden. Bitte erneut versuchen.") }
    }

    /// Spiel ist geladen: offene Käufe zustellen und bereits gekaufte Freischaltungen erneut melden
    /// (so sind Käufe auch nach Neuinstallation oder auf einem zweiten Gerät sofort da).
    func ready() async {
        for await result in StoreKit.Transaction.unfinished { await receive(result) }
        await sendEntitlements(report: false)
    }

    /// „Käufe wiederherstellen“
    func restore() async {
        do { try await AppStore.sync() } catch { await notify?("Wiederherstellen hat nicht geklappt. Bitte bei Apple angemeldet sein und erneut versuchen."); return }
        let n = await sendEntitlements(report: true)
        if n == 0 { await notify?("Keine früheren Käufe gefunden.") }
    }

    @discardableResult
    private func sendEntitlements(report: Bool) async -> Int {
        var n = 0
        for await result in StoreKit.Transaction.currentEntitlements {
            guard case .verified(let t) = result, t.productID.hasPrefix(Self.prefix), t.revocationDate == nil else { continue }
            if let deliver, await deliver(t) { n += 1 }
        }
        if report && n > 0 { await notify?("Käufe wiederhergestellt.") }
        return n
    }

    private func receive(_ result: VerificationResult<StoreKit.Transaction>) async {
        guard case .verified(let transaction) = result, transaction.productID.hasPrefix(Self.prefix) else { return }
        if transaction.revocationDate != nil { await transaction.finish(); return }
        guard !inFlight.contains(transaction.id) else { return }
        inFlight.insert(transaction.id); defer { inFlight.remove(transaction.id) }
        // Erst abschließen, wenn das Spiel die Freischaltung sicher gespeichert hat.
        guard let deliver, await deliver(transaction) else { return }
        await transaction.finish()
    }
}
