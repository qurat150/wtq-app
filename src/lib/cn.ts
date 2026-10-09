// Joins Tailwind class names, skipping falsy values. The web version of
// RN's style={[styles.a, isActive && styles.b]}.
// cn("p-4", isActive && "bg-violet-600") -> "p-4 bg-violet-600" or "p-4"
export function cn(...classes: (string | false | null | undefined)[]) {
  // ...classes = rest parameter: collects all arguments into an array.
  // filter(Boolean) drops false/null/undefined/"" before joining with spaces.
  return classes.filter(Boolean).join(" ");
}
