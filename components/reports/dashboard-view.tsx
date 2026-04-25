"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { DollarSign, Package, Receipt, TrendingUp } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { formatBRL, formatDate, formatNumber } from "@/lib/format";
import type { PaymentMethod } from "@/lib/constants";
import type { Id } from "@/convex/_generated/dataModel";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, KpiCardSkeleton } from "./kpi-card";
import { SalesByHourChart } from "./sales-by-hour-chart";
import { PaymentMethodChart } from "./payment-method-chart";
import { TopProductsList } from "./top-products-list";
import { RecentSalesList } from "./recent-sales-list";
import { DashboardEmptyState } from "./dashboard-empty-state";

type DashboardStats = {
  todayTotalCents: number;
  todayCount: number;
  todayItemCount: number;
  ticketAvgCents: number;
  byPaymentMethod: Record<PaymentMethod, { count: number; totalCents: number }>;
  topProducts: Array<{
    productId: Id<"products">;
    name: string;
    qty: number;
    totalCents: number;
  }>;
};

type RecentSale = {
  _id: Id<"sales">;
  _creationTime: number;
  customerName?: string;
  totalCents: number;
  paymentMethod: PaymentMethod;
  itemCount: number;
};

type HourBucket = { hour: number; totalCents: number; count: number };

/**
 * Dashboard principal — KPIs do dia, gráficos (vendas/hora e formas de
 * pagamento) e listas de top produtos / últimas vendas. Calcula o
 * `todayStartMs` no client (00:00 local) e dispara as queries Convex.
 */
export function DashboardView() {
  const bounds = useTodayBounds();

  const stats = useQuery(
    api.reports.dashboardStats,
    bounds ? { todayStartMs: bounds.todayStartMs } : "skip",
  ) as DashboardStats | undefined;

  const recent = useQuery(api.sales.listRecent, { limit: 10 }) as
    | RecentSale[]
    | undefined;

  const byHour = useQuery(
    api.reports.salesByHour,
    bounds
      ? { startMs: bounds.todayStartMs, endMs: bounds.todayEndMs }
      : "skip",
  ) as HourBucket[] | undefined;

  const greeting = useMemo(
    () => (bounds ? greetingFor(new Date(bounds.now)) : "Olá"),
    [bounds],
  );
  const isLoading = !bounds || stats === undefined;
  const isEmpty = !isLoading && stats.todayCount === 0;
  const topProduct = stats?.topProducts[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          {greeting}, time!
        </h1>
        <p className="text-sm text-muted-foreground">
          Aqui está o resumo do dia
          {bounds ? ` · ${formatDate(bounds.now)}` : ""}
        </p>
      </header>

      {isLoading ? (
        <LoadingState />
      ) : isEmpty ? (
        <DashboardEmptyState />
      ) : (
        <>
          <section
            aria-label="Indicadores do dia"
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            <KpiCard
              label="Vendas hoje"
              value={formatBRL(stats.todayTotalCents)}
              icon={DollarSign}
              hint={`${formatNumber(stats.todayItemCount)} item${stats.todayItemCount === 1 ? "" : "s"} vendido${stats.todayItemCount === 1 ? "" : "s"}`}
              highlight
            />
            <KpiCard
              label="Ticket médio"
              value={formatBRL(stats.ticketAvgCents)}
              icon={TrendingUp}
              hint="Média por venda"
            />
            <KpiCard
              label="Qtd vendas"
              value={formatNumber(stats.todayCount)}
              icon={Receipt}
            />
            <KpiCard
              label="Top produto"
              value={topProduct?.name ?? "—"}
              icon={Package}
              hint={
                topProduct ? `x${formatNumber(topProduct.qty)}` : "Sem dados"
              }
            />
          </section>

          <section
            aria-label="Gráficos do dia"
            className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            <SalesByHourChart data={byHour} />
            <PaymentMethodChart byPaymentMethod={stats.byPaymentMethod} />
          </section>

          <section
            aria-label="Listagens"
            className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            <TopProductsList products={stats.topProducts} />
            <RecentSalesList sales={recent} />
          </section>
        </>
      )}
    </div>
  );
}

type DayBounds = {
  now: number;
  todayStartMs: number;
  todayEndMs: number;
};

/**
 * Calcula início e fim do dia atual no fuso local. Computa em useEffect
 * pra preservar pureza no render (Date.now é impuro). Atualiza a cada
 * minuto pra cobrir viradas de hora durante uma sessão longa.
 */
function useTodayBounds(): DayBounds | null {
  const [bounds, setBounds] = useState<DayBounds | null>(null);

  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      setBounds((prev) => {
        // Evita re-render se o início do dia não mudou.
        if (prev && prev.todayStartMs === start.getTime()) return prev;
        return {
          now,
          todayStartMs: start.getTime(),
          todayEndMs: end.getTime(),
        };
      });
    };
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return bounds;
}

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function LoadingState() {
  return (
    <>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListSkeleton />
        <ListSkeleton />
      </section>
    </>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[240px] w-full" />
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
