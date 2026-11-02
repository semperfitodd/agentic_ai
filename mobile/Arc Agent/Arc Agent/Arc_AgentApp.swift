import SwiftUI

@main
struct Arc_AgentApp: App {
    @AppStorage(AppearancePreference.storageKey) private var appearance = AppearancePreference.system

    init() {
        // Earlier builds kept the GitHub token in UserDefaults; it now lives in the Keychain.
        UserDefaults.standard.removeObject(forKey: "custom_github_token")
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(appearance.colorScheme)
        }
    }
}
