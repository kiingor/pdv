"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Settings2, X } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export type ReportFilterValues = {
  customerId?: Id<"customers">;
  paymentMethod?: PaymentMethod;
  productId?: Id<"products">;
};

type CustomerOption = {
  _id: Id<"customers">;
  name: string;
  phone: string;
};

type ProductOption = {
  _id: Id<"products">;
  name: string;
  active: boolean;
};

type Props = {
  value: ReportFilterValues;
  onChange: (v: ReportFilterValues) => void;
};

/**
 * Popover "Mais filtros" com cliente, forma de pagamento e produto.
 * Cliente e produto usam combobox via `<Command>` pra busca rápida.
 */
export function ReportFilters({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const customers = useQuery(api.customers.list, {}) as
    | CustomerOption[]
    | undefined;
  const products = useQuery(api.products.listAll, {}) as
    | ProductOption[]
    | undefined;

  const activeCount =
    (value.customerId ? 1 : 0) +
    (value.paymentMethod ? 1 : 0) +
    (value.productId ? 1 : 0);

  function clearAll() {
    onChange({});
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Mais filtros
            {activeCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {activeCount}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80 p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Cliente</Label>
            <CustomerCombobox
              customers={customers}
              value={value.customerId}
              onChange={(id) => onChange({ ...value, customerId: id })}
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Forma de pagamento
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const selected = value.paymentMethod === m.value;
                return (
                  <Button
                    key={m.value}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    onClick={() =>
                      onChange({
                        ...value,
                        paymentMethod: selected ? undefined : m.value,
                      })
                    }
                    className="gap-1.5"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {m.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Produto</Label>
            <ProductCombobox
              products={products}
              value={value.productId}
              onChange={(id) => onChange({ ...value, productId: id })}
            />
          </div>

          {activeCount > 0 && (
            <>
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="self-start"
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CustomerCombobox({
  customers,
  value,
  onChange,
}: {
  customers: CustomerOption[] | undefined;
  value?: Id<"customers">;
  onChange: (id?: Id<"customers">) => void;
}) {
  return (
    <Command className="rounded-md border bg-background">
      <CommandInput placeholder="Buscar cliente..." />
      <CommandList className="max-h-40">
        <CommandEmpty>
          {customers === undefined ? "Carregando..." : "Sem resultados"}
        </CommandEmpty>
        <CommandGroup>
          <CommandItem
            data-checked={value === undefined}
            onSelect={() => onChange(undefined)}
          >
            Todos
          </CommandItem>
          {(customers ?? []).map((c) => (
            <CommandItem
              key={c._id as unknown as string}
              data-checked={value === c._id}
              onSelect={() =>
                onChange(value === c._id ? undefined : c._id)
              }
            >
              <span className="truncate">{c.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function ProductCombobox({
  products,
  value,
  onChange,
}: {
  products: ProductOption[] | undefined;
  value?: Id<"products">;
  onChange: (id?: Id<"products">) => void;
}) {
  return (
    <Command className="rounded-md border bg-background">
      <CommandInput placeholder="Buscar produto..." />
      <CommandList className="max-h-40">
        <CommandEmpty>
          {products === undefined ? "Carregando..." : "Sem resultados"}
        </CommandEmpty>
        <CommandGroup>
          <CommandItem
            data-checked={value === undefined}
            onSelect={() => onChange(undefined)}
          >
            Todos
          </CommandItem>
          {(products ?? []).map((p) => (
            <CommandItem
              key={p._id as unknown as string}
              data-checked={value === p._id}
              onSelect={() =>
                onChange(value === p._id ? undefined : p._id)
              }
            >
              <span className="truncate">{p.name}</span>
              {!p.active && (
                <span className="ml-auto text-xs text-muted-foreground">
                  arquivado
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
