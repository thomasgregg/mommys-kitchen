import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="min-h-screen px-4 py-10 md:px-6 md:py-16">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full items-center justify-center">
        <LoginForm error={error} message={message} />
      </div>
    </main>
  );
}
