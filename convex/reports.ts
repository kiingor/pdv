import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Módulo de relatórios e agregações.
 *
 * Convenções:
 *  - Todos valores em centavos (int).
 *  - Apenas vendas `status="completed"` entram nos totais (canceladas saem).
 *  - Para janelas grandes, fazemos os agregados em memória após o `collect()`.
 *    Convex não tem `groupBy` nativo — para PDV de evento o volume é OK.
 *  - `salesByHour` assume que o cliente já enviou timestamps no fuso correto.
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

type PaymentMethod = "cash" | "pix" | "credit" | "debit";

const ALL_PAYMENT_METHODS: PaymentMethod[] = ["cash", "pix", "credit", "debit"];

/* -------------------------------------------------------------------- */
/* DASHBOARD                                                             */
/* -------------------------------------------------------------------- */

/**
 * Estatísticas do dia para o dashboard principal.
 *
 * Recebe `todayStartMs` do cliente (UTC-3 já aplicado).
 * Retorna:
 *  - totais do dia (valor, quantidade de vendas, quantidade de itens)
 *  - ticket médio
 *  - breakdown por método de pagamento (sempre os 4 métodos, com zeros se ausente)
 *  - top 5 produtos por quantidade vendida
 */
export const dashboardStats = query({
  args: { todayStartMs: v.number() },
  handler: async (ctx, { todayStartMs }) => {
    // Vendas de hoje (completed, _creationTime >= todayStartMs).
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .filter((q) => q.gte(q.field("_creationTime"), todayStartMs))
      .collect();

    const todayCount = sales.length;
    const todayTotalCents = sales.reduce((acc, s) => acc + s.totalCents, 0);
    const todayItemCount = sales.reduce((acc, s) => acc + s.itemCount, 0);
    const ticketAvgCents =
      todayCount > 0 ? Math.round(todayTotalCents / todayCount) : 0;

    // Breakdown por método de pagamento (sempre todos os 4).
    const byPaymentMethod: Record<
      PaymentMethod,
      { count: number; totalCents: number }
    > = {
      cash: { count: 0, totalCents: 0 },
      pix: { count: 0, totalCents: 0 },
      credit: { count: 0, totalCents: 0 },
      debit: { count: 0, totalCents: 0 },
    };
    for (const sale of sales) {
      const bucket = byPaymentMethod[sale.paymentMethod as PaymentMethod];
      bucket.count += 1;
      bucket.totalCents += sale.totalCents;
    }

    // Top 5 produtos: precisamos varrer saleItems das vendas de hoje.
    type ProductAgg = {
      productId: Id<"products">;
      name: string;
      qty: number;
      totalCents: number;
    };
    const productAgg = new Map<string, ProductAgg>();
    for (const sale of sales) {
      const items = await ctx.db
        .query("saleItems")
        .withIndex("by_sale", (q) => q.eq("saleId", sale._id))
        .collect();
      for (const item of items) {
        const key = item.productId as unknown as string;
        const cur = productAgg.get(key);
        if (cur) {
          cur.qty += item.quantity;
          cur.totalCents += item.subtotalCents;
        } else {
          productAgg.set(key, {
            productId: item.productId,
            name: item.productName,
            qty: item.quantity,
            totalCents: item.subtotalCents,
          });
        }
      }
    }
    const topProducts = Array.from(productAgg.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      todayTotalCents,
      todayCount,
      todayItemCount,
      ticketAvgCents,
      byPaymentMethod,
      topProducts,
    };
  },
});

/* -------------------------------------------------------------------- */
/* SALES REPORT                                                          */
/* -------------------------------------------------------------------- */

/**
 * Relatório de vendas com filtros opcionais.
 *
 * Estratégia:
 *  - Se filtrar por `productId`: começa por saleItems (índice by_product),
 *    carrega vendas únicas, filtra por janela + outros filtros.
 *  - Senão: começa por sales (índice by_status, status="completed"),
 *    filtra a janela e os filtros opcionais (customerId/paymentMethod).
 *
 * Anexa info do cliente (objeto `customer`) em cada venda quando houver.
 * Retorna também totais agregados para o cabeçalho do relatório.
 */
export const salesReport = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
    filters: v.object({
      customerId: v.optional(v.id("customers")),
      paymentMethod: v.optional(paymentMethodValidator),
      productId: v.optional(v.id("products")),
    }),
  },
  handler: async (ctx, { startMs, endMs, filters }) => {
    let sales: Doc<"sales">[] = [];

    if (filters.productId) {
      // Caminho via saleItems by_product → carrega vendas únicas.
      const items = await ctx.db
        .query("saleItems")
        .withIndex("by_product", (q) => q.eq("productId", filters.productId!))
        .collect();
      const uniqueSaleIds = new Set<string>();
      for (const it of items) uniqueSaleIds.add(it.saleId as unknown as string);
      const loaded: Doc<"sales">[] = [];
      for (const sid of uniqueSaleIds) {
        const sale = await ctx.db.get(sid as unknown as Id<"sales">);
        if (!sale) continue;
        if (sale.status !== "completed") continue;
        if (sale._creationTime < startMs || sale._creationTime >= endMs) {
          continue;
        }
        if (filters.customerId && sale.customerId !== filters.customerId) {
          continue;
        }
        if (
          filters.paymentMethod &&
          sale.paymentMethod !== filters.paymentMethod
        ) {
          continue;
        }
        loaded.push(sale);
      }
      sales = loaded;
    } else {
      // Caminho direto via sales by_status.
      sales = await ctx.db
        .query("sales")
        .withIndex("by_status", (q) => q.eq("status", "completed"))
        .filter((q) =>
          q.and(
            q.gte(q.field("_creationTime"), startMs),
            q.lt(q.field("_creationTime"), endMs),
          ),
        )
        .collect();

      if (filters.customerId) {
        sales = sales.filter((s) => s.customerId === filters.customerId);
      }
      if (filters.paymentMethod) {
        sales = sales.filter((s) => s.paymentMethod === filters.paymentMethod);
      }
    }

    // Ordena desc por _creationTime para consistência.
    sales.sort((a, b) => b._creationTime - a._creationTime);

    // Anexa info do cliente (cache simples por id para evitar reler).
    const customerCache = new Map<string, Doc<"customers"> | null>();
    const enriched = await Promise.all(
      sales.map(async (sale) => {
        let customer: Doc<"customers"> | null = null;
        if (sale.customerId) {
          const key = sale.customerId as unknown as string;
          if (customerCache.has(key)) {
            customer = customerCache.get(key) ?? null;
          } else {
            customer = await ctx.db.get(sale.customerId);
            customerCache.set(key, customer);
          }
        }
        return { ...sale, customer };
      }),
    );

    const totals = {
      count: sales.length,
      totalCents: sales.reduce((acc, s) => acc + s.totalCents, 0),
      itemCount: sales.reduce((acc, s) => acc + s.itemCount, 0),
    };

    return { sales: enriched, totals };
  },
});

/* -------------------------------------------------------------------- */
/* SALES BY HOUR                                                         */
/* -------------------------------------------------------------------- */

/**
 * Distribuição de vendas por hora do dia (0..23).
 * Sempre retorna os 24 buckets, mesmo zerados, pra UI montar gráfico facilmente.
 *
 * IMPORTANTE: este query usa `new Date(creationTime).getHours()` que retorna
 * a hora no fuso UTC do servidor Convex. Para o evento em UTC-3, o cliente
 * deve passar `startMs`/`endMs` já ajustados — e no momento de agrupar por
 * hora, fazemos a subtração de 3h aqui antes do `getUTCHours()`.
 */
export const salesByHour = query({
  args: { startMs: v.number(), endMs: v.number() },
  handler: async (ctx, { startMs, endMs }) => {
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .filter((q) =>
        q.and(
          q.gte(q.field("_creationTime"), startMs),
          q.lt(q.field("_creationTime"), endMs),
        ),
      )
      .collect();

    const buckets: { hour: number; totalCents: number; count: number }[] =
      Array.from({ length: 24 }, (_, hour) => ({
        hour,
        totalCents: 0,
        count: 0,
      }));

    // UTC-3: subtraímos 3h em ms antes de extrair a hora UTC.
    const OFFSET_MS = 3 * 60 * 60 * 1000;
    for (const sale of sales) {
      const adjusted = new Date(sale._creationTime - OFFSET_MS);
      const hour = adjusted.getUTCHours();
      buckets[hour].totalCents += sale.totalCents;
      buckets[hour].count += 1;
    }
    return buckets;
  },
});

/* -------------------------------------------------------------------- */
/* MARGIN REPORT                                                         */
/* -------------------------------------------------------------------- */

/**
 * Relatório de margem por produto.
 *
 * Para cada produto incluído (ativo OU arquivado, desde que tenha
 * `costPriceCents` definido OU vendas no período), retorna:
 *  - priceCents (preço de venda atual)
 *  - costPriceCents (preço de custo, ou null se não cadastrado)
 *  - marginCents (priceCents - costPriceCents, ou null)
 *  - marginPct (margem / priceCents * 100, ou null)
 *  - qtySold (quantidade vendida no período, padrão 0)
 *  - totalRevenueCents (receita total do produto no período, padrão 0)
 *  - totalCostCents (qtySold * costPriceCents, ou null)
 *  - totalProfitCents (totalRevenueCents - totalCostCents, ou null)
 *
 * Args: { startMs?: number, endMs?: number }
 *  - Sem args: usa todos os tempos (qtySold = total histórico).
 *  - Com args: filtra saleItems pelo _creationTime das sales correspondentes
 *    (apenas sales `completed`).
 *
 * Ordenação: por marginPct desc (produtos mais lucrativos primeiro).
 * Itens com marginPct = null vão para o final.
 *
 * Observação de performance: a janela típica (hoje/última semana) tem
 * volume baixo de saleItems no PDV de evento — a varredura em memória
 * é aceitável e evita índice extra por data.
 */
export const marginReport = query({
  args: {
    startMs: v.optional(v.number()),
    endMs: v.optional(v.number()),
  },
  handler: async (ctx, { startMs, endMs }) => {
    // 1) Carrega todos os produtos (ativos e arquivados).
    const products = await ctx.db.query("products").collect();

    // 2) Carrega saleItems do período. Se houver janela, filtra pelas vendas
    //    completed dentro do range; senão, varre todos os saleItems.
    type ItemAgg = { qtySold: number; totalRevenueCents: number };
    const aggByProduct = new Map<string, ItemAgg>();

    if (startMs !== undefined || endMs !== undefined) {
      // Range parcial é OK: usa Infinity/-Infinity como fallback.
      const lo = startMs ?? -Infinity;
      const hi = endMs ?? Infinity;

      const sales = await ctx.db
        .query("sales")
        .withIndex("by_status", (q) => q.eq("status", "completed"))
        .filter((q) =>
          q.and(
            q.gte(q.field("_creationTime"), lo),
            q.lt(q.field("_creationTime"), hi),
          ),
        )
        .collect();

      for (const sale of sales) {
        const items = await ctx.db
          .query("saleItems")
          .withIndex("by_sale", (q) => q.eq("saleId", sale._id))
          .collect();
        for (const item of items) {
          const key = item.productId as unknown as string;
          const cur = aggByProduct.get(key);
          if (cur) {
            cur.qtySold += item.quantity;
            cur.totalRevenueCents += item.subtotalCents;
          } else {
            aggByProduct.set(key, {
              qtySold: item.quantity,
              totalRevenueCents: item.subtotalCents,
            });
          }
        }
      }
    } else {
      // Sem janela: agrega histórico inteiro de saleItems.
      // Considera só itens cujas vendas estão `completed` para alinhar com
      // o resto do módulo (canceladas não contam em receita).
      const allItems = await ctx.db.query("saleItems").collect();
      const saleStatusCache = new Map<string, "completed" | "cancelled" | null>();
      for (const item of allItems) {
        const sKey = item.saleId as unknown as string;
        let status = saleStatusCache.get(sKey);
        if (status === undefined) {
          const sale = await ctx.db.get(item.saleId);
          status = sale ? sale.status : null;
          saleStatusCache.set(sKey, status);
        }
        if (status !== "completed") continue;

        const key = item.productId as unknown as string;
        const cur = aggByProduct.get(key);
        if (cur) {
          cur.qtySold += item.quantity;
          cur.totalRevenueCents += item.subtotalCents;
        } else {
          aggByProduct.set(key, {
            qtySold: item.quantity,
            totalRevenueCents: item.subtotalCents,
          });
        }
      }
    }

    // 3) Monta linha por produto, filtrando os que não têm custo nem vendas.
    type MarginRow = {
      productId: Id<"products">;
      name: string;
      active: boolean;
      /** Preço de venda atual no catálogo. Pode diferir do que foi vendido. */
      priceCents: number;
      /** Preço médio que o produto FOI VENDIDO no período (totalRevenue/qty). */
      avgSoldPriceCents: number | null;
      costPriceCents: number | null;
      /** Margem unit baseada no preço médio real vendido (ou catálogo se sem vendas). */
      marginCents: number | null;
      marginPct: number | null;
      qtySold: number;
      totalRevenueCents: number;
      totalCostCents: number | null;
      totalProfitCents: number | null;
    };

    const rows: MarginRow[] = [];
    for (const product of products) {
      const key = product._id as unknown as string;
      const agg = aggByProduct.get(key);
      const hasCost = product.costPriceCents !== undefined;
      const hasSales = agg !== undefined && agg.qtySold > 0;

      // Inclui apenas produtos com custo cadastrado OU com vendas no período.
      if (!hasCost && !hasSales) continue;

      const costPriceCents = hasCost ? (product.costPriceCents as number) : null;

      const qtySold = agg?.qtySold ?? 0;
      const totalRevenueCents = agg?.totalRevenueCents ?? 0;

      // Preço médio real vendido (se houver vendas) — captura ajustes feitos no PDV.
      // Quando não há vendas, cai pro preço de catálogo (próxima venda esperada).
      const avgSoldPriceCents =
        qtySold > 0 ? Math.round(totalRevenueCents / qtySold) : null;
      const effectivePriceCents = avgSoldPriceCents ?? product.priceCents;

      const marginCents =
        costPriceCents !== null ? effectivePriceCents - costPriceCents : null;
      const marginPct =
        marginCents !== null && effectivePriceCents > 0
          ? (marginCents / effectivePriceCents) * 100
          : null;

      const totalCostCents =
        costPriceCents !== null ? qtySold * costPriceCents : null;
      const totalProfitCents =
        totalCostCents !== null ? totalRevenueCents - totalCostCents : null;

      rows.push({
        productId: product._id,
        name: product.name,
        active: product.active,
        priceCents: product.priceCents,
        avgSoldPriceCents,
        costPriceCents,
        marginCents,
        marginPct,
        qtySold,
        totalRevenueCents,
        totalCostCents,
        totalProfitCents,
      });
    }

    // 4) Ordena por marginPct desc; null no final. Empate desempatado por nome.
    rows.sort((a, b) => {
      if (a.marginPct === null && b.marginPct === null) {
        return a.name.localeCompare(b.name, "pt-BR");
      }
      if (a.marginPct === null) return 1;
      if (b.marginPct === null) return -1;
      if (b.marginPct !== a.marginPct) return b.marginPct - a.marginPct;
      return a.name.localeCompare(b.name, "pt-BR");
    });

    return rows;
  },
});

/* -------------------------------------------------------------------- */
/* MARGEM POR VENDA (drill-down item-a-item)                             */
/* -------------------------------------------------------------------- */

/**
 * Margem de cada item vendido no período (vendas completed). Diferente do
 * `marginReport` (agregado por produto), este retorna **uma linha por
 * saleItem** — útil pra ver vendas onde o operador alterou o preço unitário
 * no PDV (ex: produto cadastrado a R$ 23, vendido a R$ 32).
 *
 * Cada linha mostra: data, produto, qty, preço aplicado, preço de catálogo,
 * custo, margem real e diferença vs catálogo (positiva = vendeu mais caro).
 */
export const marginBySaleItem = query({
  args: {
    startMs: v.optional(v.number()),
    endMs: v.optional(v.number()),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const lo = startMs ?? -Infinity;
    const hi = endMs ?? Infinity;

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .filter((q) =>
        q.and(
          q.gte(q.field("_creationTime"), lo),
          q.lt(q.field("_creationTime"), hi),
        ),
      )
      .collect();

    type SaleItemMarginRow = {
      saleItemId: Id<"saleItems">;
      saleId: Id<"sales">;
      saleCreatedAt: number;
      productId: Id<"products">;
      productName: string;
      customerName: string | null;
      paymentMethod: PaymentMethod;
      quantity: number;
      /** Preço unit aplicado nessa venda (pode diferir do catálogo). */
      unitPriceCents: number;
      /** Preço atual do catálogo (ou unitPrice se produto sumiu). */
      catalogPriceCents: number;
      costPriceCents: number | null;
      subtotalCents: number;
      marginCents: number | null;
      marginPct: number | null;
      totalCostCents: number | null;
      totalProfitCents: number | null;
      /** Diferença entre preço aplicado e catálogo. Positiva = vendeu mais caro. */
      priceVsCatalogCents: number;
    };

    const productCache = new Map<string, Doc<"products"> | null>();
    const rows: SaleItemMarginRow[] = [];

    for (const sale of sales) {
      const items = await ctx.db
        .query("saleItems")
        .withIndex("by_sale", (q) => q.eq("saleId", sale._id))
        .collect();

      for (const item of items) {
        const pKey = item.productId as unknown as string;
        let product = productCache.get(pKey);
        if (product === undefined) {
          product = await ctx.db.get(item.productId);
          productCache.set(pKey, product);
        }

        const costPriceCents = product?.costPriceCents ?? null;
        const catalogPriceCents = product?.priceCents ?? item.unitPriceCents;

        const marginCents =
          costPriceCents !== null
            ? item.unitPriceCents - costPriceCents
            : null;
        const marginPct =
          marginCents !== null && item.unitPriceCents > 0
            ? (marginCents / item.unitPriceCents) * 100
            : null;
        const totalCostCents =
          costPriceCents !== null ? item.quantity * costPriceCents : null;
        const totalProfitCents =
          totalCostCents !== null
            ? item.subtotalCents - totalCostCents
            : null;

        rows.push({
          saleItemId: item._id,
          saleId: sale._id,
          saleCreatedAt: sale._creationTime,
          productId: item.productId,
          productName: item.productName,
          customerName: sale.customerName ?? null,
          paymentMethod: sale.paymentMethod,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          catalogPriceCents,
          costPriceCents,
          subtotalCents: item.subtotalCents,
          marginCents,
          marginPct,
          totalCostCents,
          totalProfitCents,
          priceVsCatalogCents: item.unitPriceCents - catalogPriceCents,
        });
      }
    }

    // Mais recentes primeiro (operador costuma querer ver as últimas vendas).
    rows.sort((a, b) => b.saleCreatedAt - a.saleCreatedAt);
    return rows;
  },
});

/* eslint-disable @typescript-eslint/no-unused-vars */
// Mantemos a constante exportável caso outros módulos precisem iterar os métodos.
export const _ALL_PAYMENT_METHODS = ALL_PAYMENT_METHODS;
