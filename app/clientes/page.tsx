import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { CustomersTable } from "@/components/customers/customers-table";

export const metadata: Metadata = {
  title: "Clientes — PDV Eventos",
  description: "Cadastre quem compra com você.",
};

export default function ClientesPage() {
  return (
    <AppShell>
      <CustomersTable />
    </AppShell>
  );
}
