// Server Component (no "use client"): stays thin, just renders the feature's client screen.
import { GeneratorScreen } from "@/features/generator";

export default function Home() {
  return <GeneratorScreen />;
}