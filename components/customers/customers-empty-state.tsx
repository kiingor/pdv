"use client";

import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onCreate: () => void;
};

/**
 * Estado vazio inicial da listagem de clientes — quando ainda não existe
 * nenhum cadastro. Convida diretamente para o primeiro registro.
 */
export function CustomersEmptyState({ onCreate }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <Users className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-1">Nenhum cliente ainda</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Cadastre seus clientes pra acompanhar quem compra com você.
      </p>
      <Button onClick={onCreate}>Cadastrar primeiro cliente</Button>
    </div>
  );
}
