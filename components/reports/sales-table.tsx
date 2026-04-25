"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, formatDateTime, formatNumber } from "@/lib/format";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/constants";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export type SaleRow = {
  _id: Id<"sales">;
  _creationTime: number;
  customerName?: string | null;
  totalCents: number;
  paymentMethod: PaymentMethod;
  itemCount: number;
};

type SortDir = "asc" | "desc";

type Props = {
  sales: SaleRow[];
  onViewDetails?: (sale: SaleRow) => void;
  onEdit?: (sale: SaleRow) => void;
  onDelete?: (sale: SaleRow) => void;
};

const PAGE_SIZE = 50;

/**
 * Tabela de vendas com sort por data, paginação simples ("ver mais") e
 * variação responsiva (cards no mobile, tabela em md+).
 */
export function SalesTable({ sales, onViewDetails, onEdit, onDelete }: Props) {
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const sorted = useMemo(() => {
    const arr = [...sales];
    arr.sort((a, b) =>
      sortDir === "desc"
        ? b._creationTime - a._creationTime
        : a._creationTime - b._creationTime,
    );
    return arr;
  }, [sales, sortDir]);

  const visible = sorted.slice(0, pageSize);
  const hasMore = sorted.length > visible.length;

  if (sales.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Search className="h-12 w-12 text-muted-foreground/60" />
        <h3 className="text-lg font-semibold">
          Nenhuma venda no período selecionado
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tente alargar o intervalo de datas ou remover algum filtro.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="hidden md:block py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">
                <button
                  type="button"
                  onClick={() =>
                    setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                  }
                  className="inline-flex items-center gap-1 text-foreground hover:text-primary"
                >
                  Data / Hora
                  <SortIcon dir={sortDir} />
                </button>
              </TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Itens</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-12 text-right">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((s) => {
              const meta = PAYMENT_METHODS.find(
                (m) => m.value === s.paymentMethod,
              );
              const Icon = meta?.icon;
              return (
                <TableRow key={s._id as unknown as string}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatDateTime(s._creationTime)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {s.customerName ?? (
                      <span className="text-muted-foreground">Avulso</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(s.itemCount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {Icon && (
                        <Icon
                          className={cn("h-3 w-3", meta?.color)}
                          aria-hidden
                        />
                      )}
                      {PAYMENT_METHOD_LABELS[s.paymentMethod]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary tabular-nums">
                    {formatBRL(s.totalCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    <SaleActionsMenu
                      sale={s}
                      onViewDetails={onViewDetails}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <ul className="md:hidden flex flex-col gap-2">
        {visible.map((s) => {
          const meta = PAYMENT_METHODS.find(
            (m) => m.value === s.paymentMethod,
          );
          const Icon = meta?.icon;
          return (
            <li key={s._id as unknown as string}>
              <Card className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {s.customerName ?? (
                        <span className="text-muted-foreground">Avulso</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatDateTime(s._creationTime)}
                    </p>
                  </div>
                  <p className="font-bold text-primary tabular-nums">
                    {formatBRL(s.totalCents)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Badge variant="outline" className="gap-1">
                    {Icon && (
                      <Icon
                        className={cn("h-3 w-3", meta?.color)}
                        aria-hidden
                      />
                    )}
                    {PAYMENT_METHOD_LABELS[s.paymentMethod]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(s.itemCount)} item
                    {s.itemCount === 1 ? "" : "s"}
                  </span>
                  <SaleActionsMenu
                    sale={s}
                    onViewDetails={onViewDetails}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Mostrando {formatNumber(visible.length)} de {formatNumber(sales.length)}{" "}
          venda{sales.length === 1 ? "" : "s"}
        </p>
        {hasMore && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageSize((p) => p + PAGE_SIZE)}
          >
            Ver mais {Math.min(PAGE_SIZE, sales.length - visible.length)}
          </Button>
        )}
      </div>
    </div>
  );
}

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (dir === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  if (dir === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5" />;
}

function SaleActionsMenu({
  sale,
  onViewDetails,
  onEdit,
  onDelete,
}: {
  sale: SaleRow;
  onViewDetails?: (sale: SaleRow) => void;
  onEdit?: (sale: SaleRow) => void;
  onDelete?: (sale: SaleRow) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Ações da venda de ${formatBRL(sale.totalCents)}`}
          />
        }
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onViewDetails && (
          <DropdownMenuItem onClick={() => onViewDetails(sale)}>
            <Eye className="h-4 w-4" />
            Ver detalhes
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(sale)}>
            <Pencil className="h-4 w-4" />
            Editar
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(sale)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
