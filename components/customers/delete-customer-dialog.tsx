"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

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
  customer: { id: Id<"customers">; name: string } | null;
};

/**
 * Confirmação destrutiva de exclusão de cliente. Bloqueia exclusão (via
 * erro do backend) se o cliente já tiver vendas registradas, preservando
 * o histórico.
 */
export function DeleteCustomerDialog({ open, onOpenChange, customer }: Props) {
  const remove = useMutation(api.customers.remove);
  const [deleting, setDeleting] = useState(false);

  const onConfirm = async () => {
    if (!customer) return;
    setDeleting(true);
    try {
      await remove({ id: customer.id });
      toast.success("Cliente excluído");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("vendas registradas")) {
        toast.error("Esse cliente tem vendas. Não dá pra excluir.");
      } else {
        toast.error("Não deu pra excluir", {
          description: "Tenta de novo daqui a pouco.",
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir {customer?.name ?? "cliente"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. Se o cliente tem vendas registradas,
            a exclusão será bloqueada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
