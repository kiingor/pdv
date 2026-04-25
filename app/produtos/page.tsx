import { AppShell } from "@/components/layout/app-shell";
import { ProductsList } from "@/components/products/products-list";

export const metadata = {
  title: "Produtos · PDV Eventos",
};

export default function ProdutosPage() {
  return (
    <AppShell>
      <ProductsList />
    </AppShell>
  );
}
