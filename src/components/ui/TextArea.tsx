import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-y rounded-xl border border-line bg-surface p-3 text-base text-ink placeholder:text-neutral-400",
        "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
        "disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
