"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Download, Receipt } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { exportSaleItemMarginToCsv } from "@/lib/csv-export";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatBRL, formatDateTime, formatNumber } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  MarginBySaleTable,
  type SaleItemMarginRow,
} from "./margin-by-sale-table";

type Props = {
  startMs: number;
  endMs: number;
};

/**
 * Tab "Margem por venda" — drill-down item-a-item. Mostra cada saleItem do
 * período com a margem REAL aplicada (preço efetivo da venda, não catálogo).
 *
 * Útil quando o operador altera o preço no PDV — diferente do "Margem por
 * produto" que agrega por SKU, este expõe cada venda individual.
 */
export function MarginBySaleView({ startMs, endMs }: Props) {
  const data = useQuery(api.reports.marginBySaleItem, {
    startMs,
    endMs,
  }) as SaleItemMarginRow[] | undefined;

  const isLoading = data === undefined;
  const rows = useMemo<SaleItemMarginRow[]>(() => data ?? [], [data]);

  const totals = useMemo(() => computeTotals(rows), [rows]);

  function handleExport() {
    if (rows.length === 0) {
      toast.warning("Nada pra exportar nesse período.");
      return;
    }
    try {
      const today = new Date().toISOString().slice(0, 10);
      exportSaleItemMarginToCsv(
        rows.map((r) => ({
          saleCreatedAt: r.saleCreatedAt,
          productName: r.productName,
          customerName: r.customerName,
          paymentMethodLabel: PAYMENT_METHOD_LABELS[r.paymentMethod],
          quantity: r.quantity,
          unitPriceCents: r.unitPriceCents,
          catalogPriceCents: r.catalogPriceCents,
          costPriceCents: r.costPriceCents,
          subtotalCents: r.subtotalCents,
          marginCents: r.marginCents,
          marginPct: r.marginPct,
          totalProfitCents: r.totalProfitCents,
        })),
        `margem-por-venda-${today}.csv`,
        formatDateTime,
      );
      toast.success("CSV exportado!", {
        description: `${formatNumber(rows.length)} item${rows.length === 1 ? "" : "s"} no arquivo.`,
      });
    } catch (err) {
      toast.error("Não deu pra exportar", {
        description: err instanceof Error ? err.message : "Tenta de novo.",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Card className="py-0">
          <div className="border-b px-4 py-3">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex flex-col divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Receipt className="h-12 w-12 text-muted-foreground" aria-hidden />
        <h3 className="text-lg font-semibold">Sem vendas no período</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Nenhum item foi vendido no intervalo selecionado.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Itens vendidos"
          value={formatNumber(totals.itemCount)}
          hint={`${formatNumber(totals.lineCount)} linha${totals.lineCount === 1 ? "" : "s"}`}
        />
        <Kpi label="Receita" value={formatBRL(totals.revenueCents)} />
        <Kpi
          label="Lucro"
          value={
            totals.profitCents === null ? "—" : formatBRL(totals.profitCents)
          }
          tone={
            totals.profitCents === null
              ? undefined
              : totals.profitCents > 0
                ? "positive"
                : totals.profitCents < 0
                  ? "negative"
                  : undefined
          }
        />
        <Kpi
          label="Itens c/ ajuste de preço"
          value={formatNumber(totals.adjustedCount)}
          hint={
            totals.adjustedCount === 0
              ? "Nenhum ajustado no PDV"
              : `${formatNumber(totals.adjustedUpCount)} ↑ · ${formatNumber(totals.adjustedDownCount)} ↓`
          }
        />
      </section>

      <MarginBySaleTable rows={rows} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* sub-componentes                                                      */
/* ------------------------------------------------------------------ */

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-2 text-3xl font-bold tracking-tight tabular-nums",
            tone === "positive" && "text-success",
            tone === "negative" && "text-destructive",
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */

type Totals = {
  lineCount: number;
  itemCount: number;
  revenueCents: number;
  profitCents: number | null;
  adjustedCount: number;
  adjustedUpCount: number;
  adjustedDownCount: number;
};

function computeTotals(rows: SaleItemMarginRow[]): Totals {
  let itemCount = 0;
  let revenueCents = 0;
  let profitCents = 0;
  let anyWithCost = false;
  let adjustedUp = 0;
  let adjustedDown = 0;

  for (const r of rows) {
    itemCount += r.quantity;
    revenueCents += r.subtotalCents;
    if (r.totalProfitCents !== null) {
      anyWithCost = true;
      profitCents += r.totalProfitCents;
    }
    if (r.priceVsCatalogCents > 0) adjustedUp += 1;
    else if (r.priceVsCatalogCents < 0) adjustedDown += 1;
  }

  return {
    lineCount: rows.length,
    itemCount,
    revenueCents,
    profitCents: anyWithCost ? profitCents : null,
    adjustedCount: adjustedUp + adjustedDown,
    adjustedUpCount: adjustedUp,
    adjustedDownCount: adjustedDown,
  };
}
