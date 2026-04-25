import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Schema do PDV Eventos.
 *
 * Convenções:
 *  - Valores monetários SEMPRE em centavos (int) — evita float drift.
 *  - Telefones armazenados só com dígitos (formatação só na UI).
 *  - Soft-delete em produtos via campo `active`. Vendas nunca apagam.
 *  - `_id` e `_creationTime` são automáticos no Convex.
 */
export default defineSchema({
  /* -------------------------------------------------------------------- */
  /* PRODUCTS                                                              */
  /* -------------------------------------------------------------------- */
  products: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    /** Convex storage ID da foto. Gerar URL via ctx.storage.getUrl(). */
    photoStorageId: v.optional(v.id("_storage")),
    /** Preço de venda em centavos. Ex: R$ 12,90 → 1290 */
    priceCents: v.number(),
    /**
     * Preço de custo em centavos (opcional). Ex: R$ 5,00 → 500.
     * Usado pelo relatório de margem; ausente em produtos legados.
     */
    costPriceCents: v.optional(v.number()),
    /** Soft-delete: false esconde do PDV mas mantém histórico. */
    active: v.boolean(),
    /** Timestamp ms (Date.now()). _creationTime já é nativo. */
    updatedAt: v.number(),
  })
    .index("by_active", ["active"])
    .index("by_name", ["name"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["active"],
    }),

  /* -------------------------------------------------------------------- */
  /* CUSTOMERS                                                             */
  /* -------------------------------------------------------------------- */
  customers: defineTable({
    name: v.string(),
    /** Só dígitos. Ex: "11987654321" */
    phone: v.string(),
    updatedAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_name", ["name"])
    .searchIndex("search_name", { searchField: "name" })
    .searchIndex("search_phone", { searchField: "phone" }),

  /* -------------------------------------------------------------------- */
  /* SALES (cabeçalho da venda)                                            */
  /* -------------------------------------------------------------------- */
  sales: defineTable({
    /** Cliente opcional — vendas de balcão podem ser anônimas. */
    customerId: v.optional(v.id("customers")),
    /** Snapshot do nome do cliente (caso o cadastro seja editado depois). */
    customerName: v.optional(v.string()),

    /** Total da venda em centavos (soma dos saleItems). */
    totalCents: v.number(),

    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("pix"),
      v.literal("credit"),
      v.literal("debit"),
    ),

    status: v.union(v.literal("completed"), v.literal("cancelled")),

    /** Observações livres (ex: "sem gelo", desconto motivo, etc.) */
    notes: v.optional(v.string()),

    /** Quantidade total de itens (somatório das quantities) — facilita relatórios. */
    itemCount: v.number(),
  })
    /* `_creationTime` é automaticamente o sufixo de todo índice no Convex.
     * Por isso `by_status` já permite query "status=completed AND created BETWEEN X AND Y". */
    .index("by_status", ["status"])
    .index("by_customer", ["customerId"])
    .index("by_payment", ["paymentMethod"]),

  /* -------------------------------------------------------------------- */
  /* SALE ITEMS (itens da venda)                                           */
  /* -------------------------------------------------------------------- */
  saleItems: defineTable({
    saleId: v.id("sales"),
    productId: v.id("products"),
    /** Snapshot do nome no momento da venda. */
    productName: v.string(),
    /** Preço unitário aplicado (pode ter sido editado no PDV). */
    unitPriceCents: v.number(),
    quantity: v.number(),
    /** unitPriceCents * quantity — denormalizado pra leitura rápida. */
    subtotalCents: v.number(),
  })
    .index("by_sale", ["saleId"])
    .index("by_product", ["productId"]),
});
