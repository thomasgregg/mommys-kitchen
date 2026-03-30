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
                        LabeledContent("Backend server", value: appContext.isUsingCustomSupabaseURL ? "Custom" : "Default")
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
    @State private var serverURL = AppConfig.supabaseURLString
    @State private var errorMessage: String?

    init(primaryActionTitle: String = "Save and reconnect") {
        self.primaryActionTitle = primaryActionTitle
    }

    var body: some View {
        List {
            Section("Server") {
                VStack(alignment: .leading, spacing: 10) {
                    TextField("http://127.0.0.1:55421", text: $serverURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)

                    Text("Default: \(appContext.defaultSupabaseURL)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
                Text("Changing the server reconnects the app against that backend. Use this if your local stack or deployed API lives at a different URL.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.top, 8)
            }

            Section {
                Button(primaryActionTitle) {
                    do {
                        errorMessage = nil
                        try appContext.updateSupabaseURL(serverURL)
                        dismiss()
                    } catch {
                        errorMessage = error.localizedDescription
                    }
                }
                .foregroundStyle(KitchenTheme.accent)
                .listRowSeparator(.hidden)

                if appContext.isUsingCustomSupabaseURL {
                    Button("Use default server") {
                        errorMessage = nil
                        appContext.resetSupabaseURL()
                        serverURL = appContext.currentSupabaseURL
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
