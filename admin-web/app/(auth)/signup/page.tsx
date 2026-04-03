import { SignupForm } from "@/components/auth/signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen px-4 py-10 md:px-6 md:py-16">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full items-center justify-center">
        <SignupForm error={error} />
      </div>
    </main>
  );
}
