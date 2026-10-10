// Server Component: stays thin, just renders the feature's client screen.
import { BillApp } from "@/features/bill";

export default function Home() {
  return <BillApp />;
}
