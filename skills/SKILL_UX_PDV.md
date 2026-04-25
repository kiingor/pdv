# SKILL_UX_PDV — Fluxo da Tela de Vendas

Guia autoritativo para a tela principal do PDV (ponto de venda) — operada em tablet, com foco em velocidade e zero treinamento.

## Layout base

Divisão em duas colunas no desktop/tablet landscape, full em mobile portrait:

- **Catálogo** (~60% largura): grid de produtos, scroll vertical
- **Carrinho lateral sticky** (~40% largura): fixo à direita, sempre visível

```tsx
<div className="flex h-[calc(100vh-4rem)]">
  <section className="flex-1 lg:w-3/5 overflow-y-auto p-4">
    {/* grid catálogo */}
  </section>
  <aside className="hidden lg:flex lg:w-2/5 sticky top-0 h-full border-l bg-card">
    {/* carrinho */}
  </aside>
</div>
```

No mobile (<lg), o carrinho vira `<Sheet>` (drawer) acionado por botão flutuante "Ver carrinho (3)".

## Estados da tela

### (a) Carrinho vazio

```
+------------------------------+--------------------+
|  [Produto] [Produto] [Prod]  |   Carrinho vazio   |
|  [Produto] [Produto] [Prod]  |                    |
|  [Produto] [Produto] [Prod]  |   Toque num        |
|  [Produto] [Produto] [Prod]  |   produto pra      |
|                              |   comecar          |
+------------------------------+--------------------+
```

Mostra ilustração leve (lucide `<ShoppingBasket />` h-16 w-16 text-muted-foreground) + dica `"Toque num produto pra começar"`.

### (b) Com itens

```
+------------------------------+--------------------+
|  [Produto*][Produto][Prod]   |  Carrinho (3)      |
|  [Produto] [Produto][Prod]   |  -----------       |
|  [Produto] [Produto][Prod]   |  2x Coxinha  R$10  |
|  [Produto] [Produto][Prod]   |  1x Refri    R$ 6  |
|                              |  -----------       |
|                              |  Total:    R$ 16   |
|                              |  [Finalizar (F4)]  |
+------------------------------+--------------------+
```

Item recém-adicionado entra com `animate-slide-in-right`. Total atualiza com leve pulse.

### (c) Processando pagamento

`<Dialog>` modal com 4 botões grandes (cash/pix/credit/debit) usando ícones de `lib/constants.ts` `PAYMENT_METHODS`. Botões h-24, full-width, cor do método como background suave.

### (d) Sucesso

Tela cheia com `<CheckCircle2 className="h-32 w-32 text-success animate-pop" />`, total destacado em `text-5xl font-bold`, confete (ver `SKILL_UX_FEEDBACK.md`), botão "Nova venda (F4)" com `autoFocus`.

## Card de produto

```tsx
<Card className="cursor-pointer hover:scale-[1.02] transition-transform active:scale-95">
  <div className="aspect-square relative">
    <Image src={produto.foto} alt={produto.nome} fill className="object-cover rounded-t-[var(--radius)]" />
  </div>
  <CardContent className="p-3">
    <p className="font-semibold line-clamp-2">{produto.nome}</p>
    <p className="text-primary text-xl font-bold mt-1">{formatBRL(produto.preco)}</p>
  </CardContent>
</Card>
```

Foto grande no topo (aspect-square), nome em 2 linhas máx, preço em laranja primário destacado.

## Interações no card

| Gesto         | Ação                                                       |
| ------------- | ---------------------------------------------------------- |
| Tap           | +1 unidade no carrinho (item entra com `animate-slide-in-right`) |
| Long-press    | Abre `<Dialog>` "Definir quantidade" com numpad customizado |
| Swipe-left no item do carrinho | Revela botão "Remover" (ver `SKILL_UX_MOBILE.md`) |

Long-press detection: usar `onPointerDown` + `setTimeout(500ms)`, cancela em `onPointerUp/onPointerLeave/onPointerMove` (com threshold).

## Carrinho — itens

```tsx
<div className="flex items-center gap-3 py-2">
  <span className="font-medium flex-1">{item.nome}</span>
  <div className="flex items-center gap-1">
    <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => decrement()}>
      <Minus className="h-5 w-5" />
    </Button>
    <span className="w-8 text-center font-bold">{item.qty}</span>
    <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => increment()}>
      <Plus className="h-5 w-5" />
    </Button>
  </div>
  <button className="font-bold text-primary" onClick={() => abrirEditPreco()}>
    {formatBRL(item.preco * item.qty)}
  </button>
  <Button size="icon" variant="ghost" onClick={() => remover()}>
    <X className="h-4 w-4" />
  </Button>
</div>
```

- Botões +/− com h-10 w-10 (touch target garantido — ver `SKILL_UX_MOBILE.md`)
- Preço clicável: abre input inline ou popover com `maskBRL` (ver `SKILL_UX_FORMS.md`)
- Botão remover (X) à direita, com `<AlertDialog>` somente se item tiver qty>1; senão remove direto

## Atalhos de teclado

| Tecla | Ação                              |
| ----- | --------------------------------- |
| F2    | Foca campo de busca de produto    |
| F4    | Finalizar venda (abre pagamento) ou "Nova venda" na tela de sucesso |
| ESC   | Cancela venda em andamento (com `<AlertDialog>` confirmação) |
| /     | Foca busca (alternativa)          |

Implementar via `useEffect` global escutando `keydown`. Lembrar de checar `e.target` para não interceptar quando input está focado.

## Critérios de sucesso

- **<30s** do tap no primeiro produto até "Nova venda" pronta
- Operador novo consegue completar uma venda sem treinamento, apenas explorando
- Zero modais bloqueantes desnecessários — só pagamento e confirmação destrutiva
- Funciona com luvas finas / dedos molhados (touch targets generosos)

## Referências cruzadas

- `lib/format.ts` — `formatBRL`, `maskBRL` para preços
- `lib/constants.ts` — `PAYMENT_METHODS` para o dialog de pagamento
- `SKILL_UX_FEEDBACK.md` — animação de venda concluída + confete
- `SKILL_UX_MOBILE.md` — gestos swipe e drawer mobile
- `SKILL_UX_FORMS.md` — máscaras nos inputs de quantidade/preço
