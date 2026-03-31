import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var appContext: AppContext
    @ObservedObject var authManager: AuthManager

    var body: some View {
        NavigationStack {
            List {
                if let profile = authManager.profile {
                    Section("Account") {
                        LabeledContent("Name", value: profile.fullName ?? "Not set")
                        LabeledContent("Phone", value: profile.phone ?? "Not set")
                        LabeledContent("Role", value: profile.role.rawValue.capitalized)
                    }
                }

                Section("App settings") {
                    NavigationLink {
                        BackendSettingsView()
                    } label: {
                        LabeledContent("Backend server", value: appContext.currentBackendName)
                    }
                }

                Section {
                    Button("Sign out", role: .destructive) {
                        Task { await authManager.signOut() }
                    }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(KitchenTheme.background)
            .contentMargins(.bottom, 96, for: .scrollContent)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(KitchenTheme.background.ignoresSafeArea())
    }
}

struct BackendSettingsView: View {
    @EnvironmentObject private var appContext: AppContext
    @Environment(\.dismiss) private var dismiss
    let primaryActionTitle: String
    @State private var selectedMode = AppConfig.selectedBackendMode
    @State private var serverURL = AppConfig.currentCustomURLString
    @State private var publishableKey = AppConfig.currentCustomPublishableKey
    @State private var errorMessage: String?

    init(primaryActionTitle: String = "Save and reconnect") {
        self.primaryActionTitle = primaryActionTitle
    }

    var body: some View {
        List {
            Section("Environment") {
                Picker("Environment", selection: $selectedMode) {
                    ForEach(AppConfig.BackendMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)

                VStack(alignment: .leading, spacing: 8) {
                    switch selectedMode {
                    case .local:
                        Text("Local Supabase")
                            .font(.body.weight(.medium))
                        Text(appContext.localSupabaseURL)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    case .production:
                        Text("Hosted production Supabase")
                            .font(.body.weight(.medium))
                        Text(appContext.productionSupabaseURL)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    case .custom:
                        Text("Custom Supabase project")
                            .font(.body.weight(.medium))
                        Text("Use this only if you need a non-standard environment. The URL and publishable key must belong to the same Supabase project.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }

            if selectedMode == .custom {
                Section("Custom Supabase") {
                    TextField("https://your-project.supabase.co", text: $serverURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)

                    TextField("sb_publishable_...", text: $publishableKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    Text("Local default: \(appContext.localSupabaseURL)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                Text(actionDescription)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 4)

                Button(primaryActionTitle) {
                    do {
                        errorMessage = nil
                        switch selectedMode {
                        case .local, .production:
                            appContext.updateBackendMode(selectedMode)
                        case .custom:
                            try appContext.updateCustomBackend(
                                urlString: serverURL,
                                publishableKey: publishableKey
                            )
                        }
                        dismiss()
                    } catch {
                        errorMessage = error.localizedDescription
                    }
                }
                .foregroundStyle(KitchenTheme.accent)
                .listRowSeparator(.hidden)

                if appContext.isUsingCustomBackend {
                    Button("Use default server") {
                        errorMessage = nil
                        appContext.resetToLocalBackend()
                        selectedMode = .local
                        serverURL = AppConfig.currentCustomURLString
                        publishableKey = AppConfig.currentCustomPublishableKey
                        dismiss()
                    }
                    .foregroundStyle(KitchenTheme.accent)
                    .listRowSeparator(.hidden)
                }
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(KitchenTheme.background)
        .navigationTitle("Backend")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var actionDescription: String {
        switch selectedMode {
        case .local:
            return "Switch back to your local Supabase stack for simulator development."
        case .production:
            return "Switch to the hosted production Supabase project and reconnect the app."
        case .custom:
            return "Save a custom Supabase URL and its matching publishable key together."
        }
    }
}
