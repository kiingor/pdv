"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { Plus, User, UserPlus, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { QuickAddCustomerDialog } from "@/components/pdv/quick-add-customer-dialog";
import { formatPhone } from "@/lib/format";

type Customer = {
  _id: Id<"customers">;
  name: string;
  phone: string;
};

type Props = {
  customerId: Id<"customers"> | null;
  customerName: string | null;
  onSelect: (id: Id<"customers">, name: string) => void;
  onClear: () => void;
};

/**
 * Combobox de cliente com busca remota debounced + atalho para cadastrar
 * um novo sem sair do PDV.
 */
export function CustomerSelector({
  customerId,
  customerName,
  onSelect,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const matches = useQuery(
    api.customers.searchByNameOrPhone,
    debouncedTerm.length >= 1
      ? { term: debouncedTerm, limit: 8 }
      : "skip"
  ) as Customer[] | undefined;

  if (customerId && customerName) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-secondary/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <User className="h-4 w-4 shrink-0 text-secondary-foreground" />
          <span className="truncate text-sm font-medium">{customerName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          aria-label="Remover cliente"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="h-10 w-full justify-start text-sm font-normal"
              aria-label="Selecionar cliente"
            >
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sem cliente (avulso)</span>
            </Button>
          }
        />
        <PopoverContent
          align="start"
          className="w-(--anchor-size) min-w-72 p-0"
          sideOffset={6}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar nome ou telefone..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {debouncedTerm.length === 0 ? (
                <CommandEmpty>
                  Comece a digitar para buscar clientes.
                </CommandEmpty>
              ) : matches === undefined ? (
                <CommandEmpty>Buscando...</CommandEmpty>
              ) : matches.length === 0 ? (
                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
              ) : (
                <CommandGroup heading="Resultados">
                  {matches.map((c) => (
                    <CommandItem
                      key={c._id}
                      value={c._id}
                      onSelect={() => {
                        onSelect(c._id, c.name);
                        setOpen(false);
                        setSearchTerm("");
                      }}
                      className="flex flex-col items-start gap-0"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatPhone(c.phone)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__new__"
                  onSelect={() => {
                    setOpen(false);
                    setQuickAddOpen(true);
                  }}
                  className="text-primary"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Novo cliente
                  {searchTerm.trim() && (
                    <span className="ml-1 text-muted-foreground">
                      ({searchTerm.trim()})
                    </span>
                  )}
                  <Plus className="ml-auto h-4 w-4 opacity-60" />
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <QuickAddCustomerDialog
        open={quickAddOpen}
        initialName={searchTerm.trim()}
        onClose={() => setQuickAddOpen(false)}
        onCreated={(id, name) => {
          onSelect(id, name);
          setQuickAddOpen(false);
          setSearchTerm("");
        }}
      />
    </>
  );
}
