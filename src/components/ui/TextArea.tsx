import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-y rounded-xl border border-neutral-300 bg-white p-3 text-base text-neutral-900 placeholder:text-neutral-400",
        "focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30",
        "disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500",
        className
      )}
      {...props}
    />
  );
}
