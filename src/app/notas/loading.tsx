import { Skeleton } from "@/components/ui/skeleton";

/** Loading instantâneo de Notas & Lembretes. */
export default function Loading() {
  return (
    <div className="min-h-full bg-[var(--color-canvas)] px-4 py-8 sm:px-6">
      <div className="animate-fade-in mx-auto w-full max-w-[1200px]">
        <Skeleton className="mb-6 h-8 w-64 rounded-md" />

        {/* Composer */}
        <Skeleton className="h-28 w-full rounded-xl" />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(320px,360px)]">
          {/* Anotações */}
          <section>
            <Skeleton className="mb-2 h-4 w-28 rounded" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          </section>

          {/* Lembretes + Links */}
          <div className="flex flex-col gap-6">
            <section>
              <Skeleton className="mb-2 h-4 w-24 rounded" />
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-sm">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="mb-1.5 h-10 w-full rounded-lg last:mb-0" />
                ))}
              </div>
            </section>
            <section>
              <Skeleton className="mb-2 h-4 w-16 rounded" />
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-sm">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="mb-1.5 h-10 w-full rounded-lg last:mb-0" />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
