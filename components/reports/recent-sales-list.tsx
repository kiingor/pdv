import { Receipt } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL, formatTime } from "@/lib/format";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import type { Id } from "@/convex/_generated/dataModel";

type RecentSale = {
  _id: Id<"sales">;
  _creationTime: number;
  customerName?: string;
  totalCents: number;
  paymentMethod: PaymentMethod;
  itemCount: number;
};

type Props = {
  sales: RecentSale[] | undefined;
};

/**
 * Lista as últimas 10 vendas do dia, com hora, cliente, forma de pagamento
 * (com ícone) e total. Pensado pro dashboard — não é tabela completa.
 */
export function RecentSalesList({ sales }: Props) {
  const list = (sales ?? []).slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimas vendas</CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Nenhuma venda ainda
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y">
            {list.map((s) => {
              const meta = PAYMENT_METHODS.find(
                (m) => m.value === s.paymentMethod,
              );
              const Icon = meta?.icon ?? Receipt;
              return (
                <li
                  key={s._id as unknown as string}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="w-12 shrink-0 text-xs font-mono text-muted-foreground">
                    {formatTime(s._creationTime)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {s.customerName ?? "Avulso"}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon className={`h-3 w-3 ${meta?.color ?? ""}`} />
                      <span>{meta?.label ?? s.paymentMethod}</span>
                      <span className="opacity-60">
                        · {s.itemCount} item{s.itemCount === 1 ? "" : "s"}
                      </span>
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-primary">
                    {formatBRL(s.totalCents)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
