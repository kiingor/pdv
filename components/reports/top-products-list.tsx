import { Package } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL, formatNumber } from "@/lib/format";
import type { Id } from "@/convex/_generated/dataModel";

type TopProduct = {
  productId: Id<"products">;
  name: string;
  qty: number;
  totalCents: number;
};

type Props = {
  products: TopProduct[] | undefined;
};

/**
 * Lista os top 5 produtos vendidos no dia, com ranking visual,
 * quantidade e subtotal.
 */
export function TopProductsList({ products }: Props) {
  const list = products ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 produtos do dia</CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <Package className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Nenhum produto vendido ainda
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {list.map((p, i) => (
              <li
                key={p.productId as unknown as string}
                className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 hover:bg-muted/50"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(p.qty)} unidade{p.qty === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatBRL(p.totalCents)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
