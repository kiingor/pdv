import { jsPDF } from "jspdf";
import { formatBRL, formatDateTime } from "./format";
import { APP_NAME, PAYMENT_METHOD_LABELS, type PaymentMethod } from "./constants";

export type ReceiptItem = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
};

export type ReceiptData = {
  saleId: string;
  createdAt: number;
  items: ReceiptItem[];
  totalCents: number;
  paymentMethod: PaymentMethod;
  customerName: string | null;
};

const PAGE_WIDTH_MM = 80;
const MARGIN_X_MM = 4;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_X_MM * 2;
const LINE_HEIGHT_MM = 3.6;
const FONT_SIZE = 9;
const HEADER_FONT_SIZE = 11;

const DIVIDER_DOUBLE = "=".repeat(32);
const DIVIDER_SINGLE = "-".repeat(32);

function shortSaleId(saleId: string): string {
  return `#${saleId.slice(0, 6).toUpperCase()}`;
}

/**
 * Quebra o nome do item em múltiplas linhas se necessário pra caber
 * na coluna de descrição (largura - espaço do valor à direita).
 */
function wrapItemName(name: string, maxChars: number): string[] {
  if (name.length <= maxChars) return [name];
  const lines: string[] = [];
  let remaining = name;
  while (remaining.length > maxChars) {
    const slice = remaining.slice(0, maxChars);
    const lastSpace = slice.lastIndexOf(" ");
    const cut = lastSpace > maxChars / 2 ? lastSpace : maxChars;
    lines.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) lines.push(remaining);
  return lines;
}

function buildItemLines(items: ReceiptItem[]): {
  left: string;
  right: string;
}[] {
  const out: { left: string; right: string }[] = [];
  for (const item of items) {
    const prefix = `${item.quantity}x `;
    const maxNameChars = 22 - prefix.length;
    const nameLines = wrapItemName(item.name, maxNameChars);
    out.push({
      left: `${prefix}${nameLines[0]}`,
      right: formatBRL(item.subtotalCents),
    });
    for (let i = 1; i < nameLines.length; i++) {
      out.push({ left: `   ${nameLines[i]}`, right: "" });
    }
  }
  return out;
}

/**
 * Estima a altura da página antes de criar o PDF — jsPDF exige `format`
 * fixo na construção, então a altura precisa estar correta de antemão.
 */
function estimateHeightMm(itemLineCount: number, hasCustomer: boolean): number {
  const lines =
    7 + // cabeçalho (divider, título, "Comprovante", id, data)
    3 + // ITENS header (divider + label + divider)
    itemLineCount +
    3 + // subtotal (divider + label + divider)
    (hasCustomer ? 1 : 0) +
    2 + // forma pagto + total
    4; // rodapé (divider + obrigado + divider + folga)
  return Math.max(80, lines * LINE_HEIGHT_MM + 16);
}

export function generateReceiptPdf(data: ReceiptData): jsPDF {
  const itemLines = buildItemLines(data.items);
  const heightMm = estimateHeightMm(itemLines.length, !!data.customerName);

  const pdf = new jsPDF({
    unit: "mm",
    format: [PAGE_WIDTH_MM, heightMm],
    orientation: "portrait",
  });

  pdf.setFont("courier", "normal");
  pdf.setFontSize(FONT_SIZE);

  let y = 6;

  const writeCenter = (text: string, opts?: { bold?: boolean; size?: number }) => {
    if (opts?.size) pdf.setFontSize(opts.size);
    pdf.setFont("courier", opts?.bold ? "bold" : "normal");
    pdf.text(text, PAGE_WIDTH_MM / 2, y, { align: "center" });
    y += LINE_HEIGHT_MM;
    if (opts?.size) pdf.setFontSize(FONT_SIZE);
    pdf.setFont("courier", "normal");
  };

  const writeLeft = (text: string, opts?: { bold?: boolean }) => {
    pdf.setFont("courier", opts?.bold ? "bold" : "normal");
    pdf.text(text, MARGIN_X_MM, y);
    y += LINE_HEIGHT_MM;
    pdf.setFont("courier", "normal");
  };

  const writeRow = (left: string, right: string, opts?: { bold?: boolean }) => {
    pdf.setFont("courier", opts?.bold ? "bold" : "normal");
    pdf.text(left, MARGIN_X_MM, y);
    if (right) {
      pdf.text(right, PAGE_WIDTH_MM - MARGIN_X_MM, y, { align: "right" });
    }
    y += LINE_HEIGHT_MM;
    pdf.setFont("courier", "normal");
  };

  writeCenter(DIVIDER_DOUBLE);
  writeCenter(APP_NAME.toUpperCase(), { bold: true, size: HEADER_FONT_SIZE });
  writeCenter(DIVIDER_DOUBLE);
  writeLeft("Comprovante de Venda");
  writeLeft(shortSaleId(data.saleId));
  writeLeft(formatDateTime(data.createdAt));

  y += 1;
  writeCenter(DIVIDER_SINGLE);
  writeLeft("ITENS", { bold: true });
  writeCenter(DIVIDER_SINGLE);

  for (const line of itemLines) {
    writeRow(line.left, line.right);
  }

  writeCenter(DIVIDER_SINGLE);
  writeRow("Subtotal", formatBRL(data.totalCents));
  writeCenter(DIVIDER_SINGLE);

  y += 1;
  if (data.customerName) {
    writeLeft(`Cliente: ${data.customerName}`);
  }
  writeLeft(`Forma de pagto: ${PAYMENT_METHOD_LABELS[data.paymentMethod]}`);
  writeRow("TOTAL:", formatBRL(data.totalCents), { bold: true });

  y += 2;
  writeCenter(DIVIDER_DOUBLE);
  writeCenter("Obrigado!", { bold: true });
  writeCenter(DIVIDER_DOUBLE);

  // Suprime warning de variável não-utilizada (CONTENT_WIDTH_MM serve de docs).
  void CONTENT_WIDTH_MM;

  return pdf;
}

/**
 * Abre o PDF numa nova aba já com o diálogo de impressão disparado.
 * `autoPrint` precisa ser chamado antes do `output("bloburl")`.
 */
export function printReceipt(data: ReceiptData): void {
  const pdf = generateReceiptPdf(data);
  pdf.autoPrint({ variant: "non-conform" });
  const url = pdf.output("bloburl");
  const win = window.open(url, "_blank");
  if (!win) {
    throw new Error("Não conseguimos abrir a aba de impressão. Verifique o bloqueador de pop-ups.");
  }
}

export function downloadReceipt(data: ReceiptData, filename?: string): void {
  const pdf = generateReceiptPdf(data);
  const name = filename ?? `comprovante-${data.saleId.slice(0, 6)}.pdf`;
  pdf.save(name);
}
