"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  primary?: boolean;
};

const NAV: readonly NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pdv", label: "PDV", icon: ShoppingCart, primary: true },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar (desktop/tablet landscape) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-sidebar lg:p-4">
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          <NavLinks />
        </nav>
      </aside>

      {/* Top bar (mobile/tablet portrait) */}
      <header className="lg:hidden sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md px-4 py-3">
        <Brand />
      </header>

      {/* Main */}
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur-md">
        <ul className="grid grid-cols-5">
          <NavLinks compact />
        </ul>
      </nav>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold text-lg">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary via-chart-2 to-chart-3 text-white shadow-md">
        <Sparkles className="h-4 w-4" />
      </div>
      <span className="bg-gradient-to-r from-primary to-chart-3 bg-clip-text text-transparent">
        PDV Eventos
      </span>
    </Link>
  );
}

function NavLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {NAV.map(({ href, label, icon: Icon, primary }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        if (compact) {
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {primary && active ? (
                  <div className="grid h-10 w-10 -translate-y-3 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                    <Icon className="h-5 w-5" />
                  </div>
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span className={primary && active ? "-mt-2" : ""}>
                  {label}
                </span>
              </Link>
            </li>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "text-foreground/70 hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </>
  );
}
