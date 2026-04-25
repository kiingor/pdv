"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Download, DollarSign, Receipt, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/constants";
import { formatBRL, formatNumber } from "@/lib/format";
import { defaultCsvFilename, exportSalesToCsv } from "@/lib/csv-export";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { DateRangePicker, presetRange, type DateRange } from "./date-range-picker";
import { KpiCard, KpiCardSkeleton } from "./kpi-card";
import { MarginView } from "./margin-view";
import { MarginBySaleView } from "./margin-by-sale-view";
import {
  ReportFilters,
  type ReportFilterValues,
} from "./report-filters";
import { SalesTable, type SaleRow } from "./sales-table";
import { SaleDetailDialog } from "./sale-detail-dialog";
import { EditSaleDialog } from "./edit-sale-dialog";
import { DeleteSaleDialog } from "./delete-sale-dialog";

type CustomerLite = {
  _id: Id<"customers">;
  name: string;
};

type ProductLite = {
  _id: Id<"products">;
  name: string;
};

type SalesReportResult = {
  sales: Array<{
    _id: Id<"sales">;
    _creationTime: number;
    customerName?: string;
    customer?: { _id: Id<"customers">; name: string } | null;
    totalCents: number;
    paymentMethod: PaymentMethod;
    itemCount: number;
  }>;
  totals: { count: number; totalCents: number; itemCount: number };
};

type TabValue = "vendas" | "margem" | "margem-venda";

/**
 * Tela de relatórios com 3 tabs: Vendas, Margem por produto, Margem por venda.
 * O filtro de período fica fora dos `TabsContent` pra ser compartilhado
 * entre as views — alterar o range atualiza todas.
 */
export function ReportsView() {
  const [tab, setTab] = useState<TabValue>("vendas");
  const [range, setRange] = useState<DateRange>(() => presetRange("today"));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Relatórios
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe vendas e margem (por produto ou venda a venda).
        </p>
      </header>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === "vendas" || value === "margem" || value === "margem-venda") {
            setTab(value);
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="margem">Margem por produto</TabsTrigger>
          <TabsTrigger value="margem-venda">Margem por venda</TabsTrigger>
        </TabsList>

        <Card className="sticky top-2 z-20 mt-3 px-4 py-3 lg:top-4">
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker value={range} onChange={setRange} />
            <p className="text-xs text-muted-foreground">
              Período aplicado às três abas.
            </p>
          </div>
        </Card>

        <TabsContent value="vendas" className="mt-4">
          <SalesTab range={range} />
        </TabsContent>

        <TabsContent value="margem" className="mt-4">
          <MarginView startMs={range.from.getTime()} endMs={range.to.getTime()} />
        </TabsContent>

        <TabsContent value="margem-venda" className="mt-4">
          <MarginBySaleView
            startMs={range.from.getTime()}
            endMs={range.to.getTime()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab Vendas — conteúdo extraído sem mudar comportamento original.    */
/* ------------------------------------------------------------------ */

function SalesTab({ range }: { range: DateRange }) {
  const [filters, setFilters] = useState<ReportFilterValues>({});
  const [detailSaleId, setDetailSaleId] = useState<Id<"sales"> | null>(null);
  const [editSaleId, setEditSaleId] = useState<Id<"sales"> | null>(null);
  const [deleteSale, setDeleteSale] = useState<SaleRow | null>(null);

  const customers = useQuery(api.customers.list, {}) as
    | CustomerLite[]
    | undefined;
  const products = useQuery(api.products.listAll, {}) as
    | ProductLite[]
    | undefined;

  const report = useQuery(api.reports.salesReport, {
    startMs: range.from.getTime(),
    endMs: range.to.getTime(),
    filters: {
      customerId: filters.customerId,
      paymentMethod: filters.paymentMethod,
      productId: filters.productId,
    },
  }) as SalesReportResult | undefined;

  const isLoading = report === undefined;

  const tableRows: SaleRow[] = useMemo(
    () =>
      (report?.sales ?? []).map((s) => ({
        _id: s._id,
        _creationTime: s._creationTime,
        customerName: s.customerName ?? s.customer?.name ?? null,
        totalCents: s.totalCents,
        paymentMethod: s.paymentMethod,
        itemCount: s.itemCount,
      })),
    [report?.sales],
  );

  function handleExport() {
    if (!report || tableRows.length === 0) {
      toast.warning("Sem vendas pra exportar nesse período.");
      return;
    }
    try {
      exportSalesToCsv(
        tableRows.map((s) => ({
          _creationTime: s._creationTime,
          customerName: s.customerName,
          itemCount: s.itemCount,
          paymentMethod: s.paymentMethod,
          totalCents: s.totalCents,
        })),
        defaultCsvFilename(),
      );
      toast.success("CSV exportado!", {
        description: `${formatNumber(tableRows.length)} venda${tableRows.length === 1 ? "" : "s"} no arquivo.`,
      });
    } catch (err) {
      toast.error("Não deu pra exportar", {
        description: err instanceof Error ? err.message : "Tenta de novo.",
      });
    }
  }

  function handleViewDetails(sale: SaleRow) {
    setDetailSaleId(sale._id);
  }

  function handleEdit(sale: SaleRow) {
    setEditSaleId(sale._id);
  }

  function handleDelete(sale: SaleRow) {
    setDeleteSale(sale);
  }

  const filterChips = useMemo(
    () => buildFilterChips(filters, customers, products),
    [filters, customers, products],
  );

  function clearFilter(key: keyof ReportFilterValues) {
    const next = { ...filters };
    delete next[key];
    setFilters(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <ReportFilters value={filters} onChange={setFilters} />
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!report || tableRows.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {filterChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {filterChips.map((chip) => (
              <Badge
                key={chip.key}
                variant="secondary"
                className="gap-1 pr-1"
              >
                <span className="opacity-70">{chip.label}:</span> {chip.value}
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="-mr-0.5 ml-0.5 hover:bg-foreground/10"
                  aria-label={`Remover filtro ${chip.label}`}
                  onClick={() => clearFilter(chip.key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <section
        aria-label="Totais do período"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {isLoading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Total vendido"
              value={formatBRL(report.totals.totalCents)}
              icon={DollarSign}
              highlight
            />
            <KpiCard
              label="Qtd de vendas"
              value={formatNumber(report.totals.count)}
              icon={Receipt}
            />
            <KpiCard
              label="Itens vendidos"
              value={formatNumber(report.totals.itemCount)}
              icon={ShoppingBag}
            />
          </>
        )}
      </section>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <SalesTable
          sales={tableRows}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <SaleDetailDialog
        saleId={detailSaleId}
        onOpenChange={(open) => !open && setDetailSaleId(null)}
      />
      <EditSaleDialog
        saleId={editSaleId}
        onOpenChange={(open) => !open && setEditSaleId(null)}
      />
      <DeleteSaleDialog
        sale={deleteSale}
        onOpenChange={(open) => !open && setDeleteSale(null)}
      />
    </div>
  );
}

type FilterChip = {
  key: keyof ReportFilterValues;
  label: string;
  value: string;
};

function buildFilterChips(
  filters: ReportFilterValues,
  customers: CustomerLite[] | undefined,
  products: ProductLite[] | undefined,
): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.customerId) {
    const c = customers?.find((x) => x._id === filters.customerId);
    chips.push({
      key: "customerId",
      label: "Cliente",
      value: c?.name ?? "—",
    });
  }
  if (filters.paymentMethod) {
    chips.push({
      key: "paymentMethod",
      label: "Forma",
      value: PAYMENT_METHOD_LABELS[filters.paymentMethod],
    });
  }
  if (filters.productId) {
    const p = products?.find((x) => x._id === filters.productId);
    chips.push({
      key: "productId",
      label: "Produto",
      value: p?.name ?? "—",
    });
  }

  return chips;
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
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
}
