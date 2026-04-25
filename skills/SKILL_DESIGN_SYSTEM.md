# SKILL_DESIGN_SYSTEM — Sistema de Design

Tokens, tipografia, componentes e acessibilidade do PDV. Toda fonte de verdade vem de `app/globals.css`.

## Tokens de cor (definidos em `app/globals.css`)

Cores em **OKLCH** (perceptualmente uniforme — gradientes não viram lama). Modo claro e escuro definidos com `:root` e `.dark`.

### Semânticas

| Token              | Modo claro (aprox.)        | Uso                                     |
| ------------------ | -------------------------- | --------------------------------------- |
| `--primary`        | `oklch(0.68 0.21 38)`      | Laranja vibrante — CTAs, preço, marca   |
| `--primary-foreground` | branco quase puro       | Texto sobre primary                     |
| `--secondary`      | cinza claro                | Backgrounds suaves, badges neutros      |
| `--accent`         | `oklch(0.55 0.24 290)`     | Roxo — destaques alternativos           |
| `--success`        | verde                      | Confirmações, indicadores positivos     |
| `--warning`        | amarelo/âmbar              | Alertas não-críticos                    |
| `--info`           | azul                       | Mensagens informativas                  |
| `--destructive`    | vermelho-laranja           | Ações destrutivas, erros                |
| `--muted`          | cinza muito claro          | Backgrounds de seção                    |
| `--muted-foreground` | cinza médio              | Textos secundários                      |
| `--border`         | cinza claro                | Borders padrão                          |
| `--ring`           | laranja primary            | Focus ring (2px)                        |

### Charts

| Token        | Cor                |
| ------------ | ------------------ |
| `--chart-1`  | Laranja (primary)  |
| `--chart-2`  | Rosa pink (`oklch(0.65 0.25 350)`) |
| `--chart-3`  | Roxo (accent)      |
| `--chart-4`  | Verde (success)    |
| `--chart-5`  | Azul (info)        |

Sempre referenciar como `var(--chart-N)` em CSS ou inline-style — nunca hardcodar hex.

### Sidebar

Tokens dedicados para a sidebar (não depende de bg geral):

- `--sidebar`, `--sidebar-foreground`
- `--sidebar-primary`, `--sidebar-primary-foreground`
- `--sidebar-accent`, `--sidebar-accent-foreground`
- `--sidebar-border`, `--sidebar-ring`

## Border radius

Escala generosa, friendly (compatível com clima de evento festivo):

| Token            | Valor      | Uso típico                       |
| ---------------- | ---------- | -------------------------------- |
| `--radius`       | 0.875rem   | Padrão (cards, dialogs, inputs)  |
| `--radius-sm`    | 0.5rem     | Badges, tags                     |
| `--radius-md`    | 0.75rem    | Buttons                          |
| `--radius-lg`    | 1rem       | Cards de destaque                |
| `--radius-xl`    | 1.25rem    | Modais grandes                   |
| `--radius-2xl`   | 1.5rem     | Seções hero                      |
| `--radius-3xl`   | 2rem       | Imagens decorativas              |
| `--radius-4xl`   | 2.5rem     | Pílulas, blobs                   |

## Animações

Já definidas em `globals.css` via `@keyframes` + classes utilitárias:

| Classe                      | Duração | Uso                                          |
| --------------------------- | ------- | -------------------------------------------- |
| `animate-pop`               | 0.4s spring | Entrada celebrativa (sucesso, novos itens) |
| `animate-slide-in-right`    | 0.3s    | Item entrando no carrinho                    |
| `animate-fade-in`           | 0.2s    | Aparição suave de overlays                   |

Combinam bem com Tailwind defaults: `transition-transform`, `transition-colors`.

## Tipografia

**Plus Jakarta Sans** em todo o app, via variáveis CSS:

- `--font-jakarta` — corpo
- `--font-heading` — alias para Jakarta (mantém abertura para trocar headings)

Carregada em `app/layout.tsx` via `next/font/google`.

### Hierarquia

```tsx
<h1 className="text-4xl font-bold tracking-tight">Vendas</h1>
<h2 className="text-2xl font-semibold">Hoje</h2>
<h3 className="text-xl font-semibold">Top produtos</h3>
<p className="text-base">Texto corpo padrão.</p>
<p className="text-sm text-muted-foreground">Legendas, hints.</p>
<p className="text-xs">Metadados, timestamps.</p>
```

`tracking-tight` em h1 dá um look moderno sem ficar apertado demais. Para números grandes (KPIs, total da venda), usar `font-bold` + tamanhos maiores (`text-3xl`/`text-5xl`).

## Componentes shadcn instalados

Localizados em `components/ui/`:

| Componente       | Path                              | Uso típico                          |
| ---------------- | --------------------------------- | ----------------------------------- |
| alert-dialog     | `components/ui/alert-dialog.tsx`  | Confirmações destrutivas            |
| alert            | `components/ui/alert.tsx`         | Avisos inline                       |
| avatar           | `components/ui/avatar.tsx`        | Cliente, operador                   |
| badge            | `components/ui/badge.tsx`         | Status, tags                        |
| button           | `components/ui/button.tsx`        | CTAs, ações                         |
| card             | `components/ui/card.tsx`          | Containers de conteúdo              |
| command          | `components/ui/command.tsx`       | Autocomplete, command palette       |
| dialog           | `components/ui/dialog.tsx`        | Modais                              |
| dropdown-menu    | `components/ui/dropdown-menu.tsx` | Menus contextuais                   |
| field            | `components/ui/field.tsx`         | Wrapper de form field               |
| input-group      | `components/ui/input-group.tsx`   | Input com prefix/suffix             |
| input            | `components/ui/input.tsx`         | Inputs de texto                     |
| label            | `components/ui/label.tsx`         | Labels de form                      |
| popover          | `components/ui/popover.tsx`       | Date range, filtros                 |
| scroll-area      | `components/ui/scroll-area.tsx`   | Scroll customizado                  |
| select           | `components/ui/select.tsx`        | Selects                             |
| separator        | `components/ui/separator.tsx`     | Linhas divisórias                   |
| sheet            | `components/ui/sheet.tsx`         | Drawer mobile                       |
| skeleton         | `components/ui/skeleton.tsx`      | Loading states                      |
| sonner           | `components/ui/sonner.tsx`        | Toasts (`<Toaster />`)              |
| table            | `components/ui/table.tsx`         | Listagens densas                    |
| tabs             | `components/ui/tabs.tsx`          | Navegação por seções                |
| textarea         | `components/ui/textarea.tsx`      | Texto multilinha                    |

**Não reinventar.** Antes de criar componente novo, checa se existe (e se não, instala via `npx shadcn@latest add <nome>`).

## Acessibilidade

### Contraste

Alvo **WCAG AA**:
- Texto normal: 4.5:1 mínimo
- Texto grande (≥18px ou ≥14px bold): 3:1 mínimo
- Componentes UI (borders, ícones funcionais): 3:1

Os tokens já foram calibrados em OKLCH para atender. Se introduzir cor nova, validar em https://www.tpgi.com/color-contrast-checker/.

### Aria-labels

Botão só com ícone **sempre** tem `aria-label`:

```tsx
<Button size="icon" variant="ghost" aria-label="Remover item">
  <X className="h-4 w-4" />
</Button>
```

Sem isso, leitor de tela anuncia "botão" sem contexto.

### Focus visible

Ring de 2px na cor `--ring` (default do shadcn). **Nunca remover** com `outline-none` sem substituir. Em buttons customizados:

```tsx
className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

### Cor não é o único sinalizador

Status, validações e variações **sempre** combinam cor + ícone OU texto:

```tsx
// RUIM — só cor distingue sucesso de erro
<Badge className="bg-green-500">Pago</Badge>
<Badge className="bg-red-500">Falhou</Badge>

// BOM — ícone + cor
<Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Pago</Badge>
<Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>
```

Daltonismo (~8% homens) e telas em luz forte de evento dependem disso.

## Modo claro / escuro

Configurado via `next-themes` com atributo `class` no `<html>`. Tokens em `:root` (claro) e `.dark` (escuro).

Toggle ainda **não implementado**. Sugestão de implementação no header:

```tsx
"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Alternar tema">
          <Sun className="h-5 w-5 dark:hidden" />
          <Moon className="h-5 w-5 hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Claro</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Escuro</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>Sistema</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Iconografia

**lucide-react** em todo o app. Imports nomeados:

```tsx
import { ShoppingCart, Plus, Minus, X, CheckCircle2 } from "lucide-react";
```

Tamanhos padrão:

| Tamanho       | Uso                                     |
| ------------- | --------------------------------------- |
| `h-4 w-4`     | Inline com texto, badges                |
| `h-5 w-5`     | Botões padrão                           |
| `h-6 w-6`     | Botões grandes (qty +/−)                |
| `h-8 w-8`     | Headers, destaque secundário            |
| `h-16 w-16`   | Empty states                            |
| `h-32 w-32`   | Tela de sucesso (venda concluída)       |

Cor: por padrão `currentColor` (herda do parent). Usar `text-primary`, `text-success` etc. para variar.

## Referências cruzadas

- `app/globals.css` — fonte de todos os tokens
- `app/layout.tsx` — fonte Plus Jakarta carregada
- `components/ui/` — todos os componentes listados
- `SKILL_UX_FEEDBACK.md` — uso de `--success`, `--destructive` em toasts/alertas
- `SKILL_UX_REPORTS.md` — uso de `--chart-1` ... `--chart-5` em recharts
- `SKILL_UX_PDV.md` — `--primary` no preço destacado
- `SKILL_UX_MOBILE.md` — token `theme_color` para PWA
