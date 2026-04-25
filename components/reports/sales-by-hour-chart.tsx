"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL } from "@/lib/format";

type HourBucket = { hour: number; totalCents: number; count: number };

type Props = {
  data: HourBucket[] | undefined;
};

/**
 * Gráfico de barras com vendas por hora (0..23). Eixo Y em reais inteiros
 * pra ficar limpo; tooltip mostra o valor formatado em BRL.
 */
export function SalesByHourChart({ data }: Props) {
  const isEmpty = !data || data.every((b) => b.totalCents === 0);
  const chartData = (data ?? []).map((b) => ({
    hour: b.hour,
    reais: Math.round(b.totalCents / 100),
    count: b.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas por hora</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        {isEmpty ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="hour"
                tickFormatter={(h: number) => `${h}h`}
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `R$${v}`}
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
                labelFormatter={(h) =>
                  `${String(h).padStart(2, "0")}:00`
                }
                formatter={(value, _name, item) => {
                  const v = typeof value === "number" ? value : 0;
                  const count = item?.payload?.count ?? 0;
                  return [
                    `${formatBRL(v * 100)} · ${count} venda${count === 1 ? "" : "s"}`,
                    "Total",
                  ];
                }}
              />
              <Bar
                dataKey="reais"
                fill="var(--chart-1)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
      <BarChart3 className="h-12 w-12 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">
        Sem vendas para mostrar ainda
      </p>
    </div>
  );
}
