"use client";

import { useState } from "react";
import {
  AlertCircle,
  Banknote,
  CreditCard,
  Smartphone,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Id } from "@/convex/_generated/dataModel";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/constants";
import { formatBRL, formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SaleItemMarginRow = {
  saleItemId: Id<"saleItems">;
  saleId: Id<"sales">;
  saleCreatedAt: number;
  productId: Id<"products">;
  productName: string;
  customerName: string | null;
  paymentMethod: PaymentMethod;
  quantity: number;
  unitPriceCents: number;
  catalogPriceCents: number;
  costPriceCents: number | null;
  subtotalCents: number;
  marginCents: number | null;
  marginPct: number | null;
  totalCostCents: number | null;
  totalProfitCents: number | null;
  priceVsCatalogCents: number;
};

type Props = {
  rows: SaleItemMarginRow[];
};

const PAGE_SIZE = 50;

/**
 * Tabela "Margem por venda" — uma linha por saleItem. Mostra preço aplicado
 * no PDV, comparando com o catálogo, e a margem real daquela venda.
 */
export function MarginBySaleTable({ rows }: Props) {
  return <Inner rows={rows} />;
}

function Inner({ rows }: Props) {
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const visible = rows.slice(0, pageSize);
  const hasMore = rows.length > visible.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Desktop: tabela */}
      <Card className="hidden md:block py-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Data</TableHead>
              <TableHead className="min-w-[160px]">Produto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Preço aplicado</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Margem %</TableHead>
              <TableHead className="text-right">Lucro item</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow key={r.saleItemId as unknown as string}>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {formatDateTime(r.saleCreatedAt)}
                </TableCell>
                <TableCell className="font-medium">{r.productName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.customerName ?? "Avulso"}
                </TableCell>
                <TableCell>
                  <PaymentBadge method={r.paymentMethod} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(r.quantity)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <AppliedPriceCell
                    appliedCents={r.unitPriceCents}
                    catalogCents={r.catalogPriceCents}
                    diffCents={r.priceVsCatalogCents}
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <CostCell cents={r.costPriceCents} />
                </TableCell>
                <TableCell className="text-right">
                  <MarginPctBadge pct={r.marginPct} />
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  <ProfitCell cents={r.totalProfitCents} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile: cards */}
      <ul className="md:hidden flex flex-col gap-2">
        {visible.map((r) => (
          <li key={r.saleItemId as unknown as string}>
            <Card className="px-4 py-3 gap-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{r.productName}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatDateTime(r.saleCreatedAt)}
                  </p>
                </div>
                <MarginPctBadge pct={r.marginPct} />
              </div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Qty:{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatNumber(r.quantity)}
                  </span>
                </span>
                <span>
                  Preço:{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatBRL(r.unitPriceCents)}
                  </span>
                  {r.priceVsCatalogCents !== 0 && (
                    <PriceDiffChip diffCents={r.priceVsCatalogCents} compact />
                  )}
                </span>
                <span>
                  Lucro:{" "}
                  <ProfitCell cents={r.totalProfitCents} />
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Cliente:{" "}
                  <span className="font-medium text-foreground">
                    {r.customerName ?? "Avulso"}
                  </span>
                </span>
                <span>
                  Forma:{" "}
                  <span className="font-medium text-foreground">
                    {PAYMENT_METHOD_LABELS[r.paymentMethod]}
                  </span>
                </span>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Mostrando {formatNumber(visible.length)} de {formatNumber(rows.length)}{" "}
          venda{rows.length === 1 ? "" : "s"}
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
  );
}

/* ------------------------------------------------------------------ */
/* sub-componentes                                                      */
/* ------------------------------------------------------------------ */

function AppliedPriceCell({
  appliedCents,
  catalogCents,
  diffCents,
}: {
  appliedCents: number;
  catalogCents: number;
  diffCents: number;
}) {
  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <span>{formatBRL(appliedCents)}</span>
      {diffCents !== 0 && (
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded px-1 text-[10px] font-semibold",
                  diffCents > 0
                    ? "bg-success/15 text-success"
                    : "bg-warning/15 text-warning",
                )}
              >
                {diffCents > 0 ? (
                  <TrendingUp className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                {diffCents > 0 ? "+" : "−"}
                {formatBRL(Math.abs(diffCents))}
              </span>
            }
          />
          <TooltipContent>
            Catálogo: {formatBRL(catalogCents)}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function PriceDiffChip({
  diffCents,
  compact,
}: {
  diffCents: number;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "ml-1 inline-flex items-center gap-0.5 rounded px-1 text-[10px] font-semibold",
        diffCents > 0
          ? "bg-success/15 text-success"
          : "bg-warning/15 text-warning",
      )}
    >
      {diffCents > 0 ? "+" : "−"}
      {formatBRL(Math.abs(diffCents))}
      {!compact && (
        <span className="ml-1 text-muted-foreground">vs catálogo</span>
      )}
    </span>
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
  return (
    <span
      className={cn(
        "tabular-nums",
        cents > 0 ? "text-success" : "text-destructive",
      )}
    >
      {formatBRL(cents)}
    </span>
  );
}

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
  const tone = pct < 0 ? "negative" : pct < 20 ? "warning" : "positive";
  const formatter = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        tone === "negative" && "bg-destructive/15 text-destructive",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "positive" && "bg-success/15 text-success",
      )}
    >
      {formatter.format(pct)}%
    </span>
  );
}

function PaymentBadge({ method }: { method: PaymentMethod }) {
  const Icon =
    method === "cash"
      ? Banknote
      : method === "pix"
        ? Smartphone
        : CreditCard;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {PAYMENT_METHOD_LABELS[method]}
    </span>
  );
}
