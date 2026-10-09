// This file is at src/app/page.tsx, so it renders at the URL "/".
// No "use client" at the top, so this is a Server Component (Step 5 explains that).
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-md space-y-2 px-4 py-8">
      <h1 className="text-2xl font-bold">Interview Prep</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Coming soon: describe a role, get interview questions.
      </p>
    </main>
  );
}
