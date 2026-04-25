"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRL } from "@/lib/format";

type SaleSummary = {
  _id: Id<"sales">;
  totalCents: number;
  itemCount: number;
};

type Props = {
  sale: SaleSummary | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

/**
 * Confirmação destrutiva pra apagar a venda.
 * Restaura estoque (se a venda ainda estava completed) e remove do histórico.
 */
export function DeleteSaleDialog({ sale, onOpenChange, onDeleted }: Props) {
  const remove = useMutation(api.sales.remove);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (!sale) return;
    setSubmitting(true);
    try {
      await remove({ id: sale._id });
      toast.success("Venda excluída", {
        description: "Estoque restaurado se houvesse controle.",
      });
      onDeleted?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Falha ao excluir venda", {
        description: err instanceof Error ? err.message : "Tenta de novo.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={sale !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir essa venda?</AlertDialogTitle>
          <AlertDialogDescription>
            {sale && (
              <>
                A venda de <strong>{formatBRL(sale.totalCents)}</strong> com{" "}
                {sale.itemCount} {sale.itemCount === 1 ? "item" : "itens"} vai
                ser removida do histórico permanentemente. Se houver produtos
                com controle de estoque, a quantidade será restaurada.
                <br />
                <br />
                Essa ação <strong>não pode ser desfeita</strong>.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Sim, excluir"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
