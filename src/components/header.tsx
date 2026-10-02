"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Database, BookOpen, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { IdentityPicker } from "@/components/team/identity-picker";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { href: "/", label: "Kanban", icon: LayoutGrid },
  { href: "/queries", label: "Queries", icon: Database },
  { href: "/conhecimento", label: "Conhecimento", icon: BookOpen },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname() ?? "/";
  const { theme, setTheme } = useTheme();

  return (
    <header className="shrink-0">
      <div className="relative mx-auto flex h-14 w-full max-w-[1200px] items-center justify-center gap-3 px-4">
        <Link
          href="/"
          prefetch
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-primary)] text-[var(--color-primary-foreground)]">
            <LayoutGrid className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">Workspace</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition",
                  active
                    ? "bg-[var(--color-muted)] font-medium text-[var(--color-foreground)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <IdentityPicker />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Alternar tema"
          >
            {/* Ícone por CSS: o tema só é conhecido no cliente (evita erro de hidratação). */}
            <Sun className="hidden h-4 w-4 dark:block" />
            <Moon className="h-4 w-4 dark:hidden" />
          </Button>
        </div>
      </div>
    </header>
  );
}
