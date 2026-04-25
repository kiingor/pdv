import Link from "next/link";
import { PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Estado mostrado no dashboard quando ainda não houve venda no dia.
 * Tom alegre, com CTA pra abrir o PDV.
 */
export function DashboardEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <PartyPopper className="h-16 w-16 text-muted-foreground" />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">
            Ainda não houve vendas hoje
          </h2>
          <p className="text-sm text-muted-foreground">
            Bora começar? O dia tá zerado, esperando o primeiro pedido.
          </p>
        </div>
        <Button
          size="lg"
          render={<Link href="/pdv">Ir pro PDV</Link>}
          nativeButton={false}
        />
      </CardContent>
    </Card>
  );
}
