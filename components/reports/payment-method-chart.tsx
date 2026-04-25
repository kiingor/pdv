"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import {
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/lib/constants";

type Buckets = Record<PaymentMethod, { count: number; totalCents: number }>;

type Props = {
  byPaymentMethod: Buckets | undefined;
};

const CHART_VARS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

/**
 * Donut chart com a distribuição das vendas por forma de pagamento.
 * Mantém ordem de `PAYMENT_METHODS` pra cor ficar previsível entre eventos.
 */
export function PaymentMethodChart({ byPaymentMethod }: Props) {
  const data = PAYMENT_METHODS.map((m, i) => {
    const bucket = byPaymentMethod?.[m.value] ?? { count: 0, totalCents: 0 };
    return {
      method: m.value,
      label: m.label,
      value: bucket.totalCents,
      count: bucket.count,
      color: CHART_VARS[i % CHART_VARS.length],
    };
  });

  const total = data.reduce((acc, d) => acc + d.value, 0);
  const isEmpty = total === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forma de pagamento</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        {isEmpty ? (
          <EmptyChart />
        ) : (
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-stretch">
            <div className="w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.filter((d) => d.value > 0)}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {data
                      .filter((d) => d.value > 0)
                      .map((d) => (
                        <Cell key={d.method} fill={d.color} />
                      ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                    formatter={(value, _name, item) => {
                      const v = typeof value === "number" ? value : 0;
                      const count = item?.payload?.count ?? 0;
                      const label = item?.payload?.label ?? "";
                      return [
                        `${formatBRL(v)} · ${count} venda${count === 1 ? "" : "s"}`,
                        label,
                      ];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="flex flex-1 flex-col justify-center gap-2 text-sm">
              {data.map((d) => {
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <li
                    key={d.method}
                    className="flex items-center gap-2.5"
                  >
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="flex-1 truncate font-medium">
                      {d.label}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {d.count} · {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
      <PieIcon className="h-12 w-12 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">
        Nenhum pagamento registrado ainda
      </p>
    </div>
  );
}
