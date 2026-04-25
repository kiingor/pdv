"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { MoreVertical, Plus, Search, Pencil, Trash2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatPhone, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CustomersEmptyState } from "./customers-empty-state";
import {
  CustomerFormDialog,
  type CustomerFormInitial,
} from "./customer-form-dialog";
import { DeleteCustomerDialog } from "./delete-customer-dialog";

type Customer = {
  _id: Id<"customers">;
  _creationTime: number;
  name: string;
  phone: string;
  updatedAt: number;
};

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Listagem principal de clientes com busca debounced, ações de criar/editar/excluir
 * e variação responsiva (tabela em desktop, cards em mobile).
 */
export function CustomersTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedTerm = useDebounce(searchTerm.trim(), 300);

  const allCustomers = useQuery(api.customers.list, {}) as
    | Customer[]
    | undefined;
  const searchResults = useQuery(
    api.customers.searchByNameOrPhone,
    debouncedTerm ? { term: debouncedTerm } : "skip"
  ) as Customer[] | undefined;

  const isSearching = debouncedTerm.length > 0;
  const list = isSearching ? searchResults : allCustomers;
  const isLoading = list === undefined;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerFormInitial | undefined>(
    undefined
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{
    id: Id<"customers">;
    name: string;
  } | null>(null);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing({ id: c._id, name: c.name, phone: c.phone });
    setFormOpen(true);
  };

  const openDelete = (c: Customer) => {
    setToDelete({ id: c._id, name: c.name });
    setDeleteOpen(true);
  };

  const showInitialEmptyState = useMemo(
    () => !isSearching && !isLoading && list && list.length === 0,
    [isSearching, isLoading, list]
  );

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8 max-w-6xl mx-auto w-full">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Clientes
        </h1>
        <p className="text-sm text-muted-foreground">
          Cadastre quem compra com você
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou telefone…"
            className="pl-8"
            aria-label="Buscar clientes"
          />
        </div>
        <Button onClick={openCreate} className="sm:w-auto w-full">
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : showInitialEmptyState ? (
        <CustomersEmptyState onCreate={openCreate} />
      ) : list && list.length === 0 ? (
        <SearchEmptyState term={debouncedTerm} />
      ) : (
        <>
          <DesktopTable
            customers={list ?? []}
            onEdit={openEdit}
            onDelete={openDelete}
          />
          <MobileList
            customers={list ?? []}
            onEdit={openEdit}
            onDelete={openDelete}
          />
        </>
      )}

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
      />
      <DeleteCustomerDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        customer={toDelete}
      />
    </div>
  );
}

function DesktopTable({
  customers,
  onEdit,
  onDelete,
}: {
  customers: Customer[];
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}) {
  return (
    <Card className={cn("hidden md:block py-0")}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Cadastrado em</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => (
            <TableRow key={c._id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="font-mono text-sm">
                {formatPhone(c.phone)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(c._creationTime)}
              </TableCell>
              <TableCell className="text-right">
                <RowActions
                  onEdit={() => onEdit(c)}
                  onDelete={() => onDelete(c)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function MobileList({
  customers,
  onEdit,
  onDelete,
}: {
  customers: Customer[];
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}) {
  return (
    <ul className="md:hidden flex flex-col gap-2">
      {customers.map((c) => (
        <li key={c._id}>
          <Card className="px-4 py-3 flex-row items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{c.name}</p>
              <p className="text-sm text-muted-foreground font-mono">
                {formatPhone(c.phone)}
              </p>
            </div>
            <RowActions
              onEdit={() => onEdit(c)}
              onDelete={() => onDelete(c)}
            />
          </Card>
        </li>
      ))}
    </ul>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Ações do cliente" />
        }
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LoadingState() {
  return (
    <>
      <Card className="hidden md:block py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <ul className="md:hidden flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i}>
            <Card className="px-4 py-3 flex-row items-center justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

function SearchEmptyState({ term }: { term: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <Search className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">
        Nenhum cliente encontrado para &ldquo;{term}&rdquo;
      </p>
    </div>
  );
}
