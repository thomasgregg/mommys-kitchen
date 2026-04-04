import Foundation
import Supabase

@MainActor
final class AuthManager: ObservableObject {
    enum State {
        case loading
        case signedOut
        case signedIn(User)
    }

    @Published private(set) var state: State = .loading
    @Published private(set) var profile: Profile?
    @Published private(set) var familyName: String?
    @Published var errorMessage: String?
    @Published var accountDeletionMessage: String?

    private let supabase: SupabaseService
    private let profileRepository: ProfileRepository
    private let appSettingsStore: AppSettingsStore
    private let requiredRole: Profile.Role?
    private let roleMismatchMessage: String?
    private var authTask: Task<Void, Never>?
    private var authStateChangeListener: (any AuthStateChangeListenerRegistration)?

    init(
        supabase: SupabaseService,
        profileRepository: ProfileRepository,
        appSettingsStore: AppSettingsStore,
        requiredRole: Profile.Role? = nil,
        roleMismatchMessage: String? = nil
    ) {
        self.supabase = supabase
        self.profileRepository = profileRepository
        self.appSettingsStore = appSettingsStore
        self.requiredRole = requiredRole
        self.roleMismatchMessage = roleMismatchMessage
    }

    func start() {
        authTask?.cancel()
        authStateChangeListener?.remove()
        authStateChangeListener = nil
        authTask = Task {
            let listener = await supabase.client.auth.onAuthStateChange { [weak self] _, session in
                Task { @MainActor [weak self] in
                    await self?.handleSession(session?.user)
                }
            }

            guard !Task.isCancelled else {
                listener.remove()
                return
            }

            authStateChangeListener = listener
        }
    }

    func stop() {
        authTask?.cancel()
        authTask = nil
        authStateChangeListener?.remove()
        authStateChangeListener = nil
    }

    func signIn(email: String, password: String) async {
        do {
            errorMessage = nil
            accountDeletionMessage = nil
            let session = try await supabase.client.auth.signIn(email: email, password: password)
            await handleSession(session.user)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signUp(fullName: String, phone: String, email: String, password: String) async {
        do {
            errorMessage = nil
            accountDeletionMessage = nil
            var metadata: [String: AnyJSON] = [
                "full_name": .string(fullName)
            ]
            let trimmedPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmedPhone.isEmpty {
                metadata["phone"] = .string(trimmedPhone)
            }
            if let tenantSlug = AppConfig.tenantSlug {
                metadata["tenant_slug"] = .string(tenantSlug)
            }
            if let tenantName = AppConfig.tenantName {
                metadata["tenant_name"] = .string(tenantName)
            }
            let response = try await supabase.client.auth.signUp(email: email, password: password, data: metadata)
            if let session = response.session {
                _ = session
                let normalizedSession = try await supabase.client.auth.signIn(email: email, password: password)
                await handleSession(normalizedSession.user)
            } else {
                profile = nil
                familyName = nil
                state = .signedOut
                errorMessage = "Check your email to confirm your account before signing in."
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signOut() async {
        do {
            try await supabase.client.auth.signOut()
            profile = nil
            familyName = nil
            state = .signedOut
            accountDeletionMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteAccount() async {
        do {
            errorMessage = nil
            accountDeletionMessage = nil
            let _: DeleteAccountResponse = try await supabase.client.functions.invoke(
                "delete-account",
                options: .init(),
                decoder: JSONDecoder.mommysKitchen
            )

            do {
                try await supabase.client.auth.signOut()
            } catch {
                // Best effort. We still want the app to leave the deleted account state.
            }

            profile = nil
            familyName = nil
            state = .signedOut
            accountDeletionMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    var currentUser: User? {
        guard case let .signedIn(user) = state else { return nil }
        return user
    }

    private func handleSession(_ user: User?) async {
        guard let user else {
            profile = nil
            familyName = nil
            state = .signedOut
            return
        }

        state = .signedIn(user)
        do {
            let fetchedProfile = try await profileRepository.fetchCurrentProfile(userID: user.id)
            let fetchedFamilyName = try await profileRepository.fetchTenantName(userID: user.id)
            await appSettingsStore.refresh()
            if let requiredRole, fetchedProfile.role != requiredRole {
                profile = nil
                familyName = nil
                state = .signedOut
                errorMessage = roleMismatchMessage ?? "This account doesn’t have access to this app."
                try? await supabase.client.auth.signOut()
                return
            }
            profile = fetchedProfile
            familyName = fetchedFamilyName
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct DeleteAccountResponse: Decodable {
    let deleted: Bool
}
