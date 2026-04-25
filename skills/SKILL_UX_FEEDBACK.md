# SKILL_UX_FEEDBACK — Sistema de Feedback

Padrões de toasts, loading, confirmações destrutivas e a animação de "venda concluída". Tudo centrado em `sonner` + shadcn.

## Toasts (sonner)

Já está montado em `app/layout.tsx`:

```tsx
<Toaster richColors position="top-center" />
```

`top-center` foi escolhido pra tablet — não compete com bottom nav nem com carrinho lateral. `richColors` aplica cores semânticas automaticamente.

```tsx
import { toast } from "sonner";

// Sucesso (verde) — confirmações curtas, ações concluídas
toast.success("Venda registrada!");

// Erro (vermelho-laranja, 5s) — falha que requer atenção
toast.error("Falha ao salvar", {
  description: "Verifique sua conexão e tente novamente.",
  duration: 5000,
});

// Info (azul) — avisos não-críticos
toast.info("Sincronizando catálogo...");

// Warning (amarelo) — atenção sem bloquear
toast.warning("Estoque baixo: restam 3 unidades");

// Loading com promise — atualiza sozinho
toast.promise(salvarVenda(), {
  loading: "Salvando venda...",
  success: "Venda registrada!",
  error: (e) => humanizeError(e),
});
```

**Regras:**
- Toast nunca é o único feedback de uma ação destrutiva — combine com `<AlertDialog>` antes
- Mensagem curta no `title`; contexto no `description`
- Para erros, sempre incluir `description` com sugestão acionável

## Loading states

### Listagens (3+ itens potenciais)

Use `<Skeleton />` durante o load, com forma aproximada do conteúdo:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

{isLoading ? (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <Card key={i}>
        <Skeleton className="aspect-square w-full" />
        <CardContent className="p-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </CardContent>
      </Card>
    ))}
  </div>
) : (
  <ProdutosGrid produtos={produtos} />
)}
```

Mostre o **mesmo número** de skeletons que o esperado — evita layout shift quando dados chegam.

### Botão individual

```tsx
import { Loader2 } from "lucide-react";

<Button disabled={loading} type="submit">
  {loading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
      Salvando...
    </>
  ) : (
    "Salvar"
  )}
</Button>
```

Botão fica `disabled` enquanto carrega (previne double-click). Largura não muda — texto "Salvando..." tem tamanho próximo de "Salvar".

## Confirmações destrutivas

**SEMPRE** usar `<AlertDialog>` antes de:

- Cancelar venda em andamento (perde os itens do carrinho)
- Arquivar produto (mesmo que seja soft-delete reversível)
- Excluir cliente
- Limpar histórico
- Reverter venda finalizada

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Cancelar venda</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Cancelar essa venda?</AlertDialogTitle>
      <AlertDialogDescription>
        Os {itens.length} itens do carrinho serão removidos. Essa ação não pode ser desfeita.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Voltar</AlertDialogCancel>
      <AlertDialogAction
        onClick={cancelarVenda}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Sim, cancelar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Regras:**
- Título em forma de pergunta (favorece "voltar" como default mental)
- Descrição diz **o que vai acontecer** (não só "tem certeza?")
- Botão de confirmação em `variant="destructive"` (vermelho-laranja)
- Texto do botão de confirmação descreve a ação ("Sim, cancelar"), não genérico ("OK")
- Botão "Voltar" como default focado (operador errou o tap → ESC volta)

## Animação "venda concluída"

Tela full-screen overlaying o PDV após sucesso. Composição:

```tsx
import { CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

function VendaConcluida({ total, onNovaVenda }: Props) {
  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 },
      colors: ["#FF6B35", "#FF1493", "#9333EA", "#22C55E"], // primary, pink, purple, success
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F4") onNovaVenda();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNovaVenda]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur">
      <Card className="animate-pop max-w-md w-full mx-4 text-center p-8">
        <CheckCircle2 className="h-32 w-32 text-success mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-2">Venda registrada!</h2>
        <p className="text-5xl font-bold text-primary mb-6">{formatBRL(total)}</p>
        <Button autoFocus onClick={onNovaVenda} size="lg" className="w-full h-14 text-lg">
          Nova venda (F4)
        </Button>
      </Card>
    </div>
  );
}
```

**Detalhes:**
- `<CheckCircle2 />` em `h-32 w-32 text-success` — grande e verde
- "Venda registrada!" em `text-3xl font-bold`
- Total em `text-5xl font-bold text-primary` (laranja vibrante)
- Card com `animate-pop` (já definido em `globals.css`, 0.4s spring)
- Confete com `canvas-confetti` — instalar: `npm install canvas-confetti @types/canvas-confetti`
- Cores do confete espelham os tokens (primary laranja, chart-2 rosa, chart-3 roxo, success verde)
- Botão "Nova venda" com `autoFocus` + atalho `F4`
- Backdrop `bg-background/95 backdrop-blur` esconde o PDV embaixo sem ficar opaco demais

**Alternativa sem lib (CSS puro):** divs animadas absolutas com `@keyframes` que jogam pontos coloridos. Funciona, mas perde naturalidade. Recomendado: `canvas-confetti` (4kb gzip).

## Referências cruzadas

- `app/layout.tsx` — onde o `<Toaster />` é montado
- `app/globals.css` — definição de `animate-pop`, cores `--success`, `--primary`
- `SKILL_UX_PDV.md` — onde a tela de sucesso é disparada
- `SKILL_UX_FORMS.md` — `humanizeError()` para mensagens de toast
