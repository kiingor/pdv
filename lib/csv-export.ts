import { formatDateTime } from "./format";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "./constants";

export type SaleForExport = {
  _creationTime: number;
  customerName?: string | null;
  itemCount: number;
  paymentMethod: PaymentMethod;
  totalCents: number;
};

/**
 * Exporta vendas filtradas como CSV compatível com Excel BR.
 * Usa separador `;`, BOM UTF-8 (acentos) e vírgula como decimal.
 */
export function exportSalesToCsv(
  sales: SaleForExport[],
  filename: string,
): void {
  const headers = ["Data", "Cliente", "Itens", "Forma", "Total"];
  const rows = sales.map((s) => [
    formatDateTime(s._creationTime),
    s.customerName ?? "Avulso",
    String(s.itemCount),
    PAYMENT_METHOD_LABELS[s.paymentMethod],
    (s.totalCents / 100).toFixed(2).replace(".", ","),
  ]);

  downloadCsv(headers, rows, filename);
}

export type MarginRowForExport = {
  name: string;
  qtySold: number;
  costPriceCents: number | null;
  priceCents: number;
  avgSoldPriceCents: number | null;
  marginCents: number | null;
  marginPct: number | null;
  totalRevenueCents: number;
  totalCostCents: number | null;
  totalProfitCents: number | null;
};

/**
 * Exporta o relatório de margem por produto como CSV compatível com Excel BR.
 * Mesma convenção do `exportSalesToCsv`: `;`, BOM UTF-8 e vírgula decimal.
 * Valores `null` viram string vazia (Excel exibe célula em branco).
 */
export function exportMarginToCsv(
  rows: MarginRowForExport[],
  filename: string,
): void {
  const headers = [
    "Produto",
    "Qty vendida",
    "Custo unit",
    "Preço catálogo",
    "Preço médio vendido",
    "Margem unit",
    "Margem %",
    "Receita período",
    "Custo período",
    "Lucro período",
  ];

  const data = rows.map((r) => [
    r.name,
    String(r.qtySold),
    centsToCsv(r.costPriceCents),
    centsToCsv(r.priceCents),
    centsToCsv(r.avgSoldPriceCents),
    centsToCsv(r.marginCents),
    pctToCsv(r.marginPct),
    centsToCsv(r.totalRevenueCents),
    centsToCsv(r.totalCostCents),
    centsToCsv(r.totalProfitCents),
  ]);

  downloadCsv(headers, data, filename);
}

/** Gera nome de arquivo `vendas-YYYY-MM-DD.csv` com a data atual. */
export function defaultCsvFilename(prefix = "vendas"): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${prefix}-${today}.csv`;
}

export type SaleItemMarginRowForExport = {
  saleCreatedAt: number;
  productName: string;
  customerName: string | null;
  paymentMethodLabel: string;
  quantity: number;
  unitPriceCents: number;
  catalogPriceCents: number;
  costPriceCents: number | null;
  subtotalCents: number;
  marginCents: number | null;
  marginPct: number | null;
  totalProfitCents: number | null;
};

/**
 * Exporta a "Margem por venda" (item-a-item). Cada linha = um saleItem.
 */
export function exportSaleItemMarginToCsv(
  rows: SaleItemMarginRowForExport[],
  filename: string,
  formatDate: (ts: number) => string,
): void {
  const headers = [
    "Data",
    "Produto",
    "Cliente",
    "Forma",
    "Qty",
    "Preço aplicado",
    "Preço catálogo",
    "Custo unit",
    "Subtotal",
    "Margem unit",
    "Margem %",
    "Lucro item",
  ];

  const data = rows.map((r) => [
    formatDate(r.saleCreatedAt),
    r.productName,
    r.customerName ?? "Avulso",
    r.paymentMethodLabel,
    String(r.quantity),
    centsToCsv(r.unitPriceCents),
    centsToCsv(r.catalogPriceCents),
    centsToCsv(r.costPriceCents),
    centsToCsv(r.subtotalCents),
    centsToCsv(r.marginCents),
    pctToCsv(r.marginPct),
    centsToCsv(r.totalProfitCents),
  ]);

  downloadCsv(headers, data, filename);
}

/* ------------------------------------------------------------------ */
/* internals                                                            */
/* ------------------------------------------------------------------ */

function downloadCsv(
  headers: string[],
  rows: string[][],
  filename: string,
): void {
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"),
    )
    .join("\n");

  // BOM `\uFEFF` é essencial pro Excel reconhecer UTF-8 e não quebrar acentos.
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function centsToCsv(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

function pctToCsv(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "";
  // Mantém 1 casa decimal pra alinhar com a UI.
  return pct.toFixed(1).replace(".", ",");
}
