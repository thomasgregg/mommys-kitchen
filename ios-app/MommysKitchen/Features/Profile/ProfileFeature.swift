import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var appContext: AppContext
    @ObservedObject var authManager: AuthManager
    @State private var showingDeleteConfirmation = false

    var body: some View {
        NavigationStack {
            List {
                if let profile = authManager.profile {
                    Section("Account") {
                        LabeledContent("Name", value: profile.fullName ?? "Not set")
                        LabeledContent("Email", value: authManager.currentUser?.email ?? "Not set")
                        LabeledContent("Phone", value: profile.phone ?? "Not set")
                        LabeledContent("Role", value: profile.role.rawValue.capitalized)
                    }
                }

                #if DEBUG
                Section("App settings") {
                    NavigationLink {
                        BackendSettingsView(
                            primaryActionTitle: "Save and reconnect",
                            showEnvironmentDetails: true,
                            showCustomHelperText: true,
                            showLocalDefaultHint: false,
                            prefillCustomValues: false,
                            showActionDescription: false
                        )
                    } label: {
                        LabeledContent("Backend server", value: appContext.currentBackendName)
                    }
                }
                #endif

                Section {
                    Button("Delete account", role: .destructive) {
                        showingDeleteConfirmation = true
                    }

                    Button("Sign out", role: .destructive) {
                        Task { await authManager.signOut() }
                    }
                }

                if let accountDeletionMessage = authManager.accountDeletionMessage {
                    Section {
                        Text(accountDeletionMessage)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(KitchenTheme.background)
            .contentMargins(.bottom, 96, for: .scrollContent)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .confirmationDialog(
                "Delete account?",
                isPresented: $showingDeleteConfirmation,
                titleVisibility: .visible
            ) {
                Button("Delete account", role: .destructive) {
                    Task { await authManager.deleteAccount() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This removes your access to the app and deletes your saved contact details. Past order records stay anonymized for kitchen history.")
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(KitchenTheme.background.ignoresSafeArea())
    }
}

struct BackendSettingsView: View {
    @EnvironmentObject private var appContext: AppContext
    @Environment(\.dismiss) private var dismiss
    let primaryActionTitle: String
    let showEnvironmentDetails: Bool
    let showCustomHelperText: Bool
    let showLocalDefaultHint: Bool
    let prefillCustomValues: Bool
    let showActionDescription: Bool
    @State private var selectedMode = AppConfig.selectedBackendMode
    @State private var serverURL: String
    @State private var publishableKey: String
    @State private var errorMessage: String?

    init(
        primaryActionTitle: String = "Save and reconnect",
        showEnvironmentDetails: Bool = true,
        showCustomHelperText: Bool = true,
        showLocalDefaultHint: Bool = true,
        prefillCustomValues: Bool = true,
        showActionDescription: Bool = true
    ) {
        self.primaryActionTitle = primaryActionTitle
        self.showEnvironmentDetails = showEnvironmentDetails
        self.showCustomHelperText = showCustomHelperText
        self.showLocalDefaultHint = showLocalDefaultHint
        self.prefillCustomValues = prefillCustomValues
        self.showActionDescription = showActionDescription
        _serverURL = State(initialValue: prefillCustomValues ? AppConfig.currentCustomURLString : "")
        _publishableKey = State(initialValue: prefillCustomValues ? AppConfig.currentCustomPublishableKey : "")
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

                if showEnvironmentDetails {
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
                            if showCustomHelperText {
                                Text("Use this only if you need a non-standard environment. The URL and publishable key must belong to the same Supabase project.")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            if selectedMode == .custom {
                Section("Connection details") {
                    TextField("https://your-project.supabase.co", text: $serverURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                        .foregroundStyle(.primary)
                        .tint(.primary)

                    TextField("sb_publishable_...", text: $publishableKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .foregroundStyle(.primary)
                        .tint(.primary)

                    if showLocalDefaultHint {
                        Text("Local default: \(appContext.localSupabaseURL)")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Section {
                if showActionDescription {
                    Text(actionDescription)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .padding(.vertical, 4)
                }

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
                        appContext.resetToDefaultBackend()
                        selectedMode = .production
                        serverURL = prefillCustomValues ? AppConfig.currentCustomURLString : ""
                        publishableKey = prefillCustomValues ? AppConfig.currentCustomPublishableKey : ""
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
