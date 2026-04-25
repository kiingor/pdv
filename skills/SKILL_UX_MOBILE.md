# SKILL_UX_MOBILE — Mobile e Tablet

Tablet-first, mobile-friendly. Alvo principal: iPad 10.2" e Android genérico em landscape para o operador, portrait para gestor consultando relatórios.

## Touch targets

**Mínimo 44px** (Apple HIG), **48px recomendado** para PDV (operador às vezes com luvas, dedos molhados de bebida, ambiente festivo barulhento).

Já garantido em `app/globals.css` via:

```css
@media (hover: none) {
  button, [role="button"], a {
    min-height: 44px;
    min-width: 44px;
  }
}
```

`(hover: none)` aplica só em devices touch — desktop com mouse mantém os tamanhos compactos do shadcn.

Para botões críticos do PDV (qty +/−, finalizar, métodos de pagamento), force ainda maior:

```tsx
<Button size="icon" className="h-12 w-12 lg:h-10 lg:w-10">
  <Plus className="h-6 w-6" />
</Button>
```

## Gestos

### Swipe-left no item do carrinho → revela "Remover"

Padrão iOS-style. Implementação simples sem lib:

```tsx
function CartItem({ item, onRemove }: Props) {
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute right-0 top-0 h-full bg-destructive flex items-center px-4"
        style={{ width: 80 }}
      >
        <button onClick={onRemove} className="text-destructive-foreground font-bold">
          Remover
        </button>
      </div>
      <div
        className="bg-card transition-transform"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
        onTouchMove={(e) => {
          const delta = e.touches[0].clientX - startX.current;
          setTranslateX(Math.min(0, Math.max(-80, delta)));
        }}
        onTouchEnd={() => setTranslateX(translateX < -40 ? -80 : 0)}
      >
        {/* conteúdo do item */}
      </div>
    </div>
  );
}
```

Se a interação ficar engasgada, troca para `react-swipeable` (npm install react-swipeable). API mais limpa.

### Pull-to-refresh (opcional)

Só nas listagens (vendas, produtos, clientes) — não no PDV. Use `react-pull-to-refresh` ou implementação nativa com `touchstart` + scroll-position check. Adia para fase 2 se não houver tempo.

## Orientação

### Tablet landscape (1024×768+)

- Sidebar visível (`lg:flex`)
- Bottom nav escondida
- PDV em duas colunas (catálogo + carrinho)

### Mobile portrait (<768px) e tablet portrait

- Bottom nav fixa (`lg:hidden`)
- Sidebar como `<Sheet>` (drawer) abrindo da esquerda, acionada por `<MenuIcon />` no header
- PDV em coluna única; carrinho vira drawer da direita acionado por botão flutuante

Detecção: `useIsTablet()` e `useIsMobile()` de `hooks/use-mobile.ts`. Mas prefira responsive Tailwind (`lg:`) sempre que possível — menos JS, melhor SSR.

```tsx
import { useIsMobile } from "@/hooks/use-mobile";

const isMobile = useIsMobile(); // só quando precisa de lógica condicional além de CSS
```

## Safe area (iOS)

Bottom nav precisa respeitar a "home bar" do iPhone:

```tsx
<nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-card border-t pb-[env(safe-area-inset-bottom)]">
  {/* itens */}
</nav>
```

Sem isso, no iPhone X+ o último botão fica escondido atrás da barra preta.

Equivalente para o topo (notch) em headers fixos:

```tsx
<header className="fixed top-0 ... pt-[env(safe-area-inset-top)]">
```

## Tablet alvo

Testar em:

- **iPad 10.2"** (Safari iOS) — mercado de eventos brasileiros usa muito
- **Tablet Android genérico** (Samsung Galaxy Tab A 10.1, Multilaser) — Chrome
- Resolução mínima de design: **1024×600** (alguns Android tablets baratos)
- Testar com brilho da tela em 50% sob luz forte (ambiente externo de evento)

## PWA — fase 2

Não implementar agora, só deixar a porta aberta:

- `public/manifest.json` com nome, ícones, `display: "standalone"`, `theme_color` igual ao `--primary` laranja
- Service Worker via `next-pwa` ou Workbox
- Cachear o catálogo de produtos para o PDV funcionar sem net (eventos têm wifi instável)
- Fila de vendas offline → sincroniza quando voltar online

Implementação típica adia para depois do MVP estabilizar — Convex já é resiliente com offline-first parcial via cache local.

## Referências cruzadas

- `hooks/use-mobile.ts` — `useIsMobile`, `useIsTablet`
- `components/layout/app-shell.tsx` — sidebar + bottom nav
- `app/globals.css` — `@media (hover: none)` para touch targets
- `SKILL_UX_PDV.md` — drawer do carrinho mobile, swipe-to-remove
- `SKILL_DESIGN_SYSTEM.md` — tokens de cor para `theme_color` do PWA
