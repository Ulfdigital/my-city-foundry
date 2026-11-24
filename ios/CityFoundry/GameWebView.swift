import SwiftUI
import UIKit
import WebKit
import StoreKit

// Mit Internet lädt die App das Spiel live von der Website – jedes Update der Website ist sofort in der App.
// Ohne Internet startet die eingebaute Offline-Fassung. Die Spielstände werden zwischen beiden gespiegelt.
let liveURL = URL(string: "https://my-city-foundry.vercel.app/")!
let liveHost = "my-city-foundry.vercel.app"
let savePrefix = "my-city-foundry-"       // Spielstand-Schlüssel der Website (my-city-foundry-v1 + -at) – nicht ändern
let offlineScheme = "mcf"

/// Sicherung des Spielstands als Datei.
enum SaveBackup {
    static var file: URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("spielstaende.json")
    }
    static func read() -> String? { try? String(contentsOf: file, encoding: .utf8) }
    static func write(_ s: String) { try? s.write(to: file, atomically: true, encoding: .utf8) }
}

struct GameWebView: UIViewRepresentable {
    @ObservedObject var store: GameStore
    func makeCoordinator() -> Coordinator { Coordinator(store: store) }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(context.coordinator, forURLScheme: offlineScheme)
        config.userContentController.add(context.coordinator, name: "cfApp")
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = UIColor(red: 0.37, green: 0.62, blue: 0.29, alpha: 1)
        web.scrollView.backgroundColor = web.backgroundColor
        context.coordinator.web = web
        store.deliver = { [weak coordinator = context.coordinator] transaction in
            guard let coordinator else { return false }
            return await coordinator.call("cfApplyPurchase", value: ["transactionId": String(transaction.id), "productId": transaction.productID])
        }
        store.sendProducts = { [weak coordinator = context.coordinator] list in _ = await coordinator?.call("cfProducts", value: list) }
        store.notify = { [weak coordinator = context.coordinator] text in _ = await coordinator?.call("cfStoreMessage", value: text) }
        context.coordinator.start()
        return web
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}

    @MainActor final class Coordinator: NSObject, WKURLSchemeHandler, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
        weak var web: WKWebView?
        let store: GameStore
        init(store: GameStore) { self.store = store }
        var triedLive = false
        static let offlineURL = URL(string: "\(offlineScheme)://app/index.html")!

        /// Gesicherte Spielstände in die Seite geben (nur wenn sie neuer sind) und regelmäßig zurückholen.
        func prepareScripts() {
            guard let ucc = web?.configuration.userContentController else { return }
            ucc.removeAllUserScripts()
            let literal = SaveBackup.read().flatMap { try? JSONSerialization.data(withJSONObject: [$0]) }.flatMap { String(data: $0, encoding: .utf8) } ?? "[null]"
            let restore = "(function(){var P='\(savePrefix)',b=\(literal)[0];if(!b)return;try{var o=JSON.parse(b),la=+(localStorage.getItem(P+'at')||0);if(!o||!(o.at>la))return;var ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(P)===0)ks.push(k);}ks.forEach(function(k){localStorage.removeItem(k);});for(var k in o.items)localStorage.setItem(k,o.items[k]);}catch(e){}})();"
            ucc.addUserScript(WKUserScript(source: restore, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            let keep = "(function(){var P='\(savePrefix)',last='';function s(){try{var at=+(localStorage.getItem(P+'at')||0);if(!at)return;var items={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(P)===0)items[k]=localStorage.getItem(k);}var v=JSON.stringify({at:at,items:items});if(v!==last){last=v;webkit.messageHandlers.cfApp.postMessage({action:'save',data:v});}}catch(e){}}s();setInterval(s,10000);document.addEventListener('visibilitychange',s);window.addEventListener('pagehide',s);})();"
            ucc.addUserScript(WKUserScript(source: keep, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        func start() {
            prepareScripts()
            // Zurück in die App: läuft gerade die Offline-Fassung, noch einmal live versuchen.
            NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
                Task { @MainActor in self?.tryGoLive() }
            }
            // Alle 30 Sekunden prüfen, ob die Website wieder erreichbar ist (nur solange offline).
            Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in Task { @MainActor in self?.tryGoLive() } }
            // Erster Start: Offline-Fassung kurz öffnen (Spielstände sichern), dann live laden.
            if SaveBackup.read() == nil { loadOffline(); return }
            loadLive()
        }
        var liveFails = 0
        var checking = false
        var isOffline: Bool { web?.url?.scheme == offlineScheme }
        func loadLive() { triedLive = true; prepareScripts(); web?.load(URLRequest(url: liveURL, cachePolicy: .reloadRevalidatingCacheData, timeoutInterval: 20)) }
        func loadOffline() { prepareScripts(); web?.load(URLRequest(url: Self.offlineURL)) }

        /// Live-Laden ist schiefgegangen: bis zu 3 neue Versuche, erst danach die Offline-Fassung.
        func liveFailed(_ error: Error) {
            let e = error as NSError
            if e.code == NSURLErrorCancelled { return }                       // nur abgelöst durch neues Laden – kein echter Fehler
            if e.domain == "WebKitErrorDomain" && e.code == 102 { return }    // „Frame load interrupted“ – ebenfalls kein Fehler
            liveFails += 1
            if liveFails <= 3 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in self?.loadLive() }
            } else { liveFails = 0; loadOffline() }
        }
        /// Offline-Fassung läuft: Ist die Website erreichbar, Spielstände sichern und live weiterspielen.
        func tryGoLive() {
            guard isOffline, triedLive, !checking, let web else { return }
            checking = true
            var req = URLRequest(url: liveURL, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 10)
            req.httpMethod = "HEAD"
            Task { @MainActor in
                defer { checking = false }
                guard let result = try? await URLSession.shared.data(for: req),
                      (result.1 as? HTTPURLResponse)?.statusCode == 200, isOffline else { return }
                let js = "(function(){var P='\(savePrefix)';var at=+(localStorage.getItem(P+'at')||0);if(!at)return null;var items={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(P)===0)items[k]=localStorage.getItem(k);}return JSON.stringify({at:at,items:items});})()"
                if let data = try? await web.evaluateJavaScript(js) as? String, data.count < 40_000_000 { SaveBackup.write(data) }
                loadLive()
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            if webView.url?.host == liveHost { liveFails = 0 }
            if webView.url?.scheme == offlineScheme && !triedLive {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in self?.loadLive() }
            }
        }
        /// Gehörte der fehlgeschlagene Ladevorgang zur Website? (webView.url zeigt dabei oft noch die vorige Seite, z. B. die Offline-Fassung)
        func isLiveFailure(_ webView: WKWebView, _ error: Error) -> Bool {
            if let failed = (error as NSError).userInfo[NSURLErrorFailingURLErrorKey] as? URL { return failed.host == liveHost }
            return webView.url?.scheme != offlineScheme
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            if isLiveFailure(webView, error) { liveFailed(error) }
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { if webView.url?.host == liveHost { liveFailed(error) } }
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            let u = message.frameInfo.request.url
            let trusted = (u?.scheme == offlineScheme && u?.host == "app") || (u?.scheme == "https" && u?.host == liveHost)
            guard message.frameInfo.isMainFrame, trusted, let body = message.body as? [String: String] else { return }
            switch body["action"] {
            case "save": if let data = body["data"], data.count < 40_000_000 { SaveBackup.write(data) }
            case "ready": Task { await store.ready() }
            case "products": let ids = (body["ids"] ?? "").split(separator: ",").map(String.init); Task { await store.loadProducts(ids) }
            case "buy": if let id = body["productId"] { Task { await store.buy(id) } }
            case "restore": Task { await store.restore() }
            // Links nach außen (Impressum): die Elternsperre fragt das Spiel vorher ab
            case "open": if let s = body["url"], let url = URL(string: s), url.scheme == "https" { UIApplication.shared.open(url) }
            default: break
            }
        }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            let url = navigationAction.request.url
            let ok = (url?.scheme == offlineScheme && url?.host == "app") || (url?.scheme == "https" && url?.host == liveHost) || url?.scheme == "about"
            // Fremde Links werden nicht geöffnet – nach außen geht es nur über „open“ (z. B. Impressum).
            decisionHandler(ok ? .allow : .cancel)
        }

        func call(_ function: String, value: Any) async -> Bool {
            guard let web, let data = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed]),
                  let json = String(data: data, encoding: .utf8) else { return false }
            let script = "typeof window.\(function)==='function' && window.\(function)(\(json))"
            do { return (try await web.evaluateJavaScript(script) as? Bool) == true } catch { return false }
        }

        // Rückfragen der Seite als iOS-Dialog anzeigen
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            if !present(a) { completionHandler() }
        }
        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "Abbrechen", style: .cancel) { _ in completionHandler(false) })
            a.addAction(UIAlertAction(title: "OK", style: .destructive) { _ in completionHandler(true) })
            if !present(a) { completionHandler(false) }
        }
        func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
            let a = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
            a.addTextField { $0.text = defaultText }
            a.addAction(UIAlertAction(title: "Abbrechen", style: .cancel) { _ in completionHandler(nil) })
            a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(a.textFields?.first?.text) })
            if !present(a) { completionHandler(nil) }
        }
        private func present(_ vc: UIViewController) -> Bool {
            let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
            guard var top = scene?.windows.first(where: { $0.isKeyWindow })?.rootViewController ?? scene?.windows.first?.rootViewController else { return false }
            while let p = top.presentedViewController { top = p }
            top.present(vc, animated: true); return true
        }

        // Offline-Fassung aus dem App-Paket ausliefern
        func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
            guard let url = urlSchemeTask.request.url, url.host == "app",
                  let root = Bundle.main.url(forResource: "WebAssets", withExtension: nil) else {
                urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist)); return
            }
            var path = url.path == "/" || url.path.isEmpty ? "index.html" : String(url.path.dropFirst())
            if !path.contains(".") { path += ".html" }
            let file = root.appendingPathComponent(path).standardizedFileURL
            guard file.path.hasPrefix(root.standardizedFileURL.path + "/"),
                  let data = try? Data(contentsOf: file) else {
                urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist)); return
            }
            let types = ["html":"text/html", "js":"application/javascript", "mjs":"text/javascript", "css":"text/css", "json":"application/json", "webp":"image/webp", "png":"image/png", "svg":"image/svg+xml", "woff2":"font/woff2", "txt":"text/plain", "ico":"image/x-icon"]
            let response = URLResponse(url: url, mimeType: types[file.pathExtension] ?? "application/octet-stream", expectedContentLength: data.count, textEncodingName: "utf-8")
            urlSchemeTask.didReceive(response); urlSchemeTask.didReceive(data); urlSchemeTask.didFinish()
        }
        func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
    }
}
