import { KnowledgeShell } from "@/components/knowledge/knowledge-shell";
import { getJourneys, getKnowledge } from "@/db/queries";
import type { KnowledgeBootstrap } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Banco de Conhecimento",
  description: "O que a equipe aprendeu sobre cada jornada.",
};

type PageProps = {
  searchParams: Promise<{ j?: string; t?: string; item?: string }>;
};

export default async function ConhecimentoPage({ searchParams }: PageProps) {
  const [journeys, items, sp] = await Promise.all([
    getJourneys(),
    getKnowledge(),
    searchParams,
  ]);

  const data: KnowledgeBootstrap = { journeys, items };

  return (
    <KnowledgeShell
      data={data}
      initialJourney={sp.j}
      initialKind={sp.t}
      initialItem={sp.item}
    />
  );
}
