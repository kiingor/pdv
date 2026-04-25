"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";

type Props = {
  totalCents: number;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
};

/**
 * CTA principal do PDV. Sempre visível, ganha cor viva quando habilitado.
 * F4 dispara via atalho global lá no orchestrator.
 */
export function FinalizeButton({ totalCents, disabled, loading, onClick }: Props) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="h-14 w-full bg-gradient-to-r from-primary via-primary to-chart-2 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:opacity-95 disabled:bg-muted disabled:bg-none disabled:text-muted-foreground disabled:shadow-none"
      aria-label="Finalizar venda (atalho F4)"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Finalizando...
        </>
      ) : (
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Finalizar
          </span>
          <span className="text-lg tabular-nums">{formatBRL(totalCents)}</span>
          <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-semibold">
            F4
          </span>
        </span>
      )}
    </Button>
  );
}
