import { AppShell } from "@/components/layout/app-shell";
import { DashboardView } from "@/components/reports/dashboard-view";

export default function HomePage() {
  return (
    <AppShell>
      <DashboardView />
    </AppShell>
  );
}
