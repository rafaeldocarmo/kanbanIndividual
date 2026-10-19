"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/conhecimento", label: "Conhecimento" },
  { href: "/conhecimento/erros", label: "Erros OM" },
];

/** Duas áreas dentro da mesma aba: o conhecimento solto e o catálogo de erros. */
export function KnowledgeTabs() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="mb-5 flex w-fit items-center rounded-md bg-[var(--color-muted)] p-0.5">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            prefetch
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded px-3 py-1 text-sm transition",
              active
                ? "bg-[var(--color-card)] font-medium text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
