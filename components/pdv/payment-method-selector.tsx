"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
};

/**
 * Grid 2x2 com os 4 métodos de pagamento. O selecionado fica preenchido
 * na cor do método pra reduzir erro do operador.
 */
export function PaymentMethodSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PAYMENT_METHODS.map((method) => {
        const Icon = method.icon;
        const selected = value === method.value;
        return (
          <Button
            key={method.value}
            type="button"
            variant={selected ? "default" : "outline"}
            onClick={() => onChange(method.value)}
            aria-pressed={selected}
            aria-label={`Pagamento em ${method.label}`}
            className={cn(
              "relative h-16 flex-col gap-1 text-sm font-semibold",
              selected
                ? cn(
                    "border-transparent ring-2 ring-offset-2 ring-offset-card",
                    method.value === "cash" &&
                      "bg-success text-white ring-success/40 hover:bg-success/90",
                    method.value === "pix" &&
                      "bg-info text-white ring-info/40 hover:bg-info/90",
                    method.value === "credit" &&
                      "bg-primary text-primary-foreground ring-primary/40 hover:bg-primary/90",
                    method.value === "debit" &&
                      "bg-chart-3 text-white ring-chart-3/40 hover:bg-chart-3/90"
                  )
                : cn(method.bgColor, method.color, "border-current/20 hover:opacity-90")
            )}
          >
            {selected && (
              <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />
            )}
            <Icon className="h-5 w-5" />
            {method.label}
          </Button>
        );
      })}
    </div>
  );
}
