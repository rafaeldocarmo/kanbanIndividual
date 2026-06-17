import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading instantâneo do Kanban. É pré-carregado (prefetch) pelo Next, então
 * aparece no mesmo frame do clique — nunca uma tela em branco.
 */
export default function Loading() {
  return (
    <div className="flex h-full flex-col bg-[var(--color-canvas)] pb-4">
      <div className="animate-fade-in mx-auto flex w-full max-w-[1200px] min-h-0 flex-1 flex-col overflow-hidden rounded-b-xl bg-[var(--color-background)] shadow-[0_0_0_1px_var(--color-border)]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
          <Skeleton className="h-9 w-full max-w-md rounded-md" />
          <div className="ml-auto flex items-center gap-4">
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>

        {/* Quick add */}
        <div className="border-b border-[var(--color-border)] px-4 py-2.5">
          <Skeleton className="h-9 w-64 rounded-md" />
        </div>

        {/* Lista */}
        <div className="flex-1 min-h-0 overflow-hidden bg-[var(--color-canvas)] px-4 py-3">
          <div className="h-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-sm">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-[var(--color-border)] px-3 py-3 last:border-0"
              >
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1 max-w-[40%] rounded" />
                <Skeleton className="ml-auto h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
