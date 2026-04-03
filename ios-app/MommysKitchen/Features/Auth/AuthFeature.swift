import SwiftUI

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isSubmitting = false

    private let authManager: AuthManager

    init(authManager: AuthManager) {
        self.authManager = authManager
    }

    func submit() async {
        authManager.errorMessage = nil

        guard !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !password.isEmpty else {
            authManager.errorMessage = "Enter your email and password to sign in."
            return
        }

        isSubmitting = true
        defer { isSubmitting = false }

        await authManager.signIn(email: email, password: password)
    }
}

struct AuthView: View {
    @EnvironmentObject private var appContext: AppContext
    @StateObject private var viewModel: AuthViewModel
    @ObservedObject private var authManager: AuthManager
    @State private var showingBackendSettings = false

    init(authManager: AuthManager) {
        _viewModel = StateObject(wrappedValue: AuthViewModel(authManager: authManager))
        self.authManager = authManager
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(spacing: 14) {
                        Image("BrandMark")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 68, height: 68)
                            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                            .shadow(color: .black.opacity(0.06), radius: 10, y: 4)

                        VStack(spacing: 8) {
                            Text("Order your favorite comfort food from your favorite chef, Mommy.")
                                .font(.headline)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
                .listRowBackground(Color.clear)

                Section("Welcome back") {
                    TextField("Email", text: $viewModel.email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textContentType(.emailAddress)

                    SecureField("Password", text: $viewModel.password)
                        .textContentType(.password)
                }

                Section {
                    Text("Need an account? Ask your family admin.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let errorMessage = authManager.errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
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
            .navigationTitle("Mommy's Kitchen")
            .navigationBarTitleDisplayMode(.inline)
            #if DEBUG
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingBackendSettings = true
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                    .accessibilityLabel("Backend settings")
                    .tint(.secondary)
                }
            }
            .sheet(isPresented: $showingBackendSettings) {
                NavigationStack {
                    BackendSettingsView(
                        primaryActionTitle: "Save",
                        showEnvironmentDetails: true,
                        showCustomHelperText: true,
                        showLocalDefaultHint: false,
                        prefillCustomValues: false,
                        showActionDescription: false
                    )
                        .environmentObject(appContext)
                }
            }
            #endif
            .safeAreaInset(edge: .bottom) {
                Button {
                    Task { await viewModel.submit() }
                } label: {
                    if viewModel.isSubmitting {
                        ProgressView().tint(.white)
                    } else {
                        Text("Sign In")
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(.ultraThinMaterial)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(KitchenTheme.background.ignoresSafeArea())
    }
}
