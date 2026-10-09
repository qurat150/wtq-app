export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
    >
      {message}
    </div>
  );
}
