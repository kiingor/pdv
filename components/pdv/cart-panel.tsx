"use client";

import { ShoppingBasket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CartItem } from "@/components/pdv/cart-item";
import { CustomerSelector } from "@/components/pdv/customer-selector";
import { PaymentMethodSelector } from "@/components/pdv/payment-method-selector";
import { FinalizeButton } from "@/components/pdv/finalize-button";
import type { UseCart } from "@/hooks/use-cart";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  cart: UseCart;
  finalizing: boolean;
  onFinalize: () => void;
  /** Hide the header when rendered in a Sheet that already shows a title. */
  hideHeader?: boolean;
};

/**
 * Painel do carrinho — itens, cliente, pagamento e botão de finalizar.
 * Usado tanto na lateral fixa (desktop) quanto dentro do Sheet (mobile).
 */
export function CartPanel({ cart, finalizing, onFinalize, hideHeader }: Props) {
  const {
    state,
    totalCents,
    itemCount,
    increaseQty,
    decreaseQty,
    removeItem,
    setUnitPrice,
    setCustomer,
    clearCustomer,
    setPaymentMethod,
    clear,
  } = cart;

  const empty = state.items.length === 0;
  const finalizeDisabled = empty || !state.paymentMethod;

  return (
    <div className="flex h-full flex-col bg-card">
      {!hideHeader && (
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Carrinho</h2>
            {itemCount > 0 && (
              <Badge variant="default" className="px-2 tabular-nums">
                {itemCount}
              </Badge>
            )}
          </div>
          {!empty && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Limpar carrinho"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar o carrinho?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Os {itemCount} itens serão removidos. Essa ação não pode ser
                    desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={clear}>
                    Sim, limpar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </header>
      )}

      <div className={cn("flex-1 overflow-y-auto", empty && "grid place-items-center")}>
        {empty ? (
          <EmptyCart />
        ) : (
          <ul className="space-y-2 p-3">
            {state.items.map((item) => (
              <li key={item.productId}>
                <CartItem
                  item={item}
                  onIncrease={() => increaseQty(item.productId)}
                  onDecrease={() => decreaseQty(item.productId)}
                  onRemove={() => removeItem(item.productId)}
                  onPriceChange={(cents) => setUnitPrice(item.productId, cents)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="space-y-3 border-t bg-background/40 p-3">
        <CustomerSelector
          customerId={state.customerId}
          customerName={state.customerName}
          onSelect={setCustomer}
          onClear={clearCustomer}
        />

        <Separator />

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="text-3xl font-bold tabular-nums text-primary">
            {formatBRL(totalCents)}
          </span>
        </div>

        <PaymentMethodSelector
          value={state.paymentMethod}
          onChange={setPaymentMethod}
        />

        <FinalizeButton
          totalCents={totalCents}
          disabled={finalizeDisabled}
          loading={finalizing}
          onClick={onFinalize}
        />
        {finalizeDisabled && !empty && (
          <p className="text-center text-xs text-muted-foreground">
            Selecione a forma de pagamento.
          </p>
        )}
      </footer>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <ShoppingBasket className="mb-4 h-16 w-16 text-muted-foreground" />
      <p className="text-base font-semibold">Carrinho vazio</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Toque num produto pra começar.
      </p>
    </div>
  );
}
