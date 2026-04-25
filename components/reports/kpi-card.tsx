import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Subtítulo curto opcional, mostrado abaixo do valor. */
  hint?: string;
  /** Quando true, destaca o valor em laranja (uso típico: "Vendas hoje"). */
  highlight?: boolean;
};

/**
 * Card de KPI reutilizável: ícone discreto no canto, label compacta e
 * número grande em destaque. Pensado pro topo do dashboard.
 */
export function KpiCard({ label, value, icon: Icon, hint, highlight }: Props) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <p
          className={cn(
            "mt-2 text-3xl font-bold tracking-tight",
            highlight && "text-primary",
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

/** Skeleton com a mesma forma do KpiCard, pra evitar layout shift. */
export function KpiCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-5 rounded-md" />
        </div>
        <Skeleton className="mt-3 h-8 w-32" />
        <Skeleton className="mt-2 h-3 w-20" />
      </CardContent>
    </Card>
  );
}
