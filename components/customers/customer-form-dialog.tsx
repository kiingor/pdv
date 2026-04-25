"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { maskPhone, onlyDigits, formatPhone } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome (mínimo 2 letras)"),
  phone: z
    .string()
    .refine((v) => {
      const d = onlyDigits(v);
      return d.length === 10 || d.length === 11;
    }, "Telefone inválido. Use (11) 99999-9999"),
});

type FormValues = z.infer<typeof schema>;

export type CustomerFormInitial = {
  id: Id<"customers">;
  name: string;
  phone: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando presente, modo edição. Quando undefined, modo criação. */
  initial?: CustomerFormInitial;
};

/**
 * Modal de cadastro/edição de cliente. Aplica máscara de telefone enquanto
 * digita e converte pra dígitos puros antes de enviar pro backend.
 */
export function CustomerFormDialog({ open, onOpenChange, initial }: Props) {
  const isEdit = !!initial;
  const create = useMutation(api.customers.create);
  const update = useMutation(api.customers.update);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "" },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: initial?.name ?? "",
      phone: initial ? formatPhone(initial.phone) : "",
    });
  }, [open, initial, reset]);

  const phoneValue = watch("phone");

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      const phoneDigits = onlyDigits(data.phone);
      if (isEdit && initial) {
        await update({ id: initial.id, name: data.name, phone: phoneDigits });
        toast.success("Cliente atualizado!");
      } else {
        await create({ name: data.name, phone: phoneDigits });
        toast.success("Cliente cadastrado!");
      }
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("telefone já cadastrado")) {
        setError("phone", {
          type: "duplicate",
          message: "Esse telefone já está cadastrado pra outra pessoa",
        });
      } else {
        toast.error("Não deu pra salvar", {
          description: "Tenta de novo daqui a pouco.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados do cliente."
              : "Cadastre um cliente pra associar às vendas."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field>
            <Label htmlFor="customer-name">Nome</Label>
            <Input
              id="customer-name"
              autoFocus
              placeholder="Nome do cliente"
              aria-invalid={isSubmitted && !!errors.name}
              {...register("name")}
            />
            {isSubmitted && errors.name && (
              <p className="text-sm text-destructive mt-1">
                {errors.name.message}
              </p>
            )}
          </Field>

          <Field>
            <Label htmlFor="customer-phone">Telefone</Label>
            <Input
              id="customer-phone"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              value={phoneValue ?? ""}
              onChange={(e) =>
                setValue("phone", maskPhone(e.target.value), {
                  shouldValidate: isSubmitted,
                })
              }
              aria-invalid={isSubmitted && !!errors.phone}
            />
            {isSubmitted && errors.phone && (
              <p className="text-sm text-destructive mt-1">
                {errors.phone.message}
              </p>
            )}
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
