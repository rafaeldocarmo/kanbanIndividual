import { OmErrorsShell } from "@/components/om/om-errors-shell";
import { getJourneys, getOmErrors } from "@/db/queries";
import type { OmErrorsBootstrap } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Erros OM",
  description: "Catálogo de erros do OM, com contorno e status.",
};

type PageProps = {
  searchParams: Promise<{ j?: string; item?: string }>;
};

export default async function ErrosOmPage({ searchParams }: PageProps) {
  const [journeys, items, sp] = await Promise.all([
    getJourneys(),
    getOmErrors(),
    searchParams,
  ]);

  const data: OmErrorsBootstrap = { journeys, items };

  return (
    <OmErrorsShell data={data} initialJourney={sp.j} initialItem={sp.item} />
  );
}
