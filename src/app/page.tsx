import { AppShell } from "@/components/app-shell";
import {
  ensureDefaults,
  getActivities,
  getAssignees,
  getJourneys,
  getStages,
} from "@/db/queries";
import type {
  BootstrapData,
  GroupBy,
  Lanes,
  Scope,
  ViewMode,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    view?: string;
    group?: string;
    scope?: string;
    lanes?: string;
    hide?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  await ensureDefaults();
  const [stages, journeys, assignees, activities, sp] = await Promise.all([
    getStages(),
    getJourneys(),
    getAssignees(),
    getActivities(),
    searchParams,
  ]);

  const data: BootstrapData = { stages, journeys, assignees, activities };

  const initialView: ViewMode = sp.view === "board" ? "board" : "list";
  const initialGroup: GroupBy =
    sp.group === "journey" || sp.group === "assignee" ? sp.group : "status";
  const initialScope: Scope = sp.scope === "mine" ? "mine" : "team";
  const initialLanes: Lanes = sp.lanes === "person" ? "person" : "none";
  const initialHidden = (sp.hide?.split(",") ?? []).filter((id) =>
    stages.some((s) => s.id === id),
  );

  return (
    <AppShell
      data={data}
      initialView={initialView}
      initialGroup={initialGroup}
      initialScope={initialScope}
      initialLanes={initialLanes}
      initialHidden={initialHidden}
    />
  );
}
