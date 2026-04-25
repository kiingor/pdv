# PDV Eventos

Sistema de vendas (Point of Sale) para eventos. Tablet-first, divertido, rápido. Operador deve conseguir fechar uma venda em <30 segundos sem treinamento prévio.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (preset `base-nova`)
- **Convex** — backend reativo (queries/mutations/storage)
- **Recharts** — gráficos do dashboard
- **react-hook-form** + **zod** — validação de formulários
- **canvas-confetti** — animação de venda concluída
- **Plus Jakarta Sans** — tipografia (sans-serif arredondada)

## Quickstart (1ª vez)

```bash
# 1. Já está tudo instalado. Caso precise reinstalar:
npm install

# 2. CRÍTICO — gere uma deploy key NOVA do Convex:
#    https://dashboard.convex.dev/  →  seu projeto  →  Settings  →  Deploy Keys
#    (a key antiga foi exposta no chat — REVOGUE)

# 3. Cole no .env.local:
#    CONVEX_DEPLOY_KEY=dev:laudable-mink-6|<sua-nova-key>

# 4. Rodar Convex em modo dev (mantém schema + funções sincronizadas):
npx convex dev          # primeiro run autentica e gera convex/_generated/

# 5. Em OUTRO terminal, rodar o Next.js:
npm run dev

# 6. Abrir http://localhost:3000
```

> **Nota sobre o Convex:** o schema já foi enviado pra `https://laudable-mink-6.convex.cloud` durante o setup (a pasta `convex/_generated/` existe e tem os tipos). Mas pra trabalhar localmente e ver mudanças no schema/funções refletirem ao vivo, deixe `npx convex dev` rodando em paralelo com `npm run dev`.

## Arquitetura

```
pdv/
├── app/                          # Routes (App Router)
│   ├── layout.tsx                # Fonts, providers (Convex, Theme, Sonner)
│   ├── page.tsx                  # Dashboard (/)
│   ├── pdv/page.tsx              # Tela de vendas
│   ├── produtos/page.tsx         # CRUD produtos
│   ├── clientes/page.tsx         # CRUD clientes
│   └── relatorios/page.tsx       # Relatórios + filtros + CSV
│
├── components/
│   ├── ui/                       # shadcn primitivos (~22 componentes)
│   ├── layout/app-shell.tsx      # Sidebar (lg+) + bottom nav (mobile)
│   ├── providers/                # ConvexClientProvider, ThemeProvider
│   ├── products/                 # Listagem, form, foto upload, archive dialog
│   ├── customers/                # Tabela, form, delete dialog
│   ├── pdv/                      # Catálogo, carrinho, customer selector,
│   │                             #   payment buttons, finalize, success overlay
│   └── reports/                  # Dashboard, KPIs, charts, filtros, tabela
│
├── convex/                       # Backend
│   ├── schema.ts                 # 4 tabelas + índices
│   ├── products.ts               # CRUD + photo upload (storage)
│   ├── customers.ts              # CRUD + busca por nome/telefone
│   ├── sales.ts                  # create transacional, listar, cancelar
│   ├── reports.ts                # Agregações p/ dashboard + relatórios
│   └── _generated/               # Gerado por `npx convex dev` (NÃO editar)
│
├── hooks/
│   ├── use-cart.ts               # State do carrinho (useReducer)
│   ├── use-keyboard-shortcut.ts  # F2/F4/ESC
│   └── use-mobile.ts             # Breakpoints
│
├── lib/
│   ├── format.ts                 # formatBRL, maskPhone, maskBRL, etc.
│   ├── constants.ts              # PAYMENT_METHODS (cash/pix/credit/debit)
│   ├── csv-export.ts             # Exportação Excel BR-friendly
│   └── utils.ts                  # cn() do shadcn
│
└── skills/                       # 6 docs de UX (LEIA antes de modificar UI)
    ├── SKILL_UX_PDV.md           # Fluxo da tela de vendas
    ├── SKILL_UX_FORMS.md         # Máscaras, validação, react-hook-form
    ├── SKILL_UX_FEEDBACK.md      # Toasts, loading, animação de sucesso
    ├── SKILL_UX_MOBILE.md        # Touch, swipe, orientação
    ├── SKILL_UX_REPORTS.md       # KPIs, charts, filtros, empty states
    └── SKILL_DESIGN_SYSTEM.md    # Tokens, cores OKLCH, tipografia
```

## Convenções importantes

### Dinheiro
- **SEMPRE em centavos (int)** no banco e na lógica. `R$ 12,90` = `1290`
- Display via `formatBRL(cents)` de `lib/format.ts`
- Input mascarado via `maskBRL(value)` + `parseBRLToCents(masked)`

### Telefones
- Armazenados **só dígitos** (ex: `"11987654321"`)
- Display via `formatPhone(phone)` → `"(11) 98765-4321"`
- Input com `inputMode="tel"` + `maskPhone(value)` em `onChange`

### Cores
- Use tokens semânticos do Tailwind: `text-primary`, `bg-success`, `border-destructive`
- Charts: `var(--chart-1)` a `var(--chart-5)` (definidos em `app/globals.css`)
- Paleta: laranja (primary), rosa (chart-2), roxo (chart-3), verde (success), azul (info)

### Idioma
- **Tudo em pt-BR** — UI, mensagens de erro, validações, comentários

## Comandos

```bash
npm run dev          # Next.js dev server (porta 3000)
npm run build        # Build de produção (verificado e passando)
npm run lint         # ESLint (warnings esperados em react-hook-form)
npm run start        # Servir build local

npx convex dev       # Sincroniza convex/ com a cloud (deixe rodando)
npx convex deploy    # Push pra produção
npx tsc --noEmit     # Typecheck
```

## Status atual (entregue)

✅ **Foundation** — Next.js 16, TS, Tailwind v4, shadcn (base-nova), Convex, fontes Jakarta, providers, design tokens festivos
✅ **Backend** — schema com 4 tabelas + índices + busca; products/customers/sales/reports completos com 30+ funções (queries/mutations)
✅ **Produtos** — listagem grid, busca, criar/editar com upload de foto (Convex storage), arquivar (soft-delete), restaurar
✅ **Clientes** — listagem responsiva (tabela desktop / cards mobile), busca debounced, criar/editar com validação BR, excluir com checagem de vendas
✅ **PDV** — catálogo grid, carrinho sticky/sheet, tap-to-add, long-press p/ qty, edição inline de preço, swipe-to-remove, customer combobox, quick-add modal, 4 botões de pagamento, finalize button, **success overlay com confete + checkmark animado**, atalhos F2/F4/ESC
✅ **Dashboard** — 4 KPIs (vendas hoje, ticket médio, qtd, top produto), bar chart por hora, donut por forma de pagamento, top 5 produtos, últimas 10 vendas, empty state festivo
✅ **Relatórios** — date range com presets (Hoje/Ontem/7d/30d/Mês), filtros (cliente/forma/produto), tabela paginada, totais agregados, **exportação CSV** (Excel BR friendly)
✅ **Modo claro/escuro** — tokens completos em ambos
✅ **6 SKILL files** — guias de UX em pt-BR pra futuras evoluções

## Verificações finais

| Check | Status |
|---|---|
| `npm run build` | ✅ PASS — 5 rotas geram estáticas |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors (7 warnings menores em react-hook-form e arquivos `_generated` — não-bloqueantes) |
| Convex schema push | ✅ Schema enviado e tipos gerados |

## Roadmap (não implementado, sugestões)

Itens marcados como **opcionais** no spec original ou identificados como follow-ups:

- **Histórico de compras por cliente** — backend tem o índice `by_customer` em sales pronto. Precisa de UI no cadastro do cliente.
- **Modal "Ver detalhes da venda"** em `/relatorios` — backend `sales.get` está pronto, falta abrir o dialog (atualmente só `console.log`).
- **Per-item recap no success overlay** — hoje mostra total + cliente + forma. Receipt completo seria o próximo passo.
- **Imprimir/compartilhar comprovante** — botão hoje toasts "Em breve". Web Share API + window.print() são opções.
- **Theme toggle no header** — `next-themes` já configurado, falta só o botão. Sugere usar `<DropdownMenu>` com `useTheme()`.
- **PWA + offline** — cachear catálogo de produtos pra PDV funcionar sem net no evento.
- **Múltiplos eventos / multi-tenant** — schema atual é single-tenant.
- **Auth** — sem login. Adicionar Convex Auth ou Clerk se for expor publicamente.

## Troubleshooting

**"Cannot find module '@/convex/_generated/api'"**
→ Rodar `npx convex dev` (gera o folder _generated).

**"No CONVEX_DEPLOYMENT set"**
→ Faltou o deploy key no `.env.local`. Pegue novo em https://dashboard.convex.dev/

**Foto do produto não aparece**
→ A URL é assinada pelo Convex storage. Verifique no DevTools Network se o GET está retornando 200. Se 403, o storageId pode estar inválido — recriar produto.

**Build falha em `next/image`**
→ Os componentes usam `<img>` direto pra fotos do Convex (URLs externas variáveis). Se quiser otimização, adicionar `images.remotePatterns` em `next.config.ts`.

**Confete não aparece na venda**
→ `canvas-confetti` está em deps. Se não funcionar, abrir DevTools Console — pode ser bloqueio de animation por preferência do sistema (`prefers-reduced-motion`).

---

Construído com Claude Opus 4.7 — agentes paralelos para backend, docs, e cada módulo de UI, com revisão final por agente PO. 🎉
