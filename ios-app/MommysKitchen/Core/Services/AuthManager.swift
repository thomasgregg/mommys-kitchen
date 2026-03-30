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

    private let supabase: SupabaseService
    private let profileRepository: ProfileRepository
    private let appSettingsStore: AppSettingsStore
    private var authTask: Task<Void, Never>?

    init(
        supabase: SupabaseService,
        profileRepository: ProfileRepository,
        appSettingsStore: AppSettingsStore
    ) {
        self.supabase = supabase
        self.profileRepository = profileRepository
        self.appSettingsStore = appSettingsStore
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
            let session = try await supabase.client.auth.signIn(email: email, password: password)
            await handleSession(session.user)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signUp(fullName: String, phone: String, email: String, password: String) async {
        do {
            errorMessage = nil
            let metadata: [String: AnyJSON] = [
                "full_name": .string(fullName),
                "phone": .string(phone)
            ]
            let response = try await supabase.client.auth.signUp(email: email, password: password, data: metadata)
            await handleSession(response.user)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signOut() async {
        do {
            try await supabase.client.auth.signOut()
            profile = nil
            state = .signedOut
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
            profile = try await profileRequest
            _ = await settingsRequest
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
