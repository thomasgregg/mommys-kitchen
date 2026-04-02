import SwiftUI

@MainActor
final class ChefAuthViewModel: ObservableObject {
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
            authManager.errorMessage = "Enter the kitchen account email and password to sign in."
            return
        }

        isSubmitting = true
        defer { isSubmitting = false }

        await authManager.signIn(email: email, password: password)
    }
}

struct ChefAuthView: View {
    @EnvironmentObject private var appContext: ChefAppContext
    @StateObject private var viewModel: ChefAuthViewModel
    @ObservedObject private var authManager: AuthManager
    @State private var showingBackendSettings = false

    init(authManager: AuthManager) {
        _viewModel = StateObject(wrappedValue: ChefAuthViewModel(authManager: authManager))
        self.authManager = authManager
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(spacing: 14) {
                        Image("BrandMarkChef")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 68, height: 68)
                            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                            .shadow(color: .black.opacity(0.06), radius: 10, y: 4)

                        VStack(spacing: 8) {
                            Text("Kitchen Admin")
                                .font(.title2.weight(.bold))
                                .multilineTextAlignment(.center)
                            Text("Check new orders, move them through the kitchen, and keep the family delivery flow calm.")
                                .font(.subheadline)
                                .foregroundStyle(KitchenTheme.muted)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
                .listRowBackground(Color.clear)

                Section("Kitchen sign in") {
                    TextField("Email", text: $viewModel.email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textContentType(.emailAddress)

                    SecureField("Password", text: $viewModel.password)
                        .textContentType(.password)
                }

                if let errorMessage = authManager.errorMessage {
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
            .navigationTitle("Kitchen Admin")
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
                    ChefBackendSettingsView(primaryActionTitle: "Save")
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
                        Text("Sign in")
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
