"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";

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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { _id: Id<"products">; name: string } | null;
};

/**
 * Confirmação destrutiva antes de arquivar (soft-delete) um produto.
 * Vendas anteriores são preservadas (FK não é apagada).
 */
export function ArchiveProductDialog({ open, onOpenChange, product }: Props) {
  const archive = useMutation(api.products.archive);
  const [archiving, setArchiving] = useState(false);

  async function handleArchive() {
    if (!product) return;
    setArchiving(true);
    try {
      await archive({ id: product._id });
      toast.success("Produto arquivado");
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Tente novamente em instantes.";
      toast.error("Falha ao arquivar produto", { description: message });
    } finally {
      setArchiving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Arquivar {product?.name ?? "este produto"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Ele não aparecerá mais no PDV, mas as vendas anteriores serão
            preservadas. Você pode restaurar a qualquer momento na aba “Todos”.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiving}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={archiving}
            onClick={handleArchive}
          >
            {archiving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Arquivando...
              </>
            ) : (
              "Arquivar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
