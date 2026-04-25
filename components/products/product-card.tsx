"use client";

import { ImageIcon, MoreVertical, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { calcMarginPct, formatBRL, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ProductCardItem = {
  _id: Id<"products">;
  name: string;
  description?: string;
  priceCents: number;
  costPriceCents?: number;
  stockQuantity?: number;
  active: boolean;
  photoUrl: string | null;
};

type Props = {
  product: ProductCardItem;
  onEdit: (product: ProductCardItem) => void;
  onArchive: (product: ProductCardItem) => void;
};

/**
 * Cartão de produto na grade do catálogo.
 * Clique no corpo abre edição; menu de 3 pontos expõe arquivar/restaurar.
 */
export function ProductCard({ product, onEdit, onArchive }: Props) {
  const restore = useMutation(api.products.restore);

  async function handleRestore() {
    try {
      await restore({ id: product._id });
      toast.success("Produto restaurado");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Tente novamente em instantes.";
      toast.error("Falha ao restaurar produto", { description: message });
    }
  }

  const marginPct = calcMarginPct(product.priceCents, product.costPriceCents);
  const hasCost = product.costPriceCents != null;

  return (
    <Card
      className={cn(
        "group relative cursor-pointer gap-3 pt-0 transition-shadow hover:shadow-md hover:ring-foreground/20",
        !product.active && "opacity-60",
      )}
      onClick={() => onEdit(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(product);
        }
      }}
    >
      <div className="relative aspect-square overflow-hidden rounded-t-xl bg-muted">
        {product.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.photoUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}

        {!product.active && (
          <Badge
            variant="secondary"
            className="absolute left-2 top-2 bg-background/90 backdrop-blur"
          >
            Arquivado
          </Badge>
        )}

        {product.stockQuantity !== undefined && (
          <Badge
            variant="secondary"
            className={cn(
              "absolute bottom-2 left-2 backdrop-blur tabular-nums shadow-sm",
              product.stockQuantity === 0
                ? "bg-destructive/15 text-destructive border-destructive/20"
                : product.stockQuantity <= 5
                  ? "bg-warning/15 text-warning border-warning/20"
                  : "bg-background/90",
            )}
          >
            {product.stockQuantity === 0
              ? "Esgotado"
              : `${product.stockQuantity} em estoque`}
          </Badge>
        )}

        <div
          className="absolute right-2 top-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="secondary"
                  size="icon-sm"
                  aria-label={`Ações de ${product.name}`}
                  className="bg-background/90 backdrop-blur shadow-sm"
                />
              }
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Pencil className="h-4 w-4" />
                Editar
              </DropdownMenuItem>
              {product.active ? (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onArchive(product)}
                >
                  <Trash2 className="h-4 w-4" />
                  Arquivar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleRestore}>
                  <RotateCcw className="h-4 w-4" />
                  Restaurar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-1 px-4">
        <h3 className="line-clamp-2 font-semibold leading-snug">
          {product.name}
        </h3>
        {product.description && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {product.description}
          </p>
        )}
        <p className="mt-1 text-lg font-bold text-primary">
          {formatBRL(product.priceCents)}
        </p>
        {hasCost && marginPct !== null && (
          <p
            className={cn(
              "text-xs text-muted-foreground",
              marginPct < 0 && "text-destructive",
            )}
          >
            Custo: {formatBRL(product.costPriceCents!)} · Margem{" "}
            {formatNumber(marginPct)}%
          </p>
        )}
      </div>
    </Card>
  );
}
