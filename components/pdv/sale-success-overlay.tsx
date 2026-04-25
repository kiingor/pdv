"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { formatBRL } from "@/lib/format";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/constants";
import {
  downloadReceipt,
  printReceipt,
  type ReceiptItem,
} from "@/lib/receipt";

type Props = {
  saleId: string;
  createdAt: number;
  items: ReceiptItem[];
  totalCents: number;
  paymentMethod: PaymentMethod;
  customerName: string | null;
  onNewSale: () => void;
};

/**
 * Overlay full-screen celebrativo que aparece após cada venda.
 * Confete dispara nos 2 cantos inferiores na montagem; F4 abre nova venda.
 */
export function SaleSuccessOverlay({
  saleId,
  createdAt,
  items,
  totalCents,
  paymentMethod,
  customerName,
  onNewSale,
}: Props) {
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const colors = ["#FF6B35", "#FF1493", "#9333EA", "#22C55E", "#F59E0B"];
    const common = {
      particleCount: 80,
      spread: 70,
      startVelocity: 55,
      colors,
      ticks: 220,
    } as const;
    confetti({ ...common, angle: 60, origin: { x: 0, y: 0.85 } });
    confetti({ ...common, angle: 120, origin: { x: 1, y: 0.85 } });
  }, []);

  useKeyboardShortcut("F4", () => onNewSale(), { ignoreInEditable: false });
  useKeyboardShortcut("Escape", () => onNewSale(), { ignoreInEditable: false });

  const methodInfo = PAYMENT_METHODS.find((m) => m.value === paymentMethod);
  const Icon = methodInfo?.icon ?? CheckCircle2;

  const receiptData = {
    saleId,
    createdAt,
    items,
    totalCents,
    paymentMethod,
    customerName,
  };

  const handlePrint = () => {
    if (printing) return;
    setPrinting(true);
    try {
      printReceipt(receiptData);
    } catch (err) {
      const description =
        err instanceof Error ? err.message : "Tente novamente em instantes.";
      toast.error("Falha ao gerar comprovante", { description });
    } finally {
      setTimeout(() => setPrinting(false), 200);
    }
  };

  const handleDownload = () => {
    if (downloading) return;
    setDownloading(true);
    try {
      downloadReceipt(receiptData);
    } catch (err) {
      const description =
        err instanceof Error ? err.message : "Tente novamente em instantes.";
      toast.error("Falha ao baixar comprovante", { description });
    } finally {
      setTimeout(() => setDownloading(false), 200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-background/95 p-4 backdrop-blur-md">
      <Card className="mx-auto w-full max-w-md animate-pop p-8 text-center">
        <div className="mx-auto mb-4 grid h-32 w-32 place-items-center rounded-full bg-success/10">
          <CheckCircle2 className="h-24 w-24 animate-pop text-success" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Venda registrada!</h2>
        {customerName && (
          <p className="mt-1 text-sm text-muted-foreground">
            Cliente: <span className="font-medium">{customerName}</span>
          </p>
        )}
        <p className="mt-6 text-5xl font-bold text-primary tabular-nums">
          {formatBRL(totalCents)}
        </p>
        <div className="mt-3 flex justify-center">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-sm">
            <Icon className="h-3.5 w-3.5" />
            {PAYMENT_METHOD_LABELS[paymentMethod]}
          </Badge>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <Button
            autoFocus
            onClick={onNewSale}
            className="h-14 w-full bg-gradient-to-r from-primary to-chart-2 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30"
          >
            Nova venda (F4)
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={printing}
              className="h-11 flex-1"
            >
              <Printer className="mr-2 h-4 w-4" />
              {printing ? "Gerando..." : "Imprimir"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDownload}
              disabled={downloading}
              className="h-11 flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              {downloading ? "Gerando..." : "Baixar PDF"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
