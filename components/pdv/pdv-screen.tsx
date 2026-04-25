"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Maximize2,
  Minimize2,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProductCatalog } from "@/components/pdv/product-catalog";
import { CartPanel } from "@/components/pdv/cart-panel";
import { SaleSuccessOverlay } from "@/components/pdv/sale-success-overlay";
import { useCart } from "@/hooks/use-cart";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useFullscreen } from "@/hooks/use-fullscreen";
import type { PaymentMethod } from "@/lib/constants";
import type { ReceiptItem } from "@/lib/receipt";
import { cn } from "@/lib/utils";

type SuccessInfo = {
  saleId: string;
  createdAt: number;
  items: ReceiptItem[];
  totalCents: number;
  paymentMethod: PaymentMethod;
  customerName: string | null;
};

type Props = {
  /**
   * Modo kiosk: PDV ocupa 100% da viewport (sem AppShell). Esconde também
   * o botão "abrir em nova guia" (já está em nova guia) e o link de voltar.
   */
  kioskMode?: boolean;
};

/**
 * Orquestrador da tela do PDV: coordena o catálogo, o carrinho (lateral em
 * desktop e drawer em mobile), atalhos de teclado e a chamada da venda.
 */
export function PdvScreen({ kioskMode = false }: Props) {
  const cart = useCart();
  const createSale = useMutation(api.sales.create);
  const [finalizing, setFinalizing] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fullscreen = useFullscreen();

  const openInNewTab = useCallback(() => {
    window.open("/pdv?kiosk=1", "_blank", "noopener,noreferrer");
  }, []);

  // Map productId → quantidade já no carrinho (pra catálogo desabilitar
  // cards quando o estoque limite for atingido).
  const cartQuantities = useMemo(() => {
    const m = new Map<string, number>();
    for (const item of cart.state.items) {
      m.set(item.productId as unknown as string, item.quantity);
    }
    return m;
  }, [cart.state.items]);

  const finalizeDisabled =
    cart.state.items.length === 0 || !cart.state.paymentMethod;

  const handleFinalize = useCallback(async () => {
    if (finalizeDisabled || finalizing) return;
    setFinalizing(true);
    try {
      const result = await createSale({
        customerId: cart.state.customerId ?? undefined,
        paymentMethod: cart.state.paymentMethod!,
        items: cart.state.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPriceCents: it.unitPriceCents,
        })),
        notes: cart.state.notes.trim() || undefined,
      });
      // Snapshot dos itens antes do `clear` no `handleNewSale`, pra alimentar o
      // comprovante mesmo após o reset do carrinho.
      setSuccess({
        saleId: result.saleId,
        createdAt: Date.now(),
        items: cart.state.items.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          unitPriceCents: it.unitPriceCents,
          subtotalCents: it.unitPriceCents * it.quantity,
        })),
        totalCents: result.totalCents,
        paymentMethod: cart.state.paymentMethod!,
        customerName: cart.state.customerName,
      });
      setCartOpen(false);
    } catch (err) {
      const description =
        err instanceof Error ? err.message : "Tente novamente em instantes.";
      toast.error("Não conseguimos registrar a venda", { description });
    } finally {
      setFinalizing(false);
    }
  }, [cart.state, createSale, finalizing, finalizeDisabled]);

  const handleNewSale = useCallback(() => {
    cart.clear();
    setSuccess(null);
    setCartOpen(false);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [cart]);

  useKeyboardShortcut(
    "F2",
    (e) => {
      e.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    },
    { ignoreInEditable: false, enabled: !success }
  );

  useKeyboardShortcut(
    "F4",
    (e) => {
      e.preventDefault();
      handleFinalize();
    },
    { ignoreInEditable: false, enabled: !success }
  );

  return (
    <div
      className={cn(
        "flex flex-col",
        kioskMode
          ? "h-dvh"
          : "h-[calc(100dvh-9rem)] lg:h-screen",
      )}
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/85 px-3 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-2 min-w-0">
          {!kioskMode && (
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              render={
                <Link href="/" aria-label="Voltar para o painel">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              }
            />
          )}
          <h1 className="truncate text-base font-semibold sm:text-lg">PDV</h1>
          {kioskMode && (
            <Badge variant="secondary" className="hidden gap-1 px-2 sm:inline-flex">
              <span className="text-[10px] uppercase tracking-wide">Kiosk</span>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cart.state.customerName && (
            <Badge variant="secondary" className="hidden gap-1 px-2 sm:inline-flex">
              <span className="text-xs">Cliente:</span>
              <span className="text-xs font-semibold">{cart.state.customerName}</span>
            </Badge>
          )}

          {/* Abrir PDV em nova guia (modo kiosk, sem AppShell) */}
          {!kioskMode && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={openInNewTab}
                    aria-label="Abrir PDV em nova guia"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>Abrir PDV em nova guia</TooltipContent>
            </Tooltip>
          )}

          {/* Toggle fullscreen */}
          {fullscreen.isSupported && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={fullscreen.toggle}
                    aria-label={
                      fullscreen.isFullscreen
                        ? "Sair de tela cheia"
                        : "Tela cheia"
                    }
                  >
                    {fullscreen.isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                }
              />
              <TooltipContent>
                {fullscreen.isFullscreen ? "Sair de tela cheia" : "Tela cheia"}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Botão flutuante para abrir o carrinho no mobile */}
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="default"
                  className="gap-2 lg:hidden"
                  aria-label={`Abrir carrinho (${cart.itemCount} ${cart.itemCount === 1 ? "item" : "itens"})`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="text-sm font-semibold">Carrinho</span>
                  {cart.itemCount > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white/25 px-1.5 text-xs font-bold tabular-nums">
                      {cart.itemCount}
                    </span>
                  )}
                </Button>
              }
            />
            <SheetContent
              side="right"
              className="flex w-full flex-col p-0 sm:max-w-md"
            >
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2 text-base">
                  Carrinho
                  {cart.itemCount > 0 && (
                    <Badge variant="default" className="px-2 tabular-nums">
                      {cart.itemCount}
                    </Badge>
                  )}
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-hidden">
                <CartPanel
                  cart={cart}
                  finalizing={finalizing}
                  onFinalize={handleFinalize}
                  hideHeader
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden">
          <ProductCatalog
            searchInputRef={searchInputRef}
            onAddProduct={cart.addProduct}
            cartQuantities={cartQuantities}
          />
        </main>
        <aside className="hidden w-96 shrink-0 border-l bg-card lg:flex lg:flex-col xl:w-[420px]">
          <CartPanel
            cart={cart}
            finalizing={finalizing}
            onFinalize={handleFinalize}
          />
        </aside>
      </div>

      {success && (
        <SaleSuccessOverlay
          saleId={success.saleId}
          createdAt={success.createdAt}
          items={success.items}
          totalCents={success.totalCents}
          paymentMethod={success.paymentMethod}
          customerName={success.customerName}
          onNewSale={handleNewSale}
        />
      )}
    </div>
  );
}
