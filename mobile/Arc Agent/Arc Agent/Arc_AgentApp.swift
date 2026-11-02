import SwiftUI

@main
struct Arc_AgentApp: App {
    init() {
        // Earlier builds kept the GitHub token in UserDefaults; it now lives in the Keychain.
        UserDefaults.standard.removeObject(forKey: "custom_github_token")
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
