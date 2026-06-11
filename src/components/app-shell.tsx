"use client";

import * as React from "react";
import { toast } from "sonner";
import { Toolbar } from "@/components/toolbar";
import { ListView } from "@/components/list-view";
import { BoardView } from "@/components/board-view";
import { QuickAdd } from "@/components/quick-add";
import { ActivityDialog } from "@/components/activity/activity-dialog";
import type {
  ActivityView,
  BootstrapData,
  GroupBy,
  ViewMode,
} from "@/lib/types";
import { useQueryState, parseAsStringEnum } from "nuqs";

const GROUPS: GroupBy[] = ["status", "journey", "assignee"];
const VIEWS: ViewMode[] = ["list", "board"];

export type Mutation =
  | { type: "create"; activity: ActivityView }
  | { type: "update"; activity: ActivityView }
  | { type: "delete"; id: string }
  | {
      type: "move";
      id: string;
      stageId?: string;
      journeyId?: string | null;
      assigneeId?: string | null;
    }
  | {
      type: "addStatus";
      activityId: string;
      status: { id: string; content: string; createdAt: Date };
    }
  | { type: "removeStatus"; activityId: string; statusId: string };

function reducer(state: ActivityView[], action: Mutation): ActivityView[] {
  switch (action.type) {
    case "create":
      return [action.activity, ...state];
    case "update":
      return state.map((a) =>
        a.id === action.activity.id ? action.activity : a,
      );
    case "delete":
      return state.filter((a) => a.id !== action.id);
    case "move":
      return state.map((a) => {
        if (a.id !== action.id) return a;
        return {
          ...a,
          stageId: action.stageId ?? a.stageId,
          stageName:
            action.stageId && action.stageId !== a.stageId
              ? null
              : a.stageName,
          stageColor:
            action.stageId && action.stageId !== a.stageId
              ? null
              : a.stageColor,
          journeyId:
            action.journeyId !== undefined ? action.journeyId : a.journeyId,
          assigneeId:
            action.assigneeId !== undefined ? action.assigneeId : a.assigneeId,
        };
      });
    case "addStatus":
      return state.map((a) =>
        a.id === action.activityId
          ? {
              ...a,
              statusUpdates: [action.status, ...a.statusUpdates],
              lastStatus: action.status.content,
            }
          : a,
      );
    case "removeStatus":
      return state.map((a) => {
        if (a.id !== action.activityId) return a;
        const next = a.statusUpdates.filter((s) => s.id !== action.statusId);
        return {
          ...a,
          statusUpdates: next,
          lastStatus: next[0]?.content ?? null,
        };
      });
  }
}

type ActivitiesCtx = {
  activities: ActivityView[];
  mutate: (
    action: Mutation,
    server: () => Promise<{ ok: boolean; error?: string }>,
  ) => void;
};

const ActivitiesContext = React.createContext<ActivitiesCtx | null>(null);

export function useActivitiesContext() {
  const ctx = React.useContext(ActivitiesContext);
  if (!ctx) throw new Error("ActivitiesContext required");
  return ctx;
}

type Props = {
  data: BootstrapData;
  initialView?: ViewMode;
  initialGroup?: GroupBy;
};

export function AppShell({ data, initialView, initialGroup }: Props) {
  const [search, setSearch] = React.useState("");
  const [group, setGroup] = useQueryState(
    "group",
    parseAsStringEnum(GROUPS).withDefault(initialGroup ?? "status"),
  );
  const [view, setView] = useQueryState(
    "view",
    parseAsStringEnum(VIEWS).withDefault(initialView ?? "list"),
  );

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [optimisticActivities, applyOptimistic] = React.useOptimistic(
    data.activities,
    reducer,
  );

  const mutate = React.useCallback<ActivitiesCtx["mutate"]>(
    (action, server) => {
      React.startTransition(async () => {
        applyOptimistic(action);
        try {
          const r = await server();
          if (!r.ok) toast.error(r.error ?? "Falha ao salvar");
        } catch {
          toast.error("Falha de sincronização");
        }
      });
    },
    [applyOptimistic],
  );

  const ctxValue = React.useMemo<ActivitiesCtx>(
    () => ({ activities: optimisticActivities, mutate }),
    [optimisticActivities, mutate],
  );

  const openEdit = React.useCallback((a: ActivityView) => {
    setEditingId(a.id);
    setDialogOpen(true);
  }, []);

  const editing = editingId
    ? optimisticActivities.find((a) => a.id === editingId) ?? null
    : null;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return optimisticActivities;
    return optimisticActivities.filter((a) => {
      return (
        a.name.toLowerCase().includes(q) ||
        a.lastStatus?.toLowerCase().includes(q) ||
        a.journeyName?.toLowerCase().includes(q) ||
        a.assigneeName?.toLowerCase().includes(q)
      );
    });
  }, [optimisticActivities, search]);

  return (
    <ActivitiesContext.Provider value={ctxValue}>
      <div className="flex h-svh flex-col bg-[var(--color-canvas)] pb-4">
        <div className="mx-auto flex w-full max-w-[1200px] min-h-0 flex-1 flex-col overflow-hidden rounded-b-xl bg-[var(--color-background)] shadow-[0_0_0_1px_var(--color-border)]">
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            group={group}
            onGroupChange={setGroup}
            view={view}
            onViewChange={setView}
          />
          <QuickAdd
            stages={data.stages}
            journeys={data.journeys}
            assignees={data.assignees}
          />
          <div className="flex-1 overflow-auto scrollbar-thin">
            {view === "board" ? (
              <BoardView
                activities={filtered}
                stages={data.stages}
                onEdit={openEdit}
              />
            ) : (
              <ListView
                activities={filtered}
                stages={data.stages}
                journeys={data.journeys}
                assignees={data.assignees}
                group={group}
                onEdit={openEdit}
              />
            )}
          </div>
        </div>
        <ActivityDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          stages={data.stages}
          journeys={data.journeys}
          assignees={data.assignees}
          initial={editing}
        />
      </div>
    </ActivitiesContext.Provider>
  );
}
