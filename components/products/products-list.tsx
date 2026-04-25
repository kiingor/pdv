"use client";

import { useMemo, useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ArchiveProductDialog } from "./archive-product-dialog";
import {
  ProductCard,
  type ProductCardItem,
} from "./product-card";
import {
  ProductFormDialog,
  type ProductFormProduct,
} from "./product-form-dialog";

type TabValue = "active" | "all";

/**
 * Tela principal do módulo de produtos.
 * Une busca, abas (ativos/todos), grid e diálogos de criação/edição/arquivamento.
 */
export function ProductsList() {
  const [tab, setTab] = useState<TabValue>("active");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductFormProduct | null>(null);
  const [archiveTarget, setArchiveTarget] =
    useState<ProductCardItem | null>(null);

  const includeInactive = tab === "all";
  const trimmed = search.trim();

  const listActive = useQuery(api.products.listActive, includeInactive ? "skip" : {});
  const listAll = useQuery(api.products.listAll, includeInactive ? {} : "skip");
  const searchResults = useQuery(
    api.products.searchByName,
    trimmed.length > 0 ? { searchTerm: trimmed, includeInactive } : "skip",
  );

  const isSearching = trimmed.length > 0;
  const baseList = (includeInactive ? listAll : listActive) as
    | ProductCardItem[]
    | undefined;
  const items = (isSearching ? searchResults : baseList) as
    | ProductCardItem[]
    | undefined;

  const isLoading = items === undefined;

  const sortedItems = useMemo(() => {
    if (!items) return [];
    if (!includeInactive) return items;
    // "Todos" — ativos primeiro, depois arquivados (mantém ordem alfabética dentro de cada bloco).
    return [...items].sort((a, b) => {
      if (a.active === b.active) return 0;
      return a.active ? -1 : 1;
    });
  }, [items, includeInactive]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(product: ProductCardItem) {
    setEditing({
      _id: product._id,
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      costPriceCents: product.costPriceCents,
      stockQuantity: product.stockQuantity,
      photoUrl: product.photoUrl,
    });
    setFormOpen(true);
  }

  function openArchive(product: ProductCardItem) {
    setArchiveTarget(product);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Produtos
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie o catálogo do evento
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="h-11 pl-9"
            aria-label="Buscar produtos"
          />
        </div>
        <Button
          onClick={openCreate}
          className="h-11 px-4 sm:h-11"
          size="lg"
        >
          <Plus className="h-5 w-5" />
          Novo produto
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === "active" || value === "all") setTab(value);
        }}
      >
        <TabsList>
          <TabsTrigger value="active">Ativos</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <ProductGridSkeleton />
      ) : sortedItems.length === 0 ? (
        <EmptyState
          searching={isSearching}
          onCreate={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedItems.map((p) => (
            <ProductCard
              key={p._id}
              product={p}
              onEdit={openEdit}
              onArchive={openArchive}
            />
          ))}
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
      />

      <ArchiveProductDialog
        open={archiveTarget !== null}
        onOpenChange={(o) => {
          if (!o) setArchiveTarget(null);
        }}
        product={archiveTarget}
      />
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="gap-3 pt-0">
          <Skeleton className="aspect-square w-full rounded-none rounded-t-xl" />
          <div className="flex flex-col gap-2 px-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({
  searching,
  onCreate,
}: {
  searching: boolean;
  onCreate: () => void;
}) {
  if (searching) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <Package className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Nenhum produto encontrado</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tente buscar por outro termo ou cadastre um novo produto.
        </p>
        <Button variant="outline" onClick={onCreate} className="mt-2">
          <Plus className="h-4 w-4" />
          Cadastrar produto
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
      <Package className="h-16 w-16 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Nenhum produto cadastrado</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Comece cadastrando os itens que serão vendidos no evento.
      </p>
      <Button onClick={onCreate} size="lg" className="mt-2">
        <Plus className="h-5 w-5" />
        Cadastrar primeiro produto
      </Button>
    </div>
  );
}
