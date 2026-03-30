import SwiftUI

@MainActor
final class AuthViewModel: ObservableObject {
    enum Mode: String, CaseIterable, Identifiable {
        case signIn = "Sign In"
        case signUp = "Sign Up"

        var id: String { rawValue }
    }

    @Published var mode: Mode = .signIn
    @Published var fullName = ""
    @Published var phone = ""
    @Published var email = ""
    @Published var password = ""
    @Published var isSubmitting = false

    private let authManager: AuthManager

    init(authManager: AuthManager) {
        self.authManager = authManager
    }

    func submit() async {
        isSubmitting = true
        defer { isSubmitting = false }

        switch mode {
        case .signIn:
            await authManager.signIn(email: email, password: password)
        case .signUp:
            await authManager.signUp(fullName: fullName, phone: phone, email: email, password: password)
        }
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

                Section {
                    Picker("Mode", selection: $viewModel.mode) {
                        ForEach(AuthViewModel.Mode.allCases) { mode in
                            Text(mode.rawValue).tag(mode)
                        }
                    }
                    .font(.headline)
                    .controlSize(.large)
                    .pickerStyle(.segmented)
                }

                Section(viewModel.mode == .signUp ? "Your details" : "Welcome back") {
                    if viewModel.mode == .signUp {
                        TextField("Full name", text: $viewModel.fullName)
                            .textInputAutocapitalization(.words)
                        TextField("Phone", text: $viewModel.phone)
                            .keyboardType(.phonePad)
                    }

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
            .navigationTitle("Mommy's Kitchen")
            .navigationBarTitleDisplayMode(.inline)
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
                    BackendSettingsView(primaryActionTitle: "Save")
                        .environmentObject(appContext)
                }
            }
            .safeAreaInset(edge: .bottom) {
                Button {
                    Task { await viewModel.submit() }
                } label: {
                    if viewModel.isSubmitting {
                        ProgressView().tint(.white)
                    } else {
                        Text(viewModel.mode.rawValue)
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
