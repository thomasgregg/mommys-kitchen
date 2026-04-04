import SwiftUI

struct ChefProfileView: View {
    @EnvironmentObject private var appContext: ChefAppContext
    @ObservedObject var authManager: AuthManager

    var body: some View {
        NavigationStack {
            List {
                if let profile = authManager.profile {
                    Section("Account") {
                        LabeledContent("Name", value: profile.fullName ?? "Not set")
                        LabeledContent("Email", value: authManager.currentUser?.email ?? "Not set")
                        LabeledContent("Phone", value: profile.phone ?? "Not set")
                        LabeledContent("Family", value: authManager.familyName ?? "Not set")
                        LabeledContent("Role", value: "Kitchen admin")
                    }
                }

                #if DEBUG
                Section("App settings") {
                    NavigationLink {
                        ChefBackendSettingsView(primaryActionTitle: "Save and reconnect")
                    } label: {
                        LabeledContent("Backend server", value: appContext.currentBackendName)
                    }
                }
                #endif

                Section("Account actions") {
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

struct ChefBackendSettingsView: View {
    @EnvironmentObject private var appContext: ChefAppContext
    @Environment(\.dismiss) private var dismiss
    let primaryActionTitle: String
    @State private var selectedMode = AppConfig.selectedBackendMode
    @State private var serverURL = AppConfig.currentCustomURLString
    @State private var anonKey = AppConfig.currentCustomAnonKey
    @State private var errorMessage: String?

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
                        Text("Use this only if you need a non-standard environment. The URL and anon key must belong to the same Supabase project.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }

            if selectedMode == .custom {
                Section("Connection details") {
                    TextField("https://your-project.supabase.co", text: $serverURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)

                    TextField("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", text: $anonKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
            }

            Section {
                Button(primaryActionTitle) {
                    do {
                        errorMessage = nil
                        switch selectedMode {
                        case .local, .production:
                            appContext.updateBackendMode(selectedMode)
                        case .custom:
                            try appContext.updateCustomBackend(urlString: serverURL, anonKey: anonKey)
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
                        appContext.resetToDefaultBackend()
                        selectedMode = .production
                        serverURL = AppConfig.currentCustomURLString
                        anonKey = AppConfig.currentCustomAnonKey
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
}
