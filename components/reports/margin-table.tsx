"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Id } from "@/convex/_generated/dataModel";
import { formatBRL, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export type MarginRow = {
  productId: Id<"products">;
  name: string;
  active: boolean;
  /** Preço atual no catálogo. */
  priceCents: number;
  /** Preço médio que foi REALMENTE vendido no período. Null se não houve vendas. */
  avgSoldPriceCents: number | null;
  costPriceCents: number | null;
  /** Margem unit calculada com base no preço médio vendido (ou catálogo se sem vendas). */
  marginCents: number | null;
  marginPct: number | null;
  qtySold: number;
  totalRevenueCents: number;
  totalCostCents: number | null;
  totalProfitCents: number | null;
};

type SortKey = "marginPct" | "totalProfitCents";
type SortDir = "asc" | "desc";

type Props = {
  rows: MarginRow[];
};

const PAGE_SIZE = 50;

/**
 * Tabela do relatório de margem com sort por margem % e lucro,
 * variação responsiva (cards em mobile) e color coding por faixa de margem.
 */
export function MarginTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("marginPct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => compareRows(a, b, sortKey, sortDir));
    return arr;
  }, [rows, sortKey, sortDir]);

  const visible = sorted.slice(0, pageSize);
  const hasMore = sorted.length > visible.length;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        <Card className="hidden md:block py-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Produto</TableHead>
                <TableHead className="text-right">Qty vend.</TableHead>
                <TableHead className="text-right">Custo unit.</TableHead>
                <TableHead className="text-right">Preço médio</TableHead>
                <TableHead className="text-right">Margem unit.</TableHead>
                <TableHead className="text-right">
                  <SortButton
                    label="Margem %"
                    active={sortKey === "marginPct"}
                    dir={sortKey === "marginPct" ? sortDir : null}
                    onClick={() => toggleSort("marginPct")}
                  />
                </TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Custo período</TableHead>
                <TableHead className="text-right">
                  <SortButton
                    label="Lucro"
                    active={sortKey === "totalProfitCents"}
                    dir={sortKey === "totalProfitCents" ? sortDir : null}
                    onClick={() => toggleSort("totalProfitCents")}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.productId as unknown as string}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{r.name}</span>
                      {!r.active && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          Arquivado
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(r.qtySold)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <CostCell cents={r.costPriceCents} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <PriceCell
                      catalogCents={r.priceCents}
                      avgSoldCents={r.avgSoldPriceCents}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.marginCents === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={signTextClass(r.marginCents)}>
                        {formatBRL(r.marginCents)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <MarginPctBadge pct={r.marginPct} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.totalRevenueCents === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      formatBRL(r.totalRevenueCents)
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.totalCostCents === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : r.totalCostCents === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      formatBRL(r.totalCostCents)
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    <ProfitCell cents={r.totalProfitCents} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <ul className="md:hidden flex flex-col gap-2">
          {visible.map((r) => (
            <li key={r.productId as unknown as string}>
              <Card className="px-4 py-3 gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold truncate">{r.name}</p>
                  <MarginPctBadge pct={r.marginPct} />
                </div>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Qty:{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {formatNumber(r.qtySold)}
                    </span>
                  </span>
                  <span>
                    Receita:{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {r.totalRevenueCents === 0
                        ? "—"
                        : formatBRL(r.totalRevenueCents)}
                    </span>
                  </span>
                  <span>
                    Lucro:{" "}
                    <span className="tabular-nums">
                      <ProfitCell cents={r.totalProfitCents} />
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Custo unit.:{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      <CostCell cents={r.costPriceCents} />
                    </span>
                  </span>
                  <span>
                    Preço:{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      <PriceCell
                        catalogCents={r.priceCents}
                        avgSoldCents={r.avgSoldPriceCents}
                        compact
                      />
                    </span>
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {formatNumber(visible.length)} de{" "}
            {formatNumber(rows.length)} produto
            {rows.length === 1 ? "" : "s"}
          </p>
          {hasMore && (
            <button
              type="button"
              onClick={() => setPageSize((p) => p + PAGE_SIZE)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Ver mais{" "}
              {formatNumber(Math.min(PAGE_SIZE, rows.length - visible.length))}
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ------------------------------------------------------------------ */
/* sub-componentes                                                      */
/* ------------------------------------------------------------------ */

/**
 * Mostra o preço médio efetivamente vendido. Se diferir do catálogo,
 * inclui um chip indicando o ajuste (operador subiu/desceu o preço no PDV).
 *
 * compact=true → renderização inline pra cards mobile (sem chip).
 */
function PriceCell({
  catalogCents,
  avgSoldCents,
  compact = false,
}: {
  catalogCents: number;
  avgSoldCents: number | null;
  compact?: boolean;
}) {
  const effective = avgSoldCents ?? catalogCents;
  const diff =
    avgSoldCents !== null && avgSoldCents !== catalogCents
      ? avgSoldCents - catalogCents
      : 0;

  if (compact) {
    return <>{formatBRL(effective)}</>;
  }

  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <span>{formatBRL(effective)}</span>
      {diff !== 0 && (
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded px-1 text-[10px] font-semibold",
                  diff > 0
                    ? "bg-success/15 text-success"
                    : "bg-warning/15 text-warning",
                )}
              >
                {diff > 0 ? (
                  <TrendingUp className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                {diff > 0 ? "+" : "−"}
                {formatBRL(Math.abs(diff))}
              </span>
            }
          />
          <TooltipContent>
            Catálogo: {formatBRL(catalogCents)} ·{" "}
            {diff > 0 ? "vendido mais caro" : "vendido com desconto"}
          </TooltipContent>
        </Tooltip>
      )}
      {avgSoldCents === null && (
        <span className="text-[10px] text-muted-foreground">catálogo</span>
      )}
    </div>
  );
}

function CostCell({ cents }: { cents: number | null }) {
  if (cents === null) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              —
              <AlertCircle className="h-3 w-3" aria-hidden />
            </span>
          }
        />
        <TooltipContent>Custo não cadastrado</TooltipContent>
      </Tooltip>
    );
  }
  return <>{formatBRL(cents)}</>;
}

function ProfitCell({ cents }: { cents: number | null }) {
  if (cents === null) return <span className="text-muted-foreground">—</span>;
  if (cents === 0) return <span className="text-muted-foreground">—</span>;
  return <span className={signTextClass(cents)}>{formatBRL(cents)}</span>;
}

/**
 * Badge da coluna Margem %. Color thresholds:
 *  - null  → cinza "—" + ícone info
 *  - < 0   → destructive (vende abaixo do custo!)
 *  - 0..20 → warning (margem apertada)
 *  - >= 20 → success (saudável)
 */
function MarginPctBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              —
              <AlertCircle className="h-3 w-3" aria-hidden />
            </span>
          }
        />
        <TooltipContent>Custo não cadastrado</TooltipContent>
      </Tooltip>
    );
  }

  const tone = marginTone(pct);
  const formatted = formatPct(pct);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        tone === "negative" && "bg-destructive/15 text-destructive",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "positive" && "bg-success/15 text-success",
      )}
    >
      {formatted}
    </span>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-end gap-1 hover:text-primary",
        active ? "text-foreground" : "text-foreground/70",
      )}
    >
      {label}
      {dir === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : dir === "desc" ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */

type MarginToneKey = "negative" | "warning" | "positive";

function marginTone(pct: number): MarginToneKey {
  if (pct < 0) return "negative";
  if (pct < 20) return "warning";
  return "positive";
}

function signTextClass(cents: number): string {
  if (cents > 0) return "text-success";
  if (cents < 0) return "text-destructive";
  return "text-muted-foreground";
}

function formatPct(pct: number): string {
  const formatter = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${formatter.format(pct)}%`;
}

/**
 * Comparação de linhas pra sort. Aceita NULL em ambos os lados:
 * - Itens com valor NULL sempre vão para o final (independente de asc/desc),
 *   pra que "produtos sem custo" não poluam o topo da tabela.
 * - Empate → desempata pelo nome (estável e previsível).
 */
function compareRows(
  a: MarginRow,
  b: MarginRow,
  key: SortKey,
  dir: SortDir,
): number {
  const av = a[key];
  const bv = b[key];

  if (av === null && bv === null) {
    return a.name.localeCompare(b.name, "pt-BR");
  }
  if (av === null) return 1;
  if (bv === null) return -1;

  if (av !== bv) {
    return dir === "desc" ? bv - av : av - bv;
  }
  return a.name.localeCompare(b.name, "pt-BR");
}
