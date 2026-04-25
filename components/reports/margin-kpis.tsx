"use client";

import { DollarSign, PiggyBank, Receipt, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

export type MarginTotals = {
  /** Soma de `totalRevenueCents` de todos os produtos no período. */
  revenueCents: number;
  /** Soma de `totalCostCents` (apenas itens com custo cadastrado). */
  costCents: number | null;
  /** Soma de `totalProfitCents` (apenas itens com custo cadastrado). */
  profitCents: number | null;
  /** Margem média ponderada: `profitCents / revenueWithCostCents * 100`. */
  marginPct: number | null;
};

type Props = {
  totals: MarginTotals;
};

/**
 * Quatro KPIs do relatório de margem: Receita, Custo, Lucro e Margem média.
 * Lucro/Margem usam color coding (verde/vermelho) conforme sinal.
 * Quando o cálculo não é possível (sem nenhum produto com custo no período),
 * mostra "—".
 */
export function MarginKpis({ totals }: Props) {
  const profitTone = signTone(totals.profitCents);
  const marginTone = signTone(totals.marginPct);

  return (
    <section
      aria-label="Totais de margem do período"
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      <KpiCard
        label="Receita"
        value={formatBRL(totals.revenueCents)}
        icon={Receipt}
      />
      <KpiCard
        label="Custo total"
        value={
          totals.costCents === null ? "—" : formatBRL(totals.costCents)
        }
        icon={DollarSign}
        muted={totals.costCents === null}
      />
      <KpiCard
        label="Lucro"
        value={
          totals.profitCents === null
            ? "—"
            : formatBRL(totals.profitCents)
        }
        icon={PiggyBank}
        tone={totals.profitCents === null ? undefined : profitTone}
      />
      <KpiCard
        label="Margem média"
        value={
          totals.marginPct === null ? "—" : formatPct(totals.marginPct)
        }
        icon={TrendingUp}
        tone={totals.marginPct === null ? undefined : marginTone}
      />
    </section>
  );
}

/** Skeleton com a mesma forma da seção de KPIs, pra evitar layout shift. */
export function MarginKpisSkeleton() {
  return (
    <section
      aria-label="Totais de margem do período"
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-5 rounded-md" />
            </div>
            <Skeleton className="mt-3 h-8 w-28" />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */

type Tone = "positive" | "negative" | "neutral";

function signTone(n: number | null): Tone {
  if (n === null) return "neutral";
  if (n > 0) return "positive";
  if (n < 0) return "negative";
  return "neutral";
}

function formatPct(pct: number): string {
  const formatter = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${formatter.format(pct)}%`;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  muted,
}: {
  label: string;
  value: string;
  icon: typeof Receipt;
  tone?: Tone;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <p
          className={cn(
            "mt-2 text-3xl font-bold tracking-tight tabular-nums",
            tone === "positive" && "text-success",
            tone === "negative" && "text-destructive",
            muted && "text-muted-foreground",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
