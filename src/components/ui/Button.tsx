import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  loading?: boolean;
};

const variants = {
  primary:
    "bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400 dark:text-neutral-950",
  secondary:
    "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className,
  children,
  // Web gotcha: a <button> inside a <form> defaults to type="submit".
  // Defaulting to "button" stops accidental form submits.
  type = "button",
  ...props // everything else (onClick, aria-label...) passes straight through
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className // last, so callers can override
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
