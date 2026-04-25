"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Calculator, Download } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { exportMarginToCsv } from "@/lib/csv-export";
import { formatNumber } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { MarginKpis, MarginKpisSkeleton, type MarginTotals } from "./margin-kpis";
import { MarginTable, type MarginRow } from "./margin-table";

type Props = {
  startMs: number;
  endMs: number;
};

/**
 * Tab de margem por produto. Consome `api.reports.marginReport` e mostra:
 *  - 4 KPIs (Receita, Custo total, Lucro, Margem média)
 *  - tabela com sort + variação responsiva (cards no mobile)
 *  - empty state quando NENHUM produto tem custo cadastrado
 */
export function MarginView({ startMs, endMs }: Props) {
  const data = useQuery(api.reports.marginReport, {
    startMs,
    endMs,
  }) as MarginRow[] | undefined;

  const isLoading = data === undefined;
  const rows = useMemo<MarginRow[]>(() => data ?? [], [data]);

  const totals = useMemo<MarginTotals>(() => computeTotals(rows), [rows]);

  const hasAnyCost = useMemo(
    () => rows.some((r) => r.costPriceCents !== null),
    [rows],
  );

  function handleExport() {
    if (rows.length === 0) {
      toast.warning("Nada pra exportar nesse período.");
      return;
    }
    try {
      const today = new Date().toISOString().slice(0, 10);
      exportMarginToCsv(rows, `margem-${today}.csv`);
      toast.success("CSV exportado!", {
        description: `${formatNumber(rows.length)} produto${rows.length === 1 ? "" : "s"} no arquivo.`,
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
        <MarginKpisSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  // Caso 1: nenhum produto retornado e nenhum tem custo → empty state CTA.
  // O backend só retorna produtos com custo cadastrado OU com vendas no período,
  // então `rows.length === 0` significa: nada vendido E nada com custo.
  if (rows.length === 0 || !hasAnyCost) {
    return (
      <div className="flex flex-col gap-6">
        <NoCostsEmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={rows.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <MarginKpis totals={totals} />

      <MarginTable rows={rows} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */

/**
 * Agrega os totais do período pros KPIs.
 *
 * Regras de null safety:
 *  - Receita soma TODOS os produtos (mesmo sem custo).
 *  - Custo/Lucro só somam itens com custo cadastrado. Se NENHUM item
 *    tem custo no período, retornam `null` (KPI mostra "—").
 *  - Margem média é ponderada por receita (lucro_total / receita_dos_que_têm_custo)
 *    pra refletir o quanto da operação que dá pra medir está performando.
 *  - Se a receita-com-custo for 0 (vende só produtos sem custo), margem = null.
 */
function computeTotals(rows: MarginRow[]): MarginTotals {
  let revenueCents = 0;
  let costCents = 0;
  let profitCents = 0;
  let revenueWithCostCents = 0;
  let anyWithCost = false;

  for (const r of rows) {
    revenueCents += r.totalRevenueCents;
    if (r.totalCostCents !== null && r.totalProfitCents !== null) {
      anyWithCost = true;
      costCents += r.totalCostCents;
      profitCents += r.totalProfitCents;
      revenueWithCostCents += r.totalRevenueCents;
    }
  }

  const marginPct =
    anyWithCost && revenueWithCostCents > 0
      ? (profitCents / revenueWithCostCents) * 100
      : null;

  return {
    revenueCents,
    costCents: anyWithCost ? costCents : null,
    profitCents: anyWithCost ? profitCents : null,
    marginPct,
  };
}

function NoCostsEmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Calculator className="h-12 w-12 text-muted-foreground" aria-hidden />
      <h3 className="text-lg font-semibold">Sem dados de margem ainda</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Cadastre o preço de custo dos produtos pra ver a margem completa.
      </p>
      <Button
        className="mt-2"
        render={<Link href="/produtos">Ir pra Produtos</Link>}
      />
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card className="py-0">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex flex-col divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
}
