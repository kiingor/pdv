"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/constants";
import { formatPhone } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  saleId: Id<"sales"> | null;
  onOpenChange: (open: boolean) => void;
};

type CustomerLite = {
  _id: Id<"customers">;
  name: string;
  phone: string;
};

type SaleDetail = {
  sale: {
    _id: Id<"sales">;
    customerName?: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  };
  customer: { _id: Id<"customers">; name: string; phone: string } | null;
};

/**
 * Edita SOMENTE meta da venda: cliente, forma de pagamento e observações.
 * Itens não são editáveis aqui — pra isso, cancele e recrie a venda.
 */
export function EditSaleDialog({ saleId, onOpenChange }: Props) {
  const data = useQuery(
    api.sales.get,
    saleId ? { id: saleId } : "skip",
  ) as SaleDetail | null | undefined;

  return (
    <Dialog open={saleId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar venda</DialogTitle>
          <DialogDescription>
            Cliente, forma de pagamento e observações. Itens não podem ser
            alterados — cancele e recrie a venda se precisar.
          </DialogDescription>
        </DialogHeader>

        {!saleId ? null : data === undefined ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : data === null ? (
          <p className="text-sm text-muted-foreground">
            Venda não encontrada.
          </p>
        ) : (
          <Form
            key={saleId as unknown as string}
            saleId={saleId}
            initial={data}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Form({
  saleId,
  initial,
  onClose,
}: {
  saleId: Id<"sales">;
  initial: SaleDetail;
  onClose: () => void;
}) {
  const updateMeta = useMutation(api.sales.updateMeta);
  const customers = useQuery(api.customers.list, {}) as
    | CustomerLite[]
    | undefined;

  const [customerId, setCustomerId] = useState<Id<"customers"> | null>(
    initial.customer?._id ?? null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial.sale.paymentMethod,
  );
  const [notes, setNotes] = useState(initial.sale.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);

  useEffect(() => {
    setCustomerId(initial.customer?._id ?? null);
    setPaymentMethod(initial.sale.paymentMethod);
    setNotes(initial.sale.notes ?? "");
  }, [initial]);

  const selectedCustomer = customers?.find((c) => c._id === customerId);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await updateMeta({
        id: saleId,
        customerId: customerId === null ? null : customerId,
        paymentMethod,
        notes,
      });
      toast.success("Venda atualizada!");
      onClose();
    } catch (err) {
      toast.error("Falha ao atualizar venda", {
        description: err instanceof Error ? err.message : "Tenta de novo.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <Field>
        <Label>Cliente</Label>
        <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
              >
                {selectedCustomer ? (
                  <span className="flex items-center gap-2 truncate">
                    <span className="font-medium">{selectedCustomer.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatPhone(selectedCustomer.phone)}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Avulso (sem cliente)
                  </span>
                )}
              </Button>
            }
          />
          <PopoverContent className="w-(--anchor-width) min-w-[280px] p-0">
            <Command>
              <CommandInput placeholder="Buscar cliente..." />
              <CommandList>
                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="__avulso__"
                    onSelect={() => {
                      setCustomerId(null);
                      setCustomerOpen(false);
                    }}
                  >
                    <span className="text-muted-foreground">
                      Avulso (sem cliente)
                    </span>
                  </CommandItem>
                  {customers?.map((c) => (
                    <CommandItem
                      key={c._id as unknown as string}
                      value={`${c.name} ${c.phone}`}
                      onSelect={() => {
                        setCustomerId(c._id);
                        setCustomerOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatPhone(c.phone)}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </Field>

      <Field>
        <Label htmlFor="edit-sale-payment">Forma de pagamento</Label>
        <Select
          value={paymentMethod}
          onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
        >
          <SelectTrigger id="edit-sale-payment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                <span className="flex items-center gap-2">
                  <m.icon className="h-4 w-4" />
                  {PAYMENT_METHOD_LABELS[m.value]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <Label htmlFor="edit-sale-notes">Observações</Label>
        <Textarea
          id="edit-sale-notes"
          rows={3}
          placeholder="Opcional — ex: motivo de desconto"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <FieldDescription>
          Itens da venda não podem ser editados aqui.
        </FieldDescription>
      </Field>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
