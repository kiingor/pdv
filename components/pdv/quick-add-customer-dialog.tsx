"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { maskPhone, onlyDigits } from "@/lib/format";

type Props = {
  open: boolean;
  /** Texto inicial do nome (geralmente vem do termo digitado no Combobox). */
  initialName?: string;
  onClose: () => void;
  onCreated: (customerId: Id<"customers">, customerName: string) => void;
};

const PHONE_REGEX = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

/**
 * Modal mínimo para cadastrar cliente sem sair do PDV.
 * Após criar, dispara `onCreated` para o seletor já marcar o novo cliente.
 */
export function QuickAddCustomerDialog({
  open,
  initialName,
  onClose,
  onCreated,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Cadastro rápido — só nome e telefone.
          </DialogDescription>
        </DialogHeader>
        {/* Form é montado fresco a cada abertura — descarta state ao fechar. */}
        {open && (
          <QuickAddForm
            key={initialName ?? ""}
            initialName={initialName}
            onClose={onClose}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type FormProps = {
  initialName?: string;
  onClose: () => void;
  onCreated: (customerId: Id<"customers">, customerName: string) => void;
};

function QuickAddForm({ initialName, onClose, onCreated }: FormProps) {
  const createCustomer = useMutation(api.customers.create);
  const [name, setName] = useState(initialName ?? "");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const nameError =
    submitted && name.trim().length < 2 ? "Informe o nome" : null;
  const phoneError =
    submitted && !PHONE_REGEX.test(phone) ? "Telefone inválido" : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (name.trim().length < 2 || !PHONE_REGEX.test(phone)) return;
    setSubmitting(true);
    try {
      const id = await createCustomer({
        name: name.trim(),
        phone: onlyDigits(phone),
      });
      toast.success("Cliente cadastrado!");
      onCreated(id, name.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tente novamente";
      const description =
        message === "Telefone já cadastrado"
          ? "Esse número já pertence a outro cliente."
          : message;
      toast.error("Não foi possível cadastrar", { description });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field data-invalid={!!nameError}>
        <FieldLabel>Nome</FieldLabel>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do cliente"
          className="h-10"
        />
        {nameError && <p className="text-sm text-destructive">{nameError}</p>}
      </Field>

      <Field data-invalid={!!phoneError}>
        <FieldLabel>Telefone</FieldLabel>
        <Input
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
          placeholder="(11) 99999-9999"
          className="h-10"
          autoComplete="tel"
        />
        {phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar cliente"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
