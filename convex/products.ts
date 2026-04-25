import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Módulo de produtos do PDV.
 *
 * Convenções:
 *  - Preços em centavos (int) — nunca floats.
 *  - Soft-delete via `active=false`. Vendas antigas continuam apontando.
 *  - Fotos via Convex storage. Nunca expor `photoStorageId` ao cliente,
 *    sempre resolver para `photoUrl` antes de retornar.
 */

/* -------------------------------------------------------------------- */
/* HELPERS                                                               */
/* -------------------------------------------------------------------- */

type ProductWithPhoto = Omit<Doc<"products">, "photoStorageId"> & {
  photoUrl: string | null;
};

/**
 * Resolve o storageId em URL pública e remove o storageId raw do payload.
 */
async function withPhotoUrl(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  product: Doc<"products">,
): Promise<ProductWithPhoto> {
  const { photoStorageId, ...rest } = product;
  const photoUrl = photoStorageId
    ? await ctx.storage.getUrl(photoStorageId)
    : null;
  return { ...rest, photoUrl };
}

/* -------------------------------------------------------------------- */
/* QUERIES                                                               */
/* -------------------------------------------------------------------- */

/** Lista apenas produtos ativos, ordenados por nome (asc), com photoUrl resolvida. */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    products.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return await Promise.all(products.map((p) => withPhotoUrl(ctx, p)));
  },
});

/** Lista TODOS os produtos (inclusive inativos) — view administrativa. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    products.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return await Promise.all(products.map((p) => withPhotoUrl(ctx, p)));
  },
});

/** Retorna um único produto por ID com photoUrl resolvida; null se não existir. */
export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const product = await ctx.db.get(id);
    if (!product) return null;
    return await withPhotoUrl(ctx, product);
  },
});

/**
 * Busca produtos pelo nome usando o searchIndex `search_name`.
 * Por padrão filtra apenas ativos (uso no PDV); admin pode incluir inativos.
 */
export const searchByName = query({
  args: {
    searchTerm: v.string(),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, { searchTerm, includeInactive }) => {
    const term = searchTerm.trim();
    if (!term) return [];

    const results = await ctx.db
      .query("products")
      .withSearchIndex("search_name", (q) => {
        const base = q.search("name", term);
        return includeInactive ? base : base.eq("active", true);
      })
      .collect();

    return await Promise.all(results.map((p) => withPhotoUrl(ctx, p)));
  },
});

/* -------------------------------------------------------------------- */
/* MUTATIONS                                                             */
/* -------------------------------------------------------------------- */

/**
 * Cria um produto novo. Sempre nasce ativo.
 * Preços em centavos — `costPriceCents` é opcional (preencher só quando
 * o operador souber o custo, pra alimentar o relatório de margem).
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    priceCents: v.number(),
    costPriceCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("products", {
      name: args.name,
      description: args.description,
      photoStorageId: args.photoStorageId,
      priceCents: args.priceCents,
      costPriceCents: args.costPriceCents,
      active: true,
      updatedAt: Date.now(),
    });
    return id;
  },
});

/** Atualiza campos parciais do produto. Atualiza updatedAt automaticamente. */
export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    priceCents: v.optional(v.number()),
    costPriceCents: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    // Remove chaves undefined para não sobrescrever com undefined.
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) clean[k] = v;
    }
    clean.updatedAt = Date.now();
    await ctx.db.patch(id, clean);
  },
});

/** Soft-delete: marca produto como inativo. Não remove do banco. */
export const archive = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { active: false, updatedAt: Date.now() });
  },
});

/** Reativa um produto previamente arquivado. */
export const restore = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { active: true, updatedAt: Date.now() });
  },
});

/**
 * Gera URL temporária para upload da foto do produto.
 * O cliente faz POST do arquivo nessa URL, recebe um storageId,
 * e então passa esse storageId para `create` ou `update`.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
