import SwiftUI

@main
struct CityFoundryApp: App {
    @StateObject private var store = GameStore()
    var body: some Scene {
        WindowGroup {
            GameWebView(store: store)
                .ignoresSafeArea(.container, edges: .bottom)
                .background(Color(red: 0.37, green: 0.62, blue: 0.29))
        }
    }
}
