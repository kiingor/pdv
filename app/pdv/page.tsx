import { AppShell } from "@/components/layout/app-shell";
import { PdvScreen } from "@/components/pdv/pdv-screen";

export const metadata = {
  title: "PDV · PDV Eventos",
};

type SearchParams = Promise<{ kiosk?: string }>;

export default async function PdvPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { kiosk } = await searchParams;
  const isKiosk = kiosk === "1";

  if (isKiosk) {
    return <PdvScreen kioskMode />;
  }

  return (
    <AppShell>
      <PdvScreen />
    </AppShell>
  );
}
