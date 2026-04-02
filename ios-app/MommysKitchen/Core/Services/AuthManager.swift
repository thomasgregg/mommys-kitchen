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
    @Published var errorMessage: String?
    @Published var accountDeletionMessage: String?

    private let supabase: SupabaseService
    private let profileRepository: ProfileRepository
    private let appSettingsStore: AppSettingsStore
    private let requiredRole: Profile.Role?
    private let roleMismatchMessage: String?
    private var authTask: Task<Void, Never>?

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
        authTask = Task {
            await restoreSession()
            for await (_, session) in supabase.client.auth.authStateChanges {
                await handleSession(session?.user)
            }
        }
    }

    func stop() {
        authTask?.cancel()
        authTask = nil
    }

    func restoreSession() async {
        do {
            let session = try await supabase.client.auth.session
            await handleSession(session.user)
        } catch {
            state = .signedOut
        }
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
            let response = try await supabase.client.auth.signUp(email: email, password: password, data: metadata)
            if let session = response.session {
                _ = session
                let normalizedSession = try await supabase.client.auth.signIn(email: email, password: password)
                await handleSession(normalizedSession.user)
            } else {
                profile = nil
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
            state = .signedOut
            return
        }

        state = .signedIn(user)
        do {
            async let profileRequest = profileRepository.fetchCurrentProfile(userID: user.id)
            async let settingsRequest = appSettingsStore.refresh()
            let fetchedProfile = try await profileRequest
            _ = await settingsRequest
            if let requiredRole, fetchedProfile.role != requiredRole {
                profile = nil
                state = .signedOut
                errorMessage = roleMismatchMessage ?? "This account doesn’t have access to this app."
                try? await supabase.client.auth.signOut()
                return
            }
            profile = fetchedProfile
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct DeleteAccountResponse: Decodable {
    let deleted: Bool
}
