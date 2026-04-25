"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/constants";
import { formatBRL, formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  saleId: Id<"sales"> | null;
  onOpenChange: (open: boolean) => void;
};

type SaleDetail = {
  sale: {
    _id: Id<"sales">;
    _creationTime: number;
    customerName?: string;
    paymentMethod: PaymentMethod;
    totalCents: number;
    itemCount: number;
    status: "completed" | "cancelled";
    notes?: string;
  };
  items: Array<{
    _id: Id<"saleItems">;
    productName: string;
    unitPriceCents: number;
    quantity: number;
    subtotalCents: number;
    productPhotoUrl: string | null;
  }>;
  customer: { _id: Id<"customers">; name: string; phone: string } | null;
};

/**
 * Dialog read-only com itens, totais e meta da venda.
 * Para EDITAR, o operador usa o EditSaleDialog (cliente/forma/notes).
 * Para mudar itens/qty/preço: precisa cancelar e recriar a venda.
 */
export function SaleDetailDialog({ saleId, onOpenChange }: Props) {
  const data = useQuery(
    api.sales.get,
    saleId ? { id: saleId } : "skip",
  ) as SaleDetail | null | undefined;

  return (
    <Dialog open={saleId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da venda</DialogTitle>
          <DialogDescription>
            {saleId
              ? `#${String(saleId).slice(-6).toUpperCase()}`
              : "Carregando..."}
          </DialogDescription>
        </DialogHeader>

        {data === undefined ? (
          <SkeletonBody />
        ) : data === null ? (
          <p className="text-sm text-muted-foreground">
            Venda não encontrada (talvez tenha sido excluída).
          </p>
        ) : (
          <Body detail={data} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Body({ detail }: { detail: SaleDetail }) {
  const { sale, items, customer } = detail;
  const meta = PAYMENT_METHODS.find((m) => m.value === sale.paymentMethod);
  const Icon = meta?.icon;

  return (
    <div className="flex flex-col gap-4">
      {/* Meta */}
      <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-sm">
        <Row label="Data">{formatDateTime(sale._creationTime)}</Row>
        <Row label="Status">
          <Badge
            variant={sale.status === "cancelled" ? "destructive" : "secondary"}
            className={cn(
              sale.status === "completed" &&
                "bg-success/15 text-success border-success/20",
            )}
          >
            {sale.status === "completed" ? "Concluída" : "Cancelada"}
          </Badge>
        </Row>
        <Row label="Cliente">
          {customer ? (
            <span>
              {customer.name}{" "}
              <span className="text-xs text-muted-foreground font-mono">
                {customer.phone}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Avulso</span>
          )}
        </Row>
        <Row label="Forma">
          <Badge variant="outline" className="gap-1">
            {Icon && (
              <Icon className={cn("h-3 w-3", meta?.color)} aria-hidden />
            )}
            {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
          </Badge>
        </Row>
        {sale.notes && (
          <Row label="Obs.">
            <span className="text-foreground/80">{sale.notes}</span>
          </Row>
        )}
      </div>

      {/* Itens */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Itens ({formatNumber(sale.itemCount)})
        </p>
        <ul className="flex flex-col divide-y border rounded-lg overflow-hidden">
          {items.map((item) => (
            <li
              key={item._id as unknown as string}
              className="flex items-center gap-3 p-2.5"
            >
              {item.productPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.productPhotoUrl}
                  alt=""
                  className="h-10 w-10 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-gradient-to-br from-primary/20 via-chart-2/20 to-chart-3/20 text-sm font-bold text-primary/70">
                  {item.productName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.productName}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatNumber(item.quantity)} ×{" "}
                  {formatBRL(item.unitPriceCents)}
                </p>
              </div>
              <p className="text-sm font-bold text-primary tabular-nums">
                {formatBRL(item.subtotalCents)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <Separator />

      <div className="flex items-baseline justify-between text-base">
        <span className="font-semibold">Total</span>
        <span className="text-2xl font-bold text-primary tabular-nums">
          {formatBRL(sale.totalCents)}
        </span>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function SkeletonBody() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}
