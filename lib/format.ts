/**
 * Formatadores BR — moeda, telefone, datas, números.
 * Toda a UI deve passar por aqui pra manter consistência.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const TIME = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Centavos (number) → "R$ 12,90" */
export function formatBRL(cents: number): string {
  return BRL.format(cents / 100);
}

/** Reais (number) → "R$ 12,90" */
export function formatBRLFromReais(reais: number): string {
  return BRL.format(reais);
}

export function formatNumber(n: number): string {
  return NUMBER.format(n);
}

export function formatDateTime(ts: number | Date): string {
  return DATE_TIME.format(ts);
}

export function formatDate(ts: number | Date): string {
  return DATE.format(ts);
}

export function formatTime(ts: number | Date): string {
  return TIME.format(ts);
}

/** "11987654321" → "(11) 98765-4321" */
export function formatPhone(raw: string): string {
  const digits = onlyDigits(raw);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Aplica máscara de telefone BR enquanto o usuário digita.
 * "11987" → "(11) 987"
 */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Aplica máscara de moeda BRL enquanto digita.
 * Trabalha em centavos. "1290" (digitado) → "R$ 12,90"
 */
export function maskBRL(value: string): string {
  const digits = onlyDigits(value);
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return formatBRL(cents);
}

/** Extrai centavos de uma string mascarada "R$ 12,90" → 1290 */
export function parseBRLToCents(masked: string): number {
  const digits = onlyDigits(masked);
  return digits ? parseInt(digits, 10) : 0;
}

/** Reais (float) → centavos (int). 12.9 → 1290 */
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}

/** Centavos → reais. 1290 → 12.9 */
export function centsToReais(cents: number): number {
  return cents / 100;
}

/**
 * Calcula a margem de lucro em porcentagem a partir do preço de venda e custo
 * (ambos em centavos). Retorna `null` quando o cálculo não faz sentido —
 * sem custo cadastrado ou preço de venda zero/negativo.
 *
 * Margem negativa (custo > preço) também é retornada — quem consome decide
 * como apresentar (ex: alerta visual).
 */
export function calcMarginPct(
  priceCents: number,
  costCents: number | null | undefined,
): number | null {
  if (costCents == null || priceCents <= 0) return null;
  return ((priceCents - costCents) / priceCents) * 100;
}
