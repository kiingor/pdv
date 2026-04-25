import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Wipe completo: apaga TODOS os dados de products, customers, sales e saleItems.
 *
 * Uso (CLI):
 *   npx convex run admin:wipeAllData '{"confirm":"WIPE"}'
 *
 * O argumento `confirm` precisa ser literal "WIPE" — proteção contra clique
 * acidental no dashboard ou run sem querer.
 *
 * IMPORTANTE: também tenta apagar arquivos do storage (fotos de produto).
 */
export const wipeAllData = internalMutation({
  args: { confirm: v.string() },
  handler: async (ctx, { confirm }) => {
    if (confirm !== "WIPE") {
      throw new Error(
        'Confirmação incorreta. Passe { "confirm": "WIPE" } para confirmar.',
      );
    }

    // Apaga em ordem segura: filhos antes de pais (saleItems → sales).
    const saleItems = await ctx.db.query("saleItems").collect();
    for (const item of saleItems) await ctx.db.delete(item._id);

    const sales = await ctx.db.query("sales").collect();
    for (const sale of sales) await ctx.db.delete(sale._id);

    const customers = await ctx.db.query("customers").collect();
    for (const customer of customers) await ctx.db.delete(customer._id);

    // Produtos: também remover storage (fotos) pra não deixar lixo.
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      if (product.photoStorageId) {
        try {
          await ctx.storage.delete(product.photoStorageId);
        } catch {
          // Storage pode estar inacessível — não bloqueia o wipe.
        }
      }
      await ctx.db.delete(product._id);
    }

    return {
      deleted: {
        saleItems: saleItems.length,
        sales: sales.length,
        customers: customers.length,
        products: products.length,
      },
    };
  },
});

/**
 * Wipe seletivo: só vendas (mantém produtos e clientes cadastrados).
 * Útil pra limpar dados de teste do PDV mas manter o catálogo.
 *
 * Uso: npx convex run admin:wipeSalesOnly '{"confirm":"WIPE"}'
 */
export const wipeSalesOnly = internalMutation({
  args: { confirm: v.string() },
  handler: async (ctx, { confirm }) => {
    if (confirm !== "WIPE") {
      throw new Error(
        'Confirmação incorreta. Passe { "confirm": "WIPE" } para confirmar.',
      );
    }

    const saleItems = await ctx.db.query("saleItems").collect();
    for (const item of saleItems) await ctx.db.delete(item._id);

    const sales = await ctx.db.query("sales").collect();
    for (const sale of sales) await ctx.db.delete(sale._id);

    return {
      deleted: { saleItems: saleItems.length, sales: sales.length },
    };
  },
});
