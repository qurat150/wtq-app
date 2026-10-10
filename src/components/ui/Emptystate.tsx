import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode; // anything renderable: emoji, SVG, component
};

export function EmptyState({ title, description, icon = "✨" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center">
      <div className="text-3xl" aria-hidden="true">
        {icon}
      </div>
      <p className="font-medium text-neutral-800">{title}</p>
      {description && (
        <p className="text-sm text-neutral-500">{description}</p>
      )}
    </div>
  );
}
