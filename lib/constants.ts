import { Banknote, CreditCard, Smartphone } from "lucide-react";

export const PAYMENT_METHODS = [
  {
    value: "cash",
    label: "Espécie",
    icon: Banknote,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    value: "pix",
    label: "PIX",
    icon: Smartphone,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    value: "credit",
    label: "Crédito",
    icon: CreditCard,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    value: "debit",
    label: "Débito",
    icon: CreditCard,
    color: "text-accent-foreground",
    bgColor: "bg-accent",
  },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Espécie",
  pix: "PIX",
  credit: "Crédito",
  debit: "Débito",
};

export const APP_NAME = "PDV Eventos";
