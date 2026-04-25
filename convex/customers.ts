import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

/**
 * Módulo de clientes.
 *
 * Convenções:
 *  - Telefone armazenado SOMENTE com dígitos. Formatação fica na UI.
 *  - Telefone é praticamente uma chave única — bloqueamos duplicatas
 *    em mutations (create/update).
 *  - Não permitimos remover cliente com vendas registradas.
 */

/* -------------------------------------------------------------------- */
/* HELPERS                                                               */
/* -------------------------------------------------------------------- */

/** Tira tudo que não é dígito. Aceita máscaras tipo "(11) 98765-4321". */
function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/* -------------------------------------------------------------------- */
/* QUERIES                                                               */
/* -------------------------------------------------------------------- */

/** Lista todos os clientes ordenados por nome (asc). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").collect();
    customers.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return customers;
  },
});

/** Retorna um cliente por ID, ou null. */
export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Busca cliente por telefone exato.
 * Strip de não-dígitos antes de consultar.
 */
export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const normalized = digitsOnly(phone);
    if (!normalized) return null;
    return await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .unique();
  },
});

/**
 * Busca por nome OU telefone.
 * - Sempre tenta search por nome (searchIndex `search_name`).
 * - Se o termo tiver 2+ dígitos, também busca por telefone (searchIndex `search_phone`).
 * - Faz merge dedup pelo `_id`. Limit aplicado no resultado final.
 */
export const searchByNameOrPhone = query({
  args: {
    term: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { term, limit }) => {
    const max = limit ?? 20;
    const trimmed = term.trim();
    if (!trimmed) return [];

    const byName = await ctx.db
      .query("customers")
      .withSearchIndex("search_name", (q) => q.search("name", trimmed))
      .take(max);

    const digits = digitsOnly(trimmed);
    let byPhone: Doc<"customers">[] = [];
    if (digits.length >= 2) {
      byPhone = await ctx.db
        .query("customers")
        .withSearchIndex("search_phone", (q) => q.search("phone", digits))
        .take(max);
    }

    // Merge dedup por _id, preservando ordem (matches por nome primeiro).
    const seen = new Set<string>();
    const merged: Doc<"customers">[] = [];
    for (const c of [...byName, ...byPhone]) {
      const key = c._id as unknown as string;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(c);
      if (merged.length >= max) break;
    }
    return merged;
  },
});

/* -------------------------------------------------------------------- */
/* MUTATIONS                                                             */
/* -------------------------------------------------------------------- */

/**
 * Cria cliente. Telefone é normalizado (só dígitos) e checado por duplicata.
 * Lança "Telefone já cadastrado" se já existir cliente com esse número.
 */
export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, { name, phone }) => {
    const normalized = digitsOnly(phone);
    if (!normalized) {
      throw new Error("Telefone inválido");
    }

    const existing = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .unique();
    if (existing) {
      throw new Error("Telefone já cadastrado");
    }

    return await ctx.db.insert("customers", {
      name: name.trim(),
      phone: normalized,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Atualiza nome e telefone do cliente.
 * Telefone normalizado e checado por duplicata em OUTRO cliente.
 */
export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, { id, name, phone }) => {
    const normalized = digitsOnly(phone);
    if (!normalized) {
      throw new Error("Telefone inválido");
    }

    const existing = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .unique();
    if (existing && existing._id !== id) {
      throw new Error("Telefone já cadastrado");
    }

    await ctx.db.patch(id, {
      name: name.trim(),
      phone: normalized,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove cliente. Bloqueia se houver vendas registradas para preservar histórico.
 */
export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    const sale = await ctx.db
      .query("sales")
      .withIndex("by_customer", (q) => q.eq("customerId", id))
      .first();
    if (sale) {
      throw new Error("Cliente possui vendas registradas");
    }
    await ctx.db.delete(id);
  },
});
