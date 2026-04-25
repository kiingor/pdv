import { AppShell } from "@/components/layout/app-shell";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata = {
  title: "Relatórios · PDV Eventos",
};

export default function RelatoriosPage() {
  return (
    <AppShell>
      <ReportsView />
    </AppShell>
  );
}
