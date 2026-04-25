"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Minus, Plus, PackageSearch, Search } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ProductPdvCard } from "@/components/pdv/product-pdv-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";

type Product = {
  _id: Id<"products">;
  name: string;
  priceCents: number;
  stockQuantity?: number;
  photoUrl: string | null;
};

type Props = {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onAddProduct: (input: {
    productId: Id<"products">;
    name: string;
    photoUrl: string | null;
    unitPriceCents: number;
    stockQuantity?: number;
    quantity?: number;
  }) => void;
  /** Map productId → quantidade já no carrinho. Usado pra limitar adições. */
  cartQuantities: Map<string, number>;
};

/**
 * Grid de produtos com busca debounced e diálogo de quantidade
 * (acionado por long-press num card).
 */
export function ProductCatalog({
  searchInputRef,
  onAddProduct,
  cartQuantities,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [qtyDialog, setQtyDialog] = useState<Product | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const allProducts = useQuery(api.products.listActive) as Product[] | undefined;
  const searchResults = useQuery(
    api.products.searchByName,
    debouncedTerm.length >= 2 ? { searchTerm: debouncedTerm } : "skip"
  ) as Product[] | undefined;

  const isSearching = debouncedTerm.length >= 2;
  const products = isSearching ? searchResults : allProducts;
  const isLoading = products === undefined;

  return (
    <section className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b bg-background/85 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar produto... (F2)"
            className="h-12 pl-11 text-base"
            aria-label="Buscar produto"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {isLoading ? (
          <CatalogSkeleton />
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2 md:gap-2.5">
            {products.map((product) => {
              const inCart =
                cartQuantities.get(product._id as unknown as string) ?? 0;
              return (
                <ProductPdvCard
                  key={product._id}
                  name={product.name}
                  priceCents={product.priceCents}
                  photoUrl={product.photoUrl}
                  stockQuantity={product.stockQuantity}
                  inCartQuantity={inCart}
                  onTap={() =>
                    onAddProduct({
                      productId: product._id,
                      name: product.name,
                      photoUrl: product.photoUrl,
                      unitPriceCents: product.priceCents,
                      stockQuantity: product.stockQuantity,
                    })
                  }
                  onLongPress={() => setQtyDialog(product)}
                />
              );
            })}
          </div>
        ) : (
          <CatalogEmpty searching={isSearching} term={debouncedTerm} />
        )}
      </div>

      <QuantityDialog
        product={qtyDialog}
        onClose={() => setQtyDialog(null)}
        onConfirm={(quantity) => {
          if (!qtyDialog) return;
          onAddProduct({
            productId: qtyDialog._id,
            name: qtyDialog.name,
            photoUrl: qtyDialog.photoUrl,
            unitPriceCents: qtyDialog.priceCents,
            quantity,
          });
          setQtyDialog(null);
        }}
      />
    </section>
  );
}

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2 md:gap-2.5">
      {Array.from({ length: 18 }).map((_, i) => (
        <Card key={i} className="gap-0 py-0">
          <div className="aspect-square w-full p-1.5">
            <Skeleton className="h-full w-full rounded-md" />
          </div>
          <div className="space-y-1.5 px-2 pb-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function CatalogEmpty({ searching, term }: { searching: boolean; term: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-24 text-center">
      <PackageSearch className="mb-4 h-16 w-16 text-muted-foreground" />
      {searching ? (
        <>
          <p className="text-lg font-semibold">Nada encontrado</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Não achamos nenhum produto com &ldquo;{term}&rdquo;. Tente outro termo.
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold">Nenhum produto cadastrado</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Cadastre produtos em <strong>Produtos</strong> para começar a vender.
          </p>
        </>
      )}
    </div>
  );
}

type QuantityDialogProps = {
  product: Product | null;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
};

function QuantityDialog({ product, onClose, onConfirm }: QuantityDialogProps) {
  if (!product) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <QuantityDialogBody
          key={product._id}
          product={product}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

function QuantityDialogBody({
  product,
  onClose,
  onConfirm,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const total = useMemo(
    () => product.priceCents * qty,
    [product.priceCents, qty]
  );

  const numpadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"];

  function handleNumpad(key: string) {
    if (key === "C") {
      setQty(1);
      return;
    }
    if (key === "OK") {
      if (qty >= 1) onConfirm(qty);
      return;
    }
    setQty((prev) => {
      // Substitui se ainda está em 1 (default), concatena se já editou.
      const digit = parseInt(key, 10);
      if (prev === 1) return digit === 0 ? 1 : digit;
      const next = parseInt(`${prev}${digit}`, 10);
      return Math.min(next, 999);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Definir quantidade</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          {product.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.photoUrl}
              alt={product.name}
              className="h-14 w-14 rounded-md object-cover"
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-md bg-gradient-to-br from-primary/20 via-chart-2/20 to-chart-3/20 text-xl font-bold text-primary/70">
              {product.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBRL(product.priceCents)} cada
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Diminuir quantidade"
          >
            <Minus className="h-5 w-5" />
          </Button>
          <div className="min-w-20 text-center text-4xl font-bold tabular-nums">
            {qty}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12"
            onClick={() => setQty((q) => Math.min(999, q + 1))}
            aria-label="Aumentar quantidade"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {numpadKeys.map((key) => (
            <Button
              key={key}
              variant={key === "OK" ? "default" : key === "C" ? "outline" : "secondary"}
              onClick={() => handleNumpad(key)}
              className="h-14 text-lg font-semibold"
            >
              {key}
            </Button>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Subtotal:{" "}
          <span className="text-base font-bold text-primary">
            {formatBRL(total)}
          </span>
        </p>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onConfirm(qty)}>Adicionar {qty}</Button>
      </DialogFooter>
    </>
  );
}
