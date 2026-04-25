# SKILL_UX_FORMS — Padrões de Formulário

Guia para inputs, máscaras, validação e botões em modais. Toda formatação numérica/telefone vive em `lib/format.ts`.

## Máscaras

Usar utilitários de `lib/format.ts` no `onChange` do input — nunca no onBlur (perdeu o feedback imediato).

```tsx
import { maskPhone, maskBRL, parseBRLToCents } from "@/lib/format";

// Telefone
<Input
  inputMode="tel"
  value={form.telefone}
  onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })}
  placeholder="(11) 99999-9999"
/>

// Preço (em centavos no estado, exibido formatado)
<Input
  inputMode="decimal"
  value={maskBRL(form.precoStr)}
  onChange={(e) => setForm({ ...form, precoStr: e.target.value })}
/>
// Ao salvar: const cents = parseBRLToCents(form.precoStr);
```

## inputMode correto

Pequena escolha que melhora muito UX em mobile (define teclado nativo):

| Campo            | inputMode    | Por quê                                      |
| ---------------- | ------------ | -------------------------------------------- |
| Telefone         | `"tel"`      | Teclado numérico + `*` `#` `+`               |
| Preço, valor     | `"decimal"`  | Inclui vírgula no Android, ponto no iOS      |
| Quantidade       | `"numeric"`  | Apenas dígitos, sem decimal                  |
| CPF / CNPJ       | `"numeric"`  | Só dígitos                                   |
| E-mail           | `"email"`    | Adiciona `@` e `.` no teclado                |
| URL              | `"url"`      | Adiciona `/` e `.com`                        |

Sem `inputMode`, o teclado padrão de texto aparece e o operador perde tempo trocando para numérico.

## Validação

`react-hook-form` + `zod` (já instalados). Erros inline abaixo do campo, na cor `text-destructive`.

```tsx
const schema = z.object({
  nome: z.string().min(2, "Nome muito curto"),
  telefone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido"),
});

const { register, handleSubmit, formState: { errors, isSubmitted } } = useForm({
  resolver: zodResolver(schema),
});

<Field>
  <Label>Nome</Label>
  <Input {...register("nome")} autoFocus />
  {isSubmitted && errors.nome && (
    <p className="text-sm text-destructive mt-1">{errors.nome.message}</p>
  )}
</Field>
```

Regra: **não mostrar erro até o primeiro submit** (`isSubmitted=true`). Mostrar erro enquanto o usuário ainda digita o nome incomoda.

## Auto-foco

Sempre focar o primeiro campo quando um modal abre. Duas formas:

```tsx
// Forma 1: autoFocus prop (suficiente em 90% dos casos)
<Input autoFocus />

// Forma 2: ref + useEffect (necessário se modal anima entrada e autoFocus dispara antes)
const inputRef = useRef<HTMLInputElement>(null);
useEffect(() => {
  if (open) {
    setTimeout(() => inputRef.current?.focus(), 100); // após animação do dialog
  }
}, [open]);
<Input ref={inputRef} />
```

Em `<Dialog>` do shadcn, `autoFocus` funciona; em `<Sheet>` mobile às vezes precisa do timeout.

## Mensagens amigáveis

Nunca expor erros técnicos. Tradução obrigatória na camada de UI:

| NÃO                          | SIM                                            |
| ---------------------------- | ---------------------------------------------- |
| "Constraint violation"       | "Esse telefone já está cadastrado"             |
| "Network error"              | "Sem conexão. Tenta de novo daqui a pouco"     |
| "Validation failed: phone"   | "Telefone inválido. Use (11) 99999-9999"       |
| "Unauthorized"               | "Sua sessão expirou. Faça login de novo"       |
| "500 Internal Server Error"  | "Algo deu errado do nosso lado. Tenta de novo" |

Centralize em uma função `humanizeError(err)` ou no `toast.error` (ver `SKILL_UX_FEEDBACK.md`).

## Botões em modais

### Desktop (≥768px)

Ordem: cancelar à esquerda (`variant="ghost"`), submit à direita (`variant="default"`, cor primária).

```tsx
<DialogFooter className="hidden md:flex flex-row justify-between">
  <Button variant="ghost" onClick={onClose}>Cancelar</Button>
  <Button type="submit" variant="default">Salvar cliente</Button>
</DialogFooter>
```

### Mobile (<768px)

Empilhados verticalmente, **submit em cima** (mais alcançável com polegar quando teclado está aberto):

```tsx
<DialogFooter className="md:hidden flex flex-col-reverse gap-2">
  <Button variant="ghost" onClick={onClose} className="w-full">Cancelar</Button>
  <Button type="submit" variant="default" className="w-full">Salvar cliente</Button>
</DialogFooter>
```

`flex-col-reverse` mantém o submit primeiro no DOM (acessibilidade) mas visualmente em cima.

## Snippet de exemplo — cadastro rápido de cliente

```tsx
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { maskPhone } from "@/lib/format";

const schema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  telefone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido"),
});

function CadastroCliente({ open, onClose }: Props) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitted } } =
    useForm({ resolver: zodResolver(schema), defaultValues: { nome: "", telefone: "" } });

  const onSubmit = async (data) => {
    try {
      await criarCliente(data);
      toast.success("Cliente cadastrado!");
      onClose();
    } catch (e) {
      toast.error("Falha ao salvar", { description: humanizeError(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <Label>Nome</Label>
            <Input {...register("nome")} autoFocus placeholder="Nome do cliente" />
            {isSubmitted && errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
          </Field>
          <Field>
            <Label>Telefone</Label>
            <Input
              {...register("telefone")}
              inputMode="tel"
              value={watch("telefone")}
              onChange={(e) => setValue("telefone", maskPhone(e.target.value))}
              placeholder="(11) 99999-9999"
            />
            {isSubmitted && errors.telefone && <p className="text-sm text-destructive">{errors.telefone.message}</p>}
          </Field>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar cliente</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Referências cruzadas

- `lib/format.ts` — `maskPhone`, `maskBRL`, `parseBRLToCents`, `onlyDigits`
- `SKILL_UX_FEEDBACK.md` — toasts e tratamento de erros
- `SKILL_UX_MOBILE.md` — touch targets em botões de modal
- `components/ui/field.tsx`, `input.tsx`, `label.tsx`, `dialog.tsx` — primitivas
