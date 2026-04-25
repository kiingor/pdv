"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Pencil, Plus, X } from "lucide-react";
import { useSwipeable } from "react-swipeable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CartItem as CartItemType } from "@/hooks/use-cart";
import { formatBRL, maskBRL, parseBRLToCents } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  item: CartItemType;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  onPriceChange: (cents: number) => void;
};

const SWIPE_REVEAL_PX = 88;

/**
 * Linha do item do carrinho com controles de quantidade, preço editável
 * e remoção (X em desktop, swipe-left em mobile).
 *
 * Layout em 2 linhas (sempre): linha 1 = foto + nome/preço unitário + X;
 * linha 2 = controles de quantidade + subtotal. Garante que o subtotal
 * nunca grude no botão "+" em painéis estreitos (280px–600px).
 */
export function CartItem({
  item,
  onIncrease,
  onDecrease,
  onRemove,
  onPriceChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draftPrice, setDraftPrice] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      // Em mobile o teclado virtual pode cobrir o input — rola até ficar visível.
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editing]);

  function startEdit() {
    setDraftPrice(maskBRL(String(item.unitPriceCents)));
    setEditing(true);
  }

  function commitEdit() {
    const cents = parseBRLToCents(draftPrice);
    if (cents > 0 && cents !== item.unitPriceCents) {
      onPriceChange(cents);
    }
    setEditing(false);
  }

  function handleRemoveClick() {
    if (item.quantity > 1) {
      setConfirmRemove(true);
    } else {
      onRemove();
    }
  }

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setRevealed(true),
    onSwipedRight: () => setRevealed(false),
    trackMouse: false,
    delta: 16,
  });

  const subtotalCents = item.unitPriceCents * item.quantity;

  return (
    <>
      <div ref={rootRef} className="relative overflow-hidden rounded-lg">
        <button
          type="button"
          onClick={() => {
            setRevealed(false);
            handleRemoveClick();
          }}
          className="absolute inset-y-0 right-0 flex w-22 items-center justify-center bg-destructive/15 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/25"
          style={{ width: SWIPE_REVEAL_PX }}
          aria-label={`Remover ${item.name}`}
        >
          Remover
        </button>
        <div
          {...swipeHandlers}
          className={cn(
            "group/cartitem relative animate-slide-in-right space-y-2 bg-card p-2 transition-transform"
          )}
          style={{ transform: revealed ? `translateX(-${SWIPE_REVEAL_PX}px)` : "translateX(0)" }}
        >
          {/* Linha 1 — foto + nome/preço editável + X */}
          <div className="flex items-start gap-2">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.photoUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-gradient-to-br from-primary/20 via-chart-2/20 to-chart-3/20 text-base font-bold text-primary/70">
                {item.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {item.name}
              </p>
              {editing ? (
                <Input
                  ref={inputRef}
                  inputMode="decimal"
                  value={draftPrice}
                  onChange={(e) => setDraftPrice(maskBRL(e.target.value))}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitEdit();
                    } else if (e.key === "Escape") {
                      setEditing(false);
                    }
                  }}
                  className="mt-1 h-7 w-32 px-2 text-sm"
                  aria-label="Preço unitário"
                />
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={startEdit}
                        className="mt-0.5 inline-flex max-w-full cursor-pointer items-center gap-1 rounded-sm text-xs text-foreground/75 underline decoration-dotted decoration-muted-foreground/60 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-2 focus-visible:outline-ring"
                        aria-label="Editar preço unitário"
                      >
                        <span className="truncate">
                          {formatBRL(item.unitPriceCents)}
                        </span>
                        <span className="shrink-0 text-muted-foreground/70">
                          cada
                        </span>
                        <Pencil
                          className="h-3 w-3 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover/cartitem:opacity-100"
                          aria-hidden="true"
                        />
                      </button>
                    }
                  />
                  <TooltipContent side="bottom" sideOffset={6}>
                    Toque para alterar o preço
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={handleRemoveClick}
              aria-label={`Remover ${item.name}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Linha 2 — controles de quantidade (esquerda) + subtotal (direita) */}
          <div className="flex items-center justify-between gap-3 pl-14">
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={onDecrease}
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-7 text-center text-base font-bold tabular-nums">
                {item.quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={onIncrease}
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-w-0 truncate text-right text-base font-bold tabular-nums text-primary">
              {formatBRL(subtotalCents)}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover esse item?</AlertDialogTitle>
            <AlertDialogDescription>
              {item.quantity}x {item.name} será removido do carrinho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmRemove(false);
                onRemove();
              }}
            >
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
