import { OmShell } from "@/components/om/om-shell";
import { getJourneys, getOmErrors } from "@/db/queries";
import type { OmErrorsBootstrap, ViewMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kanban OM",
  description: "Erros do OM, do backlog ao defeito criado.",
};

type PageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function OmPage({ searchParams }: PageProps) {
  const [journeys, items, sp] = await Promise.all([
    getJourneys(),
    getOmErrors(),
    searchParams,
  ]);
  const data: OmErrorsBootstrap = { journeys, items };
  const initialView: ViewMode = sp.view === "list" ? "list" : "board";

  return <OmShell data={data} initialView={initialView} />;
}
