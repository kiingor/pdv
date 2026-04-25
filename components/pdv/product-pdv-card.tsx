"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  priceCents: number;
  photoUrl: string | null;
  onTap: () => void;
  /** Toque longo (~500ms) — usado para abrir diálogo de quantidade. */
  onLongPress?: () => void;
};

const LONG_PRESS_MS = 500;
const MOVE_THRESHOLD_PX = 8;

/**
 * Card individual de produto no catálogo do PDV. Tap = +1 unidade no carrinho
 * com flash de feedback. Long-press abre fluxo de quantidade explícita.
 */
export function ProductPdvCard({ name, priceCents, photoUrl, onTap, onLongPress }: Props) {
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  function triggerFlash() {
    setFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 400);
  }

  function handlePointerDown(e: React.PointerEvent) {
    longPressFired.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        longPressFired.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    }
  }

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!startPos.current) return;
    const dx = Math.abs(e.clientX - startPos.current.x);
    const dy = Math.abs(e.clientY - startPos.current.y);
    if (dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX) {
      clearLongPress();
    }
  }

  function handlePointerUp() {
    clearLongPress();
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onTap();
    triggerFlash();
  }

  function handlePointerLeave() {
    clearLongPress();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTap();
      triggerFlash();
    }
  }

  const initial = name.charAt(0).toUpperCase();

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Adicionar ${name} ao carrinho. Preço ${formatBRL(priceCents)}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onKeyDown={handleKeyDown}
      className={cn(
        "group/product cursor-pointer select-none gap-0 py-0 ring-1 ring-border transition-all hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
        flash && "animate-pop ring-2 ring-primary"
      )}
    >
      <div className="aspect-square w-full p-1.5">
        <div className="relative h-full w-full overflow-hidden rounded-md">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={name}
              className="absolute inset-0 h-full w-full object-cover transition-transform group-hover/product:scale-105"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/20 via-chart-2/20 to-chart-3/20 text-2xl font-bold text-primary/70">
              {initial}
            </div>
          )}
        </div>
      </div>
      <div className="px-2 pb-2">
        <p className="line-clamp-2 text-xs font-semibold leading-tight">{name}</p>
        <p className="mt-0.5 text-sm font-bold text-primary tabular-nums">
          {formatBRL(priceCents)}
        </p>
      </div>
    </Card>
  );
}
