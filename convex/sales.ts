import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Módulo de vendas.
 *
 * Convenções:
 *  - `create` é atômico (mutations Convex são transacionais).
 *  - Snapshotamos `productName` e `unitPriceCents` em cada saleItem para
 *    preservar o histórico mesmo se o produto mudar/for arquivado.
 *  - Snapshotamos `customerName` no header da venda pelo mesmo motivo.
 *  - Vendas nunca são apagadas — `cancel` apenas marca status="cancelled".
 */

/* -------------------------------------------------------------------- */
/* TYPES                                                                 */
/* -------------------------------------------------------------------- */

const paymentMethodValidator = v.union(
  v.literal("cash"),
  v.literal("pix"),
  v.literal("credit"),
  v.literal("debit"),
);

/* -------------------------------------------------------------------- */
/* MUTATIONS                                                             */
/* -------------------------------------------------------------------- */

/**
 * Cria uma venda completa (header + itens) de forma atômica.
 *
 * Para cada item:
 *  - Lê o produto e snapshota o nome.
 *  - Usa `unitPriceCents` informado, ou cai no `priceCents` do produto.
 *  - Calcula `subtotalCents = unitPriceCents * quantity`.
 *
 * Retorna `{ saleId, totalCents }` para a UI poder mostrar recibo.
 */
export const create = mutation({
  args: {
    customerId: v.optional(v.id("customers")),
    paymentMethod: paymentMethodValidator,
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        unitPriceCents: v.optional(v.number()),
      }),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      throw new Error("Venda precisa ter pelo menos 1 item");
    }

    // Snapshot do nome do cliente (se houver).
    let customerName: string | undefined;
    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId);
      if (!customer) throw new Error("Cliente não encontrado");
      customerName = customer.name;
    }

    // Pré-processa todos os itens: lê o produto, snapshota nome e preço,
    // calcula subtotal, e agrega qty por produto (pra validar estoque).
    // Erro aqui aborta a mutation inteira (atomicidade do Convex).
    type ResolvedItem = {
      productId: Id<"products">;
      productName: string;
      unitPriceCents: number;
      quantity: number;
      subtotalCents: number;
    };

    const resolved: ResolvedItem[] = [];
    // Cache de produto + soma de qty (caso o mesmo productId apareça +1x).
    const productAgg = new Map<
      string,
      { product: Doc<"products">; totalQty: number }
    >();
    let totalCents = 0;
    let itemCount = 0;

    for (const item of args.items) {
      if (item.quantity <= 0) {
        throw new Error("Quantidade do item deve ser maior que zero");
      }

      const key = item.productId as unknown as string;
      let entry = productAgg.get(key);
      if (!entry) {
        const product = await ctx.db.get(item.productId);
        if (!product) throw new Error("Produto não encontrado");
        entry = { product, totalQty: 0 };
        productAgg.set(key, entry);
      }
      entry.totalQty += item.quantity;

      const unitPriceCents = item.unitPriceCents ?? entry.product.priceCents;
      const subtotalCents = unitPriceCents * item.quantity;
      resolved.push({
        productId: item.productId,
        productName: entry.product.name,
        unitPriceCents,
        quantity: item.quantity,
        subtotalCents,
      });
      totalCents += subtotalCents;
      itemCount += item.quantity;
    }

    // Validação de estoque: só pra produtos com `stockQuantity` definido.
    // (`undefined` = ilimitado, ex: bebidas servidas; pula a checagem.)
    for (const [, entry] of productAgg) {
      if (entry.product.stockQuantity !== undefined) {
        if (entry.totalQty > entry.product.stockQuantity) {
          throw new Error(
            `Estoque insuficiente de "${entry.product.name}". ` +
              `Disponível: ${entry.product.stockQuantity}, pedido: ${entry.totalQty}.`,
          );
        }
      }
    }

    // Insere o header da venda.
    const saleId = await ctx.db.insert("sales", {
      customerId: args.customerId,
      customerName,
      totalCents,
      paymentMethod: args.paymentMethod,
      status: "completed",
      notes: args.notes,
      itemCount,
    });

    // Insere todos os itens.
    for (const item of resolved) {
      await ctx.db.insert("saleItems", {
        saleId,
        productId: item.productId,
        productName: item.productName,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        subtotalCents: item.subtotalCents,
      });
    }

    // Decrementa estoque dos produtos com controle ativo.
    const now = Date.now();
    for (const [, entry] of productAgg) {
      if (entry.product.stockQuantity !== undefined) {
        await ctx.db.patch(entry.product._id, {
          stockQuantity: entry.product.stockQuantity - entry.totalQty,
          updatedAt: now,
        });
      }
    }

    return { saleId, totalCents };
  },
});

/**
 * Cancela uma venda (não apaga). Status fica "cancelled".
 * Restaura o estoque dos produtos com controle ativo.
 * Idempotente: cancelar venda já cancelada é no-op (não dobra o estoque).
 */
export const cancel = mutation({
  args: { id: v.id("sales") },
  handler: async (ctx, { id }) => {
    const sale = await ctx.db.get(id);
    if (!sale) throw new Error("Venda não encontrada");
    if (sale.status === "cancelled") return; // idempotente

    const items = await ctx.db
      .query("saleItems")
      .withIndex("by_sale", (q) => q.eq("saleId", id))
      .collect();

    // Agrega qty por productId (preserva o tipo Id<"products">).
    const restock = new Map<
      string,
      { productId: Id<"products">; qty: number }
    >();
    for (const item of items) {
      const key = item.productId as unknown as string;
      const cur = restock.get(key);
      if (cur) {
        cur.qty += item.quantity;
      } else {
        restock.set(key, { productId: item.productId, qty: item.quantity });
      }
    }

    // Restaura estoque dos produtos com controle ativo.
    const now = Date.now();
    for (const [, { productId, qty }] of restock) {
      const product = await ctx.db.get(productId);
      if (product?.stockQuantity !== undefined) {
        await ctx.db.patch(productId, {
          stockQuantity: product.stockQuantity + qty,
          updatedAt: now,
        });
      }
    }

    await ctx.db.patch(id, { status: "cancelled" });
  },
});

/* -------------------------------------------------------------------- */
/* QUERIES                                                               */
/* -------------------------------------------------------------------- */

/**
 * Retorna venda completa: header + itens (com photoUrl do produto) + cliente (se houver).
 * Usado na tela de detalhes/recibo.
 */
export const get = query({
  args: { id: v.id("sales") },
  handler: async (ctx, { id }) => {
    const sale = await ctx.db.get(id);
    if (!sale) return null;

    const items = await ctx.db
      .query("saleItems")
      .withIndex("by_sale", (q) => q.eq("saleId", id))
      .collect();

    // Resolve photoUrl do produto atual em cada item.
    const itemsWithPhoto = await Promise.all(
      items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const photoUrl =
          product?.photoStorageId
            ? await ctx.storage.getUrl(product.photoStorageId)
            : null;
        return { ...item, productPhotoUrl: photoUrl };
      }),
    );

    let customer: Doc<"customers"> | null = null;
    if (sale.customerId) {
      customer = await ctx.db.get(sale.customerId);
    }

    return { sale, items: itemsWithPhoto, customer };
  },
});

/**
 * Lista vendas COMPLETED mais recentes (ordem desc por _creationTime).
 * Usa `customerName` já snapshotado no header — não precisa join.
 */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = limit ?? 50;
    return await ctx.db
      .query("sales")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .order("desc")
      .take(max);
  },
});

/**
 * Lista vendas dentro de uma janela [startMs, endMs).
 * Por padrão filtra status="completed". Passe outro status (ou null) se necessário.
 */
export const listByDateRange = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
    status: v.optional(
      v.union(v.literal("completed"), v.literal("cancelled")),
    ),
  },
  handler: async (ctx, { startMs, endMs, status }) => {
    const targetStatus = status ?? "completed";
    return await ctx.db
      .query("sales")
      .withIndex("by_status", (q) => q.eq("status", targetStatus))
      .filter((q) =>
        q.and(
          q.gte(q.field("_creationTime"), startMs),
          q.lt(q.field("_creationTime"), endMs),
        ),
      )
      .collect();
  },
});
