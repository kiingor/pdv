"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";

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
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { maskBRL, parseBRLToCents } from "@/lib/format";

import {
  ProductPhotoUpload,
  type SelectedPhoto,
  uploadPhotoToConvex,
} from "./product-photo-upload";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome muito curto (mínimo 2 caracteres)"),
  description: z.string().trim().optional(),
  priceStr: z
    .string()
    .min(1, "Preço é obrigatório")
    .refine((v) => parseBRLToCents(v) > 0, "Preço deve ser maior que zero"),
  // Opcional: aceita string vazia. Validação só impede valor negativo,
  // o que não acontece pela máscara — mas mantemos a refine por garantia.
  costPriceStr: z
    .string()
    .optional()
    .refine(
      (v) => !v || parseBRLToCents(v) >= 0,
      "Preço de custo inválido",
    ),
});

type FormValues = z.infer<typeof schema>;

export type ProductFormProduct = {
  _id: Id<"products">;
  name: string;
  description?: string;
  priceCents: number;
  costPriceCents?: number;
  photoUrl: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando presente, o dialog opera em modo edição. */
  product?: ProductFormProduct | null;
};

/**
 * Dialog unificado de criação e edição de produto.
 * Faz upload da foto (se houver) antes da mutation de create/update.
 */
export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const isEdit = Boolean(product);
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const generateUploadUrl = useMutation(api.products.generateUploadUrl);

  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      priceStr: "",
      costPriceStr: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (product) {
      reset({
        name: product.name,
        description: product.description ?? "",
        priceStr: maskBRL(String(product.priceCents)),
        costPriceStr:
          product.costPriceCents != null
            ? maskBRL(String(product.costPriceCents))
            : "",
      });
    } else {
      reset({ name: "", description: "", priceStr: "", costPriceStr: "" });
    }
    setSelectedPhoto(null);
  }, [open, product, reset]);

  useEffect(() => {
    return () => {
      if (selectedPhoto?.previewUrl) {
        URL.revokeObjectURL(selectedPhoto.previewUrl);
      }
    };
  }, [selectedPhoto]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      let photoStorageId: Id<"_storage"> | undefined;
      if (selectedPhoto) {
        const uploadUrl = await generateUploadUrl();
        const storageId = await uploadPhotoToConvex(
          selectedPhoto.file,
          uploadUrl,
        );
        photoStorageId = storageId as Id<"_storage">;
      }

      const priceCents = parseBRLToCents(values.priceStr);
      const description = values.description?.trim()
        ? values.description.trim()
        : undefined;
      // Campo opcional: string vazia → undefined (mutation aceita opcional).
      const costPriceCents = values.costPriceStr?.trim()
        ? parseBRLToCents(values.costPriceStr)
        : undefined;

      if (isEdit && product) {
        await updateProduct({
          id: product._id,
          name: values.name.trim(),
          description,
          priceCents,
          costPriceCents,
          ...(photoStorageId ? { photoStorageId } : {}),
        });
        toast.success("Produto atualizado!");
      } else {
        await createProduct({
          name: values.name.trim(),
          description,
          priceCents,
          costPriceCents,
          photoStorageId,
        });
        toast.success("Produto cadastrado!");
      }

      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Tente novamente em instantes.";
      toast.error(isEdit ? "Falha ao atualizar produto" : "Falha ao cadastrar produto", {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const priceStr = watch("priceStr");
  const costPriceStr = watch("costPriceStr");

  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados deste item do catálogo."
              : "Cadastre um novo item para vender no PDV."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <Field>
            <Label htmlFor="product-name">Nome</Label>
            <Input
              id="product-name"
              autoFocus
              placeholder="Ex: Chopp 500ml"
              aria-invalid={isSubmitted && !!errors.name}
              {...register("name")}
            />
            {isSubmitted && (
              <FieldError errors={errors.name ? [errors.name] : []} />
            )}
          </Field>

          <Field>
            <Label htmlFor="product-description">Descrição</Label>
            <Textarea
              id="product-description"
              placeholder="Detalhes opcionais que aparecem na busca"
              rows={2}
              {...register("description")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <Field>
              <Label htmlFor="product-price">Preço</Label>
              <Input
                id="product-price"
                inputMode="decimal"
                placeholder="R$ 0,00"
                aria-invalid={isSubmitted && !!errors.priceStr}
                value={priceStr ?? ""}
                onChange={(e) =>
                  setValue("priceStr", maskBRL(e.target.value), {
                    shouldValidate: isSubmitted,
                  })
                }
              />
              {isSubmitted && (
                <FieldError
                  errors={errors.priceStr ? [errors.priceStr] : []}
                />
              )}
            </Field>

            <Field>
              <Label htmlFor="product-cost-price">Preço de custo</Label>
              <Input
                id="product-cost-price"
                inputMode="decimal"
                placeholder="R$ 0,00"
                aria-invalid={isSubmitted && !!errors.costPriceStr}
                value={costPriceStr ?? ""}
                onChange={(e) =>
                  setValue("costPriceStr", maskBRL(e.target.value), {
                    shouldValidate: isSubmitted,
                  })
                }
              />
              <FieldDescription>
                Opcional — usado para calcular margem de lucro
              </FieldDescription>
              {isSubmitted && (
                <FieldError
                  errors={errors.costPriceStr ? [errors.costPriceStr] : []}
                />
              )}
            </Field>
          </div>

          <Field>
            <Label>Foto</Label>
            <ProductPhotoUpload
              existingUrl={product?.photoUrl ?? null}
              selected={selectedPhoto}
              onSelect={setSelectedPhoto}
              disabled={submitting}
            />
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : isEdit ? (
                "Salvar"
              ) : (
                "Cadastrar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
